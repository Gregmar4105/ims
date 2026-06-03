<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShopController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 12);
        
        $query = Product::whereHas('branches', function ($query) {
                // Same filter as welcome page to keep consistent with "Storefront" logic
                $query->where('branch_name', 'LM2 Bicycle Trading');
            });

        if ($request->boolean('new')) {
            $query->where('created_at', '>=', now()->subDays(30));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('brand', function($bq) use ($search) {
                      $bq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('brand')) {
            $query->whereHas('brand', function ($q) use ($request) {
                $q->where('slug', $request->query('brand'));
            });
        }

        $products = $query->with(['brand'])
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        $categoryName = "All Products";
        if ($request->filled('search')) {
            $categoryName = "Search Results for \"{$request->input('search')}\"";
        } elseif ($request->boolean('new')) {
            $categoryName = "New Arrivals";
        }

        return Inertia::render('Shop/Category', [
            'category' => [
                'id' => 0,
                'name' => $categoryName,
                'slug' => 'search-results',
                'description' => 'Browse our collection.'
            ],
            'products' => $products,
            'currentBrand' => $request->query('brand'),
        ]);
    }

    public function suggestions(Request $request)
    {
        $query = $request->input('q');
        if (!$query) {
            return response()->json([]);
        }

        $products = Product::whereHas('branches', function ($q) {
                $q->where('branch_name', 'LM2 Bicycle Trading');
            })
            ->where(function($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('description', 'like', "%{$query}%")
                  ->orWhereHas('brand', function($bq) use ($query) {
                      $bq->where('name', 'like', "%{$query}%");
                  });
            })
            ->with('brand')
            ->take(5)
            ->get(['id', 'name', 'price', 'image_path', 'brand_id' /* Ensure brand_id is fetched for relationship */]);

        // Transform if needed, or return direct
        return response()->json($products);
    }

    public function show($slug, Request $request)
    {
        $perPage = $request->input('per_page', 12);
        
        $category = Category::where('slug', $slug)
            ->where('status', 'Active')
            ->firstOrFail();

        $query = Product::where('category_id', $category->id)
            ->whereHas('branches', function ($query) {
                // Same filter as welcome page to keep consistent with "Storefront" logic
                $query->where('branch_name', 'LM2 Bicycle Trading');
            });

        if ($request->has('brand')) {
            $query->whereHas('brand', function ($q) use ($request) {
                $q->where('slug', $request->query('brand'));
            });
        }

        $products = $query->with(['brand'])
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Shop/Category', [
            'category' => $category,
            'products' => $products,
            'currentBrand' => $request->query('brand'),
        ]);
    }
}
