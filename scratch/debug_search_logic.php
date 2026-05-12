<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use App\Models\Brand;
use App\Models\Category;

function debug_search($search, $brandName = null, $categoryName = null) {
    echo "--- Debugging: Search='{$search}', Brand='{$brandName}', Category='{$categoryName}' ---\n";
    
    $query = Product::with(['brand', 'category']);
    
    if ($search) {
        $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhereHas('brand', function ($q) use ($search) {
                  $q->where('name', 'like', "%{$search}%");
              })
              ->orWhereHas('category', function ($q) use ($search) {
                  $q->where('name', 'like', "%{$search}%");
              });
        });
    }
    
    if ($brandName && $brandName !== 'all') {
        $query->whereHas('brand', function ($q) use ($brandName) {
            $q->where('name', $brandName);
        });
    }
    
    if ($categoryName && $categoryName !== 'all') {
        $query->whereHas('category', function ($q) use ($categoryName) {
            $q->where('name', 'like', "{$categoryName}%");
        });
    }
    
    $results = $query->get();
    echo "Found " . $results->count() . " results.\n";
    foreach ($results as $p) {
        echo "- [{$p->id}] {$p->name} (Brand: {$p->brand->name}, Category: {$p->category->name})\n";
    }
    echo "\n";
}

// Case 1: Just search "toseek bike 27.5"
debug_search("toseek bike 27.5");

// Case 2: Just search "27.5"
debug_search("27.5");

// Case 3: Filters only
debug_search(null, "Toseek", "Bike");

// Case 4: All combined
debug_search("27.5", "Toseek", "Bike");

// Case 5: Subcategory filter
debug_search(null, "Toseek", "Bike 27.5");

// Case 6: Subcategory + search
debug_search("27.5", "Toseek", "Bike 27.5");
