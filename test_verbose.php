<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::first();
echo "Testing for User ID: " . $user->id . "\n";
echo "Player ID: " . $user->onesignal_player_id . "\n";

$appId = config('services.onesignal.app_id');
$restApiKey = config('services.onesignal.rest_api_key');

$payload = [
    'app_id'   => $appId,
    'headings' => ['en' => 'Test Direct API'],
    'contents' => ['en' => 'This is a direct API test'],
    'include_player_ids' => [$user->onesignal_player_id]
];

$response = Illuminate\Support\Facades\Http::withHeaders([
    'Authorization' => 'Basic ' . $restApiKey,
    'Content-Type'  => 'application/json',
])->post('https://api.onesignal.com/notifications', $payload);

echo "Status: " . $response->status() . "\n";
echo "Body: " . $response->body() . "\n";
