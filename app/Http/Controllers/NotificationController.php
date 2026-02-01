<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Message;
use App\Models\Sale;
use App\Models\Transfer;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $branchId = $user->branch_id;

        if (!$branchId) {
            return response()->json([
                'total' => 0,
                'chats' => [],
                'sales' => [],
                'transfers' => [],
            ]);
        }

        // 1. Unread Chats (Messages to this branch, not read yet)
        $unreadChats = Message::with('sender.branch')
            ->where('receiver_branch_id', $branchId)
            ->whereNull('read_at')
            ->latest()
            ->get();

        // Group by sender branch/user if needed, but for now list individual messages or grouped by conversation
        // Let's return individual unread messages but limit to recent 5 for dropdown
        // The total count is what matters most for the badge.

        // 2. Pending Sales (Sales in this branch with status 'pending')
        $pendingSales = Sale::where('branch_id', $branchId)
            ->where('status', 'pending')
            ->latest()
            ->get();

        // 3. Incoming Transfers (Transfers TO this branch with status 'outgoing')
        // 'outgoing' from source means it's on the way to destination.
        $incomingTransfers = Transfer::with('sourceBranch')
            ->where('destination_branch_id', $branchId)
            ->where('status', 'outgoing')
            ->latest()
            ->get();

        $total = $unreadChats->count() + $pendingSales->count() + $incomingTransfers->count();

        return response()->json([
            'total' => $total,
            'counts' => [
                'chats' => $unreadChats->count(),
                'sales' => $pendingSales->count(),
                'transfers' => $incomingTransfers->count(),
            ],
            'chats' => $unreadChats->take(20),
            'sales' => $pendingSales->take(20),
            'transfers' => $incomingTransfers->take(20),
        ]);
    }
}
