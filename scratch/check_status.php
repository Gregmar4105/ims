<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

foreach(\App\Models\Product::whereIn('id', [73,74,204,205])->get() as $p) {
    echo "ID: {$p->id}, Name: {$p->name}, Status: {$p->status}\n";
}
