<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function index()
    {
        // List all branches except current user's branch
        $branches = \App\Models\Branch::where('id', '!=', auth()->user()->branch_id)->get();
        return inertia('Chats/Index', [
            'branches' => $branches
        ]);
    }

    public function show(\App\Models\Branch $branch)
    {
        // Get messages between current user's branch and target branch
        $currentBranchId = auth()->user()->branch_id;
        
        $messages = \App\Models\Message::with('sender')
            ->where(function($q) use ($currentBranchId, $branch) {
                $q->where('receiver_branch_id', $currentBranchId)
                  ->whereHas('sender', function($q) use ($branch) {
                      $q->where('branch_id', $branch->id);
                  });
            })
            ->orWhere(function($q) use ($currentBranchId, $branch) {
                $q->where('receiver_branch_id', $branch->id)
                  ->whereHas('sender', function($q) use ($currentBranchId) {
                      $q->where('branch_id', $currentBranchId);
                  });
            })
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($messages);
    }

    public function store(\Illuminate\Http\Request $request, \App\Models\Branch $branch, \App\Services\OneSignalService $oneSignal)
    {
        $request->validate([
            'content' => 'required|string'
        ]);

        $message = \App\Models\Message::create([
            'sender_id' => auth()->id(),
            'receiver_branch_id' => $branch->id,
            'content' => $request->content
        ]);

        // Broadcast event
        $message->load('sender');
        broadcast(new \App\Events\MessageSent($message))->toOthers();

        // Send OneSignal Notification
        // Get all users in the receiver branch with a player ID
        $receiverPlayerIds = \App\Models\User::where('branch_id', $branch->id)
            ->whereNotNull('onesignal_player_id')
            ->pluck('onesignal_player_id')
            ->toArray();
        
        $oneSignal->sendNotification(
            auth()->user()->name . ': ' . $request->content,
            $receiverPlayerIds,
            ['branch_id' => auth()->user()->branch_id]
        );

        return response()->json($message->load('sender'));
    }

    public function storeOneSignalId(Request $request)
    {
        $request->validate([
            'player_id' => 'required|string'
        ]);

        auth()->user()->update([
            'onesignal_player_id' => $request->player_id
        ]);

        return response()->json(['status' => 'success']);
    }

}
