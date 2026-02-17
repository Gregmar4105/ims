<?php

use App\Models\User;
use App\Models\Message;
use App\Models\Sale;
use App\Models\Transfer;
use App\Models\UserNotificationView;

// Find a branch admin
$user = User::role('Branch Administrator')->first();

if (!$user) {
    echo "No Branch Administrator found.\n";
    exit;
}

echo "Checking notifications for User ID: {$user->id}, Branch ID: {$user->branch_id}\n";
$branchId = $user->branch_id;

// 1. Chats
$chats = Message::with('sender.branch')
    ->where('receiver_branch_id', $branchId)
    ->latest()
    ->take(100)
    ->get();

echo "Chats Count: " . $chats->count() . "\n";
foreach ($chats->take(3) as $chat) {
    echo " - Chat ID: {$chat->id}, ReadAt: {$chat->read_at}\n";
}

// 2. Sales
$sales = Sale::where('branch_id', $branchId)
    ->where('status', 'readied')
    ->latest()
    ->take(100)
    ->get();

echo "Sales (Readied) Count: " . $sales->count() . "\n";

// Check ALL sales to see if there are others
$allSales = Sale::where('branch_id', $branchId)->count();
echo "Total Sales for Branch: $allSales\n";

// 3. Incoming Transfers
$incomingTransfers = Transfer::with('sourceBranch')
    ->where('destination_branch_id', $branchId)
    ->where('status', 'outgoing')
    ->latest()
    ->take(100)
    ->get();

echo "Incoming Transfers (Outgoing) Count: " . $incomingTransfers->count() . "\n";

// 4. Readied Transfers
$readiedTransfers = Transfer::with('destinationBranch')
    ->where('source_branch_id', $branchId)
    ->where('status', 'readied')
    ->latest()
    ->take(100)
    ->get();
    
echo "Outgoing Transfers (Readied) Count: " . $readiedTransfers->count() . "\n";

