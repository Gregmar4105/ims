<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;

function test_search($search) {
    echo "--- Testing Search: '{$search}' ---\n";
    
    $query = Product::with(['brand', 'category']);
    
    $query->where(function ($q) use ($search) {
        // Standard matches
        $q->where('name', 'like', "%{$search}%")
          ->orWhere('description', 'like', "%{$search}%")
          ->orWhereHas('brand', function ($q) use ($search) {
              $q->where('name', 'like', "%{$search}%");
          })
          ->orWhereHas('category', function ($q) use ($search) {
              $q->where('name', 'like', "%{$search}%");
          });

        // Word splitting
        $words = array_filter(explode(' ', $search));
        if (count($words) > 1) {
            $q->orWhere(function ($sq) use ($words) {
                foreach ($words as $word) {
                    $sq->where('name', 'like', "%{$word}%");
                }
            });
        }
    });
    
    $results = $query->get();
    echo "Found " . $results->count() . " results.\n";
    foreach ($results as $p) {
        echo "- [{$p->id}] {$p->name}\n";
    }
    echo "\n";
}

// Test word-splitting search (out of order)
test_search("toseek bike 27.5");

// Test normal search
test_search("CAMRON");
