<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Brand;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    protected function buildFilteredProductQuery(Request $request, $user, $isSystemAdmin, &$filterBranch, &$filterBrand, &$filterCategory, &$filterStock, &$search)
    {
        $search = $request->query('search');
        $filterBranch = $request->query('branch');
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
                  ->orWhereHas('brand', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('category', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if ($filterBranch && $filterBranch !== 'all') {
            $query->whereHas('branches', function ($q) use ($filterBranch) {
                $q->where('branch_name', $filterBranch);
            });
        }

        if ($filterBrand && $filterBrand !== 'all') {
            $query->whereHas('brand', function ($q) use ($filterBrand) {
                $q->where('name', $filterBrand);
            });
        }

        if ($filterCategory && $filterCategory !== 'all') {
            $query->whereHas('category', function ($q) use ($filterCategory) {
                $q->where('name', $filterCategory);
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
        
        $filterBranch = $filterBrand = $filterCategory = $filterStock = $search = null;

        $query = $this->buildFilteredProductQuery($request, $user, $isSystemAdmin, $filterBranch, $filterBrand, $filterCategory, $filterStock, $search);

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

        if (!$branchId && !$isSystemAdmin) {
            return Inertia::render('Products/Create', [
                'brands' => [],
                'categories' => [],
            ]);
        }

        if ($isSystemAdmin) {
            $brands = Brand::where('status', 'Active')->get()
                ->sortByDesc(function ($brand) use ($branchId) {
                    return $brand->branch_id === $branchId ? 1 : 0;
                })
                ->unique('name')
                ->values();

            $categories = Category::where('status', 'Active')->get()
                ->sortByDesc(function ($category) use ($branchId) {
                    return $category->branch_id === $branchId ? 1 : 0;
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

        return Inertia::render('Products/Create', [
            'brands' => $brands,
            'categories' => $categories,
            'suppliers' => $suppliers,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:255',
            'code_2' => 'nullable|string|max:255',
            'sku' => 'nullable|string|max:255',
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
        ]);

        $isSystemAdmin = $user->hasRole('System Administrator');
        
        if (!$user->branch && !$isSystemAdmin) {
            return back()->withErrors(['branch' => 'You must be assigned to a branch to add products.']);
        }

        $branchName = $user->branch ? $user->branch->branch_name : 'System';
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

        DB::transaction(function () use ($validated, $user) {
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
            ]);

            // Create Branch Product (Stock) if user has a branch
            if ($user->branch_id) {
                \App\Models\BranchProduct::create([
                    'branch_id' => $user->branch_id,
                    'product_id' => $product->id,
                    'quantity' => $validated['quantity'],
                    'physical_location' => $validated['physical_location'] ?? null,
                    'description' => $validated['description'] ?? null,
                    'variations' => $validated['variations'] ?? null,
                    'reorder_level' => $validated['reorder_level'] ?? 0,
                ]);
            }
        });

        return redirect()->route('products.index')->with('success', 'Product added successfully.');
    }

    public function edit(Product $product)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        // Authorization: System Admin or has stock in branch
        // We check if the product is associated with the user's branch
        $hasStock = $product->branches()->where('branch_id', $user->branch_id)->exists();

        if (!$isSystemAdmin && !$hasStock) {
            abort(403, 'Unauthorized action.');
        }

        // Load branch specific data for the form
        if (!$isSystemAdmin) {
            $branchProduct = $product->branches()->where('branch_id', $user->branch_id)->first();
            $product->quantity = $branchProduct ? $branchProduct->pivot->quantity : 0;
            $product->physical_location = $branchProduct ? $branchProduct->pivot->physical_location : '';
            if ($branchProduct) {
                $product->description = $branchProduct->pivot->description ?? $product->description;
                $product->variations = $branchProduct->pivot->variations ?? $product->variations;
                $product->reorder_level = $branchProduct->pivot->reorder_level ?? 0;
            } else {
                $product->reorder_level = 0;
            }
        }

        $brands = Brand::where('status', 'Active')->get();
        $categories = Category::where('status', 'Active')->get();

        $suppliers = \App\Models\Supplier::all(['id', 'name']);

        return Inertia::render('Products/Edit', [
            'product' => $product,
            'brands' => $brands,
            'categories' => $categories,
            'suppliers' => $suppliers,
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:255',
            'code_2' => 'nullable|string|max:255',
            'sku' => 'nullable|string|max:255',
            'barcode' => 'nullable|string|digits:13|unique:products,barcode,' . $product->id,
            'qr_code' => 'nullable|string|digits:13|unique:products,qr_code,' . $product->id,

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

        DB::transaction(function () use ($product, $validated, $user, $isSystemAdmin) {
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
            ]);

            // Update Branch Stock
            if (!$isSystemAdmin && $user->branch_id) {
                \App\Models\BranchProduct::updateOrCreate(
                    [
                        'branch_id' => $user->branch_id,
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
        });

        return redirect()->route('products.index')->with('success', 'Product updated successfully.');
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
                // Delete pivot and product
                $product->branches()->detach();
                $product->delete();
            }
        });

        return redirect()->route('products.index')->with('success', 'Selected products deleted successfully.');
    }
}
