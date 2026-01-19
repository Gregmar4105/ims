<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShopController extends Controller
{
    public function show($slug)
    {
        $category = Category::where('slug', $slug)
            ->where('status', 'Active')
            ->firstOrFail();

        $products = Product::where('category_id', $category->id)
            ->whereHas('branches', function ($query) {
                // Same filter as welcome page to keep consistent with "Storefront" logic
                $query->whereIn('branch_name', ['Main Branch', 'LM2 Bicycle Trading']);
            })
            ->with(['brand'])
            ->latest()
            ->paginate(12);

        return Inertia::render('Shop/Category', [
            'category' => $category,
            'products' => $products,
        ]);
    }
}
