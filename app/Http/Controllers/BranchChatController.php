<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class BranchChatController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        
        // Employee's own branch
        $branch = \App\Models\Branch::find($user->branch_id);

        return inertia('BranchChat/Index', [
            'branch' => $branch,
        ]);
    }

    public function show(Request $request)
    {
        // Get internal messages for the current user's branch
        $currentBranchId = auth()->user()->branch_id;
        
        $query = \App\Models\Message::with(['sender.branch', 'replyTo.sender'])
            ->where('receiver_branch_id', $currentBranchId)
            ->whereHas('sender', function($q) use ($currentBranchId) {
                // Sender must also be from the exact same branch for it to be internal
                $q->where('branch_id', $currentBranchId);
            });

        // Mark unread messages as read FOR THIS USER
    $userId = auth()->id();
    $unreadMessageIds = \App\Models\Message::where('receiver_branch_id', $currentBranchId)
        ->whereHas('sender', function($q) use ($currentBranchId) {
            $q->where('branch_id', $currentBranchId);
        })
        ->where('sender_id', '!=', $userId)
        ->whereNotIn('id', function($query) use ($userId) {
            $query->select('viewable_id')
                  ->from('user_notification_views')
                  ->where('viewable_type', 'chat')
                  ->where('user_id', $userId);
        })
        ->pluck('id');

    $inserts = [];
    foreach($unreadMessageIds as $msgId) {
        $inserts[] = [
            'user_id' => $userId,
            'viewable_type' => 'chat',
            'viewable_id' => $msgId,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
    if (!empty($inserts)) {
        \App\Models\UserNotificationView::insertOrIgnore($inserts);
    }

        // Search functionality
        if ($request->has('query') && !empty($request->input('query'))) {
            $searchTerm = '%' . $request->input('query') . '%';
            $query->where('content', 'like', $searchTerm);
        }

        // Pagination: Load older messages
        if ($request->has('before_id')) {
            $query->where('id', '<', $request->before_id);
        }
        
        // Polling: Load newer messages
        if ($request->has('after_id')) {
            $query->where('id', '>', $request->after_id);
            $messages = $query->orderBy('created_at', 'asc')->get();
            return response()->json($messages);
        }
            
        $messages = $query->orderBy('created_at', 'desc')
            ->take(50)
            ->get()
            ->sortBy('id')
            ->values();

        return response()->json($messages);
    }

    public function media(Request $request)
    {
        $currentBranchId = auth()->user()->branch_id;
        
        $media = \App\Models\Message::whereNotNull('attachment_path')
            ->where('receiver_branch_id', $currentBranchId)
            ->whereHas('sender', function($s) use ($currentBranchId) {
                $s->where('branch_id', $currentBranchId);
            })
            ->orderBy('created_at', 'desc')
            ->get(['id', 'attachment_path', 'created_at']);

        // Group by date
        $grouped = $media->groupBy(function($item) {
            return $item->created_at->format('Y-m-d');
        });

        return response()->json($grouped);
    }

    public function store(\Illuminate\Http\Request $request, \App\Services\OneSignalService $oneSignal)
    {
        $request->validate([
            'content' => 'nullable|string',
            'attachment' => 'nullable|image|max:2048', // Max 2MB
            'reply_to_message_id' => 'nullable|exists:messages,id',
        ]);

        if (empty($request->content) && !$request->hasFile('attachment')) {
            return response()->json(['message' => 'Message content or attachment is required.'], 422);
        }

        $senderBranchId = auth()->user()->branch_id;
        
        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $filename = date('YmdHis') . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('chat_photos', $filename, 'public');
            $attachmentPath = $path;
        }

        $message = \App\Models\Message::create([
            'sender_id' => auth()->id(),
            'receiver_branch_id' => $senderBranchId, // Self branch = internal
            'content' => $request->content ?? '',
            'attachment_path' => $attachmentPath,
            'reply_to_message_id' => $request->reply_to_message_id,
        ]);

        // Broadcast event
        try {
            $message->load('sender');
            broadcast(new \App\Events\MessageSent($message))->toOthers();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Broadcast failed: ' . $e->getMessage());
        }

        // Send OneSignal Notification to other branch members
        try {
            $currentUser = auth()->user();
            
            // Get all other users in EXACTLY the same branch
            $query = \App\Models\User::where('branch_id', $senderBranchId)
                ->where('id', '!=', $currentUser->id)
                ->whereNotNull('onesignal_player_id');

            $receiverPlayerIds = $query->pluck('onesignal_player_id')->toArray();
            
            \Illuminate\Support\Facades\Log::info("BranchChat OneSignal Target: Branch {$senderBranchId}, Found " . count($receiverPlayerIds) . " recipients.");
            \Illuminate\Support\Facades\Log::info("Excluded Sender ID: {$currentUser->id} (Player ID: {$currentUser->onesignal_player_id})");

            $senderBranchName = \App\Models\Branch::find($senderBranchId)->branch_name ?? 'Branch Chat';

            if (!empty($receiverPlayerIds)) {
                $response = $oneSignal->sendNotification(
                    $currentUser->name . ' (Internal): ' . $request->content,
                    $receiverPlayerIds,
                    $senderBranchName,
                    ['branch_id' => $senderBranchId, 'internal' => true]
                );
                \Illuminate\Support\Facades\Log::info("BranchChat OneSignal Response: " . json_encode($response));
            } else {
                \Illuminate\Support\Facades\Log::warning("BranchChat OneSignal: No recipients found for branch {$senderBranchId}");
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('OneSignal notification failed: ' . $e->getMessage());
        }

        return response()->json($message->load(['sender.branch', 'replyTo.sender']));
    }
}
