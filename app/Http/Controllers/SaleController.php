<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\Product;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SaleController extends Controller
{
    use \App\Traits\IntelligentSearch;

    /**
     * Display sales list - all for sysadmin, branch-only for others
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        
        $query = Sale::with(['items.product', 'branch', 'readiedBy', 'approvedBy'])
            ->latest();
            
        // Status Filter
        $statusFilter = $request->query('status_filter', 'all');
        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        } else {
            $query->whereIn('status', ['completed', 'cancelled']);
        }
            
        // Date Filters
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        
        if ($dateFrom) {
            $query->where('created_at', '>=', Carbon::parse($dateFrom)->startOfDay());
        }
        if ($dateTo) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }
        
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : null;

        // System Admin sees all, others see their branch only
        if ($branchId) {
            $query->where('branch_id', $branchId);
        } elseif (!$user->hasRole('System Administrator') && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }
        
        // Search
        if ($request->query('search')) {
            $search = $request->query('search');
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhereHas('branch', fn($q) => $q->where('branch_name', 'like', "%{$search}%"));
            });
        }

        // Stats queries (respecting current user branch filters but NOT search/date filters to show global totals)
        $statsQuery = Sale::where('status', 'completed');
        if ($branchId) {
            $statsQuery->where('branch_id', $branchId);
        } elseif (!$user->hasRole('System Administrator') && $user->branch_id) {
            $statsQuery->where('branch_id', $user->branch_id);
        }
        
        $todayStart = now()->startOfDay();
        $weekStart = now()->startOfWeek();
        $monthStart = now()->startOfMonth();

        // Calculate revenues efficiently
        $completedSales = $statsQuery->with('items')->get();
        
        $totalRevenue = 0;
        $todayRevenue = 0;
        $weeklyRevenue = 0;
        $monthlyRevenue = 0;
        
        foreach ($completedSales as $sale) {
            $saleRevenue = $sale->items->sum(fn($item) => $item->quantity * $item->price);
            $totalRevenue += $saleRevenue;
            
            if ($sale->created_at >= $todayStart) $todayRevenue += $saleRevenue;
            if ($sale->created_at >= $weekStart) $weeklyRevenue += $saleRevenue;
            if ($sale->created_at >= $monthStart) $monthlyRevenue += $saleRevenue;
        }

        $stats = [
            'total_sales' => $completedSales->count(), // All time completed
            'total_revenue' => $totalRevenue,
            'today_revenue' => $todayRevenue,
            'weekly_revenue' => $weeklyRevenue,
            'monthly_revenue' => $monthlyRevenue,
        ];
        
        $sales = $query->paginate(10)->withQueryString();
        
        return Inertia::render('Sales/Index', [
            'sales' => $sales,
            'stats' => $stats,
            'filters' => $request->only(['search', 'date_from', 'date_to', 'status_filter']),
        ]);
    }

    /**
     * Print the filtered list of sales
     */
    public function printList(Request $request)
    {
        $user = auth()->user();
        
        $query = Sale::with(['items.product', 'branch', 'readiedBy', 'approvedBy'])
            ->latest();
            
        // Reuse identical filters from index
        $statusFilter = $request->query('status_filter', 'all');
        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        } else {
            $query->whereIn('status', ['completed', 'cancelled']);
        }
            
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        
        if ($dateFrom) {
            $query->where('created_at', '>=', Carbon::parse($dateFrom)->startOfDay());
        }
        if ($dateTo) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }
        
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : null;

        if ($branchId) {
            $query->where('branch_id', $branchId);
        } elseif (!$user->hasRole('System Administrator') && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }
        
        if ($request->query('search')) {
            $search = $request->query('search');
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhereHas('branch', fn($q) => $q->where('branch_name', 'like', "%{$search}%"));
            });
        }
        
        // Get all unpaginated for printing
        $sales = $query->get();
        
        return Inertia::render('Sales/PrintList', [
            'sales' => $sales,
            'filters' => $request->only(['search', 'date_from', 'date_to', 'status_filter']),
        ]);
    }

    /**
     * Print an individual sale as a non-official invoice
     */
    public function printItem(Sale $sale)
    {
        $user = auth()->user();
        
        if (!$user->hasRole('System Administrator') && $user->branch_id !== $sale->branch_id) {
            abort(403, 'Unauthorized to view this sale');
        }
        
        $sale->load(['items.product', 'branch', 'readiedBy', 'approvedBy']);
        
        return Inertia::render('Sales/PrintItem', [
            'sale' => $sale,
        ]);
    }

    /**
     * Show new sales page with scanner and pending approvals
     */
    public function create()
    {
        $user = auth()->user();
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;
        
        if (!$branchId) {
            abort(403, 'User does not belong to a branch or active branch not selected');
        }
        
        // Get products in user's branch
        $products = DB::table('products')
            ->join('branch_products', 'products.id', '=', 'branch_products.product_id')
            ->where('branch_products.branch_id', $branchId)
            ->where('branch_products.quantity', '>=', 0)
            ->select(
                'products.id',
                'products.name',
                'products.barcode',
                'products.qr_code',
                'products.price',
                'products.image_path',
                'branch_products.quantity as available_quantity'
            )
            ->get();
        
        // Get readied sales pending approval (for branch admins)
        $pendingSales = Sale::with(['items.product', 'readiedBy'])
            ->where('branch_id', $branchId)
            ->where('status', 'readied')
            ->latest()
            ->get();
        
        return Inertia::render('Sales/Create', [
            'products' => $products,
            'pendingSales' => $pendingSales,
        ]);
    }

    /**
     * Search products in branch inventory
     */
    public function search(Request $request)
    {
        $search = $request->query('search');
        if (!$search) return response()->json([]);
        
        $user = auth()->user();
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;
        if (!$branchId) {
            return response()->json(['error' => 'User does not belong to a branch or active branch not selected'], 403);
        }
        
        $products = $this->performIntelligentSearch(
            $search,
            ['barcode', 'qr_code'],
            $branchId
        );

        // Map to include available_quantity from branch_products
        $results = $products->map(function($p) use ($branchId) {
            $branchProduct = DB::table('branch_products')
                ->where('branch_id', $branchId)
                ->where('product_id', $p->id)
                ->first();
                
            return [
                'id' => $p->id,
                'name' => $p->name,
                'barcode' => $p->barcode,
                'qr_code' => $p->qr_code,
                'price' => $p->price,
                'image_path' => $p->image_path,
                'available_quantity' => $branchProduct ? $branchProduct->quantity : 0,
            ];
        });
            
        return response()->json($results);
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
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;
        $code = $request->code;
        
        $product = DB::table('products')
            ->join('branch_products', 'products.id', '=', 'branch_products.product_id')
            ->where('branch_products.branch_id', $branchId)
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
                'products.image_path',
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
            'items.*.price' => 'required|numeric|min:0',
            'items.*.original_price' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);
        
        $user = auth()->user();
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;
        
        if (!$branchId) {
            abort(403, 'User does not belong to a branch or active branch not selected');
        }
        
        $sale = null;

        DB::transaction(function () use ($request, $user, $branchId, &$sale) {
            $sale = Sale::create([
                'branch_id' => $branchId,
                'status' => 'readied',
                'readied_by' => $user->id,
                'notes' => $request->notes,
            ]);
            
            foreach ($request->items as $item) {
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'original_price' => $item['original_price'],
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
    public function approve(Sale $sale, \App\Services\OneSignalService $oneSignal)
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
        
        // Notify the user who readied the sale
        try {
            $readiedBy = \App\Models\User::find($sale->readied_by);
            if ($readiedBy && $readiedBy->onesignal_player_id && $readiedBy->id !== $user->id) {
                $oneSignal->sendNotification(
                    "Sale #{$sale->id} was approved by {$user->name}.",
                    [$readiedBy->onesignal_player_id],
                    "Sale Approved"
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send sale approval notification: " . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Sale approved and inventory updated.');
    }

    /**
     * Cancel a readied sale
     */
    public function cancel(Sale $sale, \App\Services\OneSignalService $oneSignal)
    {
        if ($sale->status !== 'readied') {
            return redirect()->back()->with('error', 'Only readied sales can be cancelled');
        }
        
        $sale->update(['status' => 'cancelled']);
        
        // Notify the user who readied the sale
        try {
            $user = auth()->user();
            $readiedBy = \App\Models\User::find($sale->readied_by);
            if ($readiedBy && $readiedBy->onesignal_player_id && $readiedBy->id !== $user->id) {
                $oneSignal->sendNotification(
                    "Sale #{$sale->id} was cancelled by {$user->name}.",
                    [$readiedBy->onesignal_player_id],
                    "Sale Cancelled"
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send sale cancellation notification: " . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Sale cancelled.');
    }

    /**
     * Display return items page
     */
    public function returns(Request $request)
    {
        $user = auth()->user();
        $search = $request->input('search');
        
        // Queries
        $query = Sale::with(['items.product', 'branch', 'readiedBy', 'approvedBy'])
            ->where('status', 'completed')
            ->latest();
        
        $returnsQuery = SaleReturn::with(['sale.branch', 'product', 'returnedBy'])->latest();

        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : null;

        // Role Restrictions
        if ($branchId) {
            $query->where('branch_id', $branchId);
            $returnsQuery->whereHas('sale', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        } elseif (!$user->hasRole('System Administrator') && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
            $returnsQuery->whereHas('sale', function ($q) use ($user) {
                $q->where('branch_id', $user->branch_id);
            });
        }
        
        // Search Filter
        if ($search) {
            // Filter Completed Sales (Dropdown Candidates)
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhereHas('items.product', fn($q) => $q->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('branch', fn($q) => $q->where('branch_name', 'like', "%{$search}%"));
            });

            // Filter Recent Returns (Table)
            $returnsQuery->where(function($q) use ($search) {
                $q->whereHas('product', fn($q) => $q->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('sale', fn($q) => $q->where('id', 'like', "%{$search}%"))
                  ->orWhereHas('returnedBy', fn($q) => $q->where('name', 'like', "%{$search}%"));
            });
        }
        
        $completedSales = $query->take(50)->get(); // Limit to 50 for performance
        $recentReturns = $returnsQuery->take(20)->get();
        
        return Inertia::render('Sales/Returns', [
            'completedSales' => $completedSales,
            'recentReturns' => $recentReturns,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Process a return - restore inventory
     */
    public function storeReturn(Request $request, \App\Services\OneSignalService $oneSignal)
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
        
        // Notify Branch Administrators about the return
        try {
            $adminPlayerIds = \App\Models\User::role('Branch Administrator')
                ->where('branch_id', $sale->branch_id)
                ->whereNotNull('onesignal_player_id')
                ->where('id', '!=', $user->id)
                ->pluck('onesignal_player_id')
                ->toArray();

            if (!empty($adminPlayerIds)) {
                $product = \App\Models\Product::find($request->product_id);
                $productName = $product ? $product->name : 'A product';
                
                $oneSignal->sendNotification(
                    "Return processed for Sale #{$sale->id}: {$request->quantity}x {$productName} by {$user->name}.",
                    $adminPlayerIds,
                    "Return Processed"
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send return notification: " . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Return processed and inventory restored.');
    }
}
