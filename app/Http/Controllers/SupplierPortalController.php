<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Transfer;
use App\Models\TransferItem;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupplierPortalController extends Controller
{
    public function index()
    {
        return Inertia::render('Suppliers/Portal', [
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
            'branches' => Branch::orderBy('branch_name')->get(['id', 'branch_name as name']),
            'products' => Product::with('brand')->orderBy('name')->get(['id', 'name', 'brand_id']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'destination_branch_id' => 'required|exists:branches,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Create Transfer
        $transfer = Transfer::create([
            'supplier_id' => $validated['supplier_id'],
            'destination_branch_id' => $validated['destination_branch_id'],
            'status' => 'pending', // Pending approval/receipt by branch
            'notes' => $validated['notes'] ?? null,
            // source_branch_id is null for supplier transfers
        ]);

        // Create Transfer Items
        foreach ($validated['items'] as $item) {
            TransferItem::create([
                'transfer_id' => $transfer->id,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                // received_quantity will be updated by branch upon receipt
            ]);
        }

        return redirect()->route('suppliers.portal')->with('success', 'Items sent successfully! The branch will verify the shipment.');
    }
}
