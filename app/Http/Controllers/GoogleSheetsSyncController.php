<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\BranchProduct;
use App\Services\GoogleSheetsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleSheetsSyncController extends Controller
{
    protected $sheetsService;

    public function __construct(GoogleSheetsService $sheetsService)
    {
        $this->sheetsService = $sheetsService;
    }

    /**
     * Build a deterministic snapshot key from a raw sheet row's data cells.
     * Used to detect whether the user modified a row in Google Sheets since the last sync.
     */
    protected function buildRowSnapshotKey(array $row): string
    {
        // Normalize each cell: trim, lowercase, collapse whitespace, treat null/empty/'null' as empty
        $normalized = array_map(function ($cell) {
            $val = trim((string)($cell ?? ''));
            if (strtolower($val) === 'null' || $val === '') {
                return '';
            }
            return strtolower(preg_replace('/\s+/', ' ', $val));
        }, $row);

        return md5(implode('|', $normalized));
    }

    /**
     * Build a complete snapshot map for a branch's sheet rows.
     * Returns an associative array keyed by sheet_row_index => snapshot_hash.
     */
    protected function buildSheetSnapshot(array $rows, int $startIndex = 2): array
    {
        $snapshot = [];
        foreach ($rows as $index => $row) {
            if (empty($row) || (count($row) === 1 && trim($row[0]) === '')) {
                continue;
            }
            $rowIndex = $index + $startIndex; // 1-indexed plus header row offset
            $snapshot[(string)$rowIndex] = $this->buildRowSnapshotKey($row);
        }
        return $snapshot;
    }

    /**
     * Perform a full sync of all branches and their products to Google Sheets.
     */
    public function syncAll()
    {
        set_time_limit(600);
        
        try {
            $branches = Branch::all();
            
            $headers = [
                'ID', 'Physical Location', 'Supplier', 'Barcode', 'QR Code',
                'SKU', 'Category', 'Product Name', 'Brand', 'Code',
                '2code', 'Variations', 'Description', 'Supplier Description',
                'Reorder Level', 'Price', 'Quantity'
            ];

            foreach ($branches as $branch) {
                $rows = [$headers];
                
                $branchProducts = BranchProduct::where('branch_id', $branch->id)
                    ->with(['product.brand', 'product.category', 'product.supplier'])
                    ->get();
                
                foreach ($branchProducts as $bp) {
                    $product = $bp->product;
                    if (!$product) continue;

                    $rows[] = array_values([
                        $product->id,
                        $bp->physical_location,
                        $product->supplier?->name,
                        $product->barcode,
                        $product->qr_code,
                        $product->sku,
                        $product->category?->name,
                        $product->name,
                        $product->brand?->name,
                        $product->code,
                        $product->code_2,
                        $bp->variations ?? $product->variations,
                        $bp->description,
                        $product->description,
                        $bp->reorder_level,
                        $product->price,
                        $bp->quantity,
                    ]);
                }

                $this->sheetsService->updateSheetContent($branch->branch_name, array_values($rows));

                // Store snapshot for this branch after syncing
                $freshRows = $this->sheetsService->getSheetContent($branch->branch_name);
                if (!empty($freshRows)) {
                    array_shift($freshRows); // Remove header row
                    $snapshot = $this->buildSheetSnapshot($freshRows);
                    $branch->update(['sheet_snapshot' => $snapshot, 'last_sheet_sync_at' => now()]);
                }
            }

            // --- Reorders Tab Sync ---
            $reorderHeaders = ['ID', 'Product Name', 'Brand', 'Category', 'Supplier'];
            foreach ($branches as $branch) {
                $reorderHeaders[] = $branch->branch_name . ' Stock';
                $reorderHeaders[] = $branch->branch_name . ' Reorder';
            }

            $reorderRows = [$reorderHeaders];
            
            // Get all products that have at least one branch in reorder state
            $productsWithReorders = \App\Models\Product::whereHas('branches', function ($query) {
                $query->whereNotNull('branch_products.reorder_level')
                      ->where('branch_products.reorder_level', '>', 0)
                      ->whereRaw('branch_products.quantity <= branch_products.reorder_level');
            })->with(['brand', 'category', 'supplier', 'branches'])->get();

            foreach ($productsWithReorders as $product) {
                $row = [
                    $product->id,
                    $product->name,
                    $product->brand?->name,
                    $product->category?->name,
                    $product->supplier?->name,
                ];

                foreach ($branches as $branch) {
                    $bp = $product->branches->where('id', $branch->id)->first();
                    $row[] = $bp ? $bp->pivot->quantity : 0;
                    $row[] = $bp ? $bp->pivot->reorder_level : 0;
                }
                $reorderRows[] = $row;
            }

            $this->sheetsService->updateSheetContent('Reorders', array_values($reorderRows));

            // --- Sales Tab Sync (All History) ---
            $this->sheetsService->syncSalesSheet();

            // --- Transfers Tab Sync (All History) ---
            $this->sheetsService->syncTransfersSheet();

            return back()->with('success', 'Full sync completed successfully.');
        } catch (\Exception $e) {
            Log::error('Full Google Sheets Sync Error: ' . $e->getMessage());
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Pull and compare active branch sheet with local database.
     */
    public function pullAndCompare(Request $request)
    {
        if (!auth()->user()->hasRole('System Administrator')) {
            return response()->json(['error' => 'Unauthorized. Only System Administrators can perform this action.'], 403);
        }

        try {
            $user = auth()->user();
            $branchId = session()->has('active_branch_id')
                ? session('active_branch_id')
                : $user->branch_id;

            if (!$branchId) {
                return response()->json(['error' => 'No active branch selected.'], 400);
            }

            $branch = Branch::findOrFail($branchId);
            $sheetName = $branch->branch_name;

            $rows = $this->sheetsService->getSheetContent($sheetName);
            if (empty($rows)) {
                return response()->json(['error' => "Google Sheet tab for branch '{$sheetName}' is empty or could not be read. Please make sure the sheet is shared or correctly formatted."], 400);
            }

            // Exclude header row if first row matches headers
            $headers = array_shift($rows);
            // Verify if first row is indeed headers, if not put it back
            if ($headers && strtolower($headers[0]) !== 'id' && strtolower($headers[0]) !== 'product name' && strtolower($headers[0]) !== 'product') {
                array_unshift($rows, $headers);
            }

            // Load the stored snapshot for this branch (last-known sheet state after previous sync)
            $storedSnapshot = $branch->sheet_snapshot ?? [];

            // Load all database products for this branch in memory for fast lookup
            $branchProducts = BranchProduct::where('branch_id', $branchId)
                ->with(['product.brand', 'product.category', 'product.supplier'])
                ->get();
            
            $dbProductsById = [];
            $dbProductsByBarcode = [];
            $dbProductsByQrCode = [];
            $dbProductsBySku = [];
            $dbProductsByName = [];

            foreach ($branchProducts as $bp) {
                $p = $bp->product;
                if (!$p) continue;
                
                $dbProductsById[$p->id] = $bp;
                if ($p->barcode) $dbProductsByBarcode[$p->barcode] = $bp;
                if ($p->qr_code) $dbProductsByQrCode[$p->qr_code] = $bp;
                if ($p->sku) {
                    $dbProductsBySku[$p->sku][] = $bp;
                }
                $dbProductsByName[strtolower(trim($p->name))] = $bp;
            }

            $cleanValue = function($val, $default = null) {
                if ($val === null || $val === '' || strtolower(trim($val)) === 'null') {
                    return $default;
                }
                return trim($val);
            };

            $comparedItems = [];
            $seenSheetBarcodes = [];
            $seenSheetQrCodes = [];
            $seenSheetSkus = [];

            foreach ($rows as $index => $row) {
                if (empty($row) || (count($row) === 1 && trim($row[0]) === '')) {
                    continue;
                }

                $sheetId = $cleanValue($row[0] ?? null);
                $sheetPhysLoc = $cleanValue($row[1] ?? null);
                $sheetSupplier = $cleanValue($row[2] ?? null);
                $sheetBarcode = $cleanValue($row[3] ?? null);
                $sheetQrCode = $cleanValue($row[4] ?? null);
                $sheetSku = $cleanValue($row[5] ?? null);
                $sheetCategory = $cleanValue($row[6] ?? null);
                $sheetName = $cleanValue($row[7] ?? null);
                $sheetBrand = $cleanValue($row[8] ?? null);
                $sheetCode = $cleanValue($row[9] ?? null);
                $sheetCode2 = $cleanValue($row[10] ?? null);
                $sheetVariations = $cleanValue($row[11] ?? null);
                $sheetDesc = $cleanValue($row[12] ?? null);
                $sheetSupplierDesc = $cleanValue($row[13] ?? null);
                
                $rawReorder = $cleanValue($row[14] ?? null, 0);
                $cleanReorder = preg_replace('/[^\d]/', '', $rawReorder);
                $sheetReorder = is_numeric($cleanReorder) ? (int)$cleanReorder : 0;

                $rawPrice = $cleanValue($row[15] ?? null, 0);
                $cleanPrice = preg_replace('/[^\d\.]/', '', $rawPrice);
                $sheetPrice = is_numeric($cleanPrice) ? (float)$cleanPrice : 0.0;

                $rawQty = $cleanValue($row[16] ?? null, 0);
                $cleanQty = preg_replace('/[^\d\-]/', '', $rawQty);
                $sheetQty = is_numeric($cleanQty) ? (int)$cleanQty : 0;

                if (!$sheetName) {
                    continue; // Skip products with no name
                }

                // Match with database product
                $matchedBp = null;
                if ($sheetId && is_numeric($sheetId) && isset($dbProductsById[(int)$sheetId])) {
                    $matchedBp = $dbProductsById[(int)$sheetId];
                }

                if (!$matchedBp) {
                    if ($sheetBarcode && isset($dbProductsByBarcode[$sheetBarcode])) {
                        $matchedBp = $dbProductsByBarcode[$sheetBarcode];
                    } elseif ($sheetQrCode && isset($dbProductsByQrCode[$sheetQrCode])) {
                        $matchedBp = $dbProductsByQrCode[$sheetQrCode];
                    } elseif ($sheetSku && isset($dbProductsBySku[$sheetSku])) {
                        $sheetSupplierClean = strtolower(trim($sheetSupplier ?? ''));
                        foreach ($dbProductsBySku[$sheetSku] as $bp) {
                            $dbSupplierClean = strtolower(trim($bp->product->supplier?->name ?? ''));
                            if ($dbSupplierClean === $sheetSupplierClean) {
                                $matchedBp = $bp;
                                break;
                            }
                        }
                    } elseif ($sheetName && isset($dbProductsByName[strtolower($sheetName)])) {
                        $matchedBp = $dbProductsByName[strtolower($sheetName)];
                    }
                }

                $warnings = [];
                $isDuplicate = false;
                $isPossibleReorder = false;

                // 1. Check duplicate barcode within this branch (using memory lookups)
                if ($sheetBarcode) {
                    if (isset($dbProductsByBarcode[$sheetBarcode])) {
                        $existingBp = $dbProductsByBarcode[$sheetBarcode];
                        $isPossibleReorder = true;
                        $matchedBp = $existingBp;
                    }

                    if (isset($seenSheetBarcodes[$sheetBarcode])) {
                        $warnings[] = "Duplicate barcode '{$sheetBarcode}' found multiple times in the Google Sheet.";
                        $isDuplicate = true;
                    }
                    $seenSheetBarcodes[$sheetBarcode] = true;
                }

                // 2. Check duplicate QR Code within this branch (using memory lookups)
                if ($sheetQrCode) {
                    if (isset($dbProductsByQrCode[$sheetQrCode])) {
                        $existingBp = $dbProductsByQrCode[$sheetQrCode];
                        if (!$matchedBp || $existingBp->product_id != $matchedBp->product_id) {
                            $warnings[] = "QR Code '{$sheetQrCode}' conflicts with an existing product in this branch: ID {$existingBp->product_id} ('{$existingBp->product->name}').";
                            $isDuplicate = true;
                        }
                    }

                    if (isset($seenSheetQrCodes[$sheetQrCode])) {
                        $warnings[] = "Duplicate QR Code '{$sheetQrCode}' found multiple times in the Google Sheet.";
                        $isDuplicate = true;
                    }
                    $seenSheetQrCodes[$sheetQrCode] = true;
                }

                // 3. Check duplicate SKU within this branch (using memory lookups)
                if ($sheetSku) {
                    if (isset($dbProductsBySku[$sheetSku])) {
                        foreach ($dbProductsBySku[$sheetSku] as $existingBp) {
                            if (!$matchedBp || $existingBp->product_id != $matchedBp->product_id) {
                                $existingSupplier = strtolower(trim($existingBp->product->supplier?->name ?? ''));
                                $sheetSupplierClean = strtolower(trim($sheetSupplier ?? ''));
                                if ($existingSupplier === $sheetSupplierClean) {
                                    $warnings[] = "SKU '{$sheetSku}' conflicts with an existing product in this branch: ID {$existingBp->product_id} ('{$existingBp->product->name}').";
                                    $isDuplicate = true;
                                    break;
                                }
                            }
                        }
                    }

                    $sheetSupplierClean = strtolower(trim($sheetSupplier ?? ''));
                    if (isset($seenSheetSkus[$sheetSku])) {
                        foreach ($seenSheetSkus[$sheetSku] as $seenSupplier) {
                            if ($seenSupplier === $sheetSupplierClean) {
                                $warnings[] = "Duplicate SKU '{$sheetSku}' found multiple times in the Google Sheet.";
                                $isDuplicate = true;
                                break;
                            }
                        }
                    }
                    $seenSheetSkus[$sheetSku][] = $sheetSupplierClean;
                }

                // --- Snapshot-based change detection ---
                $sheetRowIndex = $index + 2; // 1-indexed plus header row offset
                $currentRowHash = $this->buildRowSnapshotKey($row);
                $storedRowHash = $storedSnapshot[(string)$sheetRowIndex] ?? null;

                // If the row's hash matches the stored snapshot, the user didn't touch it
                // in Google Sheets since the last sync → skip entirely
                if ($storedRowHash !== null && $currentRowHash === $storedRowHash) {
                    continue;
                }

                // --- DB comparison for display values and change highlighting ---
                $status = 'new';
                $changes = [];
                $dbValues = [];
                $quantityMode = null; // null for new items, 'choose' for existing items with qty change

                if ($matchedBp) {
                    $status = 'modified'; // If it wasn't skipped by snapshot, it's been modified
                    $p = $matchedBp->product;

                    // Always populate db_values with original quantity and barcode for comparison / display
                    $dbValues['quantity'] = (int)$matchedBp->quantity;
                    $dbValues['barcode'] = $p->barcode;

                    $checkDiff = function($field, $sheetVal, $dbVal) use (&$changes, &$dbValues) {
                        if ($sheetVal != $dbVal) {
                            $changes[] = $field;
                            $dbValues[$field] = $dbVal;
                        }
                    };

                    $checkDiff('name', $sheetName, $p->name);
                    $checkDiff('brand_name', $sheetBrand, $p->brand?->name);
                    $checkDiff('category_name', $sheetCategory, $p->category?->name);
                    $checkDiff('supplier_name', $sheetSupplier, $p->supplier?->name);
                    $checkDiff('barcode', $sheetBarcode, $p->barcode);
                    $checkDiff('qr_code', $sheetQrCode, $p->qr_code);
                    $checkDiff('code', $sheetCode, $p->code);
                    $checkDiff('code_2', $sheetCode2, $p->code_2);
                    $checkDiff('sku', $sheetSku, $p->sku);

                    // Variations checking
                    $sheetVarClean = $this->sheetsService->parseVariationsString($sheetVariations);
                    $dbVarCleanStr = $matchedBp->variations ? json_encode($matchedBp->variations) : ($p->variations ? json_encode($p->variations) : null);
                    $sheetVarCleanStr = $sheetVarClean ? json_encode($sheetVarClean) : null;
                    if ($sheetVarCleanStr !== $dbVarCleanStr) {
                        $changes[] = 'variations';
                        $dbValues['variations'] = $matchedBp->variations ?? $p->variations;
                    }

                    $checkDiff('physical_location', $sheetPhysLoc, $matchedBp->physical_location);
                    $checkDiff('description', $sheetDesc, $matchedBp->description);
                    $checkDiff('supplier_description', $sheetSupplierDesc, $p->description);
                    $checkDiff('reorder_level', (int)$sheetReorder, (int)$matchedBp->reorder_level);
                    $checkDiff('price', (float)$sheetPrice, (float)$p->price);
                    $checkDiff('quantity', (int)$sheetQty, (int)$matchedBp->quantity);

                    // If quantity changed, let the user choose how to handle it
                    if (in_array('quantity', $changes)) {
                        $quantityMode = 'choose'; // Frontend will show overwrite vs add options
                    }

                    // If nothing actually differs from DB, it could be a snapshot-only change
                    // (e.g., whitespace normalization). Still show it but mark as no changes.
                    if (empty($changes)) {
                        $status = 'unchanged';
                    }
                }

                if ($isPossibleReorder) {
                    $status = 'possible_reorder';
                    $quantityMode = 'choose';
                } elseif ($isDuplicate) {
                    $status = 'duplicate';
                }

                if ($status === 'unchanged') {
                    continue;
                }

                $comparedItems[] = [
                    'sheet_row_index' => $sheetRowIndex,
                    'status' => $status,
                    'is_rejected' => false,
                    'original_id' => $matchedBp ? $matchedBp->product_id : null,
                    'db_values' => $dbValues,
                    'changes' => $changes,
                    'warnings' => $warnings,
                    'quantity_mode' => $quantityMode, // 'choose' = let user pick overwrite vs add
                    'values' => [
                        'id' => $sheetId ?: ($matchedBp ? (string)$matchedBp->product_id : ''),
                        'name' => $sheetName,
                        'brand_name' => $sheetBrand ?: '',
                        'category_name' => $sheetCategory ?: '',
                        'supplier_name' => $sheetSupplier ?: '',
                        'barcode' => $sheetBarcode ?: '',
                        'qr_code' => $sheetQrCode ?: '',
                        'code' => $sheetCode ?: '',
                        'code_2' => $sheetCode2 ?: '',
                        'sku' => $sheetSku ?: '',
                        'variations' => $sheetVariations ?: '',
                        'physical_location' => $sheetPhysLoc ?: '',
                        'description' => $sheetDesc ?: '',
                        'supplier_description' => $sheetSupplierDesc ?: '',
                        'reorder_level' => (int)$sheetReorder,
                        'price' => (float)$sheetPrice,
                        'quantity' => (int)$sheetQty,
                    ]
                ];
            }

            return response()->json([
                'success' => true,
                'branch_name' => $branch->branch_name,
                'items' => $comparedItems
            ]);

        } catch (\Exception $e) {
            Log::error('Google Sheets pullAndCompare error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred during sheet analysis: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Save the reviewed and validated product changes from sheets sync back to the database.
     */
    public function savePulled(Request $request)
    {
        if (!auth()->user()->hasRole('System Administrator')) {
            return response()->json(['error' => 'Unauthorized. Only System Administrators can perform this action.'], 403);
        }

        ini_set('memory_limit', '1024M');
        set_time_limit(600); // 10 minutes for large imports (e.g. 1800+ items)

        $request->validate([
            'items' => 'required|array',
            'items.*.is_rejected' => 'required|boolean',
            'items.*.values.name' => 'exclude_if:items.*.is_rejected,true|required|string|max:255',
            'items.*.values.quantity' => 'exclude_if:items.*.is_rejected,true|required|integer|min:0',
            'items.*.values.price' => 'exclude_if:items.*.is_rejected,true|required|numeric|min:0',
        ]);

        try {
            $user = auth()->user();
            $branchId = session()->has('active_branch_id')
                ? session('active_branch_id')
                : $user->branch_id;

            if (!$branchId) {
                return response()->json(['error' => 'No active branch selected.'], 400);
            }

            $userId = auth()->id();
            $createdCount = 0;
            $updatedCount = 0;

            // Cache arrays for Brands, Categories, and Suppliers to optimize DB queries
            $cachedBrands = [];
            $cachedCategories = [];
            $cachedSuppliers = [];

            // Temporarily disable Google Sheet sync observers to prevent a high volume of
            // slow synchronous API requests and quota exceptions in the loop.
            \App\Models\Transfer::withoutEvents(function() use ($request, $branchId, $userId, &$createdCount, &$updatedCount, &$cachedBrands, &$cachedCategories, &$cachedSuppliers) {
                \App\Models\Product::withoutEvents(function() use ($request, $branchId, $userId, &$createdCount, &$updatedCount, &$cachedBrands, &$cachedCategories, &$cachedSuppliers) {
                    \App\Models\BranchProduct::withoutEvents(function() use ($request, $branchId, $userId, &$createdCount, &$updatedCount, &$cachedBrands, &$cachedCategories, &$cachedSuppliers) {
                        \Illuminate\Support\Facades\DB::transaction(function() use ($request, $branchId, $userId, &$createdCount, &$updatedCount, &$cachedBrands, &$cachedCategories, &$cachedSuppliers) {
                            $validItems = array_filter($request->items, function($itemData) {
                                return !$itemData['is_rejected'];
                            });

                            if (count($validItems) > 0) {
                                $transfer = \App\Models\Transfer::create([
                                    'source_branch_id' => $branchId,
                                    'destination_branch_id' => $branchId,
                                    'status' => 'completed',
                                    'readied_by' => $userId,
                                    'received_by' => $userId,
                                    'notes' => 'Synchronized & imported via Google Sheet pull-save',
                                ]);

                                foreach ($validItems as $itemData) {
                                    $values = $itemData['values'];
                                    
                                    // 1. Resolve Brand
                                    $brandId = null;
                                    if (!empty($values['brand_name'])) {
                                        $brandNameKey = trim($values['brand_name']);
                                        if (isset($cachedBrands[$brandNameKey])) {
                                            $brandId = $cachedBrands[$brandNameKey];
                                        } else {
                                            $brand = \App\Models\Brand::where('name', $values['brand_name'])
                                                ->where(function($q) use ($branchId) {
                                                    $q->where('branch_id', $branchId)->orWhereNull('branch_id');
                                                })->first();
                                            
                                            if (!$brand) {
                                                $brand = \App\Models\Brand::create([
                                                    'name' => $values['brand_name'],
                                                    'slug' => \Illuminate\Support\Str::slug($values['brand_name']),
                                                    'status' => 'Active',
                                                    'branch_id' => $branchId,
                                                    'created_by' => $userId,
                                                ]);
                                            }
                                            $brandId = $brand->id;
                                            $cachedBrands[$brandNameKey] = $brandId;
                                        }
                                    }

                                    // 2. Resolve Category
                                    $categoryId = null;
                                    if (!empty($values['category_name'])) {
                                        $categoryNameKey = trim($values['category_name']);
                                        if (isset($cachedCategories[$categoryNameKey])) {
                                            $categoryId = $cachedCategories[$categoryNameKey];
                                        } else {
                                            $category = \App\Models\Category::where('name', $values['category_name'])
                                                ->where(function($q) use ($branchId) {
                                                    $q->where('branch_id', $branchId)->orWhereNull('branch_id');
                                                })->first();
                                            
                                            if (!$category) {
                                                $category = \App\Models\Category::create([
                                                    'name' => $values['category_name'],
                                                    'slug' => \Illuminate\Support\Str::slug($values['category_name']),
                                                    'status' => 'Active',
                                                    'branch_id' => $branchId,
                                                    'created_by' => $userId,
                                                ]);
                                            }
                                            $categoryId = $category->id;
                                            $cachedCategories[$categoryNameKey] = $categoryId;
                                        }
                                    }

                                    // 3. Resolve Supplier
                                    $supplierId = null;
                                    if (!empty($values['supplier_name'])) {
                                        $supplierNameKey = trim($values['supplier_name']);
                                        if (isset($cachedSuppliers[$supplierNameKey])) {
                                            $supplierId = $cachedSuppliers[$supplierNameKey];
                                        } else {
                                            $supplier = \App\Models\Supplier::where('name', $values['supplier_name'])->first();
                                            if (!$supplier) {
                                                $supplier = \App\Models\Supplier::create(['name' => $values['supplier_name']]);
                                            }
                                            $supplierId = $supplier->id;
                                            $cachedSuppliers[$supplierNameKey] = $supplierId;
                                        }
                                    }

                                    // Parse Variations
                                    $variations = $this->sheetsService->parseVariationsString($values['variations'] ?? null);

                                    $productId = $itemData['original_id'];
                                    $product = null;

                                    if ($productId) {
                                        // UPDATE EXISTING
                                        $product = \App\Models\Product::findOrFail($productId);
                                        $product->update([
                                            'name' => $values['name'],
                                            'brand_id' => $brandId,
                                            'category_id' => $categoryId,
                                            'supplier_id' => $supplierId,
                                            'barcode' => $values['barcode'] ?: null,
                                            'qr_code' => $values['qr_code'] ?: null,
                                            'code' => $values['code'] ?: null,
                                            'code_2' => $values['code_2'] ?: null,
                                            'sku' => $values['sku'] ?: null,
                                            'description' => $values['supplier_description'] ?: null,
                                            'price' => $values['price'],
                                            'variations' => $variations,
                                        ]);

                                        $bpQuantity = $values['quantity'];
                                        $quantityMode = $itemData['quantity_mode'] ?? 'overwrite';
                                        if ($quantityMode === 'add') {
                                            $existingBp = BranchProduct::where([
                                                'branch_id' => $branchId,
                                                'product_id' => $product->id,
                                            ])->first();
                                            if ($existingBp) {
                                                $bpQuantity = $existingBp->quantity + $values['quantity'];
                                            }
                                        }
                                        
                                        $bp = BranchProduct::updateOrCreate([
                                            'branch_id' => $branchId,
                                            'product_id' => $product->id,
                                        ], [
                                            'quantity' => $bpQuantity,
                                            'physical_location' => $values['physical_location'] ?: null,
                                            'reorder_level' => $values['reorder_level'] ?: 0,
                                            'variations' => $variations,
                                            'description' => $values['description'] ?: null,
                                        ]);

                                        $updatedCount++;
                                    } else {
                                        // CREATE NEW
                                        // Double check if product name exists globally or barcode/sku conflicts to reuse product globally
                                        if ($values['barcode']) {
                                            $product = \App\Models\Product::where('barcode', $values['barcode'])->first();
                                        }
                                        if (!$product && $values['qr_code']) {
                                            $product = \App\Models\Product::where('qr_code', $values['qr_code'])->first();
                                        }
                                        if (!$product && $values['sku']) {
                                            $product = \App\Models\Product::where('sku', $values['sku'])
                                                ->whereHas('supplier', function($q) use ($values) {
                                                    $q->where('name', $values['supplier_name']);
                                                })->first();
                                            if (!$product && empty($values['supplier_name'])) {
                                                $product = \App\Models\Product::where('sku', $values['sku'])
                                                    ->whereNull('supplier_id')
                                                    ->first();
                                            }
                                        }
                                        if (!$product) {
                                            $product = \App\Models\Product::where('name', $values['name'])->first();
                                        }

                                        if ($product) {
                                            // Re-use existing global product, just link to this branch and update details
                                            $product->update([
                                                'brand_id' => $brandId ?: $product->brand_id,
                                                'category_id' => $categoryId ?: $product->category_id,
                                                'supplier_id' => $supplierId ?: $product->supplier_id,
                                                'barcode' => $values['barcode'] ?: $product->barcode,
                                                'qr_code' => $values['qr_code'] ?: $product->qr_code,
                                                'sku' => $values['sku'] ?: $product->sku,
                                                'price' => $values['price'],
                                                'variations' => $variations ?: $product->variations,
                                                'description' => $values['supplier_description'] ?: $product->description,
                                            ]);
                                        } else {
                                            $product = \App\Models\Product::create([
                                                'name' => $values['name'],
                                                'brand_id' => $brandId,
                                                'category_id' => $categoryId,
                                                'supplier_id' => $supplierId,
                                                'barcode' => $values['barcode'] ?: null,
                                                'qr_code' => $values['qr_code'] ?: null,
                                                'code' => $values['code'] ?: null,
                                                'code_2' => $values['code_2'] ?: null,
                                                'sku' => $values['sku'] ?: null,
                                                'description' => $values['supplier_description'] ?: null,
                                                'price' => $values['price'],
                                                'variations' => $variations,
                                                'created_by' => $userId,
                                                'image_path' => 'new_product_import.png',
                                                'status' => 'active',
                                            ]);
                                        }

                                        $bpQuantity = $values['quantity'];
                                        $quantityMode = $itemData['quantity_mode'] ?? 'overwrite';
                                        if ($quantityMode === 'add') {
                                            $existingBp = BranchProduct::where([
                                                'branch_id' => $branchId,
                                                'product_id' => $product->id,
                                            ])->first();
                                            if ($existingBp) {
                                                $bpQuantity = $existingBp->quantity + $values['quantity'];
                                            }
                                        }
                                        
                                        BranchProduct::updateOrCreate([
                                            'branch_id' => $branchId,
                                            'product_id' => $product->id,
                                        ], [
                                            'quantity' => $bpQuantity,
                                            'physical_location' => $values['physical_location'] ?: null,
                                            'reorder_level' => $values['reorder_level'] ?: 0,
                                            'variations' => $variations,
                                            'description' => $values['description'] ?: null,
                                        ]);

                                        $createdCount++;
                                    }

                                    // Create Transfer Item
                                    if ($product) {
                                        \App\Models\TransferItem::create([
                                            'transfer_id' => $transfer->id,
                                            'product_id' => $product->id,
                                            'quantity' => $values['quantity'],
                                            'received_quantity' => $values['quantity'],
                                            'status' => 'ok',
                                        ]);
                                    }
                                }
                            }
                        });
                    });
                });
            });

            // Perform single bulk updates for the modified sheets to keep Google Sheets 100% in sync
            if ($createdCount > 0 || $updatedCount > 0) {
                // 1. Sync the active branch sheet in one bulk call
                $branch = Branch::findOrFail($branchId);
                $headers = [
                    'ID', 'Physical Location', 'Supplier', 'Barcode', 'QR Code',
                    'SKU', 'Category', 'Product Name', 'Brand', 'Code',
                    '2code', 'Variations', 'Description', 'Supplier Description',
                    'Reorder Level', 'Price', 'Quantity'
                ];

                $rows = [$headers];
                $branchProducts = BranchProduct::where('branch_id', $branchId)
                    ->with(['product.brand', 'product.category', 'product.supplier'])
                    ->get();

                foreach ($branchProducts as $bp) {
                    $product = $bp->product;
                    if (!$product) continue;

                    $rows[] = array_values([
                        $product->id,
                        $bp->physical_location,
                        $product->supplier?->name,
                        $product->barcode,
                        $product->qr_code,
                        $product->sku,
                        $product->category?->name,
                        $product->name,
                        $product->brand?->name,
                        $product->code,
                        $product->code_2,
                        $bp->variations ?? $product->variations,
                        $bp->description,
                        $product->description,
                        $bp->reorder_level,
                        $product->price,
                        $bp->quantity,
                    ]);
                }
                $this->sheetsService->updateSheetContent($branch->branch_name, array_values($rows));

                // 2. Sync the Reorders tab in one bulk call
                $reorderHeaders = ['ID', 'Product Name', 'Brand', 'Category', 'Supplier'];
                $branches = Branch::all();
                foreach ($branches as $b) {
                    $reorderHeaders[] = $b->branch_name . ' Stock';
                    $reorderHeaders[] = $b->branch_name . ' Reorder';
                }

                $reorderRows = [$reorderHeaders];
                $productsWithReorders = \App\Models\Product::whereHas('branches', function ($query) {
                    $query->whereNotNull('branch_products.reorder_level')
                          ->where('branch_products.reorder_level', '>', 0)
                          ->whereRaw('branch_products.quantity <= branch_products.reorder_level');
                })->with(['brand', 'category', 'supplier', 'branches'])->get();

                foreach ($productsWithReorders as $product) {
                    $row = [
                        $product->id,
                        $product->name,
                        $product->brand?->name,
                        $product->category?->name,
                        $product->supplier?->name,
                    ];

                    foreach ($branches as $b) {
                        $bp = $product->branches->where('id', $b->id)->first();
                        $row[] = $bp ? $bp->pivot->quantity : 0;
                        $row[] = $bp ? $bp->pivot->reorder_level : 0;
                    }
                    $reorderRows[] = $row;
                }
                $this->sheetsService->updateSheetContent('Reorders', array_values($reorderRows));

                // 3. Sync the Transfers tab in one bulk call
                $transferHeaders = ['Transfer ID', 'Source Branch', 'Destination', 'Status', 'Date', 'Readied By', 'Approved By', 'Received By', 'Items', 'Notes'];
                $transferRows = [$transferHeaders];
                $allTransfers = \App\Models\Transfer::with(['sourceBranch', 'destinationBranch', 'supplier', 'readiedBy', 'approvedBy', 'receivedBy', 'items.product'])->orderBy('created_at', 'desc')->get();

                foreach ($allTransfers as $t) {
                    $itemCount = $t->items->count();
                    $itemsSummary = $t->items->take(250)->map(function($item) {
                        $summary = '• ' . ($item->product->name ?? 'Unknown') . ' x ' . $item->quantity;
                        if ($item->received_quantity !== null) {
                            $summary .= " [Rec: {$item->received_quantity}]";
                        }
                        return $summary;
                    })->implode("\n");

                    if ($itemCount > 250) {
                        $itemsSummary .= "\n• ... and " . ($itemCount - 250) . " more items";
                    }

                    $destination = $t->destinationBranch?->branch_name ?? $t->supplier?->name ?? 'Unknown';

                    $transferRows[] = [
                        $t->id,
                        $t->sourceBranch?->branch_name,
                        $destination,
                        $t->status,
                        $t->created_at->format('Y-m-d H:i'),
                        $t->readiedBy?->name,
                        $t->approvedBy?->name,
                        $t->received_by_name ?? $t->receivedBy?->name,
                        $itemsSummary,
                        $t->notes,
                    ];
                }
                $this->sheetsService->updateSheetContent('Transfers', array_values($transferRows));
            }

            // Always rebuild and store the sheet snapshot for this branch
            // This ensures the snapshot is up-to-date even if no items were modified
            $branch = Branch::findOrFail($branchId);
            $freshRows = $this->sheetsService->getSheetContent($branch->branch_name);
            if (!empty($freshRows)) {
                array_shift($freshRows); // Remove header row
                $snapshot = $this->buildSheetSnapshot($freshRows);
                $branch->update(['sheet_snapshot' => $snapshot, 'last_sheet_sync_at' => now()]);
            }

            return response()->json([
                'success' => true,
                'message' => "Sync complete! Created {$createdCount} new products and updated {$updatedCount} existing products."
            ]);

        } catch (\Exception $e) {
            Log::error('Google Sheets savePulled error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to apply changes to database: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Match database quantities with the values from the Google Sheet exactly,
     * ignoring new products and bypassing transfers/sales/reorder updates.
     */
    public function matchQuantity(Request $request)
    {
        if (!auth()->user()->hasRole('System Administrator')) {
            return response()->json(['error' => 'Unauthorized. Only System Administrators can perform this action.'], 403);
        }

        ini_set('memory_limit', '1024M');
        set_time_limit(600); // 10 minutes for large syncs

        try {
            $user = auth()->user();
            $branchId = session()->has('active_branch_id')
                ? session('active_branch_id')
                : $user->branch_id;

            if (!$branchId) {
                return response()->json(['error' => 'No active branch selected.'], 400);
            }

            $branch = Branch::findOrFail($branchId);
            $sheetName = $branch->branch_name;

            $rows = $this->sheetsService->getSheetContent($sheetName);
            if (empty($rows)) {
                return response()->json(['error' => "Google Sheet tab for branch '{$sheetName}' is empty or could not be read."], 400);
            }

            // Exclude header row if first row matches headers
            $headers = array_shift($rows);
            if ($headers && strtolower($headers[0]) !== 'id' && strtolower($headers[0]) !== 'product name' && strtolower($headers[0]) !== 'product') {
                array_unshift($rows, $headers);
            }

            // Load all database products for this branch in memory for fast lookup
            $branchProducts = BranchProduct::where('branch_id', $branchId)
                ->with(['product.brand', 'product.category', 'product.supplier'])
                ->get();
            
            $dbProductsById = [];
            $dbProductsByBarcode = [];
            $dbProductsByQrCode = [];
            $dbProductsBySku = [];
            $dbProductsByName = [];

            foreach ($branchProducts as $bp) {
                $p = $bp->product;
                if (!$p) continue;
                
                $dbProductsById[$p->id] = $bp;
                if ($p->barcode) $dbProductsByBarcode[$p->barcode] = $bp;
                if ($p->qr_code) $dbProductsByQrCode[$p->qr_code] = $bp;
                if ($p->sku) {
                    $dbProductsBySku[$p->sku][] = $bp;
                }
                $dbProductsByName[strtolower(trim($p->name))] = $bp;
            }

            $cleanValue = function($val, $default = null) {
                if ($val === null || $val === '' || strtolower(trim($val)) === 'null') {
                    return $default;
                }
                return trim($val);
            };

            $updatedCount = 0;

            // Temporarily disable Google Sheet sync observers to prevent a high volume of
            // slow synchronous API requests and quota exceptions in the loop.
            \App\Models\Product::withoutEvents(function() use ($rows, $branchId, $dbProductsById, $dbProductsByBarcode, $dbProductsByQrCode, $dbProductsBySku, $dbProductsByName, $cleanValue, &$updatedCount) {
                \App\Models\BranchProduct::withoutEvents(function() use ($rows, $branchId, $dbProductsById, $dbProductsByBarcode, $dbProductsByQrCode, $dbProductsBySku, $dbProductsByName, $cleanValue, &$updatedCount) {
                    \Illuminate\Support\Facades\DB::transaction(function() use ($rows, $branchId, $dbProductsById, $dbProductsByBarcode, $dbProductsByQrCode, $dbProductsBySku, $dbProductsByName, $cleanValue, &$updatedCount) {
                        
                        foreach ($rows as $row) {
                            if (empty($row) || (count($row) === 1 && trim($row[0]) === '')) {
                                continue;
                            }

                            $sheetId = $cleanValue($row[0] ?? null);
                            $sheetPhysLoc = $cleanValue($row[1] ?? null);
                            $sheetSupplier = $cleanValue($row[2] ?? null);
                            $sheetBarcode = $cleanValue($row[3] ?? null);
                            $sheetQrCode = $cleanValue($row[4] ?? null);
                            $sheetSku = $cleanValue($row[5] ?? null);
                            $sheetCategory = $cleanValue($row[6] ?? null);
                            $sheetName = $cleanValue($row[7] ?? null);
                            $sheetBrand = $cleanValue($row[8] ?? null);
                            $sheetCode = $cleanValue($row[9] ?? null);
                            $sheetCode2 = $cleanValue($row[10] ?? null);
                            $sheetVariations = $cleanValue($row[11] ?? null);
                            $sheetDesc = $cleanValue($row[12] ?? null);
                            $sheetSupplierDesc = $cleanValue($row[13] ?? null);
                            
                            $rawReorder = $cleanValue($row[14] ?? null, 0);
                            $cleanReorder = preg_replace('/[^\d]/', '', $rawReorder);
                            $sheetReorder = is_numeric($cleanReorder) ? (int)$cleanReorder : 0;

                            $rawPrice = $cleanValue($row[15] ?? null, 0);
                            $cleanPrice = preg_replace('/[^\d\.]/', '', $rawPrice);
                            $sheetPrice = is_numeric($cleanPrice) ? (float)$cleanPrice : 0.0;

                            $rawQty = $cleanValue($row[16] ?? null, 0);
                            $cleanQty = preg_replace('/[^\d\-]/', '', $rawQty);
                            $sheetQty = is_numeric($cleanQty) ? (int)$cleanQty : 0;

                            if (!$sheetName) {
                                continue;
                            }

                            // Match with database product in this branch
                            $matchedBp = null;
                            if ($sheetId && is_numeric($sheetId) && isset($dbProductsById[(int)$sheetId])) {
                                $matchedBp = $dbProductsById[(int)$sheetId];
                              }

                            if (!$matchedBp) {
                                if ($sheetBarcode && isset($dbProductsByBarcode[$sheetBarcode])) {
                                    $matchedBp = $dbProductsByBarcode[$sheetBarcode];
                                } elseif ($sheetQrCode && isset($dbProductsByQrCode[$sheetQrCode])) {
                                    $matchedBp = $dbProductsByQrCode[$sheetQrCode];
                                } elseif ($sheetSku && isset($dbProductsBySku[$sheetSku])) {
                                    $sheetSupplierClean = strtolower(trim($sheetSupplier ?? ''));
                                    foreach ($dbProductsBySku[$sheetSku] as $bp) {
                                        $dbSupplierClean = strtolower(trim($bp->product->supplier?->name ?? ''));
                                        if ($dbSupplierClean === $sheetSupplierClean) {
                                            $matchedBp = $bp;
                                            break;
                                        }
                                    }
                                } elseif ($sheetName && isset($dbProductsByName[strtolower($sheetName)])) {
                                    $matchedBp = $dbProductsByName[strtolower($sheetName)];
                                }
                            }

                            $product = null;
                            if ($matchedBp) {
                                $product = $matchedBp->product;
                            } else {
                                // Double check if product exists globally in the database
                                if ($sheetId && is_numeric($sheetId)) {
                                    $product = \App\Models\Product::find((int)$sheetId);
                                }
                                if (!$product && $sheetBarcode) {
                                    $product = \App\Models\Product::where('barcode', $sheetBarcode)->first();
                                }
                                if (!$product && $sheetQrCode) {
                                    $product = \App\Models\Product::where('qr_code', $sheetQrCode)->first();
                                }
                                if (!$product && $sheetSku) {
                                    $product = \App\Models\Product::where('sku', $sheetSku)
                                        ->whereHas('supplier', function($q) use ($sheetSupplier) {
                                            $q->where('name', $sheetSupplier);
                                        })->first();
                                    if (!$product && empty($sheetSupplier)) {
                                        $product = \App\Models\Product::where('sku', $sheetSku)
                                            ->whereNull('supplier_id')
                                            ->first();
                                    }
                                }
                                if (!$product && $sheetName) {
                                    $product = \App\Models\Product::where('name', $sheetName)->first();
                                }
                            }

                            if ($product) {
                                // Update BranchProduct quantity and variations, etc. to match exactly
                                // "all products in db that exists must match exactly as it was in the google sheet"
                                $variations = $this->sheetsService->parseVariationsString($sheetVariations);
                                
                                BranchProduct::updateOrCreate([
                                    'branch_id' => $branchId,
                                    'product_id' => $product->id,
                                ], [
                                    'quantity' => (int)$sheetQty,
                                    'physical_location' => $sheetPhysLoc ?: null,
                                    'reorder_level' => $sheetReorder ?: 0,
                                    'variations' => $variations,
                                    'description' => $sheetDesc ?: null,
                                ]);

                                // Also update core product fields like name/price/barcode/qr/sku/code/code_2 if modified
                                $product->update([
                                    'name' => $sheetName,
                                    'price' => (float)$sheetPrice,
                                    'barcode' => $sheetBarcode ?: $product->barcode,
                                    'qr_code' => $sheetQrCode ?: $product->qr_code,
                                    'sku' => $sheetSku ?: $product->sku,
                                    'code' => $sheetCode ?: $product->code,
                                    'code_2' => $sheetCode2 ?: $product->code_2,
                                ]);

                                $updatedCount++;
                            }
                        }
                    });
                });
            });

            // Rebuild and store the sheet snapshot for this branch, so we don't trigger modifications next time
            $freshRows = $this->sheetsService->getSheetContent($branch->branch_name);
            if (!empty($freshRows)) {
                array_shift($freshRows); // Remove header row
                $snapshot = $this->buildSheetSnapshot($freshRows);
                $branch->update(['sheet_snapshot' => $snapshot, 'last_sheet_sync_at' => now()]);
            }

            return response()->json([
                'success' => true,
                'message' => "Successfully matched quantities and prices for {$updatedCount} existing products."
            ]);

        } catch (\Exception $e) {
            Log::error('Google Sheets matchQuantity error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to match quantities: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Reject an item and permanently delete its row from the Google Sheet.
     */
    public function rejectRow(Request $request)
    {
        if (!auth()->user()->hasRole('System Administrator')) {
            return response()->json(['error' => 'Unauthorized. Only System Administrators can perform this action.'], 403);
        }

        $request->validate([
            'sheet_row_index' => 'required|integer|min:2',
        ]);

        try {
            $user = auth()->user();
            $branchId = session()->has('active_branch_id')
                ? session('active_branch_id')
                : $user->branch_id;

            if (!$branchId) {
                return response()->json(['error' => 'No active branch selected.'], 400);
            }

            $branch = Branch::findOrFail($branchId);
            $sheetName = $branch->branch_name;
            $rowIndex = $request->sheet_row_index;

            $success = $this->sheetsService->deleteRowFromSheet($sheetName, $rowIndex);
            if (!$success) {
                return response()->json(['error' => "Google Sheet tab '{$sheetName}' not found or failed to delete row."], 400);
            }

            return response()->json([
                'success' => true,
                'message' => "Row {$rowIndex} successfully deleted from Google Sheet."
            ]);

        } catch (\Exception $e) {
            Log::error('Google Sheets rejectRow error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete row from Google Sheet: ' . $e->getMessage()], 500);
        }
    }
}
