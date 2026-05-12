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
        // Priority 1: Exact matches on identifiers
        $q->where('barcode', $search)
          ->orWhere('qr_code', $search)
          ->orWhere('sku', $search)
          ->orWhere('code', $search)
          ->orWhere('code_2', $search)
          
          // Priority 2: Standard partial matches
          ->orWhere('name', 'like', "%{$search}%")
          ->orWhere('description', 'like', "%{$search}%")
          ->orWhere('barcode', 'like', "%{$search}%")
          ->orWhere('qr_code', 'like', "%{$search}%")
          ->orWhere('code', 'like', "%{$search}%")
          ->orWhere('code_2', 'like', "%{$search}%")
          ->orWhere('sku', 'like', "%{$search}%")
          ->orWhereHas('brand', function ($q) use ($search) {
              $q->where('name', 'like', "%{$search}%");
          })
          ->orWhereHas('category', function ($q) use ($search) {
              $q->where('name', 'like', "%{$search}%");
          });

        // Priority 3: Intelligent word-splitting
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
    foreach ($results->take(5) as $p) {
        echo "- [{$p->id}] {$p->name} (Code: {$p->code}, Code2: {$p->code_2}, SKU: {$p->sku})\n";
    }
    if ($results->count() > 5) echo "... and " . ($results->count() - 5) . " more\n";
    echo "\n";
}

// Test word-splitting search
test_search("toseek bike 27.5");

// Test search by Code 2 (2Code)
// Let's find a product with a code_2 first
$pWithCode2 = Product::whereNotNull('code_2')->where('code_2', '!=', '')->first();
if ($pWithCode2) {
    test_search($pWithCode2->code_2);
} else {
    echo "No products with Code 2 found to test.\n";
}

// Test search by SKU
$pWithSku = Product::whereNotNull('sku')->where('sku', '!=', '')->first();
if ($pWithSku) {
    test_search($pWithSku->sku);
}
