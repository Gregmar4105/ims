<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::first();
$playerId = $user->onesignal_player_id;
$service = new App\Services\OneSignalService();
$res = $service->sendNotification("Test Chat Notification from another user!", [$playerId], "Jane Doe");
print_r($res);
