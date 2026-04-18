<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Branch;
use App\Models\Message;
use App\Models\User;
use App\Models\UserNotificationView;
use App\Services\OneSignalService;
use Illuminate\Support\Facades\DB;
use App\Events\MessageSent;

class ChatController extends Controller
{
    /**
     * List all branches (for Admins) or just the user's branch (for Employees).
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->hasRole('System Administrator');

        if ($isAdmin) {
            $branches = Branch::select('id', 'branch_name', 'location')->get();
        } else {
            $branches = Branch::where('id', $user->branch_id)
                ->select('id', 'branch_name', 'location')
                ->get();
        }

        return response()->json([
            'branches' => $branches,
            'user' => [
                'id' => $user->id,
                'branch_id' => $user->branch_id,
                'is_admin' => $isAdmin
            ]
        ]);
    }

    /**
     * Fetch messages for a specific branch.
     */
    public function show(Request $request, Branch $branch)
    {
        $user = $request->user();
        $currentBranchId = $user->branch_id;
        $currentUserId = $user->id;

        $query = Message::with(['sender:id,name,branch_id', 'sender.branch:id,branch_name'])
            ->where(function($q) use ($currentBranchId, $branch, $currentUserId) {
                // Inter-branch logic
                $q->where(function($inner) use ($currentBranchId, $branch) {
                    $inner->where('receiver_branch_id', $currentBranchId)
                          ->whereHas('sender', function($s) use ($branch) {
                              $s->where('branch_id', $branch->id);
                          });
                })->orWhere(function($inner) use ($branch, $currentBranchId, $currentUserId) {
                    $inner->where('receiver_branch_id', $branch->id);
                    if ($currentBranchId) {
                        $inner->whereHas('sender', function($s) use ($currentBranchId) {
                            $s->where('branch_id', $currentBranchId);
                        });
                    } else {
                        $inner->where('sender_id', $currentUserId);
                    }
                });
            });

        // If it's the SAME branch, we are doing internal chat logic as well
        if ($currentBranchId === $branch->id) {
            $query->orWhere(function($q) use ($currentBranchId) {
                $q->where('receiver_branch_id', $currentBranchId)
                  ->whereHas('sender', function($s) use ($currentBranchId) {
                      $s->where('branch_id', $currentBranchId);
                  });
            });
        }

        // Mark unread messages as read
        $unreadMessageIds = Message::where('receiver_branch_id', $currentBranchId)
            ->whereHas('sender', function($s) use ($branch) {
                $s->where('branch_id', $branch->id);
            })
            ->where('sender_id', '!=', $currentUserId)
            ->whereNotIn('id', function($sub) use ($currentUserId) {
                $sub->select('viewable_id')
                    ->from('user_notification_views')
                    ->where('viewable_type', 'chat')
                    ->where('user_id', $currentUserId);
            })
            ->pluck('id');

        $inserts = [];
        foreach($unreadMessageIds as $msgId) {
            $inserts[] = [
                'user_id' => $currentUserId,
                'viewable_type' => 'chat',
                'viewable_id' => $msgId,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        if (!empty($inserts)) {
            UserNotificationView::insertOrIgnore($inserts);
        }

        // Search
        if ($request->filled('query')) {
            $query->where('content', 'like', '%' . $request->input('query') . '%');
        }

        // Pagination
        $messages = $query->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 50));

        return response()->json($messages);
    }

    /**
     * Store a new message.
     */
    public function store(Request $request, Branch $branch, OneSignalService $oneSignal)
    {
        $request->validate([
            'content' => 'required_without:attachment|string|nullable',
            'attachment' => 'nullable|image|max:2048',
        ]);

        $user = $request->user();
        $senderBranchId = $user->branch_id;
        
        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $filename = date('YmdHis') . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('chat_photos', $filename, 'public');
            $attachmentPath = $path;
        }

        $message = Message::create([
            'sender_id' => $user->id,
            'receiver_branch_id' => $branch->id,
            'content' => $request->content ?? '',
            'attachment_path' => $attachmentPath,
        ]);

        // Broadcast
        try {
            $message->load('sender.branch');
            broadcast(new MessageSent($message))->toOthers();
        } catch (\Exception $e) {
            \Log::error('Mobile Broadcast failed: ' . $e->getMessage());
        }

        // OneSignal Notification
        try {
            $receiverPlayerIds = User::where('branch_id', $branch->id)
                ->where('id', '!=', $user->id)
                ->whereNotNull('onesignal_player_id')
                ->pluck('onesignal_player_id')
                ->toArray();

            if (!empty($receiverPlayerIds)) {
                $senderName = $user->name . ($senderBranchId ? ' (' . Branch::find($senderBranchId)->branch_name . ')' : '');
                $oneSignal->sendNotification(
                    $senderName . ': ' . ($request->content ?? 'Sent an image'),
                    $receiverPlayerIds,
                    'Branch Chat',
                    ['branch_id' => $senderBranchId, 'message_id' => $message->id]
                );
            }
        } catch (\Exception $e) {
            \Log::error('Mobile OneSignal failed: ' . $e->getMessage());
        }

        return response()->json($message->load(['sender.branch']));
    }
}
