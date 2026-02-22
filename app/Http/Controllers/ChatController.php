<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        
        $isEmployee = $user->hasRole('Employee') && !$user->hasRole('System Administrator') && !$user->hasRole('Branch Administrator');
        $initialBranch = null;

        if ($isEmployee) {
            if ($user->branch_id) {
                $branches = \App\Models\Branch::where('id', $user->branch_id)->get();
                $initialBranch = $branches->first();
            } else {
                $branches = collect([]);
            }
        } else {
            // Include own branch for admins so they can see their own branch conversation
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

        $initialBranch = null;
        if (request()->has('branch_id')) {
            $initialBranch = \App\Models\Branch::find(request()->branch_id);
        }

        return inertia('Chats/Index', [
            'branches' => $branches,
            'activeTransfers' => $activeTransfers,
            'initialBranch' => $initialBranch
        ]);
    }

    public function show(\App\Models\Branch $branch, Request $request)
    {
        // Get messages between current user's branch and target branch
        $currentBranchId = auth()->user()->branch_id;
        
        $currentUserId = auth()->id();
        
        $query = \App\Models\Message::with(['sender.branch'])
            ->where(function($query) use ($currentBranchId, $branch, $currentUserId) {
                $query->where(function($q) use ($currentBranchId, $branch) {
                    // Incoming: From target branch to my branch (or me if no branch)
                    $q->where('receiver_branch_id', $currentBranchId)
                      ->whereHas('sender', function($q) use ($branch) {
                          $q->where('branch_id', $branch->id);
                      });
                })

                ->orWhere(function($q) use ($branch, $currentBranchId, $currentUserId) {
                    // Outgoing: From me (or my branch) to target branch
                    $q->where('receiver_branch_id', $branch->id);
                    
                    if ($currentBranchId) {
                        // If I have a branch, show messages from ANYONE in my branch
                        $q->whereHas('sender', function($sq) use ($currentBranchId) {
                            $sq->where('branch_id', $currentBranchId);
                        });
                    } else {
                        // If I am system admin (no branch), show my messages
                        $q->where('sender_id', $currentUserId);
                    }
                });
            });

        // Mark unread messages as read
        \App\Models\Message::where('receiver_branch_id', $currentBranchId)
            ->whereHas('sender', function($q) use ($branch) {
                $q->where('branch_id', $branch->id);
            })
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

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
            // When polling for new stuff, we usually want EVERYTHING new, effectively.
            // But let's keep a sane limit or just pagination if really necessary.
            // For chat polling, usually we just want all new messages.
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

    public function media(\App\Models\Branch $branch)
    {
        $currentBranchId = auth()->user()->branch_id;
        
        $media = \App\Models\Message::whereNotNull('attachment_path')
            ->where(function($q) use ($currentBranchId, $branch) {
                $q->where(function($inner) use ($currentBranchId, $branch) {
                    $inner->where('receiver_branch_id', $currentBranchId)
                          ->whereHas('sender', function($s) use ($branch) {
                              $s->where('branch_id', $branch->id);
                          });
                })->orWhere(function($inner) use ($currentBranchId, $branch) {
                    $inner->where('receiver_branch_id', $branch->id)
                          ->whereHas('sender', function($s) use ($currentBranchId) {
                              $s->where('branch_id', $currentBranchId);
                          });
                });
            })
            ->orderBy('created_at', 'desc')
            ->get(['id', 'attachment_path', 'created_at']);

        // Group by date
        $grouped = $media->groupBy(function($item) {
            return $item->created_at->format('Y-m-d');
        });

        return response()->json($grouped);
    }

    public function store(\Illuminate\Http\Request $request, \App\Models\Branch $branch, \App\Services\OneSignalService $oneSignal)
    {
        $request->validate([
            'content' => 'required_without:attachment|string|nullable',
            'attachment' => 'nullable|image|max:2048', // Max 2MB
        ]);

        $senderBranchId = auth()->user()->branch_id;
        
        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            // Timestamped filename: YYYYMMDDHHMMSS_uniqid.ext
            $filename = date('YmdHis') . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            // Store in storage/app/public/chat_photos
            $path = $file->storeAs('chat_photos', $filename, 'public');
            $attachmentPath = $path;
        }

        $message = \App\Models\Message::create([
            'sender_id' => auth()->id(),
            'receiver_branch_id' => $branch->id,
            'content' => $request->content ?? '', // Allow empty content if attachment exists
            'attachment_path' => $attachmentPath,
        ]);

        // Broadcast event
        try {
            $message->load('sender');
            broadcast(new \App\Events\MessageSent($message))->toOthers();
            \Illuminate\Support\Facades\Log::info('Broadcast attempted for message ' . $message->id);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Broadcast failed: ' . $e->getMessage());
            \Illuminate\Support\Facades\Log::error($e->getTraceAsString());
        }

        // Send OneSignal Notification
        try {
            $currentUser = auth()->user();
            
            // Get all users in the receiver branch with a player ID
            $query = \App\Models\User::where('branch_id', $branch->id)
                ->whereNotNull('onesignal_player_id');
            
            // Only exclude current user if they have a player ID
            if ($currentUser->onesignal_player_id) {
                $query->where('onesignal_player_id', '!=', $currentUser->onesignal_player_id);
            }

            $receiverPlayerIds = $query->pluck('onesignal_player_id')->toArray();
            
            \Illuminate\Support\Facades\Log::info("OneSignal Target: Branch {$branch->id}, Found " . count($receiverPlayerIds) . " recipients.");
            \Illuminate\Support\Facades\Log::info("Excluded Sender ID: " . $currentUser->onesignal_player_id);

            $senderBranchName = 'System Admin'; // Default
            if ($senderBranchId) {
                $senderBranch = \App\Models\Branch::find($senderBranchId);
                if ($senderBranch) {
                    $senderBranchName = $senderBranch->branch_name;
                }
            }

            if (!empty($receiverPlayerIds)) {
                $response = $oneSignal->sendNotification(
                    $currentUser->name . ': ' . $request->content,
                    $receiverPlayerIds,
                    $senderBranchName,
                    ['branch_id' => $senderBranchId]
                );
                \Illuminate\Support\Facades\Log::info("OneSignal Response: " . json_encode($response));
            } else {
                \Illuminate\Support\Facades\Log::warning("OneSignal: No recipients found for branch {$branch->id}");
            }

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('OneSignal notification failed: ' . $e->getMessage());
        }

        return response()->json($message->load(['sender.branch']));
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
