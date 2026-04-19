<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Notifications\OneSignalTestNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushTestController extends Controller
{
    public function send(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:100',
            'body'  => 'required|string|max:500',
        ]);

        $user = $request->user();

        // Try OneSignal notification channel first (requires player_id)
        if ($user->onesignal_player_id) {
            try {
                $user->notify(new OneSignalTestNotification(
                    $request->title,
                    $request->body
                ));
                
                return response()->json(['message' => 'Notification sent via OneSignal!']);
            } catch (\Throwable $e) {
                Log::error("[PushTest] OneSignal channel failed: " . $e->getMessage());
                // Fall through to direct API approach
            }
        }

        // Fallback: Send directly via OneSignal REST API to all subscribers
        return $this->sendDirectViaOneSignal(
            $request->title,
            $request->body,
            $user
        );
    }

    /**
     * Send notification directly via OneSignal REST API.
     * Uses include_external_user_ids if the user has no player_id,
     * or falls back to targeting all subscribed devices.
     */
    private function sendDirectViaOneSignal(string $title, string $body, $user)
    {
        $appId = config('services.onesignal.app_id');
        $restApiKey = config('services.onesignal.rest_api_key');

        if (!$appId || !$restApiKey) {
            return response()->json([
                'error' => 'OneSignal is not configured. Please set ONESIGNAL_APK_ID and ONESIGNAL_APK_REST_API in your .env file.'
            ], 422);
        }

        try {
            // Build the OneSignal notification payload
            $payload = [
                'app_id'   => $appId,
                'headings' => ['en' => $title],
                'contents' => ['en' => $body],
            ];

            if ($user->onesignal_player_id) {
                // Target specific device by player ID
                $payload['include_player_ids'] = [$user->onesignal_player_id];
            } else {
                // Target by external user ID (the user's database ID)
                $payload['include_aliases'] = [
                    'external_id' => [(string) $user->id],
                ];
                $payload['target_channel'] = 'push';
            }

            $response = Http::withHeaders([
                'Authorization' => 'Basic ' . $restApiKey,
                'Content-Type'  => 'application/json',
            ])->post('https://api.onesignal.com/notifications', $payload);

            if ($response->successful()) {
                Log::info("[PushTest] Notification sent via OneSignal API: " . $response->body());
                return response()->json(['message' => 'Test notification sent!']);
            }

            Log::error("[PushTest] OneSignal API error: {$response->status()} — {$response->body()}");
            return response()->json([
                'error' => 'OneSignal API error: ' . ($response->json('errors.0') ?? $response->body())
            ], 422);

        } catch (\Throwable $e) {
            Log::error("[PushTest] Direct OneSignal send failed: " . $e->getMessage());
            return response()->json(['error' => 'Failed to send notification: ' . $e->getMessage()], 500);
        }
    }
}
