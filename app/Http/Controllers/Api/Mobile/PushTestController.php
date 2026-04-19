<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Contract\Messaging;
use Illuminate\Support\Facades\Log;

class PushTestController extends Controller
{
    protected $messaging;

    public function __construct(Messaging $messaging)
    {
        $this->messaging = $messaging;
    }

    /**
     * Send a test push notification via Firebase.
     */
    public function send(Request $request)
    {
        $request->validate([
            'title' => 'required|string',
            'body'  => 'required|string',
        ]);

        $user = $request->user();
        $token = $user->onesignal_player_id; // Still using this column for the FCM token

        if (!$token) {
            return response()->json(['error' => 'No push token found for your account. Please re-register your device.'], 400);
        }

        try {
            // Using fromArray to ensure compatibility with all library versions
            $message = CloudMessage::fromArray([
                'token' => $token,
                'notification' => [
                    'title' => $request->title,
                    'body'  => $request->body,
                ],
                'data' => [
                    'title' => $request->title,
                    'body'  => $request->body,
                    'type'  => 'test_push',
                ],
            ]);

            $this->messaging->send($message);

            return response()->json(['message' => 'Notification sent via Firebase!']);
        } catch (\Throwable $e) {
            Log::error("[PushTest] FCM sending failed: " . $e->getMessage());
            return response()->json([
                'error' => 'Firebase error: ' . $e->getMessage(),
                'message' => 'Failed to send via Firebase. Check laravel.log for details.'
            ], 500);
        }
    }
}
