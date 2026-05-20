<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use App\Models\Product;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Supplier;
use App\Models\BranchProduct;
use App\Models\AiImportLog;
use Carbon\Carbon;

class ImportTransferController extends Controller
{
    public function index()
    {
        // System-wide DB tracking
        $importMinuteUsage = AiImportLog::where('created_at', '>=', now()->subMinute())->count();
        $importDailyUsage = AiImportLog::whereDate('created_at', today())->count();

        return Inertia::render('Transfers/Import/Index', [
            'brands' => Brand::orderBy('name')->get(),
            'categories' => Category::orderBy('name')->get(),
            'suppliers' => Supplier::orderBy('name')->get(),
            'importDailyUsage' => $importDailyUsage,
            'importMinuteUsage' => $importMinuteUsage,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:10240', // Max 10MB
        ]);

        // Rate Limiting Logic (System-wide via DB)
        $importMinuteUsage = AiImportLog::where('created_at', '>=', now()->subMinute())->count();
        $importDailyUsage = AiImportLog::whereDate('created_at', today())->count();

        // Check daily limit (20)
        if ($importDailyUsage >= 20) {
            return back()->with('error', 'System daily limit of 20 AI imports reached. Please try again tomorrow.');
        }

        // Check minute limit (5)
        if ($importMinuteUsage >= 5) {
            return back()->with('error', "Too many requests. Please wait 60 seconds before trying again.");
        }

        $image = $request->file('image');
        
        // Send to n8n Webhook
        try {
            $response = Http::attach(
                'data', file_get_contents($image), $image->getClientOriginalName()
            )->post(config('services.n8n.webhook_url'));

            if ($response->successful()) {
                $raw = $response->json();
                // Handle n8n output structure: [{ "output": { "inventory_items": [...] } }]
                // Or sometimes it might be just the object. Check both.
                $items = $raw[0]['output']['inventory_items']
                    ?? $raw['output']['inventory_items']
                    ?? $raw['inventory_items']
                    ?? [];

                // Store the scanned image in the public imports folder
                $storedPath = $image->store('imports', 'public');

                $branchId = auth()->user()->branch_id;
                
                if (is_array($items)) {
                    foreach ($items as &$item) {
                        $item['exists_in_branch'] = false;
                        if (isset($item['item_name']) && $branchId) {
                            $product = Product::with(['branches' => function ($query) use ($branchId) {
                                $query->where('branches.id', $branchId);
                            }])->where('name', 'like', '%' . trim($item['item_name']) . '%')->first();

                            if ($product && $product->branches->isNotEmpty()) {
                                $item['exists_in_branch'] = true;
                                $item['product_id'] = $product->id;
                                $item['brand_id'] = (string) $product->brand_id;
                                $item['category_id'] = (string) $product->category_id;
                                $item['supplier_id'] = (string) $product->supplier_id;
                                $item['price'] = $product->price;
                                $item['code'] = $product->code;
                                $item['code_2'] = $product->code_2;
                                $item['sku'] = $product->sku;
                                
                                $branchProduct = $product->branches->first()->pivot;
                                $item['current_stock'] = $branchProduct->quantity;
                                $item['physical_location'] = $branchProduct->physical_location;
                            } else {
                                $item['exists_in_branch'] = false;
                                $item['current_stock'] = 0;
                            }
                        }
                    }
                }

                // Log the successful import
                AiImportLog::create([
                    'user_id' => auth()->id()
                ]);

                // Recalculate usage for view
                $importDailyUsage = AiImportLog::whereDate('created_at', today())->count();
                $importMinuteUsage = AiImportLog::where('created_at', '>=', now()->subMinute())->count();

                return Inertia::render('Transfers/Import/Index', [
                    'analysis_result' => ['inventory_items' => $items],
                    'scanned_image_path' => $storedPath,
                    'success' => 'Analysis complete. Found ' . count($items) . ' items.',
                    'brands' => Brand::orderBy('name')->get(),
                    'categories' => Category::orderBy('name')->get(),
                    'suppliers' => Supplier::orderBy('name')->get(),
                    'importDailyUsage' => $importDailyUsage,
                    'importMinuteUsage' => $importMinuteUsage,
                ]);
            } else {
                return back()->with('error', 'Failed to process image. Status: ' . $response->status());
            }

        } catch (\Exception $e) {
            return back()->with('error', 'Error communicating with AI service: ' . $e->getMessage());
        }
    }

    public function updateStock(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity_added' => 'required|integer|min:1',
            'image_path' => 'nullable|string|max:255',
            'attach_image' => 'nullable|boolean',
        ]);

        $branchId = auth()->user()->branch_id;

        $branchProduct = BranchProduct::where('product_id', $request->product_id)
            ->where('branch_id', $branchId)
            ->first();

        if ($branchProduct) {
            $branchProduct->quantity += $request->quantity_added;
            $branchProduct->save();

            // Handle attaching scanned image to existing product
            if ($request->attach_image && !empty($request->image_path) && \Illuminate\Support\Facades\Storage::disk('public')->exists($request->image_path)) {
                $product = Product::find($request->product_id);
                if ($product) {
                    // Delete old image if it is not default and exists
                    if ($product->image_path && $product->image_path !== 'new_product_import.png' && \Illuminate\Support\Facades\Storage::disk('public')->exists($product->image_path)) {
                        \Illuminate\Support\Facades\Storage::disk('public')->delete($product->image_path);
                    }

                    // Copy the scanned image to a unique filename
                    $extension = pathinfo($request->image_path, PATHINFO_EXTENSION);
                    $newFilename = 'products/' . uniqid('prod_', true) . '.' . $extension;
                    if (\Illuminate\Support\Facades\Storage::disk('public')->copy($request->image_path, $newFilename)) {
                        $product->image_path = $newFilename;
                        $product->save();
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Stock updated successfully.',
                'new_stock' => $branchProduct->quantity
            ]);
        }

        return response()->json(['success' => false, 'message' => 'Product not found in this branch.'], 404);
    }

    public function bulkStore(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.category_name' => 'required|string|max:255',
            'items.*.brand_name' => 'required|string|max:255',
            'items.*.supplier_name' => 'nullable|string|max:255',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.quantity' => 'required|integer|min:0',
            'items.*.code' => 'nullable|string|max:255',
            'items.*.code_2' => 'nullable|string|max:255',
            'items.*.sku' => 'nullable|string|max:255',
            'items.*.barcode' => 'nullable|string|max:255',
            'items.*.qr_code' => 'nullable|string|max:255',
            'items.*.physical_location' => 'nullable|string|max:255',
            'items.*.reorder_level' => 'nullable|integer|min:0',
            'items.*.image_path' => 'nullable|string|max:255',
        ]);

        $branchId = auth()->user()->branch_id;
        $userId = auth()->id();

        foreach ($request->items as $item) {
            // Resolve or Create Brand
            $brand = Brand::where('name', $item['brand_name'])
                ->where(function($q) use ($branchId) {
                    $q->where('branch_id', $branchId)->orWhereNull('branch_id');
                })
                ->first();
            
            if (!$brand) {
                $brand = Brand::create([
                    'name' => $item['brand_name'],
                    'slug' => \Illuminate\Support\Str::slug($item['brand_name']),
                    'status' => 'Active',
                    'branch_id' => $branchId,
                    'created_by' => $userId,
                ]);
            }

            // Resolve or Create Category
            $category = Category::where('name', $item['category_name'])
                ->where(function($q) use ($branchId) {
                    $q->where('branch_id', $branchId)->orWhereNull('branch_id');
                })
                ->first();
            
            if (!$category) {
                $category = Category::create([
                    'name' => $item['category_name'],
                    'slug' => \Illuminate\Support\Str::slug($item['category_name']),
                    'status' => 'Active',
                    'branch_id' => $branchId,
                    'created_by' => $userId,
                ]);
            }

            // Resolve or Create Supplier
            $supplierId = null;
            if (!empty($item['supplier_name'])) {
                $supplier = Supplier::where('name', $item['supplier_name'])->first();
                if (!$supplier) {
                    $supplier = Supplier::create(['name' => $item['supplier_name']]);
                }
                $supplierId = $supplier->id;
            }

            // Copy file if image_path is provided and exists
            $imagePath = 'new_product_import.png';
            if (!empty($item['image_path']) && \Illuminate\Support\Facades\Storage::disk('public')->exists($item['image_path'])) {
                $extension = pathinfo($item['image_path'], PATHINFO_EXTENSION);
                $newFilename = 'products/' . uniqid('prod_', true) . '.' . $extension;
                if (\Illuminate\Support\Facades\Storage::disk('public')->copy($item['image_path'], $newFilename)) {
                    $imagePath = $newFilename;
                }
            }

            $product = Product::create([
                'name' => $item['item_name'],
                'category_id' => $category->id,
                'brand_id' => $brand->id,
                'supplier_id' => $supplierId,
                'price' => $item['price'],
                'code' => $item['code'] ?? null,
                'code_2' => $item['code_2'] ?? null,
                'sku' => $item['sku'] ?? null,
                'barcode' => $item['barcode'] ?? null,
                'qr_code' => $item['qr_code'] ?? null,
                'created_by' => $userId,
                'image_path' => $imagePath,
                'status' => 'active',
            ]);

            BranchProduct::create([
                'branch_id' => $branchId,
                'product_id' => $product->id,
                'quantity' => $item['quantity'],
                'physical_location' => $item['physical_location'] ?? null,
                'reorder_level' => $item['reorder_level'] ?? 0,
            ]);
        }

        return redirect()->route('products.index')->with('success', 'Successfully imported and created new products.');
    }
}
