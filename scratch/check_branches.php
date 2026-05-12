<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

foreach(\App\Models\Product::whereIn('id', [73,74,204,205])->get() as $p) {
    echo "ID: {$p->id}, Name: {$p->name}, Branches: " . $p->branches->count() . "\n";
    foreach($p->branches as $b) {
        echo "  - Branch: {$b->branch_name}, Qty: {$b->pivot->quantity}\n";
    }
}
