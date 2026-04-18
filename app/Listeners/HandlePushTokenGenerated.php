<?php

namespace App\Listeners;

use Native\Mobile\Events\PushNotification\TokenGenerated;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HandlePushTokenGenerated
{
    public function handle(TokenGenerated $event): void
    {
        $token = $event->token;
        Log::info("[PushNotification] FCM Token generated: {$token}");

        // Read auth config from local mobile_settings DB
        $serverUrl = DB::table('mobile_settings')->where('key', 'server_url')->value('value');
        $apiToken  = DB::table('mobile_settings')->where('key', 'api_token')->value('value');

        if (!$serverUrl || !$apiToken) {
            Log::warning("[PushNotification] Cannot sync token — missing config. URL: " . ($serverUrl ?? 'NULL') . ", Token: " . ($apiToken ? 'PRESENT' : 'NULL'));
            return;
        }

        try {
            $response = Http::withToken($apiToken)
                ->post(rtrim($serverUrl, '/') . '/api/mobile/push-token', [
                    'push_token' => $token,
                ]);

            Log::info("[PushNotification] Token sync response: {$response->status()}");
        } catch (\Throwable $e) {
            Log::error("[PushNotification] Token sync failed: {$e->getMessage()}");
        }
    }
}
