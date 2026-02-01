<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$categories = \App\Models\Category::where('status', 'Active')
    ->withCount('products')
    ->orderByDesc('products_count')
    ->take(20)
    ->get()
    ->unique('name')
    ->take(5)
    ->values();

foreach ($categories as $c) {
    echo "ID: {$c->id}, Name: {$c->name}, Count: {$c->products_count}\n";
}
