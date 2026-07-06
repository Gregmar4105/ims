<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Transfer;
use App\Models\TransferItem;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TransferController extends Controller
{
    public function outgoing()
    {
        $user = auth()->user();
        
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if (!$branchId) {
            abort(403, 'User does not belong to a branch or no active branch selected');
        }

        $transfers = Transfer::with(['items.product', 'destinationBranch', 'readiedBy', 'approvedBy'])
            ->where('source_branch_id', $branchId)
            ->whereIn('status', ['readied', 'outgoing', 'requested', 'incomplete'])
            ->latest()
            ->get();

        $branches = Branch::where('id', '!=', $branchId)->get();

        return Inertia::render('Transfers/Outgoing', [
            'transfers' => $transfers,
            'branches' => $branches,
        ]);
    }

    public function printOutgoing(Request $request)
    {
        $user = auth()->user();
        
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if (!$branchId) {
            abort(403, 'User does not belong to a branch or no active branch selected');
        }

        $query = Transfer::with(['items.product', 'sourceBranch', 'destinationBranch', 'readiedBy', 'approvedBy', 'supplier'])
            ->where('source_branch_id', $branchId)
            ->whereIn('status', ['readied', 'outgoing', 'requested', 'incomplete'])
            ->latest();

        if ($request->has('branch_id') && $request->branch_id && $request->branch_id !== 'all') {
            $query->where('destination_branch_id', $request->branch_id);
        }

        $transfers = $query->get();
        
        $filteredBranch = null;
        if ($request->has('branch_id') && $request->branch_id && $request->branch_id !== 'all') {
            $filteredBranch = Branch::find($request->branch_id);
        }

        return Inertia::render('Transfers/PrintOutgoing', [
            'transfers' => $transfers,
            'filteredBranch' => $filteredBranch,
            'sourceBranch' => Branch::find($branchId),
        ]);
    }

    public function create()
    {
        $user = auth()->user();

        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if (!$branchId) {
            abort(403, 'User does not belong to a branch or no active branch selected');
        }

        // Fetch products available in the user's branch via the pivot table
        $products = DB::table('products')
            ->join('branch_products', 'products.id', '=', 'branch_products.product_id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->leftJoin('brands', 'products.brand_id', '=', 'brands.id')
            ->where('branch_products.branch_id', $branchId)
            ->where('branch_products.quantity', '>', 0)
            ->select(
                'products.id',
                'products.name',
                'branch_products.quantity',
                'products.barcode',
                'products.qr_code',
                'products.image_path',
                'products.price',
                'products.code',
                'products.sku',
                'categories.name as category_name',
                'brands.name as brand_name'
            )
            ->get();

        $branches = Branch::where('id', '!=', $branchId)->get();

        return Inertia::render('Transfers/Create', [
            'products' => $products,
            'branches' => $branches,
        ]);
    }

    public function store(Request $request, \App\Services\OneSignalService $oneSignal)
    {
        $request->validate([
            'destination_branch_id' => 'required|exists:branches,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        $user = auth()->user();

        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if (!$branchId) {
            abort(403, 'User does not belong to a branch or no active branch selected');
        }

        $transfer = null;

        DB::transaction(function () use ($request, $user, $branchId, &$transfer) {
            $transfer = Transfer::create([
                'source_branch_id' => $branchId,
                'destination_branch_id' => $request->destination_branch_id,
                'status' => 'readied',
                'readied_by' => $user->id,
                'notes' => $request->notes,
            ]);

            foreach ($request->items as $item) {
                TransferItem::create([
                    'transfer_id' => $transfer->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'status' => 'pending',
                ]);
            }
        });

        // Notify Branch Administrators (Source)
        try {
            $adminPlayerIds = \App\Models\User::role('Branch Administrator')
                ->where('branch_id', $branchId)
                ->whereNotNull('onesignal_player_id')
                ->where('id', '!=', $user->id) // Optional: exclude self if admin is also readying
                ->pluck('onesignal_player_id')
                ->toArray();

            if (!empty($adminPlayerIds)) {
                $oneSignal->sendNotification(
                    "Transfer #{$transfer->id} readied by {$user->name}",
                    $adminPlayerIds,
                    "Transfer Readied"
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send transfer notification (source): " . $e->getMessage());
        }

        return redirect()->route('transfers.outgoing')->with('success', 'Transfer readied successfully.');
    }

    public function incoming()
    {
        $user = auth()->user();
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if (!$branchId) {
            abort(403, 'User does not belong to a branch or no active branch selected');
        }

        $transfers = Transfer::with(['items.product', 'sourceBranch', 'readiedBy', 'approvedBy'])
            ->where('destination_branch_id', $branchId)
            ->whereIn('status', ['outgoing', 'incomplete', 'requested'])
            ->latest()
            ->get();

        return Inertia::render('Transfers/Incoming', [
            'transfers' => $transfers
        ]);
    }

    public function initiate(Request $request, Transfer $transfer, \App\Services\OneSignalService $oneSignal)
    {
        $user = auth()->user();

        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if ($transfer->source_branch_id !== $branchId) {
            abort(403, 'Unauthorized action.');
        }

        if (!in_array($transfer->status, ['readied', 'requested'])) {
            return back()->with('error', 'Transfer cannot be initiated.');
        }

        $request->validate([
            'items' => 'nullable|array',
            'items.*.id' => 'required|exists:transfer_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::transaction(function () use ($request, $transfer, $user) {
                if ($request->has('items')) {
                    foreach ($request->items as $adjItem) {
                        $item = $transfer->items()->where('id', $adjItem['id'])->first();
                        if ($item) {
                            $item->update(['quantity' => $adjItem['quantity']]);
                        }
                    }
                    // Refresh transfer items to reflect adjusted quantities
                    $transfer->load('items');
                }

                foreach ($transfer->items as $item) {
                    // Find the branch product entry
                    $branchProduct = DB::table('branch_products')
                        ->where('branch_id', $transfer->source_branch_id)
                        ->where('product_id', $item->product_id)
                        ->first();

                    if (!$branchProduct || $branchProduct->quantity < $item->quantity) {
                        throw new \Exception("Insufficient stock for product ID: {$item->product_id}");
                    }

                    // Decrement stock
                    DB::table('branch_products')
                        ->where('id', $branchProduct->id)
                        ->decrement('quantity', $item->quantity);
                }

                $transfer->update([
                    'status' => 'outgoing',
                    'approved_by' => $user->id,
                    'notes' => $request->notes,
                ]);
            });

            // Reset notifications view so it appears as unread for users
            \App\Models\UserNotificationView::where('viewable_type', 'transfer')
                ->where('viewable_id', $transfer->id)
                ->delete();
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }

        // Notify Branch Administrators (Destination) - Moved from store
        try {
            $destAdminPlayerIds = \App\Models\User::role('Branch Administrator')
                ->where('branch_id', $transfer->destination_branch_id)
                ->whereNotNull('onesignal_player_id')
                ->pluck('onesignal_player_id')
                ->toArray();

            if (!empty($destAdminPlayerIds)) {
                $sourceBranch = \App\Models\Branch::find($transfer->source_branch_id);
                $sourceBranchName = $sourceBranch ? $sourceBranch->branch_name : 'Unknown Branch';
                
                $oneSignal->sendNotification(
                    "Incoming Transfer #{$transfer->id} from {$sourceBranchName}",
                    $destAdminPlayerIds,
                    "New Transfer Created"
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send transfer notification (dest): " . $e->getMessage());
        }

        return back()->with('success', 'Transfer initiated successfully.');
    }

    public function confirmReceipt(Request $request, Transfer $transfer, \App\Services\OneSignalService $oneSignal)
    {
        $user = auth()->user();

        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if ($transfer->destination_branch_id !== $branchId) {
            abort(403, 'Unauthorized action.');
        }

        if (!in_array($transfer->status, ['outgoing', 'incomplete'])) {
            return back()->with('error', 'Transfer cannot be confirmed.');
        }

        $input = $request->all();
        if (empty($input['received_by']) || !is_numeric($input['received_by'])) {
            $input['received_by'] = null;
        }
        $request->merge($input);

        $request->validate([
            'status' => 'required|string|in:completed,incomplete,rejected,outgoing',
            'received_by' => 'nullable|exists:users,id',
            'received_by_name' => 'required|string|max:255',
            'items' => 'required|array',
            'items.*.id' => 'required|exists:transfer_items,id',
            'items.*.received_quantity' => 'required|integer|min:0',
        ]);

        $newStatus = $request->status;

        try {
            DB::transaction(function () use ($transfer, $user, $newStatus, $request) {
                if ($newStatus === 'rejected') {
                    // Rejection logic: return stock to source branch and decrement destination branch by whatever was received so far
                    foreach ($transfer->items as $item) {
                        // 1. Return sent quantity to source branch
                        $sourceBranchProduct = DB::table('branch_products')
                            ->where('branch_id', $transfer->source_branch_id)
                            ->where('product_id', $item->product_id)
                            ->first();

                        if ($sourceBranchProduct) {
                            DB::table('branch_products')
                                ->where('id', $sourceBranchProduct->id)
                                ->increment('quantity', $item->quantity);
                        } else {
                            DB::table('branch_products')->insert([
                                'branch_id' => $transfer->source_branch_id,
                                'product_id' => $item->product_id,
                                'quantity' => $item->quantity,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }

                        // 2. Remove previously received quantity from destination branch
                        if ($item->received_quantity > 0) {
                            $destBranchProduct = DB::table('branch_products')
                                ->where('branch_id', $transfer->destination_branch_id)
                                ->where('product_id', $item->product_id)
                                ->first();

                            if ($destBranchProduct) {
                                DB::table('branch_products')
                                    ->where('id', $destBranchProduct->id)
                                    ->decrement('quantity', $item->received_quantity);
                            }
                        }

                        // Update item status and received quantity
                        $item->update([
                            'received_quantity' => 0,
                            'status' => 'missing',
                        ]);
                    }

                    $transfer->update([
                        'status' => 'rejected',
                        'received_by' => $request->received_by,
                        'received_by_name' => $request->received_by_name,
                    ]);
                } elseif ($newStatus === 'incomplete') {
                    // Incomplete split delivery logic: update remaining items, delete completed items
                    $itemsInput = collect($request->items)->keyBy('id');
                    $hasRemaining = false;

                    foreach ($transfer->items as $item) {
                        $itemData = $itemsInput->get($item->id);
                        if (!$itemData) {
                            continue;
                        }

                        $newReceivedQty = max(0, min((int)$itemData['received_quantity'], $item->quantity));
                        $remainingQty = $item->quantity - $newReceivedQty;

                        // Increment destination stock by the newly received quantity
                        if ($newReceivedQty > 0) {
                            $destBranchProduct = DB::table('branch_products')
                                ->where('branch_id', $transfer->destination_branch_id)
                                ->where('product_id', $item->product_id)
                                ->first();

                            if ($destBranchProduct) {
                                DB::table('branch_products')
                                    ->where('id', $destBranchProduct->id)
                                    ->increment('quantity', $newReceivedQty);
                            } else {
                                DB::table('branch_products')->insert([
                                    'branch_id' => $transfer->destination_branch_id,
                                    'product_id' => $item->product_id,
                                    'quantity' => $newReceivedQty,
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                            }
                        }

                        if ($remainingQty > 0) {
                            $hasRemaining = true;
                            $item->update([
                                'quantity' => $remainingQty,
                                'received_quantity' => 0,
                                'status' => 'incomplete',
                            ]);
                        } else {
                            $item->delete();
                        }
                    }

                    if ($hasRemaining) {
                        $transfer->update([
                            'status' => 'incomplete',
                            'received_by' => $request->received_by,
                            'received_by_name' => $request->received_by_name,
                        ]);
                    } else {
                        $transfer->update([
                            'status' => 'completed',
                            'received_by' => $request->received_by,
                            'received_by_name' => $request->received_by_name,
                        ]);
                        $newStatus = 'completed'; // update status for notification / response message
                    }
                } else {
                    // Update received quantities and destination stock
                    $itemsInput = collect($request->items)->keyBy('id');

                    foreach ($transfer->items as $item) {
                        $itemData = $itemsInput->get($item->id);
                        if (!$itemData) {
                            continue;
                        }

                        $newReceivedQty = (int)$itemData['received_quantity'];
                        $oldReceivedQty = (int)$item->received_quantity;

                        // Difference to add/remove from destination branch
                        $delta = $newReceivedQty - $oldReceivedQty;

                        if ($delta !== 0) {
                            $destBranchProduct = DB::table('branch_products')
                                ->where('branch_id', $transfer->destination_branch_id)
                                ->where('product_id', $item->product_id)
                                ->first();

                            if ($destBranchProduct) {
                                DB::table('branch_products')
                                    ->where('id', $destBranchProduct->id)
                                    ->increment('quantity', $delta);
                            } else {
                                DB::table('branch_products')->insert([
                                    'branch_id' => $transfer->destination_branch_id,
                                    'product_id' => $item->product_id,
                                    'quantity' => $newReceivedQty,
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                            }
                        }

                        // Determine item status
                        $itemStatus = 'ok';
                        if ($newReceivedQty === 0) {
                            $itemStatus = 'missing';
                        } elseif ($newReceivedQty < $item->quantity) {
                            $itemStatus = 'incomplete';
                        }

                        $item->update([
                            'received_quantity' => $newReceivedQty,
                            'status' => $itemStatus,
                        ]);
                    }

                    $transfer->update([
                        'status' => $newStatus,
                        'received_by' => $request->received_by,
                        'received_by_name' => $request->received_by_name,
                    ]);
                }
            });

            // Reset notifications view so it appears as unread for users
            \App\Models\UserNotificationView::where('viewable_type', 'transfer')
                ->where('viewable_id', $transfer->id)
                ->delete();
        } catch (\Exception $e) {
            return back()->with('error', 'Error processing transfer receipt: ' . $e->getMessage());
        }

        $statusText = match ($newStatus) {
            'completed' => 'fully confirmed and completed',
            'incomplete' => 'marked as incomplete (partially received)',
            'rejected' => 'rejected and stock returned to sender',
            'outgoing' => 'receipt updated as pending',
            default => 'updated',
        };

        // Notify Source Branch Administrators
        try {
            $sourceAdminPlayerIds = \App\Models\User::role('Branch Administrator')
                ->where('branch_id', $transfer->source_branch_id)
                ->whereNotNull('onesignal_player_id')
                ->pluck('onesignal_player_id')
                ->toArray();

            if (!empty($sourceAdminPlayerIds)) {
                $destBranch = \App\Models\Branch::find($transfer->destination_branch_id);
                $destBranchName = $destBranch ? $destBranch->branch_name : 'Unknown Branch';
                
                $oneSignal->sendNotification(
                    "Transfer #{$transfer->id} to {$destBranchName} was {$statusText}.",
                    $sourceAdminPlayerIds,
                    "Transfer Update"
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send transfer receipt notification: " . $e->getMessage());
        }

        return back()->with('success', "Transfer receipt {$statusText}.");
    }

    public function reject(Transfer $transfer, \App\Services\OneSignalService $oneSignal)
    {
        $user = auth()->user();

        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if ($transfer->source_branch_id !== $branchId) {
            abort(403, 'Unauthorized action.');
        }

        if (!in_array($transfer->status, ['readied', 'requested'])) {
            return back()->with('error', 'Transfer cannot be rejected.');
        }

        // Option 1: Delete the transfer
        // $transfer->delete();

        // Option 2: Mark as rejected (requires status update in migration/enum)
        // For now, let's delete it or add a 'rejected' status. 
        // The user asked to "reject", implying it might stay in history or just be cancelled.
        // Let's assume "rejected" status for now, but I need to make sure the DB supports it or just use 'cancelled'.
        // The migration had: 'readied', 'outgoing', 'received', 'completed'.
        // I should probably add 'rejected' to the allowed statuses or just delete it. 
        // Given the request "be able to be rejected", I'll add a 'rejected' status logic.
        // But since I can't easily change the enum constraint if it exists (it was a string column in migration, so it's fine).
        
        $transfer->update([
            'status' => 'rejected',
        ]);

        // Reset notifications view so it appears as unread for users
        \App\Models\UserNotificationView::where('viewable_type', 'transfer')
            ->where('viewable_id', $transfer->id)
            ->delete();

        // Notify Destination Branch Administrators
        try {
            $destAdminPlayerIds = \App\Models\User::role('Branch Administrator')
                ->where('branch_id', $transfer->destination_branch_id)
                ->whereNotNull('onesignal_player_id')
                ->pluck('onesignal_player_id')
                ->toArray();

            if (!empty($destAdminPlayerIds)) {
                $sourceBranch = \App\Models\Branch::find($transfer->source_branch_id);
                $sourceBranchName = $sourceBranch ? $sourceBranch->branch_name : 'Unknown Branch';
                
                $oneSignal->sendNotification(
                    "Incoming Transfer #{$transfer->id} from {$sourceBranchName} was cancelled/rejected by the sender.",
                    $destAdminPlayerIds,
                    "Transfer Cancelled"
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send transfer rejection notification: " . $e->getMessage());
        }

        return back()->with('success', 'Transfer rejected.');
    }

    public function index(Request $request)
    {
        $user = auth()->user();
        
        $query = Transfer::with(['items.product', 'sourceBranch', 'destinationBranch', 'receivedBy', 'supplier'])
            ->latest();

        // Status Filter
        $statusFilter = $request->query('status_filter', 'all');
        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        } else {
            $query->whereIn('status', ['completed', 'rejected', 'incomplete', 'outgoing', 'readied', 'requested']);
        }
            
        // Date Filters
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        
        if ($dateFrom) {
            $query->where('updated_at', '>=', Carbon::parse($dateFrom)->startOfDay());
        }
        if ($dateTo) {
            $query->where('updated_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : null;

        // Filter by branch
        if ($branchId) {
            $query->where(function($q) use ($branchId) {
                $q->where('source_branch_id', $branchId)
                  ->orWhere('destination_branch_id', $branchId);
            });
        } elseif (!$user->hasRole('System Administrator') && $user->branch_id) {
            $query->where(function($q) use ($user) {
                $q->where('source_branch_id', $user->branch_id)
                  ->orWhere('destination_branch_id', $user->branch_id);
            });
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhereHas('sourceBranch', fn($q) => $q->where('branch_name', 'like', "%{$search}%"))
                  ->orWhereHas('destinationBranch', fn($q) => $q->where('branch_name', 'like', "%{$search}%"));
            });
        }

        // Stats queries (respecting current user branch filters but NOT search/date filters to show global totals)
        $statsQuery = Transfer::where('status', 'completed');
        if ($branchId) {
            $statsQuery->where(function($q) use ($branchId) {
                $q->where('source_branch_id', $branchId)
                  ->orWhere('destination_branch_id', $branchId);
            });
        } elseif (!$user->hasRole('System Administrator') && $user->branch_id) {
            $statsQuery->where(function($q) use ($user) {
                $q->where('source_branch_id', $user->branch_id)
                  ->orWhere('destination_branch_id', $user->branch_id);
            });
        }
        
        $todayStart = now()->startOfDay();
        $weekStart = now()->startOfWeek();
        $monthStart = now()->startOfMonth();

        // Calculate values efficiently
        $completedTransfers = $statsQuery->with('items')->get();
        
        $totalQuantity = 0;
        $todayQuantity = 0;
        $weeklyQuantity = 0;
        $monthlyQuantity = 0;
        
        foreach ($completedTransfers as $transfer) {
            $transferQuantity = $transfer->items->sum('received_quantity');
            $totalQuantity += $transferQuantity;
            
            if ($transfer->updated_at >= $todayStart) $todayQuantity += $transferQuantity;
            if ($transfer->updated_at >= $weekStart) $weeklyQuantity += $transferQuantity;
            if ($transfer->updated_at >= $monthStart) $monthlyQuantity += $transferQuantity;
        }

        $stats = [
            'total_transfers' => $completedTransfers->count(), // All time completed
            'total_quantity' => $totalQuantity,
            'today_quantity' => $todayQuantity,
            'weekly_quantity' => $weeklyQuantity,
            'monthly_quantity' => $monthlyQuantity,
        ];

        $transfers = $query->paginate(10)->withQueryString();

        return Inertia::render('Transfers/Index', [
            'transfers' => $transfers,
            'stats' => $stats,
            'filters' => $request->only(['search', 'date_from', 'date_to', 'status_filter']),
        ]);
    }

    /**
     * Print the filtered list of transfers
     */
    public function printList(Request $request)
    {
        $user = auth()->user();
        
        $query = Transfer::with(['items.product', 'sourceBranch', 'destinationBranch', 'receivedBy', 'supplier'])
            ->latest();
            
        // Reuse identical filters from index
        $statusFilter = $request->query('status_filter', 'all');
        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        } else {
            $query->whereIn('status', ['completed', 'rejected', 'incomplete']);
        }
            
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        
        if ($dateFrom) {
            $query->where('updated_at', '>=', Carbon::parse($dateFrom)->startOfDay());
        }
        if ($dateTo) {
            $query->where('updated_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : null;

        // Filter by branch
        if ($branchId) {
            $query->where(function($q) use ($branchId) {
                $q->where('source_branch_id', $branchId)
                  ->orWhere('destination_branch_id', $branchId);
            });
        } elseif (!$user->hasRole('System Administrator') && $user->branch_id) {
            $query->where(function($q) use ($user) {
                $q->where('source_branch_id', $user->branch_id)
                  ->orWhere('destination_branch_id', $user->branch_id);
            });
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhereHas('sourceBranch', fn($q) => $q->where('branch_name', 'like', "%{$search}%"))
                  ->orWhereHas('destinationBranch', fn($q) => $q->where('branch_name', 'like', "%{$search}%"));
            });
        }
        
        // Get all unpaginated for printing
        $transfers = $query->get();
        
        return Inertia::render('Transfers/PrintList', [
            'transfers' => $transfers,
            'filters' => $request->only(['search', 'date_from', 'date_to', 'status_filter']),
        ]);
    }

    /**
     * Print an individual transfer manifest
     */
    public function printItem(Transfer $transfer)
    {
        $user = auth()->user();
        
        if (!$user->hasRole('System Administrator') && $user->branch_id !== $transfer->source_branch_id && $user->branch_id !== $transfer->destination_branch_id) {
            abort(403, 'Unauthorized to view this transfer');
        }
        
        $transfer->load(['items.product', 'sourceBranch', 'destinationBranch', 'receivedBy', 'readiedBy', 'approvedBy', 'supplier']);
        
        return Inertia::render('Transfers/PrintItem', [
            'transfer' => $transfer,
        ]);
    }
}
