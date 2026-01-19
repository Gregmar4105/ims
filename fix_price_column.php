<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

try {
    if (!\Illuminate\Support\Facades\Schema::hasColumn('products', 'price')) {
        \Illuminate\Support\Facades\DB::statement('ALTER TABLE products ADD COLUMN price DECIMAL(10, 2) DEFAULT 0 AFTER name');
        echo "Column 'price' added successfully.\n";
    } else {
        echo "Column 'price' already exists.\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
