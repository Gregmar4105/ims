<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Brand;
use App\Models\Branch;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    /**
     * Auto-deactivate products whose out-of-stock grace period has expired.
     * Called at query time instead of using a scheduled task.
     */
    protected function autoDeactivateExpiredProducts(): void
    {
        Product::where('status', 'active')
            ->whereNotNull('active_until_zero_days')
            ->whereNotNull('out_of_stock_since')
            ->whereRaw('DATE_ADD(out_of_stock_since, INTERVAL active_until_zero_days DAY) <= NOW()')
            ->update(['status' => 'inactive']);
    }

    /**
     * Update the out_of_stock_since timestamp for a product based on total stock.
     */
    protected function updateOutOfStockTimestamp(Product $product): void
    {
        $totalStock = $product->branches()->sum('branch_products.quantity');

        if ($totalStock <= 0 && is_null($product->out_of_stock_since)) {
            $product->update(['out_of_stock_since' => now()]);
        } elseif ($totalStock > 0 && !is_null($product->out_of_stock_since)) {
            $product->update(['out_of_stock_since' => null]);
        }
    }

    /**
     * Resolve the target branch ID for the current user.
     * System Admins use the session-stored active branch; others use their own branch.
     */
    protected function resolveTargetBranchId($user, bool $isSystemAdmin): ?int
    {
        if ($isSystemAdmin) {
            return session('active_branch_id', $user->branch_id);
        }
        return $user->branch_id;
    }

    protected function buildFilteredProductQuery(Request $request, $user, $isSystemAdmin, &$filterBranch, &$filterBrand, &$filterCategory, &$filterStock, &$search)
    {
        $search = $request->query('search');
        $filterBranch = $request->query('branch');
        
        // Default to session branch for System Admins if no explicit filter is set in request
        if ($isSystemAdmin && !$request->has('branch')) {
            $sessionBranchId = session('active_branch_id');
            if ($sessionBranchId) {
                $sessionBranch = Branch::find($sessionBranchId);
                if ($sessionBranch) {
                    $filterBranch = $sessionBranch->branch_name;
                }
            }
        }

        $filterBrand = $request->query('brand');
        $filterCategory = $request->query('category');
        $filterStock = $request->query('stock');

        $query = Product::with(['brand', 'category', 'creator', 'supplier']);

        if (!$isSystemAdmin) {
            if (!$user->branch_id) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereHas('branches', function ($q) use ($user) {
                    $q->where('branches.id', $user->branch_id);
                });
                $query->with(['branches' => function ($q) use ($user) {
                    $q->where('branches.id', $user->branch_id);
                }]);
            }
        } else {
            $query->with('branches');
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('qr_code', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('code_2', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  // Exact matches for codes are prioritized by being part of the same OR group
                  ->orWhere('barcode', $search)
                  ->orWhere('qr_code', $search)
                  ->orWhere('code', $search)
                  ->orWhere('sku', $search)
                  ->orWhereHas('brand', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('category', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if ($filterBranch && $filterBranch !== 'all') {
            $query->where(function ($q) use ($filterBranch, $search, $isSystemAdmin) {
                $q->whereHas('branches', function ($bq) use ($filterBranch) {
                    $bq->where('branch_name', $filterBranch);
                });

                // If searching as System Admin, allow exact matches from other branches to surface
                if ($isSystemAdmin && $search) {
                    $q->orWhere('barcode', $search)
                      ->orWhere('sku', $search)
                      ->orWhere('code', $search);
                }
            });
        }

        if ($filterBrand && $filterBrand !== 'all') {
            $query->whereHas('brand', function ($q) use ($filterBrand) {
                $q->where('name', $filterBrand);
            });
        }

        if ($filterCategory && $filterCategory !== 'all') {
            $query->whereHas('category', function ($q) use ($filterCategory) {
                $q->where('name', 'like', "{$filterCategory}%");
            });
        }


        if ($filterStock && $filterStock !== 'all') {
            if (!$isSystemAdmin && $user->branch_id) {
                $query->whereHas('branches', function ($q) use ($user, $filterStock) {
                    $q->where('branches.id', $user->branch_id);
                    if ($filterStock === 'in_stock') {
                        $q->where('branch_products.quantity', '>', 0);
                    } elseif ($filterStock === 'out_of_stock') {
                        $q->where('branch_products.quantity', '=', 0);
                    } elseif ($filterStock === 'low_stock') {
                        $q->where('branch_products.quantity', '>', 0)->where('branch_products.quantity', '<=', 5);
                    }
                });
            } elseif ($isSystemAdmin && $filterBranch && $filterBranch !== 'all') {
                 $query->whereHas('branches', function ($q) use ($filterBranch, $filterStock) {
                    $q->where('branch_name', $filterBranch);
                    if ($filterStock === 'in_stock') {
                        $q->where('branch_products.quantity', '>', 0);
                    } elseif ($filterStock === 'out_of_stock') {
                        $q->where('branch_products.quantity', '=', 0);
                    } elseif ($filterStock === 'low_stock') {
                        $q->where('branch_products.quantity', '>', 0)->where('branch_products.quantity', '<=', 5);
                    }
                });
            }
        }

        return $query;
    }

    protected function transformProductForView($product, $isSystemAdmin, $user, $filterBranch) {
        if (!$isSystemAdmin && $user->branch_id) {
            $branchData = $product->branches->first();
            $product->quantity = $branchData ? $branchData->pivot->quantity : 0;
            $product->physical_location = $branchData ? $branchData->pivot->physical_location : null;
            if ($branchData) {
                $product->description = $branchData->pivot->description ?? $product->description;
                $product->variations = $branchData->pivot->variations ?? $product->variations;
            }
        } else {
            if ($filterBranch && $filterBranch !== 'all') {
                $branchData = $product->branches->firstWhere('branch_name', $filterBranch);
                $product->quantity = $branchData ? $branchData->pivot->quantity : 0;
                $product->physical_location = $branchData ? $branchData->pivot->physical_location : null;
                
                if ($branchData) {
                    $product->description = $branchData->pivot->description ?? $product->description;
                    $product->variations = $branchData->pivot->variations ?? $product->variations;
                }
            } else {
                $product->quantity = $product->branches->sum('pivot.quantity');
            }
        }
        return $product;
    }

    public function index(Request $request)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        // Auto-deactivate products whose grace period has expired
        $this->autoDeactivateExpiredProducts();
        
        $filterBranch = $filterBrand = $filterCategory = $filterStock = $search = null;
        $filterStatus = $request->query('status');
        $filterClearance = $request->query('clearance');

        $query = $this->buildFilteredProductQuery($request, $user, $isSystemAdmin, $filterBranch, $filterBrand, $filterCategory, $filterStock, $search);

        // Apply clearance filter
        if ($filterClearance === 'yes') {
            $query->whereNotNull('clearance_price')
                  ->where(function($q) {
                      $q->whereNull('clearance_until')
                        ->orWhere('clearance_until', '>', now());
                  });
        } elseif ($filterClearance === 'no') {
            $query->where(function($q) {
                $q->whereNull('clearance_price')
                  ->orWhere('clearance_until', '<=', now());
            });
        }

        // Apply status filter
        if ($filterStatus && $filterStatus !== 'all') {
            $query->where('status', $filterStatus);
        }

        $products = $query->latest()->paginate(12)->withQueryString();

        // Transform products to include branch-specific quantity for the view
        $products->getCollection()->transform(function ($product) use ($isSystemAdmin, $user, $filterBranch) {
            return $this->transformProductForView($product, $isSystemAdmin, $user, $filterBranch);
        });

        // Get options for filters
        $branches = \App\Models\Branch::pluck('branch_name')->unique()->values();
        
        // Fetch brands/categories based on visibility rules
        $brandsQuery = Brand::where('status', 'Active');
        $categoriesQuery = Category::where('status', 'Active');

        if (!$isSystemAdmin && $user->branch_id) {
            $brandsQuery->where('branch_id', $user->branch_id);
            $categoriesQuery->where('branch_id', $user->branch_id);
        }

        $brands = $brandsQuery->pluck('name')->unique()->values();
        $categories = $categoriesQuery->pluck('name')->unique()->values();

        $suppliers = \App\Models\Supplier::all(['id', 'name']);

        return Inertia::render('Products/Index', [
            'products' => $products,
            'filters' => [
                'search' => $search,
                'branch' => $filterBranch,
                'brand' => $filterBrand,
                'category' => $filterCategory,
                'stock' => $filterStock,
                'status' => $filterStatus,
                'clearance' => $filterClearance,
            ],
            'options' => [
                'branches' => $branches,
                'brands' => $brands,
                'categories' => $categories,
            ],
            'isSystemAdmin' => $isSystemAdmin,
            'suppliers' => $suppliers,
        ]);
    }

    public function print(Request $request)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');
        
        $filterBranch = $filterBrand = $filterCategory = $filterStock = $search = null;

        $query = $this->buildFilteredProductQuery($request, $user, $isSystemAdmin, $filterBranch, $filterBrand, $filterCategory, $filterStock, $search);

        // Get all matching products
        $products = $query->latest()->get();

        // Transform products to include branch-specific quantity for the view
        $products->transform(function ($product) use ($isSystemAdmin, $user, $filterBranch) {
            return $this->transformProductForView($product, $isSystemAdmin, $user, $filterBranch);
        });

        // Use the branch name from auth user or filter, to show on the print sheet
        $branchName = 'All Branches';
        if (!$isSystemAdmin && $user->branch) {
            $branchName = $user->branch->branch_name;
        } elseif ($isSystemAdmin && $filterBranch && $filterBranch !== 'all') {
            $branchName = $filterBranch;
        }

        return Inertia::render('Products/Print', [
            'products' => $products,
            'branchName' => $branchName,
            'isSystemAdmin' => $isSystemAdmin,
        ]);
    }

    public function show(Product $product)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');
        
        $product->load(['brand', 'category', 'supplier', 'creator', 'branches' => function($q) use ($user, $isSystemAdmin) {
            if (!$isSystemAdmin && $user->branch_id) {
                $q->where('branches.id', $user->branch_id);
            }
        }]);

        // Transform for specific view logic if needed (similar to index)
        if (!$isSystemAdmin && $user->branch_id) {
            $branchData = $product->branches->first();
            $product->quantity = $branchData ? $branchData->pivot->quantity : 0;
            $product->physical_location = $branchData ? $branchData->pivot->physical_location : null;
            if ($branchData) {
                $product->description = $branchData->pivot->description ?? $product->description;
                $product->variations = $branchData->pivot->variations ?? $product->variations;
                $product->reorder_level = $branchData->pivot->reorder_level ?? 0;
            } else {
                $product->reorder_level = 0;
            }
        } else {
             // Admin sees aggregate or raw
             $product->quantity = $product->branches->sum('pivot.quantity');
             $product->reorder_level = $product->branches->sum('pivot.reorder_level');
        }

        return Inertia::render('Products/Show', [
            'product' => $product,
        ]);
    }

    public function create()
    {
        $user = auth()->user();
        $branchId = $user->branch_id;
        $isSystemAdmin = $user->hasRole('System Administrator');

        // For System Admin, use the session-stored active branch
        $targetBranchId = $this->resolveTargetBranchId($user, $isSystemAdmin);

        if (!$targetBranchId && !$isSystemAdmin) {
            return Inertia::render('Products/Create', [
                'brands' => [],
                'categories' => [],
                'isSystemAdmin' => false,
                'currentBranch' => null,
            ]);
        }

        if ($isSystemAdmin) {
            $brands = Brand::where('status', 'Active')->get()
                ->sortByDesc(function ($brand) use ($targetBranchId) {
                    return $brand->branch_id === $targetBranchId ? 1 : 0;
                })
                ->unique('name')
                ->values();

            $categories = Category::where('status', 'Active')->get()
                ->sortByDesc(function ($category) use ($targetBranchId) {
                    return $category->branch_id === $targetBranchId ? 1 : 0;
                })
                ->unique('name')
                ->values();
        } else {
            $brands = Brand::where('status', 'Active')
                ->where('branch_id', $branchId)
                ->get();

            $categories = Category::where('status', 'Active')
                ->where('branch_id', $branchId)
                ->get();
        }

        $suppliers = \App\Models\Supplier::all(['id', 'name']);

        // Get current branch info for display
        $currentBranch = $targetBranchId ? Branch::find($targetBranchId) : null;

        return Inertia::render('Products/Create', [
            'brands' => $brands,
            'categories' => $categories,
            'suppliers' => $suppliers,
            'isSystemAdmin' => $isSystemAdmin,
            'currentBranch' => $currentBranch ? [
                'id' => $currentBranch->id,
                'branch_name' => $currentBranch->branch_name,
            ] : null,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:products,name',
            'code' => 'nullable|string|max:255',
            'code_2' => 'nullable|string|max:255',
            'sku' => 'nullable|string|max:255|unique:products,sku',
            'brand_id' => 'required|exists:brands,id',
            'category_id' => 'required|exists:categories,id',
            'quantity' => 'required|integer|min:0',
            'physical_location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'variations' => 'nullable|array',
            'variations.*.name' => 'required|string',
            'variations.*.options' => 'required|string', // Comma separated
            'image' => 'required|image|max:2048', // 2MB Max
            'price' => 'nullable|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'reorder_level' => 'nullable|integer|min:0',
            'active_until_zero_days' => 'nullable|integer|min:0',
        ]);

        // Resolve target branch: System Admin uses session branch, others use their own
        $targetBranchId = $this->resolveTargetBranchId($user, $isSystemAdmin);
        
        if (!$targetBranchId && !$isSystemAdmin) {
            return back()->withErrors(['branch' => 'You must be assigned to a branch to add products.']);
        }

        // Get branch info for image path
        $targetBranch = $targetBranchId ? Branch::find($targetBranchId) : null;
        $branchName = $targetBranch ? $targetBranch->branch_name : 'System';
        $brand = Brand::find($validated['brand_id']);
        $category = Category::find($validated['category_id']);
        
        $safeBranch = str_replace(' ', '', $branchName);
        $safeBrand = str_replace(' ', '', $brand ? $brand->name : 'Unknown');
        $safeCategory = str_replace(' ', '', $category ? $category->name : 'Unknown');
        $safeProduct = str_replace(' ', '-', $validated['name']);
        
        $extension = $request->file('image')->getClientOriginalExtension();
        $filename = "{$safeBranch}.{$safeBrand}.{$safeCategory}.{$safeProduct}.{$extension}";
        
        $folderPath = 'products/' . $branchName; // Keep original branch name for folder

        // Handle Image Upload
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            // Store in public disk
            $path = $file->storeAs($folderPath, $filename, 'public');
            $validated['image_path'] = $path;
        }

        DB::transaction(function () use ($validated, $user, $targetBranchId) {
            // Create Global Product
            $product = Product::create([
                'brand_id' => $validated['brand_id'],
                'category_id' => $validated['category_id'],

                'name' => $validated['name'],
                'code' => $validated['code'] ?? null,
                'code_2' => $validated['code_2'] ?? null,
                'sku' => $validated['sku'] ?? null,
                'description' => $validated['description'] ?? null,
                'variations' => $validated['variations'] ?? null,
                'image_path' => $validated['image_path'],
                'created_by' => $user->id,
                // Barcode and QR code will be generated manually via /qr-barcodes
                'barcode' => null,
                'qr_code' => null,
                'price' => $validated['price'] ?? null,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'status' => 'active',
                'active_until_zero_days' => $validated['active_until_zero_days'] ?? null,
                'out_of_stock_since' => ($validated['quantity'] <= 0) ? now() : null,
            ]);

            // Create Branch Product (Stock) using the resolved target branch
            if ($targetBranchId) {
                \App\Models\BranchProduct::create([
                    'branch_id' => $targetBranchId,
                    'product_id' => $product->id,
                    'quantity' => $validated['quantity'],
                    'physical_location' => $validated['physical_location'] ?? null,
                    'description' => $validated['description'] ?? null,
                    'variations' => $validated['variations'] ?? null,
                    'reorder_level' => $validated['reorder_level'] ?? 0,
                ]);
            }
        });

        return redirect()->route('products.show', $product->id)->with('success', 'Product added successfully.');
    }

    public function edit(Product $product)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        // Resolve target branch for loading branch-specific data
        $targetBranchId = $this->resolveTargetBranchId($user, $isSystemAdmin);

        // Authorization: System Admin or has stock in branch
        if (!$isSystemAdmin) {
            $hasStock = $product->branches()->where('branch_id', $user->branch_id)->exists();
            if (!$hasStock) {
                abort(403, 'Unauthorized action.');
            }
        }

        // Load branch specific data for the form (works for both admin and non-admin)
        $branchProduct = $product->branches()->where('branch_id', $targetBranchId)->first();
        $notInBranch = !$branchProduct;
        
        $product->quantity = $branchProduct ? $branchProduct->pivot->quantity : 0;
        $product->physical_location = $branchProduct ? $branchProduct->pivot->physical_location : '';
        if ($branchProduct) {
            $product->description = $branchProduct->pivot->description ?? $product->description;
            $product->variations = $branchProduct->pivot->variations ?? $product->variations;
            $product->reorder_level = $branchProduct->pivot->reorder_level ?? 0;
        } else {
            $product->reorder_level = 0;
        }

        $brands = Brand::where('status', 'Active')->get();
        $categories = Category::where('status', 'Active')->get();

        $suppliers = \App\Models\Supplier::all(['id', 'name']);

        // Get current branch info for display
        $currentBranch = $targetBranchId ? Branch::find($targetBranchId) : null;

        return Inertia::render('Products/Edit', [
            'product' => $product,
            'brands' => $brands,
            'categories' => $categories,
            'suppliers' => $suppliers,
            'isSystemAdmin' => $isSystemAdmin,
            'currentBranch' => $currentBranch ? [
                'id' => $currentBranch->id,
                'branch_name' => $currentBranch->branch_name,
            ] : null,
            'notInBranch' => $notInBranch,
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('products', 'name')->ignore($product->id)],
            'code' => 'nullable|string|max:255',
            'code_2' => 'nullable|string|max:255',
            'sku' => ['nullable', 'string', 'max:255', Rule::unique('products', 'sku')->ignore($product->id)],
            'barcode' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('products', 'barcode')->ignore($product->id),
                Rule::unique('products', 'qr_code')->ignore($product->id),
            ],
            'qr_code' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('products', 'barcode')->ignore($product->id),
                Rule::unique('products', 'qr_code')->ignore($product->id),
            ],

            'brand_id' => 'required|exists:brands,id',
            'category_id' => 'required|exists:categories,id',
            'quantity' => 'required|integer|min:0',
            'physical_location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'variations' => 'nullable|array',
            'variations.*.name' => 'required|string',
            'variations.*.options' => 'required|string',
            'image' => 'nullable|image|max:2048',
            'price' => 'nullable|numeric|min:0', 
            'supplier_id' => 'nullable|exists:suppliers,id',
            'reorder_level' => 'nullable|integer|min:0',
            'active_until_zero_days' => 'nullable|integer|min:0',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        // Handle Image Upload if provided
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($product->image_path && Storage::disk('public')->exists($product->image_path)) {
                Storage::disk('public')->delete($product->image_path);
            }

            // Re-construct filename logic... (simplified for brevity)
            $path = $request->file('image')->store('products', 'public');
            $validated['image_path'] = $path;
        }

        // Resolve target branch
        $targetBranchId = $this->resolveTargetBranchId($user, $isSystemAdmin);

        DB::transaction(function () use ($product, $validated, $user, $isSystemAdmin, $targetBranchId) {
            // Update Global Product Details
            $product->update([
                'name' => $validated['name'],
                'code' => $validated['code'] ?? null,
                'code_2' => $validated['code_2'] ?? null,
                'sku' => $validated['sku'] ?? null,
                'barcode' => $validated['barcode'] ?? null,
                'qr_code' => $validated['qr_code'] ?? null,

                'brand_id' => $validated['brand_id'],
                'category_id' => $validated['category_id'],
                'description' => $validated['description'] ?? null,
                'variations' => $validated['variations'] ?? null,
                'image_path' => $validated['image_path'] ?? $product->image_path,
                'price' => $validated['price'] ?? $product->price,
                'supplier_id' => $validated['supplier_id'] ?? $product->supplier_id,
                'active_until_zero_days' => $validated['active_until_zero_days'] ?? null,
                'status' => $validated['status'] ?? $product->status,
            ]);

            // Update Branch Stock — works for BOTH System Admin and Branch Admin
            if ($targetBranchId) {
                \App\Models\BranchProduct::updateOrCreate(
                    [
                        'branch_id' => $targetBranchId,
                        'product_id' => $product->id,
                    ],
                    [
                        'quantity' => $validated['quantity'],
                        'physical_location' => $validated['physical_location'] ?? null,
                        'description' => $validated['description'] ?? null,
                        'variations' => $validated['variations'] ?? null,
                        'reorder_level' => $validated['reorder_level'] ?? 0,
                    ]
                );
            }

            // Update out_of_stock_since timestamp
            $this->updateOutOfStockTimestamp($product->fresh());
        });

        return redirect()->route('products.show', $product->id)->with('success', 'Product updated successfully.');
    }

    public function toggleStatus(Product $product)
    {
        $newStatus = $product->status === 'active' ? 'inactive' : 'active';
        
        $product->update([
            'status' => $newStatus,
            // If reactivating, clear out_of_stock_since so the timer resets
            'out_of_stock_since' => $newStatus === 'active' ? null : $product->out_of_stock_since,
        ]);

        $label = $newStatus === 'active' ? 'activated' : 'deactivated';
        return back()->with('success', "Product {$label} successfully.");
    }

    public function bulkDestroy(Request $request)
    {
        $ids = $request->input('ids', []);
        if (empty($ids)) {
            return back()->with('error', 'No products selected.');
        }

        DB::transaction(function () use ($ids) {
            $products = Product::whereIn('id', $ids)->get();
            foreach ($products as $product) {
                // Delete image if exists
                if ($product->image_path && Storage::disk('public')->exists($product->image_path)) {
                    Storage::disk('public')->delete($product->image_path);
                }

                // Release unique identifiers to allow re-adding
                $timestamp = time();
                $product->update([
                    'name' => Str::limit($product->name, 200) . " (deleted-{$timestamp})",
                    'sku' => $product->sku ? $product->sku . "-del-{$timestamp}" : null,
                    'barcode' => $product->barcode ? $product->barcode . "-del-{$timestamp}" : null,
                    'qr_code' => $product->qr_code ? $product->qr_code . "-del-{$timestamp}" : null,
                    'code' => $product->code ? $product->code . "-del-{$timestamp}" : null,
                    'code_2' => $product->code_2 ? $product->code_2 . "-del-{$timestamp}" : null,
                ]);

                // Delete pivot and product
                $product->branches()->detach();
                $product->delete();
            }
        });

        return redirect()->route('products.index')->with('success', 'Selected products deleted successfully.');
    }
    public function bulkClearanceSale(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:products,id',
            'clearance_price' => 'required|numeric|min:0',
            'duration_days' => 'required|integer|min:1',
        ]);

        $ids = $validated['ids'];
        $clearanceUntil = now()->addDays((int)$validated['duration_days']);

        Product::whereIn('id', $ids)->update([
            'clearance_price' => $validated['clearance_price'],
            'clearance_until' => $clearanceUntil,
        ]);

        return redirect()->route('products.index')->with('success', 'Selected products added to clearance sale.');
    }
}
