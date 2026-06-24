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
             $q->where('branch_name', 'LM2 Bicycle Trading');
        }]);

        // Check if the product qualifies for the 3-month unsold rule for LM2 branch
        $threeMonthsAgo = now()->subMonths(3);
        $lm2Branch = \App\Models\Branch::where('branch_name', 'LM2 Bicycle Trading')->first();
        if ($lm2Branch) {
            $isSold = \App\Models\SaleItem::where('product_id', $product->id)
                ->whereHas('sale', function ($query) use ($threeMonthsAgo, $lm2Branch) {
                    $query->where('status', 'completed')
                          ->where('branch_id', $lm2Branch->id)
                          ->where('created_at', '>=', $threeMonthsAgo);
                })->exists();

            if (!$isSold && is_null($product->clearance_price)) {
                $product->clearance_price = $product->price;
            }
        }

        return Inertia::render('Shop/Show', [
            'product' => $product,
        ]);
    }

    public function clearanceSale()
    {
        $lm2Branch = \App\Models\Branch::where('branch_name', 'LM2 Bicycle Trading')->first();
        $lm2BranchId = $lm2Branch ? $lm2Branch->id : null;

        if ($lm2BranchId) {
            $threeMonthsAgo = now()->subMonths(3);
            $soldInLast3MonthsIds = \App\Models\SaleItem::whereHas('sale', function ($query) use ($threeMonthsAgo, $lm2BranchId) {
                $query->where('status', 'completed')
                      ->where('branch_id', $lm2BranchId)
                      ->where('created_at', '>=', $threeMonthsAgo);
            })->pluck('product_id')->unique()->toArray();

            $products = Product::whereHas('branches', function ($query) use ($lm2BranchId) {
                $query->where('branches.id', $lm2BranchId);
            })
            ->where(function ($query) use ($soldInLast3MonthsIds) {
                $query->where(function ($q) {
                    $q->whereNotNull('clearance_price')
                      ->where(function ($sub) {
                          $sub->whereNull('clearance_until')
                              ->orWhere('clearance_until', '>', now());
                      });
                })
                ->orWhereNotIn('id', $soldInLast3MonthsIds);
            })
            ->with(['category', 'brand'])
            ->latest()
            ->get()
            ->map(function ($product) {
                if (is_null($product->clearance_price)) {
                    $product->clearance_price = $product->price;
                }
                return $product;
            });
        } else {
            $products = collect();
        }

        return Inertia::render('Shop/Clearance', [
            'canLogin' => Route::has('login'),
            'canRegister' => Features::enabled(Features::registration()),
            'products' => $products,
        ]);
    }
}
