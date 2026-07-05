<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\BranchProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    /**
     * List sales for the user's branch.
     */
    public function index(Request $request)
    {
        $user     = $request->user();
        $isAdmin  = $user->hasRole('System Administrator');
        $branchId = $user->branch_id;

        $sales = Sale::with(['branch:id,branch_name', 'readiedBy:id,name', 'approvedBy:id,name'])
            ->when(! $isAdmin && $branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'data'       => $sales->map(fn ($s) => $this->formatSale($s)),
            'pagination' => [
                'current_page' => $sales->currentPage(),
                'last_page'    => $sales->lastPage(),
                'per_page'     => $sales->perPage(),
                'total'        => $sales->total(),
            ],
        ]);
    }

    /**
     * Show a single sale with its items.
     */
    public function show(Request $request, int $id)
    {
        $sale = Sale::with([
            'branch:id,branch_name',
            'readiedBy:id,name',
            'approvedBy:id,name',
            'items.product:id,name,code,price',
        ])->findOrFail($id);

        return response()->json($this->formatSale($sale, detailed: true));
    }

    /**
     * Create a new sale from the mobile app.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'items'             => ['required', 'array', 'min:1'],
            'items.*.product_id'=> ['required', 'integer', 'exists:products,id'],
            'items.*.quantity'  => ['required', 'integer', 'min:1'],
            'items.*.price'     => ['required', 'numeric', 'min:0'],
            'notes'             => ['nullable', 'string', 'max:500'],
        ]);

        $branchId = $user->branch_id;

        if (! $branchId) {
            return response()->json(['message' => 'User has no branch assigned.'], 422);
        }

        $sale = DB::transaction(function () use ($request, $user, $branchId) {
            $sale = Sale::create([
                'branch_id'  => $branchId,
                'status'     => 'pending',
                'readied_by' => $user->id,
                'notes'      => $request->notes,
            ]);

            foreach ($request->items as $item) {
                SaleItem::create([
                    'sale_id'    => $sale->id,
                    'product_id' => $item['product_id'],
                    'quantity'   => $item['quantity'],
                    'price'      => $item['price'],
                ]);
            }

            return $sale->load(['items.product:id,name', 'branch:id,branch_name']);
        });

        return response()->json([
            'message' => 'Sale created successfully.',
            'sale'    => $this->formatSale($sale, detailed: true),
        ], 201);
    }

    /**
     * Approve a sale - deduct inventory.
     */
    public function approve(Request $request, int $id)
    {
        $sale = Sale::findOrFail($id);
        $user = $request->user();

        // Only branch admins or sysadmins can approve
        if (!$user->hasRole('Branch Administrator') && !$user->hasRole('System Administrator')) {
            return response()->json(['message' => 'Only administrators can approve sales.'], 403);
        }

        if ($sale->status !== 'readied' && $sale->status !== 'pending') {
            return response()->json(['message' => 'Sale is not in a status that can be approved.'], 422);
        }

        DB::transaction(function () use ($sale, $user) {
            foreach ($sale->items as $item) {
                DB::table('branch_products')
                    ->where('branch_id', $sale->branch_id)
                    ->where('product_id', $item->product_id)
                    ->decrement('quantity', $item->quantity);
            }

            $sale->update([
                'status' => 'completed',
                'approved_by' => $user->id,
            ]);
        });

        return response()->json([
            'message' => 'Sale approved successfully.',
            'sale' => $this->formatSale($sale->fresh(['items.product', 'branch', 'readiedBy', 'approvedBy']), detailed: true)
        ]);
    }

    /**
     * Cancel a sale.
     */
    public function cancel(Request $request, int $id)
    {
        $sale = Sale::findOrFail($id);
        
        if ($sale->status !== 'readied' && $sale->status !== 'pending') {
            return response()->json(['message' => 'Only pending or readied sales can be cancelled.'], 422);
        }

        $sale->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Sale cancelled successfully.',
            'sale' => $this->formatSale($sale->fresh())
        ]);
    }

    /**
     * Look up product by barcode/QR code for the user's branch.
     */
    public function lookup(Request $request)
    {
        $request->validate(['code' => 'required|string']);
        
        $user = $request->user();
        $code = $request->code;

        $product = DB::table('products')
            ->join('branch_products', 'products.id', '=', 'branch_products.product_id')
            ->where('branch_products.branch_id', $user->branch_id)
            ->where(function ($query) use ($code) {
                $query->where('products.barcode', $code)
                      ->orWhere('products.qr_code', $code);
            })
            ->select(
                'products.id',
                'products.name',
                'products.barcode',
                'products.qr_code',
                'products.price',
                'branch_products.quantity as available_quantity'
            )
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Product not found in your branch inventory.'], 404);
        }

        return response()->json(['data' => $product]);
    }

    /**
     * List returns for the user's branch.
     */
    public function returns(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->hasRole('System Administrator');
        $branchId = $user->branch_id;

        $returns = SaleReturn::with(['sale.branch', 'product:id,name', 'returnedBy:id,name'])
            ->when(!$isAdmin && $branchId, function ($q) use ($branchId) {
                $q->whereHas('sale', fn($sq) => $sq->where('branch_id', $branchId));
            })
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => $returns->map(fn($r) => [
                'id' => $r->id,
                'sale_id' => $r->sale_id,
                'product_name' => $r->product?->name,
                'quantity' => $r->quantity,
                'returned_by' => $r->returnedBy?->name,
                'reason' => $r->reason,
                'created_at' => $r->created_at?->toDateTimeString(),
            ]),
            'pagination' => [
                'current_page' => $returns->currentPage(),
                'last_page' => $returns->lastPage(),
                'total' => $returns->total(),
            ]
        ]);
    }

    /**
     * Store a new sale return.
     */
    public function storeReturn(Request $request)
    {
        $request->validate([
            'sale_id' => 'required|exists:sales,id',
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'reason' => 'nullable|string',
            'return_type' => 'nullable|in:refund,exchange',
            'replacement_product_id' => 'required_if:return_type,exchange|nullable|exists:products,id',
            'replacement_quantity' => 'required_if:return_type,exchange|nullable|integer|min:1',
            'restored_to_inventory' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $sale = Sale::findOrFail($request->sale_id);

        if (!$user->hasRole('System Administrator') && $user->branch_id !== $sale->branch_id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $saleItem = SaleItem::where('sale_id', $sale->id)
            ->where('product_id', $request->product_id)
            ->first();

        if (!$saleItem) {
            return response()->json(['message' => 'Product not found in this sale.'], 422);
        }

        $alreadyReturned = SaleReturn::where('sale_id', $sale->id)
            ->where('product_id', $request->product_id)
            ->sum('quantity');

        if ($request->quantity > ($saleItem->quantity - $alreadyReturned)) {
            return response()->json(['message' => 'Return quantity exceeds available amount.'], 422);
        }

        $returnType = $request->input('return_type', 'refund');
        $restoredToInventory = $request->input('restored_to_inventory', true);

        $refundAmount = 0.00;
        if ($returnType === 'refund') {
            $refundAmount = $request->quantity * $saleItem->price;
        }

        DB::transaction(function () use ($request, $sale, $user, $returnType, $restoredToInventory, $refundAmount) {
            SaleReturn::create([
                'sale_id' => $sale->id,
                'product_id' => $request->product_id,
                'quantity' => $request->quantity,
                'returned_by' => $user->id,
                'reason' => $request->reason,
                'return_type' => $returnType,
                'replacement_product_id' => $returnType === 'exchange' ? $request->replacement_product_id : null,
                'replacement_quantity' => $returnType === 'exchange' ? $request->replacement_quantity : null,
                'refund_amount' => $refundAmount,
                'restored_to_inventory' => (bool)$restoredToInventory,
            ]);

            if ($restoredToInventory) {
                DB::table('branch_products')
                    ->where('branch_id', $sale->branch_id)
                    ->where('product_id', $request->product_id)
                    ->increment('quantity', $request->quantity);
            }

            if ($returnType === 'exchange') {
                DB::table('branch_products')
                    ->where('branch_id', $sale->branch_id)
                    ->where('product_id', $request->replacement_product_id)
                    ->decrement('quantity', $request->replacement_quantity);
            }
        });

        return response()->json(['message' => 'Return processed successfully.']);
    }

    private function formatSale(Sale $sale, bool $detailed = false): array
    {
        $base = [
            'id'          => $sale->id,
            'status'      => $sale->status,
            'branch'      => $sale->branch?->branch_name,
            'readied_by'  => $sale->readiedBy?->name,
            'approved_by' => $sale->approvedBy?->name,
            'notes'       => $sale->notes,
            'created_at'  => $sale->created_at?->toDateTimeString(),
        ];

        if ($detailed && $sale->relationLoaded('items')) {
            $base['items'] = $sale->items->map(fn ($i) => [
                'id'           => $i->id,
                'product_id'   => $i->product_id,
                'product_name' => $i->product?->name,
                'product_code' => $i->product?->code,
                'quantity'     => $i->quantity,
                'price'        => $i->price,
                'subtotal'     => ceil($i->quantity * $i->price),
            ]);
            $base['total'] = $sale->items->sum(fn ($i) => ceil($i->quantity * $i->price));
        }

        return $base;
    }
}
