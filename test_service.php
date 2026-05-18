<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$playerId = App\Models\User::first()->onesignal_player_id;
$service = new App\Services\OneSignalService();
$res = $service->sendNotification('Test from Service', [$playerId], 'Service Test');
print_r($res);
