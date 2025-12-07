<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\Product;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    /**
     * Display sales list - all for sysadmin, branch-only for others
     */
    public function index()
    {
        $user = auth()->user();
        
        $query = Sale::with(['items.product', 'branch', 'readiedBy', 'approvedBy'])
            ->whereIn('status', ['completed', 'cancelled'])
            ->latest();
        
        // System Admin sees all, others see their branch only
        if (!$user->hasRole('System Administrator') && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }
        
        $sales = $query->paginate(10);
        
        return Inertia::render('Sales/Index', [
            'sales' => $sales,
        ]);
    }

    /**
     * Show new sales page with scanner and pending approvals
     */
    public function create()
    {
        $user = auth()->user();
        
        if (!$user->branch_id) {
            abort(403, 'User does not belong to a branch');
        }
        
        // Get products in user's branch
        $products = DB::table('products')
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
        
        // Get readied sales pending approval (for branch admins)
        $pendingSales = Sale::with(['items.product', 'readiedBy'])
            ->where('branch_id', $user->branch_id)
            ->where('status', 'readied')
            ->latest()
            ->get();
        
        return Inertia::render('Sales/Create', [
            'products' => $products,
            'pendingSales' => $pendingSales,
        ]);
    }

    /**
     * Look up product by barcode or QR code
     */
    public function lookup(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
        ]);
        
        $user = auth()->user();
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
                'branch_products.quantity as available_quantity'
            )
            ->first();
        
        if (!$product) {
            return response()->json(['error' => 'Product not found in branch inventory'], 404);
        }
        
        return response()->json($product);
    }

    /**
     * Store a new sale (ready it)
     */
    public function store(Request $request, \App\Services\OneSignalService $oneSignal)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);
        
        $user = auth()->user();
        
        if (!$user->branch_id) {
            abort(403, 'User does not belong to a branch');
        }
        
        $sale = null;

        DB::transaction(function () use ($request, $user, &$sale) {
            $sale = Sale::create([
                'branch_id' => $user->branch_id,
                'status' => 'readied',
                'readied_by' => $user->id,
                'notes' => $request->notes,
            ]);
            
            foreach ($request->items as $item) {
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                ]);
            }
        });
        
        // Notify Branch Administrators
        try {
            $adminPlayerIds = \App\Models\User::role('Branch Administrator')
                ->where('branch_id', $user->branch_id)
                ->whereNotNull('onesignal_player_id')
                ->where('id', '!=', $user->id) 
                ->pluck('onesignal_player_id')
                ->toArray();

            if (!empty($adminPlayerIds)) {
                $oneSignal->sendNotification(
                    "Sale #{$sale->id} readied by {$user->name}",
                    $adminPlayerIds,
                    "Sale Readied"
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send sale notification: " . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Sale readied successfully.');
    }

    /**
     * Approve a sale - deduct inventory
     */
    public function approve(Sale $sale)
    {
        $user = auth()->user();
        
        // Only branch admins can approve
        if (!$user->hasRole('Branch Administrator') && !$user->hasRole('System Administrator')) {
            abort(403, 'Only administrators can approve sales');
        }
        
        if ($sale->status !== 'readied') {
            return redirect()->back()->with('error', 'Sale is not in readied status');
        }
        
        DB::transaction(function () use ($sale, $user) {
            // Deduct inventory for each item
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
        
        return redirect()->back()->with('success', 'Sale approved and inventory updated.');
    }

    /**
     * Cancel a readied sale
     */
    public function cancel(Sale $sale)
    {
        if ($sale->status !== 'readied') {
            return redirect()->back()->with('error', 'Only readied sales can be cancelled');
        }
        
        $sale->update(['status' => 'cancelled']);
        
        return redirect()->back()->with('success', 'Sale cancelled.');
    }

    /**
     * Display return items page
     */
    public function returns()
    {
        $user = auth()->user();
        
        $query = Sale::with(['items.product', 'branch', 'returns.product', 'returns.returnedBy'])
            ->where('status', 'completed')
            ->latest();
        
        if (!$user->hasRole('System Administrator') && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }
        
        $completedSales = $query->get();
        
        // Get recent returns
        $returnsQuery = SaleReturn::with(['sale.branch', 'product', 'returnedBy'])->latest();
        if (!$user->hasRole('System Administrator') && $user->branch_id) {
            $returnsQuery->whereHas('sale', function ($q) use ($user) {
                $q->where('branch_id', $user->branch_id);
            });
        }
        $recentReturns = $returnsQuery->take(20)->get();
        
        return Inertia::render('Sales/Returns', [
            'completedSales' => $completedSales,
            'recentReturns' => $recentReturns,
        ]);
    }

    /**
     * Process a return - restore inventory
     */
    public function storeReturn(Request $request)
    {
        $request->validate([
            'sale_id' => 'required|exists:sales,id',
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'reason' => 'nullable|string',
        ]);
        
        $user = auth()->user();
        $sale = Sale::findOrFail($request->sale_id);
        
        // Check if the quantity doesn't exceed what was sold
        $saleItem = SaleItem::where('sale_id', $sale->id)
            ->where('product_id', $request->product_id)
            ->first();
        
        if (!$saleItem) {
            return redirect()->back()->with('error', 'Product not found in this sale');
        }
        
        // Check already returned quantity
        $alreadyReturned = SaleReturn::where('sale_id', $sale->id)
            ->where('product_id', $request->product_id)
            ->sum('quantity');
        
        if ($request->quantity > ($saleItem->quantity - $alreadyReturned)) {
            return redirect()->back()->with('error', 'Return quantity exceeds available amount');
        }
        
        DB::transaction(function () use ($request, $sale, $user) {
            // Create return record
            SaleReturn::create([
                'sale_id' => $sale->id,
                'product_id' => $request->product_id,
                'quantity' => $request->quantity,
                'returned_by' => $user->id,
                'reason' => $request->reason,
            ]);
            
            // Restore inventory
            DB::table('branch_products')
                ->where('branch_id', $sale->branch_id)
                ->where('product_id', $request->product_id)
                ->increment('quantity', $request->quantity);
        });
        
        return redirect()->back()->with('success', 'Return processed and inventory restored.');
    }
}
