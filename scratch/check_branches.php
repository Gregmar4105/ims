<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== BRANCHES ===\n";
foreach (\App\Models\Branch::all() as $branch) {
    echo "ID: {$branch->id} | Name: {$branch->branch_name} | Location: {$branch->location}\n";
}

echo "\n=== ROLES ===\n";
foreach (\Spatie\Permission\Models\Role::all() as $role) {
    echo "Role: {$role->name}\n";
}
