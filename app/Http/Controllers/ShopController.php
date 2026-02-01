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
        $query = Product::whereHas('branches', function ($query) {
                // Same filter as welcome page to keep consistent with "Storefront" logic
                $query->whereIn('branch_name', ['Main Branch', 'LM2 Bicycle Trading']);
            });

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
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Shop/Category', [
            'category' => [
                'id' => 0,
                'name' => $request->filled('search') ? "Search Results for \"{$request->input('search')}\"" : "All Products",
                'slug' => 'search-results',
                'description' => 'Browse our collection.'
            ],
            'products' => $products,
            'currentBrand' => $request->query('brand'),
        ]);
    }

    public function show($slug, Request $request)
    {
        $category = Category::where('slug', $slug)
            ->where('status', 'Active')
            ->firstOrFail();

        $query = Product::where('category_id', $category->id)
            ->whereHas('branches', function ($query) {
                // Same filter as welcome page to keep consistent with "Storefront" logic
                $query->whereIn('branch_name', ['Main Branch', 'LM2 Bicycle Trading']);
            });

        if ($request->has('brand')) {
            $query->whereHas('brand', function ($q) use ($request) {
                $q->where('slug', $request->query('brand'));
            });
        }

        $products = $query->with(['brand'])
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Shop/Category', [
            'category' => $category,
            'products' => $products,
            'currentBrand' => $request->query('brand'),
        ]);
    }
}
