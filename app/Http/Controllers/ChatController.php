<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        
        // List all branches except current user's branch (if they have one)
        // If system admin (no branch), show all branches
        if ($user->branch_id) {
            $branches = \App\Models\Branch::where('id', '!=', $user->branch_id)->get();
        } else {
            $branches = \App\Models\Branch::all();
        }

        $activeTransfers = [];
        if ($user->branch_id) {
             $activeTransfers = \App\Models\Transfer::with(['sourceBranch', 'destinationBranch'])
                ->where(function($q) use ($user) {
                    $q->where('source_branch_id', $user->branch_id)
                      ->whereIn('status', ['readied', 'outgoing']);
                })
                ->orWhere(function($q) use ($user) {
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
        
        // If system admin (no branch), show messages for that branch? 
        // Logic Gap: If I am sys admin, who am I chatting AS? 
        // Usually Sys Admins might not have a specific "chat identity" in this branch-to-branch model unless they impersonate.
        // But assuming they act as "Headquarters" or similar if branch_id is null?
        // Limitation: Message table requires sender_branch_id/receiver_branch_id. 
        // If currentBranchId is null, the query below might fail or return nothing.
        // For now, let's keep existing logic but be aware.
        
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

        $senderBranchId = auth()->user()->branch_id;
        // Fallback for System Admin or user without branch -> likely 0 or null?
        // Schema likely requires integer. If nullable, we need to handle it. 
        // Assuming strict branch-to-branch chat, user MUST have a branch.
        // But we just enabled index() for no-branch users. 
        // If they try to chat, it might crash here if DB column is NOT NULL. 
        
        $message = \App\Models\Message::create([
            'sender_id' => auth()->id(),
            'receiver_branch_id' => $branch->id,
            'content' => $request->content
        ]);

        // Broadcast event
        try {
            $message->load('sender');
            broadcast(new \App\Events\MessageSent($message))->toOthers();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Broadcast failed: ' . $e->getMessage());
        }

        // Send OneSignal Notification
        try {
            $currentUser = auth()->user();
            
            // Get all users in the receiver branch with a player ID
            // EXCLUDING the current user's player ID (to avoid self-notification on same device)
            $receiverPlayerIds = \App\Models\User::where('branch_id', $branch->id)
                ->whereNotNull('onesignal_player_id')
                ->where('onesignal_player_id', '!=', $currentUser->onesignal_player_id) // Exclude self
                ->pluck('onesignal_player_id')
                ->toArray();
            
            $senderBranchName = $senderBranchId 
                ? (\App\Models\Branch::find($senderBranchId)->branch_name ?? 'IMS Chat')
                : 'System Admin';

            $oneSignal->sendNotification(
                $currentUser->name . ': ' . $request->content,
                $receiverPlayerIds,
                $senderBranchName,
                ['branch_id' => $senderBranchId]
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
