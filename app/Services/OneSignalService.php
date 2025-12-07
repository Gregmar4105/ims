<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class OneSignalService
{
    protected $appId;
    protected $restApiKey;

    public function __construct()
    {
        $this->appId = config('services.onesignal.app_id');
        $this->restApiKey = config('services.onesignal.rest_api_key');
    }

    public function sendNotification($message, $playerIds, $heading = null, $data = null)
    {
        if (empty($playerIds)) {
            return;
        }

        $payload = [
            'app_id' => $this->appId,
            'include_aliases' => [
                'onesignal_id' => array_map('strval', $playerIds)
            ],
            'contents' => ['en' => $message],
            'data' => $data,
            'target_channel' => 'push',
            'priority' => 10,
            'android_visibility' => 1, // Public visibility
            // 'android_channel_id' => '...', // Add if you have a specific channel UUID
            'android_group' => 'chat_messages', 
            'ios_badgeType' => 'Increase',
            'ios_badgeCount' => 1,
        ];

        if ($heading) {
            $payload['headings'] = ['en' => $heading];
        }

        \Illuminate\Support\Facades\Log::info('OneSignal Payload:', $payload);

        $response = Http::withHeaders([
            'Authorization' => 'Basic ' . $this->restApiKey,
            'Content-Type' => 'application/json',
        ])->post('https://onesignal.com/api/v1/notifications', $payload);

        \Illuminate\Support\Facades\Log::info('OneSignal Response Status: ' . $response->status());
        \Illuminate\Support\Facades\Log::info('OneSignal Response Body: ' . $response->body());

        return $response->json();
    }
}
