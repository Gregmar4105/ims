<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$appId = config('onesignal.app_id');
$restApiKey = config('onesignal.rest_api_key');

echo "Testing backend with App ID: " . $appId . "\n";

$payload = [
    'app_id'   => $appId,
    'headings' => ['en' => 'Backend Test'],
    'contents' => ['en' => 'This is a broadcast test to verify the backend'],
    'included_segments' => ['All']
];

$response = Illuminate\Support\Facades\Http::withHeaders([
    'Authorization' => 'Basic ' . $restApiKey,
    'Content-Type'  => 'application/json',
])->post('https://api.onesignal.com/notifications', $payload);

echo "Status: " . $response->status() . "\n";
echo "Body: " . $response->body() . "\n";
