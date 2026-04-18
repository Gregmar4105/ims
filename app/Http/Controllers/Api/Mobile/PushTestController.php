<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Notifications\OneSignalTestNotification;
use Illuminate\Http\Request;

class PushTestController extends Controller
{
    public function send(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:100',
            'body'  => 'required|string|max:500',
        ]);

        $user = $request->user();

        if (!$user->onesignal_player_id) {
            return response()->json(['error' => 'No push token registered.'], 422);
        }

        $user->notify(new OneSignalTestNotification(
            $request->title,
            $request->body
        ));

        return response()->json(['message' => 'Test notification sent!']);
    }
}
