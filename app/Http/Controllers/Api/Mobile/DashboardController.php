<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Sale;
use App\Models\Transfer;
use App\Models\Product;
use App\Models\Branch;

class DashboardController extends Controller
{
    /**
     * Dashboard summary – totals for the authenticated user's branch (or all if admin).
     */
    public function index(Request $request)
    {
        $user     = $request->user();
        $isAdmin  = $user->hasRole('System Administrator');
        $branchId = $user->branch_id;

        // Sales totals
        $salesQuery = Sale::query();
        if (! $isAdmin && $branchId) {
            $salesQuery->where('branch_id', $branchId);
        }

        $totalSales    = $salesQuery->count();
        $pendingSales  = (clone $salesQuery)->where('status', 'pending')->count();
        $approvedSales = (clone $salesQuery)->where('status', 'approved')->count();

        // Transfers
        $transferQuery = Transfer::query();
        if (! $isAdmin && $branchId) {
            $transferQuery->where(function ($q) use ($branchId) {
                $q->where('from_branch_id', $branchId)
                  ->orWhere('to_branch_id', $branchId);
            });
        }

        $pendingTransfers = (clone $transferQuery)->where('status', 'pending')->count();

        // Low stock
        $lowStockQuery = DB::table('branch_products')
            ->whereNotNull('reorder_level')
            ->where('reorder_level', '>', 0)
            ->whereRaw('quantity <= reorder_level');

        if (! $isAdmin && $branchId) {
            $lowStockQuery->where('branch_id', $branchId);
        }

        $lowStockCount = $lowStockQuery->count();

        return response()->json([
            'summary' => [
                'total_sales'       => $totalSales,
                'pending_sales'     => $pendingSales,
                'approved_sales'    => $approvedSales,
                'pending_transfers' => $pendingTransfers,
                'low_stock_items'   => $lowStockCount,
            ],
            'branch' => $branchId
                ? Branch::find($branchId, ['id', 'branch_name', 'address'])
                : null,
            'synced_at' => now()->toISOString(),
        ]);
    }

    /**
     * Sync PULL – app requests the latest data snapshot from the server.
     * Returns a compact payload the app can cache locally.
     */
    public function syncPull(Request $request)
    {
        $user     = $request->user();
        $isAdmin  = $user->hasRole('System Administrator');
        $branchId = $user->branch_id;

        // Products available in the user's branch
        $products = Product::with(['brand:id,name', 'category:id,name'])
            ->when(! $isAdmin && $branchId, function ($q) use ($branchId) {
                $q->whereHas('branches', fn ($b) => $b->where('branches.id', $branchId));
            })
            ->select('id', 'name', 'code', 'sku', 'price', 'brand_id', 'category_id', 'image_path')
            ->limit(500) // Reasonable limit for mobile
            ->get()
            ->map(function ($p) {
                return [
                    'id'           => $p->id,
                    'name'         => $p->name,
                    'code'         => $p->code,
                    'sku'          => $p->sku,
                    'price'        => $p->price,
                    'brand'        => $p->brand?->name,
                    'category'     => $p->category?->name,
                    'image_url'    => $p->image_path ? asset('storage/' . $p->image_path) : null,
                ];
            });

        // Recent sales (last 20)
        $salesQuery = Sale::with(['items.product:id,name,code', 'branch:id,branch_name'])
            ->orderByDesc('created_at')
            ->limit(20);

        if (! $isAdmin && $branchId) {
            $salesQuery->where('branch_id', $branchId);
        }

        $sales = $salesQuery->get()->map(fn ($s) => [
            'id'         => $s->id,
            'status'     => $s->status,
            'branch'     => $s->branch?->branch_name,
            'items'      => $s->items->map(fn ($i) => [
                'product_name' => $i->product?->name,
                'quantity'     => $i->quantity,
                'price'        => $i->price,
            ]),
            'created_at' => $s->created_at?->toDateTimeString(),
        ]);

        return response()->json([
            'products'   => $products,
            'sales'      => $sales,
            'synced_at'  => now()->toISOString(),
        ]);
    }

    /**
     * Sync PUSH – app sends locally-recorded data up to the server.
     * Accepts an array of pending events (e.g., scanned items, recorded sales).
     */
    public function syncPush(Request $request)
    {
        $request->validate([
            'events'            => ['required', 'array'],
            'events.*.type'     => ['required', 'string', 'in:sale_scan,stock_check,note'],
            'events.*.payload'  => ['required', 'array'],
            'events.*.local_id' => ['required', 'string'],
            'events.*.recorded_at' => ['required', 'date'],
        ]);

        $processed = [];
        $errors    = [];

        foreach ($request->events as $event) {
            try {
                // Log the event; extend this switch to handle each type
                $processed[] = [
                    'local_id'    => $event['local_id'],
                    'type'        => $event['type'],
                    'status'      => 'received',
                    'server_time' => now()->toISOString(),
                ];

                // TODO: Add actual processing per event type, e.g.:
                // case 'sale_scan': create a pending sale record
                // case 'stock_check': record a stock audit

            } catch (\Throwable $e) {
                $errors[] = [
                    'local_id' => $event['local_id'],
                    'message'  => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'processed'  => $processed,
            'errors'     => $errors,
            'synced_at'  => now()->toISOString(),
        ]);
    }
}
