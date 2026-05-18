<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Message;
use App\Models\Sale;
use App\Models\Transfer;
use App\Models\UserNotificationView;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function view()
    {
        return Inertia::render('Notifications/Index');
    }

    public function index()
    {
        $user = auth()->user();
        $branchId = $user->branch_id;

        if (!$branchId) {
            return response()->json([
                'total' => 0,
                'counts' => ['chats' => 0, 'sales' => 0, 'transfers' => 0],
                'chats' => [],
                'sales' => [],
                'transfers' => [],
            ]);
        }

        $isEmployee = $user->hasRole('Employee');

        // Get IDs of viewed notifications for this user
        $viewedChats = UserNotificationView::where('user_id', $user->id)
            ->where('viewable_type', 'chat')
            ->pluck('viewable_id');
            
        $viewedSales = collect();
        $viewedTransfers = collect();

        if (!$isEmployee) {
            $viewedSales = UserNotificationView::where('user_id', $user->id)
                ->where('viewable_type', 'sale')
                ->pluck('viewable_id');

            $viewedTransfers = UserNotificationView::where('user_id', $user->id)
                ->where('viewable_type', 'transfer')
                ->pluck('viewable_id');
        }

        // 1. Chats (Read & Unread)
        $chatsQuery = Message::with('sender.branch')
            ->where('receiver_branch_id', $branchId)
            ->where('sender_id', '!=', $user->id); // Never show messages sent by the current user

        if ($isEmployee) {
            // Employees should only see internal branch notifications
            $chatsQuery->whereHas('sender', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }

        $chats = $chatsQuery->latest()
            ->take(100)
            ->get()
            ->map(function ($chat) use ($viewedChats) {
                $chat->is_read = $viewedChats->contains($chat->id);
                return $chat;
            });

        // 2. Sales (Read & Unread) - Admins only
        $sales = collect();
        if (!$isEmployee) {
            $sales = Sale::where('branch_id', $branchId)
                ->where('status', 'readied')
                ->latest()
                ->take(100)
                ->get()
                ->map(function ($sale) use ($viewedSales) {
                    $sale->is_read = $viewedSales->contains($sale->id);
                    return $sale;
                });
        }

        // 3. Incoming Transfers - Admins only
        $incomingTransfers = collect();
        if (!$isEmployee) {
            $incomingTransfers = Transfer::with('sourceBranch')
                ->where('destination_branch_id', $branchId)
                ->where('status', 'outgoing')
                ->latest()
                ->take(100)
                ->get()
                ->map(function ($transfer) use ($viewedTransfers) {
                    $transfer->is_read = $viewedTransfers->contains($transfer->id);
                    return $transfer;
                });
        }

        // 4. Pending Outgoing Transfers - Admins only
        $readiedTransfers = collect();
        if (!$isEmployee) {
            $readiedTransfers = Transfer::with('destinationBranch')
                ->where('source_branch_id', $branchId)
                ->where('status', 'readied')
                ->latest()
                ->take(50)
                ->get()
                ->map(function ($transfer) use ($viewedTransfers) {
                    $transfer->is_read = $viewedTransfers->contains($transfer->id);
                    return $transfer;
                });
        }

        // Calculate counts based on UNREAD
        $unreadChatsCount = $chats->where('is_read', false)->count();
        $unreadSalesCount = $sales->where('is_read', false)->count();
        $unreadTransfersCount = $incomingTransfers->where('is_read', false)->count() + $readiedTransfers->where('is_read', false)->count();

        $total = $unreadChatsCount + $unreadSalesCount + $unreadTransfersCount;

        return response()->json([
            'total' => $total,
            'counts' => [
                'chats' => $unreadChatsCount,
                'sales' => $unreadSalesCount,
                'transfers' => $unreadTransfersCount,
            ],
            'chats' => $chats->values(),
            'sales' => $sales->values(),
            'transfers' => $incomingTransfers->merge($readiedTransfers)->sortByDesc('created_at')->values(),
        ]);
    }

    public function markAsRead(Request $request)
    {
        $request->validate([
            'type' => 'required|in:chat,sale,transfer',
            'id' => 'required', // String for chat (chat-123), numeric for others usually
        ]);

        $user = auth()->user();
        $id = $request->id;

        // If ID comes as "chat-123", strip prefix if needed, though usually handled by frontend
        // Assuming frontend sends raw ID and Type.
        // But notification-bell.tsx uses compound IDs like "chat-123".
        // Let's assume frontend parses it or sends raw ID. 
        // Plan: Frontend will send raw ID.

        if ($request->type === 'chat') {
            UserNotificationView::firstOrCreate([
                'user_id' => $user->id,
                'viewable_type' => 'chat',
                'viewable_id' => $id,
            ]);
        } elseif ($request->type === 'sale') {
            UserNotificationView::firstOrCreate([
                'user_id' => $user->id,
                'viewable_type' => 'sale',
                'viewable_id' => $id,
            ]);
        } elseif ($request->type === 'transfer') {
            UserNotificationView::firstOrCreate([
                'user_id' => $user->id,
                'viewable_type' => 'transfer',
                'viewable_id' => $id,
            ]);
        }

        return response()->json(['success' => true]);
    }

    public function markAllAsRead(Request $request)
    {
        $user = auth()->user();
        $branchId = $user->branch_id;

        Log::info("Marking all as read for user {$user->id} branch {$branchId}");

        if (!$branchId) {
            return response()->json(['success' => false]);
        }

        DB::transaction(function () use ($user, $branchId) {
            // 1. Mark all chats as read
            $unreadChatIds = Message::where('receiver_branch_id', $branchId)
                 ->whereNotIn('id', function($query) use ($user) {
                     $query->select('viewable_id')
                           ->from('user_notification_views')
                           ->where('viewable_type', 'chat')
                           ->where('user_id', $user->id);
                 })
                 ->pluck('id');
                 
            $inserts = [];
            foreach($unreadChatIds as $msgId) {
                $inserts[] = [
                    'user_id' => $user->id,
                    'viewable_type' => 'chat',
                    'viewable_id' => $msgId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            if (!empty($inserts)) {
                UserNotificationView::insertOrIgnore($inserts);
            }
            
            Log::info("Marked " . count($inserts) . " chats as read");

            // 2. Mark all Sales as read (viewed)
            $pendingSales = Sale::where('branch_id', $branchId)
                ->where('status', 'readied')
                ->pluck('id');
            
            Log::info("Found pending sales to mark: " . $pendingSales->count());

            foreach ($pendingSales as $saleId) {
                UserNotificationView::firstOrCreate([
                    'user_id' => $user->id,
                    'viewable_type' => 'sale',
                    'viewable_id' => $saleId,
                ]);
            }

            // 3. Mark all Transfers as read (viewed)
            $incomingTransfers = Transfer::where('destination_branch_id', $branchId)
                ->where('status', 'outgoing')
                ->pluck('id');
            
            $readiedTransfers = Transfer::where('source_branch_id', $branchId)
                ->where('status', 'readied')
                ->pluck('id');
            
            $allTransfers = $incomingTransfers->merge($readiedTransfers);

            Log::info("Found pending transfers to mark: " . $allTransfers->count());

            foreach ($allTransfers as $transferId) {
                UserNotificationView::firstOrCreate([
                    'user_id' => $user->id,
                    'viewable_type' => 'transfer',
                    'viewable_id' => $transferId,
                ]);
            }
        });

        return response()->json(['success' => true]);
    }
}
