<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SaleItem;
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
                'subtotal'     => $i->quantity * $i->price,
            ]);
            $base['total'] = $sale->items->sum(fn ($i) => $i->quantity * $i->price);
        }

        return $base;
    }
}
