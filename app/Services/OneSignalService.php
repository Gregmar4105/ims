<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class OneSignalService
{
    protected $appId;
    protected $restApiKey;

    public function __construct()
    {
        $this->appId = env('ONESIGNAL_APP_ID');
        $this->restApiKey = env('ONESIGNAL_REST_API');
    }

    public function sendNotification($message, $userIds, $data = null)
    {
        if (empty($userIds)) {
            return;
        }

        $response = Http::withHeaders([
            'Authorization' => 'Basic ' . $this->restApiKey,
            'Content-Type' => 'application/json',
        ])->post('https://onesignal.com/api/v1/notifications', [
            'app_id' => $this->appId,
            'include_external_user_ids' => array_map('strval', $userIds),
            'contents' => ['en' => $message],
            'data' => $data,
        ]);

        return $response->json();
    }
}
