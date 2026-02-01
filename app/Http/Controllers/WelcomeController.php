<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\SiteSetting;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Laravel\Fortify\Features;

class WelcomeController extends Controller
{
    private const DEFAULT_BANNER = 'https://specialized.com.ph/cdn/shop/collections/plp-banner_Bikes_2000x.progressive.jpg?v=1587621713';

    public function index()
    {
        $products = Product::whereHas('branches', function ($query) {
            $query->whereIn('branch_name', ['Main Branch', 'LM2 Bicycle Trading']);
        })
        ->with(['category', 'brand'])
        ->latest()
        ->take(20)
        ->get();

        // Get custom banner or use default
        $bannerPath = SiteSetting::get('homepage_banner');
        $bannerUrl = $bannerPath ? Storage::url($bannerPath) : self::DEFAULT_BANNER;

        return Inertia::render('welcome', [
            'canLogin' => Route::has('login'),
            'canRegister' => Features::enabled(Features::registration()),
            'products' => $products,
            'bannerUrl' => $bannerUrl,
        ]);
    }
    
    public function show(Product $product)
    {
        $product->load(['category', 'brand', 'branches' => function($q) {
             $q->whereIn('branch_name', ['Main Branch', 'LM2 Bicycle Trading']);
        }]);

        return Inertia::render('Shop/Show', [
            'product' => $product,
        ]);
    }
}
