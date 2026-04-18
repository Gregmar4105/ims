<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Message;
use App\Models\Sale;
use App\Models\Transfer;
use App\Models\UserNotificationView;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $branchId = $user->branch_id;

        if (!$branchId) {
            return response()->json([
                'total' => 0,
                'counts' => ['chats' => 0, 'sales' => 0, 'transfers' => 0],
                'notifications' => [],
            ]);
        }

        $isEmployee = $user->hasRole('Employee');

        // Get viewed IDs
        $viewed = UserNotificationView::where('user_id', $user->id)
            ->get()
            ->groupBy('viewable_type');

        // Chats
        $chats = Message::with('sender.branch')
            ->where('receiver_branch_id', $branchId)
            ->where('sender_id', '!=', $user->id)
            ->latest()
            ->take(20)
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'type' => 'chat',
                'title' => 'New Message',
                'message' => ($c->sender?->name ?? 'User') . ': ' . $c->content,
                'is_read' => isset($viewed['chat']) && $viewed['chat']->contains('viewable_id', $c->id),
                'created_at' => $c->created_at,
                'link' => "/mobile/chats/" . ($c->sender?->branch_id ?? $branchId)
            ]);

        // Sales (Admins only)
        $sales = collect();
        if (!$isEmployee) {
            $sales = Sale::where('branch_id', $branchId)
                ->where('status', 'readied')
                ->latest()
                ->take(20)
                ->get()
                ->map(fn($s) => [
                    'id' => $s->id,
                    'type' => 'sale',
                    'title' => 'Sale Pending Approval',
                    'message' => "Sale #{$s->id} requires your review.",
                    'is_read' => isset($viewed['sale']) && $viewed['sale']->contains('viewable_id', $s->id),
                    'created_at' => $s->created_at,
                    'link' => "/mobile/sales/{$s->id}"
                ]);
        }

        // Transfers
        $transfers = collect();
        if (!$isEmployee) {
            $transfers = Transfer::where(function($q) use ($branchId) {
                $q->where('destination_branch_id', $branchId)->where('status', 'outgoing');
            })->orWhere(function($q) use ($branchId) {
                $q->where('source_branch_id', $branchId)->where('status', 'readied');
            })
            ->latest()
            ->take(20)
            ->get()
            ->map(fn($t) => [
                'id' => $t->id,
                'type' => 'transfer',
                'title' => $t->status === 'outgoing' ? 'Incoming Transfer' : 'Transfer Pending Ship',
                'message' => "Transfer #{$t->id} is {$t->status}",
                'is_read' => isset($viewed['transfer']) && $viewed['transfer']->contains('viewable_id', $t->id),
                'created_at' => $t->created_at,
                'link' => "/mobile/transfers/{$t->id}"
            ]);
        }

        $all = $chats->concat($sales)->concat($transfers)->sortByDesc('created_at')->values();

        return response()->json([
            'total' => $all->where('is_read', false)->count(),
            'notifications' => $all
        ]);
    }
}
