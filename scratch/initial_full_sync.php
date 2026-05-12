<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\GoogleSheetsSyncController;

echo "Starting Initial Full Sync...\n";
$controller = app(GoogleSheetsSyncController::class);
$response = $controller->syncAll();

echo "Sync Finished: " . json_encode($response->getData()) . "\n";
