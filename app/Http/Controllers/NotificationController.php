<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Message;
use App\Models\Sale;
use App\Models\Transfer;
use App\Models\UserNotificationView;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $branchId = $user->branch_id;

        if (!$branchId || $user->hasRole('Employee')) {
            return response()->json([
                'total' => 0,
                'counts' => ['chats' => 0, 'sales' => 0, 'transfers' => 0],
                'chats' => [],
                'sales' => [],
                'transfers' => [],
            ]);
        }

        // Get IDs of viewed notifications for this user
        $viewedSales = UserNotificationView::where('user_id', $user->id)
            ->where('viewable_type', 'sale')
            ->pluck('viewable_id');

        $viewedTransfers = UserNotificationView::where('user_id', $user->id)
            ->where('viewable_type', 'transfer')
            ->pluck('viewable_id');

        // 1. Unread Chats (Messages to this branch, not read yet)
        $unreadChats = Message::with('sender.branch')
            ->where('receiver_branch_id', $branchId)
            ->whereNull('read_at')
            ->latest()
            ->get();

        // 2. Pending Sales
        $pendingSales = Sale::where('branch_id', $branchId)
            ->where('status', 'readied')
            ->whereNotIn('id', $viewedSales)
            ->latest()
            ->get();

        // 3. Incoming Transfers
        $incomingTransfers = Transfer::with('sourceBranch')
            ->where('destination_branch_id', $branchId)
            ->where('status', 'outgoing')
            ->whereNotIn('id', $viewedTransfers)
            ->latest()
            ->get();

        // 4. Pending Outgoing Transfers
        $readiedTransfers = Transfer::with('destinationBranch')
            ->where('source_branch_id', $branchId)
            ->where('status', 'readied')
            ->whereNotIn('id', $viewedTransfers)
            ->latest()
            ->get();

        $total = $unreadChats->count() + $pendingSales->count() + $incomingTransfers->count() + $readiedTransfers->count();

        return response()->json([
            'total' => $total,
            'counts' => [
                'chats' => $unreadChats->count(),
                'sales' => $pendingSales->count(),
                'transfers' => $incomingTransfers->count() + $readiedTransfers->count(),
            ],
            'chats' => $unreadChats->take(20),
            'sales' => $pendingSales->take(20),
            'transfers' => $incomingTransfers->merge($readiedTransfers)->sortByDesc('created_at')->take(20)->values(),
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
            $message = Message::find($id);
            if ($message && $message->receiver_branch_id == $user->branch_id) {
                $message->update(['read_at' => now()]);
            }
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

        if (!$branchId) {
            return response()->json(['success' => false]);
        }

        DB::transaction(function () use ($user, $branchId) {
            // 1. Mark all chats as read
            Message::where('receiver_branch_id', $branchId)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);

            // 2. Mark all Sales as read (viewed)
            $pendingSales = Sale::where('branch_id', $branchId)
                ->where('status', 'readied')
                ->pluck('id');
            
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
