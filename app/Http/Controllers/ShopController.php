<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShopController extends Controller
{
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
