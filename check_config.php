<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Config check:\n";
echo "ONESIGNAL_APK_ID: " . env('ONESIGNAL_APK_ID') . "\n";
echo "services.onesignal.app_id: " . config('services.onesignal.app_id') . "\n";
echo "services.onesignal.rest_api_key: " . (config('services.onesignal.rest_api_key') ? 'FOUND' : 'NOT FOUND') . "\n";
