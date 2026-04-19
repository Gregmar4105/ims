<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$appId = config('services.onesignal.app_id');
$restApiKey = config('services.onesignal.rest_api_key');
$playerId = App\Models\User::first()->onesignal_player_id;

echo "App ID: " . $appId . "\n";
echo "API Key length: " . strlen($restApiKey) . "\n";
echo "Player ID: " . $playerId . "\n";

$payload = [
    'app_id'   => $appId,
    'headings' => ['en' => 'Test Direct API'],
    'contents' => ['en' => 'This is a direct API test'],
    'include_player_ids' => [$playerId]
];

$response = Illuminate\Support\Facades\Http::withHeaders([
    'Authorization' => 'Basic ' . $restApiKey,
    'Content-Type'  => 'application/json',
])->post('https://api.onesignal.com/notifications', $payload);

echo "Status: " . $response->status() . "\n";
echo "Body: " . $response->body() . "\n";
