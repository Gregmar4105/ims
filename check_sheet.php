<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Branch;

$branches = Branch::all();
foreach ($branches as $b) {
    echo "ID: " . $b->id . " | Name: " . $b->branch_name . "\n";
}
