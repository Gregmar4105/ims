<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function index()
    {
        // List all branches except current user's branch
        $branches = \App\Models\Branch::where('id', '!=', auth()->user()->branch_id)->get();

        $activeTransfers = [];
        $user = auth()->user();
        if ($user->branch_id) {
             $activeTransfers = \App\Models\Transfer::with(['sourceBranch', 'destinationBranch'])
                ->where(function($q) use ($user) {
                    // I am the sender: I can see readied (pending) and outgoing
                    $q->where('source_branch_id', $user->branch_id)
                      ->whereIn('status', ['readied', 'outgoing']);
                })
                ->orWhere(function($q) use ($user) {
                    // I am the receiver: I can ONLY see outgoing (on the way)
                    $q->where('destination_branch_id', $user->branch_id)
                      ->where('status', 'outgoing');
                })
                ->latest()
                ->get();
        }

        return inertia('Chats/Index', [
            'branches' => $branches,
            'activeTransfers' => $activeTransfers
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
            ->orderBy('created_at', 'desc')
            ->take(20)
            ->get()
            ->reverse()
            ->values();

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
        // Broadcast event
        try {
            $message->load('sender');
            broadcast(new \App\Events\MessageSent($message))->toOthers();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Broadcast failed: ' . $e->getMessage());
        }

        // Send OneSignal Notification
        try {
            // Get all users in the receiver branch with a player ID
            $receiverPlayerIds = \App\Models\User::where('branch_id', $branch->id)
                ->whereNotNull('onesignal_player_id')
                ->pluck('onesignal_player_id')
                ->toArray();
            
            $senderBranchName = \App\Models\Branch::find(auth()->user()->branch_id)->branch_name ?? 'IMS Chat';

            $oneSignal->sendNotification(
                auth()->user()->name . ': ' . $request->content,
                $receiverPlayerIds,
                $senderBranchName,
                ['branch_id' => auth()->user()->branch_id]
            );
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('OneSignal notification failed: ' . $e->getMessage());
        }

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
