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
    public function index(Request $request)
    {
        $search = $request->query('search');
        $filterBranch = $request->query('branch');
        $filterBrand = $request->query('brand');
        $filterCategory = $request->query('category');
        $filterStock = $request->query('stock');
        
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');
        
        $query = Product::with(['brand', 'category', 'creator']);

        if (!$isSystemAdmin) {
            if (!$user->branch_id) {
                // User has no branch and is not Admin, show nothing.
                $query->whereRaw('1 = 0');
            } else {
                // Filter products available in the user's branch
                $query->whereHas('branches', function ($q) use ($user) {
                    $q->where('branches.id', $user->branch_id);
                });
                // Eager load the branch pivot data
                $query->with(['branches' => function ($q) use ($user) {
                    $q->where('branches.id', $user->branch_id);
                }]);
            }
        } else {
            // Admin sees all products, maybe eager load all branches?
            $query->with('branches');
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
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

        // Stock filter needs to check the pivot table quantity
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
                // Admin filtering by specific branch
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

        $products = $query->latest()->paginate(12)->withQueryString();

        // Transform products to include branch-specific quantity for the view
        $products->getCollection()->transform(function ($product) use ($isSystemAdmin, $user, $filterBranch) {
            if (!$isSystemAdmin && $user->branch_id) {
                $branchData = $product->branches->first();
                $product->quantity = $branchData ? $branchData->pivot->quantity : 0;
                $product->physical_location = $branchData ? $branchData->pivot->physical_location : null;
                // Use branch-specific description and variations if available
                if ($branchData) {
                    $product->description = $branchData->pivot->description ?? $product->description;
                    $product->variations = $branchData->pivot->variations ?? $product->variations;
                }
            } else {
                // Admin View
                if ($filterBranch && $filterBranch !== 'all') {
                    // Admin selected a specific branch
                    $branchData = $product->branches->firstWhere('branch_name', $filterBranch);
                    $product->quantity = $branchData ? $branchData->pivot->quantity : 0;
                    $product->physical_location = $branchData ? $branchData->pivot->physical_location : null;
                    
                    if ($branchData) {
                        $product->description = $branchData->pivot->description ?? $product->description;
                        $product->variations = $branchData->pivot->variations ?? $product->variations;
                    }
                } else {
                    // Admin viewing "All Branches" - Sum up quantities
                    $product->quantity = $product->branches->sum('pivot.quantity');
                }
            }
            return $product;
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

        return Inertia::render('Products/Create', [
            'brands' => $brands,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'brand_id' => 'required|exists:brands,id',
            'category_id' => 'required|exists:categories,id',
            'quantity' => 'required|integer|min:0',
            'physical_location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'variations' => 'nullable|array',
            'variations.*.name' => 'required|string',
            'variations.*.options' => 'required|string', // Comma separated
            'image' => 'required|image|max:2048', // 2MB Max
        ]);

        $user = auth()->user();
        
        if (!$user->branch) {
            return back()->withErrors(['branch' => 'You must be assigned to a branch to add products.']);
        }

        $branchName = $user->branch->branch_name;
        $brand = Brand::find($validated['brand_id']);
        $category = Category::find($validated['category_id']);
        
        $safeBranch = str_replace(' ', '', $branchName);
        $safeBrand = str_replace(' ', '', $brand->name);
        $safeCategory = str_replace(' ', '', $category->name);
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
                'description' => $validated['description'] ?? null,
                'variations' => $validated['variations'] ?? null,
                'image_path' => $validated['image_path'],
                'created_by' => $user->id,
                // Generate barcode/QR if needed, or let model/observer handle it
                'barcode' => 'P-' . Str::random(8), // Placeholder
                'qr_code' => 'QR-' . Str::random(8), // Placeholder
            ]);

            // Create Branch Product (Stock)
            \App\Models\BranchProduct::create([
                'branch_id' => $user->branch_id,
                'product_id' => $product->id,
                'quantity' => $validated['quantity'],
                'physical_location' => $validated['physical_location'] ?? null,
                'description' => $validated['description'] ?? null,
                'variations' => $validated['variations'] ?? null,
            ]);
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
            }
        }

        $brands = Brand::where('status', 'Active')->get();
        $categories = Category::where('status', 'Active')->get();

        return Inertia::render('Products/Edit', [
            'product' => $product,
            'brands' => $brands,
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'brand_id' => 'required|exists:brands,id',
            'category_id' => 'required|exists:categories,id',
            'quantity' => 'required|integer|min:0',
            'physical_location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'variations' => 'nullable|array',
            'variations.*.name' => 'required|string',
            'variations.*.options' => 'required|string',
            'image' => 'nullable|image|max:2048', 
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
                'brand_id' => $validated['brand_id'],
                'category_id' => $validated['category_id'],
                'description' => $validated['description'] ?? null,
                'variations' => $validated['variations'] ?? null,
                'image_path' => $validated['image_path'] ?? $product->image_path,
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
                    ]
                );
            }
        });

        return redirect()->route('products.index')->with('success', 'Product updated successfully.');
    }
}
