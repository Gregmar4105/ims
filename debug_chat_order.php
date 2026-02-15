<?php

use App\Models\User;
use App\Models\Branch;
use App\Models\Message;
use Illuminate\Support\Facades\DB;

// Create dummy data
$sender = User::first();
if (!$sender) {
    echo "No users found.\n";
    exit;
}

$branch = Branch::where('id', '!=', $sender->branch_id ?? 0)->first();
if (!$branch) {
    $branch = Branch::factory()->create();
}

$receiverBranchId = $branch->id;
$senderBranchId = $sender->branch_id;

// Create 3 messages with distinct timestamps
Message::create(['sender_id' => $sender->id, 'receiver_branch_id' => $receiverBranchId, 'content' => 'Oldest', 'created_at' => now()->subMinutes(10)]);
Message::create(['sender_id' => $sender->id, 'receiver_branch_id' => $receiverBranchId, 'content' => 'Middle', 'created_at' => now()->subMinutes(5)]);
Message::create(['sender_id' => $sender->id, 'receiver_branch_id' => $receiverBranchId, 'content' => 'Newest', 'created_at' => now()]);

// Simulate Controller Logic
$query = Message::where('receiver_branch_id', $receiverBranchId)
->orWhere('receiver_branch_id', $senderBranchId);

// Basic query just grab everything to be sure we match
$messages = Message::orderBy('created_at', 'desc')
    ->take(50)
    ->get()
    ->reverse()
    ->values();

echo "Count: " . $messages->count() . "\n";
foreach ($messages as $k => $m) {
    echo "[$k] " . $m->content . " (" . $m->created_at . ")\n";
}
