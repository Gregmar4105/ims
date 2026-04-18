<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Transfer;
use Illuminate\Http\Request;

class TransferController extends Controller
{
    /**
     * List transfers the user is involved in.
     */
    public function index(Request $request)
    {
        $user     = $request->user();
        $isAdmin  = $user->hasRole('System Administrator');
        $branchId = $user->branch_id;

        $transfers = Transfer::with([
            'fromBranch:id,branch_name',
            'toBranch:id,branch_name',
            'initiatedBy:id,name',
        ])
            ->when(! $isAdmin && $branchId, function ($q) use ($branchId) {
                $q->where('from_branch_id', $branchId)
                  ->orWhere('to_branch_id', $branchId);
            })
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'data'       => $transfers->map(fn ($t) => $this->formatTransfer($t)),
            'pagination' => [
                'current_page' => $transfers->currentPage(),
                'last_page'    => $transfers->lastPage(),
                'per_page'     => $transfers->perPage(),
                'total'        => $transfers->total(),
            ],
        ]);
    }

    /**
     * Show a single transfer with its items.
     */
    public function show(Request $request, int $id)
    {
        $transfer = Transfer::with([
            'fromBranch:id,branch_name',
            'toBranch:id,branch_name',
            'initiatedBy:id,name',
            'confirmedBy:id,name',
            'items.product:id,name,code',
        ])->findOrFail($id);

        return response()->json($this->formatTransfer($transfer, detailed: true));
    }

    /**
     * Confirm receipt of a transfer from the mobile app.
     */
    public function confirm(Request $request, int $id)
    {
        $user     = $request->user();
        $transfer = Transfer::findOrFail($id);

        if ($transfer->status !== 'in_transit' && $transfer->status !== 'outgoing') {
            return response()->json([
                'message' => "Transfer cannot be confirmed — current status is '{$transfer->status}'.",
            ], 422);
        }

        if ($transfer->to_branch_id !== $user->branch_id && ! $user->hasRole('System Administrator')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $transfer->update([
            'status'        => 'received',
            'confirmed_by'  => $user->id,
            'confirmed_at'  => now(),
        ]);

        return response()->json([
            'message'  => 'Transfer confirmed successfully.',
            'transfer' => $this->formatTransfer($transfer->fresh()),
        ]);
    }

    /**
     * Create a new transfer from the mobile app.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'destination_branch_id' => ['required', 'integer', 'exists:branches,id'],
            'items'                 => ['required', 'array', 'min:1'],
            'items.*.product_id'    => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity'      => ['required', 'integer', 'min:1'],
            'notes'                 => ['nullable', 'string', 'max:500'],
        ]);

        $sourceBranchId = $user->branch_id;

        if (! $sourceBranchId) {
            return response()->json(['message' => 'User has no branch assigned.'], 422);
        }

        if ($sourceBranchId == $request->destination_branch_id) {
            return response()->json(['message' => 'Source and destination branches cannot be the same.'], 422);
        }

        $transfer = \Illuminate\Support\Facades\DB::transaction(function () use ($request, $user, $sourceBranchId) {
            $transfer = Transfer::create([
                'source_branch_id'      => $sourceBranchId,
                'destination_branch_id' => $request->destination_branch_id,
                'status'                => 'readied',
                'readied_by'            => $user->id,
                'notes'                 => $request->notes,
            ]);

            foreach ($request->items as $item) {
                \App\Models\TransferItem::create([
                    'transfer_id' => $transfer->id,
                    'product_id'  => $item['product_id'],
                    'quantity'    => $item['quantity'],
                    'status'      => 'pending',
                ]);
            }

            return $transfer->load(['items.product:id,name', 'fromBranch:id,branch_name', 'toBranch:id,branch_name']);
        });

        return response()->json([
            'message'  => 'Transfer created successfully.',
            'transfer' => $this->formatTransfer($transfer, detailed: true),
        ], 201);
    }

    private function formatTransfer(Transfer $transfer, bool $detailed = false): array
    {
        $base = [
            'id'           => $transfer->id,
            'status'       => $transfer->status,
            'from_branch'  => $transfer->fromBranch?->branch_name,
            'to_branch'    => $transfer->toBranch?->branch_name,
            'initiated_by' => $transfer->initiatedBy?->name,
            'notes'        => $transfer->notes,
            'created_at'   => $transfer->created_at?->toDateTimeString(),
        ];

        if ($detailed && $transfer->relationLoaded('items')) {
            $base['items'] = $transfer->items->map(fn ($i) => [
                'id'           => $i->id,
                'product_id'   => $i->product_id,
                'product_name' => $i->product?->name,
                'product_code' => $i->product?->code,
                'quantity'     => $i->quantity,
            ]);
        }

        return $base;
    }
}
