<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$service = new \App\Services\ProxmoxService();

echo "Testing ProxmoxService...\n";

try {
    $stats = $service->getSystemStats();
    print_r($stats);
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
