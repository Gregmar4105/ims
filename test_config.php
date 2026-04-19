<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "services: " . config('services.onesignal.rest_api_key') . "\n";
echo "onesignal: " . config('onesignal.rest_api_key') . "\n";
