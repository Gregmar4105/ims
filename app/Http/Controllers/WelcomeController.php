<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

class WelcomeController extends Controller
{
    public function index()
    {
        $products = Product::whereHas('branches', function ($query) {
            $query->whereIn('branch_name', ['Main Branch', 'LM2 Bicycle Trading']);
        })
        ->with(['category', 'brand'])
        ->latest()
        ->take(8)
        ->get();

        return Inertia::render('welcome', [
            'canLogin' => Route::has('login'),
            'canRegister' => Features::enabled(Features::registration()),
            'products' => $products,
        ]);
    }
}
