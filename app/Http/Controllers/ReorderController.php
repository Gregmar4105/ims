<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\Product;
use App\Models\BranchProduct;
use App\Models\Brand;
use App\Models\Category;

class ReorderController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $query = BranchProduct::query()
            ->has('product')
            ->has('branch')
            ->whereNotNull('reorder_level')
            ->where('reorder_level', '>', 0)
            ->whereRaw('quantity <= reorder_level');

        if (!$isSystemAdmin) {
            $query->where('branch_id', $user->branch_id);
        }

        // Filter by Search Query
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('product', function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhereHas('brand', function ($qb) use ($search) {
                            $qb->where('name', 'like', "%{$search}%");
                        })
                        ->orWhereHas('category', function ($qc) use ($search) {
                            $qc->where('name', 'like', "%{$search}%");
                        });
                });
            });
        }

        // Filter by Brand
        if ($request->filled('brand') && $request->input('brand') !== 'all') {
            $brandName = $request->input('brand');
            $query->whereHas('product.brand', function ($q) use ($brandName) {
                $q->where('name', $brandName);
            });
        }

        // Filter by Category & Subcategory
        if ($request->filled('category') && $request->input('category') !== 'all') {
            $categoryName = $request->input('category');
            if ($request->filled('subcategory') && $request->input('subcategory') !== 'all') {
                $subCategoryName = $request->input('subcategory');
                $query->whereHas('product.category', function ($q) use ($subCategoryName) {
                    $q->where('name', $subCategoryName);
                });
            } else {
                $query->whereHas('product.category', function ($q) use ($categoryName) {
                    $q->where('name', $categoryName)
                      ->orWhere('name', 'like', $categoryName . ' %');
                });
            }
        }

        // Eager load relations
        $query->with(['product.brand', 'product.category', 'product.supplier', 'branch']);

        // Paginate the results (10 per page)
        $paginated = $query->paginate(10)->withQueryString();

        // Transform results to match the structure expected by the frontend
        $paginated->getCollection()->transform(function ($bp) use ($isSystemAdmin) {
            $product = $bp->product;
            return [
                'id' => $product->id,
                'name' => $product->name,
                'code' => $product->code,
                'sku' => $product->sku,
                'image_path' => $product->image_path,
                'quantity' => $bp->quantity,
                'reorder_level' => $bp->reorder_level,
                'brand' => $product->brand,
                'category' => $product->category,
                'supplier' => $product->supplier,
                'branch' => $isSystemAdmin ? [
                    'id' => $bp->branch->id,
                    'name' => $bp->branch->branch_name
                ] : null
            ];
        });

        // Fetch brands/categories based on visibility rules
        $brandsQuery = Brand::where('status', 'Active');
        $categoriesQuery = Category::where('status', 'Active');

        if (!$isSystemAdmin && $user->branch_id) {
            $brandsQuery->where('branch_id', $user->branch_id);
            $categoriesQuery->where('branch_id', $user->branch_id);
        }

        $brands = $brandsQuery->pluck('name')->unique()->values();
        $categories = $categoriesQuery->pluck('name')->unique()->values();

        return Inertia::render('Reorders/Index', [
            'reorders' => $paginated,
            'options' => [
                'brands' => $brands,
                'categories' => $categories,
            ],
            'filters' => $request->only(['search', 'brand', 'category', 'subcategory']),
        ]);
    }
}
