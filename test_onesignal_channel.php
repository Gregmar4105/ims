<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::first();
echo "Sending notification to user: " . $user->id . "\n";

try {
    $user->notify(new App\Notifications\OneSignalTestNotification("Test", "Test"));
    echo "Notification sent successfully via Laravel Notification channel.\n";
} catch (\Throwable $e) {
    echo "Exception: " . $e->getMessage() . "\n";
    if (method_exists($e, 'getResponse')) {
        echo "Response Body: " . $e->getResponse()->getBody()->getContents() . "\n";
    }
}
