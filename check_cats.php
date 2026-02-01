<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$categories = \App\Models\Category::all();
foreach ($categories as $c) {
    echo "ID: {$c->id}, Name: {$c->name}, Status: {$c->status}\n";
}
