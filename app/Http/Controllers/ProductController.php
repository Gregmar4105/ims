<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Brand;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
        
        $query = Product::with(['branch', 'brand', 'category']);

        if (!$isSystemAdmin) {
            if (!$user->branch_id) {
                // User has no branch and is not Admin, show nothing.
                $query->whereRaw('1 = 0');
            } else {
                $query->where('branch_id', $user->branch_id);
            }
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('branch', function ($q) use ($search) {
                      $q->where('branch_name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('brand', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('category', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if ($filterBranch && $filterBranch !== 'all') {
            $query->whereHas('branch', function ($q) use ($filterBranch) {
                $q->where('branch_name', $filterBranch);
            });
        }

        if ($filterBrand && $filterBrand !== 'all') {
            $query->where('brand_id', $filterBrand);
        }

        if ($filterCategory && $filterCategory !== 'all') {
            $query->where('category_id', $filterCategory);
        }

        if ($filterStock && $filterStock !== 'all') {
            if ($filterStock === 'in_stock') {
                $query->where('quantity', '>', 0);
            } elseif ($filterStock === 'out_of_stock') {
                $query->where('quantity', '=', 0);
            } elseif ($filterStock === 'low_stock') {
                $query->where('quantity', '>', 0)->where('quantity', '<=', 5);
            }
        }

        $products = $query->latest()->paginate(12)->withQueryString();

        // Get options for filters
        $branches = \App\Models\Branch::pluck('branch_name')->unique()->values();
        
        // Fetch brands/categories based on visibility rules
        $brandsQuery = Brand::where('status', 'Active');
        $categoriesQuery = Category::where('status', 'Active');

        if (!$isSystemAdmin && $user->branch_id) {
            $brandsQuery->where('branch_id', $user->branch_id);
            $categoriesQuery->where('branch_id', $user->branch_id);
        }

        $brands = $brandsQuery->get(['id', 'name']);
        $categories = $categoriesQuery->get(['id', 'name']);

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
            ]
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

        $brands = Brand::where('status', 'Active')
            ->when(!$isSystemAdmin, function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            })
            ->get();

        $categories = Category::where('status', 'Active')
            ->when(!$isSystemAdmin, function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            })
            ->get();

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
        
        // Construct filename: Branch.Brand.Category.ProductName.jpg
        // Sanitize components to remove spaces or special chars if needed, though user example had dots.
        // Example: MainBranch.Keysto.Bike.Keysto-121.jpg
        // We should probably remove spaces from components to match the dot format cleanly.
        
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

        $product = new Product($validated);
        $product->branch_id = $user->branch_id;
        $product->save();

        return redirect()->route('products.index')->with('success', 'Product added successfully.');
    }
}
