<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Transfer;
use App\Models\TransferItem;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class TransferController extends Controller
{
    public function outgoing()
    {
        $user = auth()->user();
        
        if (!$user->branch_id) {
            abort(403, 'User does not belong to a branch');
        }

        $transfers = Transfer::with(['items.product', 'destinationBranch', 'readiedBy', 'approvedBy'])
            ->where('source_branch_id', $user->branch_id)
            ->whereIn('status', ['readied', 'outgoing'])
            ->latest()
            ->get();

        return Inertia::render('Transfers/Outgoing', [
            'transfers' => $transfers,
        ]);
    }

    public function create()
    {
        $user = auth()->user();

        if (!$user->branch_id) {
            abort(403, 'User does not belong to a branch');
        }

        // Fetch products available in the user's branch via the pivot table
        $products = DB::table('products')
            ->join('branch_products', 'products.id', '=', 'branch_products.product_id')
            ->where('branch_products.branch_id', $user->branch_id)
            ->where('branch_products.quantity', '>', 0)
            ->select(
                'products.id', 
                'products.name', 
                'branch_products.quantity', 
                'products.barcode', 
                'products.qr_code'
            )
            ->get();

        $branches = Branch::where('id', '!=', $user->branch_id)->get();

        return Inertia::render('Transfers/Create', [
            'products' => $products,
            'branches' => $branches,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'destination_branch_id' => 'required|exists:branches,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        $user = auth()->user();

        DB::transaction(function () use ($request, $user) {
            $transfer = Transfer::create([
                'source_branch_id' => $user->branch_id,
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

        return redirect()->back()->with('success', 'Transfer readied successfully.');
    }

    public function incoming()
    {
        $user = auth()->user();

        if (!$user->branch_id) {
            abort(403, 'User does not belong to a branch');
        }

        $transfers = Transfer::with(['items.product', 'sourceBranch', 'readiedBy', 'approvedBy'])
            ->where('destination_branch_id', $user->branch_id)
            ->where('status', 'outgoing')
            ->latest()
            ->get();

        return Inertia::render('Transfers/Incoming', [
            'transfers' => $transfers
        ]);
    }

    public function initiate(Transfer $transfer)
    {
        $user = auth()->user();

        if ($transfer->source_branch_id !== $user->branch_id) {
            abort(403, 'Unauthorized action.');
        }

        if ($transfer->status !== 'readied') {
            return back()->with('error', 'Transfer cannot be initiated.');
        }

        DB::transaction(function () use ($transfer, $user) {
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
            ]);
        });

        return back()->with('success', 'Transfer initiated successfully.');
    }

    public function confirmReceipt(Transfer $transfer)
    {
        $user = auth()->user();

        if ($transfer->destination_branch_id !== $user->branch_id) {
            abort(403, 'Unauthorized action.');
        }

        if ($transfer->status !== 'outgoing') {
            return back()->with('error', 'Transfer cannot be confirmed.');
        }

        DB::transaction(function () use ($transfer, $user) {
            foreach ($transfer->items as $item) {
                // Update or create branch product entry for destination
                $branchProduct = DB::table('branch_products')
                    ->where('branch_id', $transfer->destination_branch_id)
                    ->where('product_id', $item->product_id)
                    ->first();

                if ($branchProduct) {
                    DB::table('branch_products')
                        ->where('id', $branchProduct->id)
                        ->increment('quantity', $item->quantity);
                } else {
                    // Create new entry if it doesn't exist (using global product info)
                    // We need to get the physical location from somewhere, or leave null.
                    // For now, we'll leave it null or copy from source if that was tracked (it's not in transfer item).
                    DB::table('branch_products')->insert([
                        'branch_id' => $transfer->destination_branch_id,
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                // Update item status
                $item->update([
                    'received_quantity' => $item->quantity, // Assuming full receipt for now
                    'status' => 'received',
                ]);
            }

            $transfer->update([
                'status' => 'completed',
                'received_by' => $user->id,
            ]);
        });

        return back()->with('success', 'Transfer receipt confirmed.');
    }

    public function reject(Transfer $transfer)
    {
        $user = auth()->user();

        if ($transfer->source_branch_id !== $user->branch_id) {
            abort(403, 'Unauthorized action.');
        }

        if ($transfer->status !== 'readied') {
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

        return back()->with('success', 'Transfer rejected.');
    }

    public function index()
    {
        $transfers = Transfer::with(['items.product', 'sourceBranch', 'destinationBranch', 'receivedBy'])
            ->whereIn('status', ['completed', 'rejected'])
            ->latest()
            ->paginate(10);

        return Inertia::render('Transfers/Index', [
            'transfers' => $transfers
        ]);
    }
}
