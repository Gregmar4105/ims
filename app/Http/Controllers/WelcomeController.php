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

    public function index(Request $request)
    {
        $page = (int) $request->input('page', 1);

        if ($page == 1) {
            $request->session()->forget('welcome_random_seed');
        } elseif (!$request->session()->has('welcome_random_seed')) {
            $request->session()->put('welcome_random_seed', rand(1, 10000));
        }
        $seed = $request->session()->get('welcome_random_seed');

        $baseQuery = Product::whereHas('branches', function ($query) {
            $query->where('branch_name', 'LM2 Bicycle Trading');
        });

        // Get the top 30 newest items to exclude them from random pages
        $top30Ids = (clone $baseQuery)->latest()->limit(30)->pluck('id')->toArray();

        if ($page == 1) {
            $products = (clone $baseQuery)
                ->with(['category', 'brand'])
                ->latest()
                ->limit(30)
                ->get();
            
            $hasMore = (clone $baseQuery)->whereNotIn('id', $top30Ids)->exists();
        } else {
            $offset = ($page - 2) * 50;
            $products = (clone $baseQuery)
                ->whereNotIn('id', $top30Ids)
                ->with(['category', 'brand'])
                ->orderByRaw("RAND($seed)")
                ->offset($offset)
                ->limit(50)
                ->get();
                
            $totalRemaining = (clone $baseQuery)->whereNotIn('id', $top30Ids)->count();
            $hasMore = $totalRemaining > ($offset + 50);
        }

        // Get custom banner or use default
        $bannerPath = SiteSetting::get('homepage_banner');
        $bannerUrl = $bannerPath ? Storage::url($bannerPath) : self::DEFAULT_BANNER;

        return Inertia::render('welcome', [
            'canLogin' => Route::has('login'),
            'canRegister' => Features::enabled(Features::registration()),
            'products' => [
                'data' => $products,
                'current_page' => $page,
                'has_more' => $hasMore,
            ],
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
