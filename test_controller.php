<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$request = Illuminate\Http\Request::create('/api/mobile/push-test', 'POST', ['title' => 'T', 'body' => 'B']);
$request->setUserResolver(function() { return App\Models\User::first(); });
$response = app()->handle($request);
echo $response->getContent();
