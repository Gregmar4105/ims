<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;

$search = "toseek bike 27.5";
$products = Product::with(['brand', 'category'])
    ->where('name', 'like', "%{$search}%")
    ->orWhereHas('brand', function ($q) use ($search) {
        $q->where('name', 'like', "%{$search}%");
    })
    ->orWhereHas('category', function ($q) use ($search) {
        $q->where('name', 'like', "%{$search}%");
    })
    ->get();

echo "Found " . $products->count() . " products for search '{$search}':\n";
foreach ($products as $p) {
    echo "- ID: {$p->id}, Name: '{$p->name}', Brand: '" . ($p->brand->name ?? 'NULL') . "', Category: '" . ($p->category->name ?? 'NULL') . "'\n";
}

$brandFilter = "Toseek";
$categoryFilter = "Bike";

$query = Product::with(['brand', 'category'])
    ->whereHas('brand', function ($q) use ($brandFilter) {
        $q->where('name', $brandFilter);
    })
    ->whereHas('category', function ($q) use ($categoryFilter) {
        $q->where('name', 'like', "{$categoryFilter}%");
    });

$filteredProducts = $query->get();
echo "\nFound " . $filteredProducts->count() . " products for Brand='{$brandFilter}' and Category LIKE '{$categoryFilter}%':\n";
foreach ($filteredProducts as $p) {
    echo "- ID: {$p->id}, Name: '{$p->name}', Brand: '" . ($p->brand->name ?? 'NULL') . "', Category: '" . ($p->category->name ?? 'NULL') . "'\n";
}
