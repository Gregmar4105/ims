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
            // Step 1: Register the device with OneSignal to get a player/subscription ID
            $playerId = $this->registerWithOneSignal($token);

            // Step 2: Send the player ID (or raw FCM token as fallback) to the remote server
            $pushToken = $playerId ?? $token;

            $response = Http::withToken($apiToken)
                ->post(rtrim($serverUrl, '/') . '/api/mobile/push-token', [
                    'push_token' => $pushToken,
                ]);

            Log::info("[PushNotification] Token sync response: {$response->status()} — stored: " . substr($pushToken, 0, 20) . '...');
        } catch (\Throwable $e) {
            Log::error("[PushNotification] Token sync failed: {$e->getMessage()}");
        }
    }

    /**
     * Register the device's FCM token with OneSignal and return the player/subscription ID.
     * This creates a "player" in OneSignal's system mapped to the FCM token.
     */
    private function registerWithOneSignal(string $fcmToken): ?string
    {
        $appId = config('services.onesignal.app_id');
        $restApiKey = config('services.onesignal.rest_api_key');

        if (!$appId || !$restApiKey) {
            Log::warning("[PushNotification] OneSignal credentials missing — skipping registration");
            return null;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Basic ' . $restApiKey,
                'Content-Type'  => 'application/json',
            ])->post('https://api.onesignal.com/players', [
                'app_id'        => $appId,
                'device_type'   => 1, // 1 = Android
                'identifier'    => $fcmToken,
                'language'      => 'en',
                'test_type'     => config('app.env') === 'production' ? null : 1,
            ]);

            if ($response->successful()) {
                $playerId = $response->json('id');
                Log::info("[PushNotification] Registered with OneSignal — Player ID: {$playerId}");
                return $playerId;
            }

            Log::error("[PushNotification] OneSignal registration failed: {$response->status()} — {$response->body()}");
        } catch (\Throwable $e) {
            Log::error("[PushNotification] OneSignal registration error: {$e->getMessage()}");
        }

        return null;
    }
}
