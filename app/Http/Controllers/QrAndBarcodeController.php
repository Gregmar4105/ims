<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class QrAndBarcodeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = auth()->user();

        if (!$user->branch_id) {
            abort(403, 'User does not belong to a branch');
        }

        // 1. Get products in user's branch
        $products = \Illuminate\Support\Facades\DB::table('products')
            ->join('branch_products', 'products.id', '=', 'branch_products.product_id')
            ->where('branch_products.branch_id', $user->branch_id)
            ->where('branch_products.quantity', '>', 0)
            ->select(
                'products.id',
                'products.name',
                'products.barcode',
                'products.qr_code',
                'branch_products.quantity as available_quantity'
            )
            ->get();

        // 2. Get other branches (for transfer destination)
        $branches = \App\Models\Branch::where('id', '!=', $user->branch_id)->get();

        // 3. Get pending sales (readied)
        $pendingSales = \App\Models\Sale::with(['items.product', 'readiedBy'])
            ->where('branch_id', $user->branch_id)
            ->where('status', 'readied')
            ->latest()
            ->get();

        // 4. Get pending transfers (readied, outgoing from here)
        $pendingTransfers = \App\Models\Transfer::with(['items.product', 'readiedBy', 'destinationBranch'])
            ->where('source_branch_id', $user->branch_id)
            ->where('status', 'readied')
            ->latest()
            ->get();

        return Inertia::render('QrAndBarcodes/Index', [
            'products' => $products,
            'branches' => $branches,
            'pendingSales' => $pendingSales,
            'pendingTransfers' => $pendingTransfers,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
