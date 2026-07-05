<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\Expense;
use App\Models\ServiceFee;
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
        
        $query = Sale::with(['items.product', 'branch', 'readiedBy', 'approvedBy', 'returns.product', 'returns.replacementProduct', 'serviceFees'])
            ->latest();
            
        // Status Filter
        $statusFilter = $request->query('status_filter', 'all');
        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        } else {
            $query->whereIn('status', ['completed', 'cancelled', 'reserved']);
        }

        // Payment Method Filter
        $paymentMethodFilter = $request->query('payment_method', 'all');
        if ($paymentMethodFilter !== 'all') {
            $query->where('payment_method', $paymentMethodFilter);
        }
            
        // Date Preset / Range Calculation
        $datePreset = $request->query('date_preset', 'today');
        if ($user->hasRole('Branch Administrator') && !$user->hasRole('System Administrator')) {
            $datePreset = 'today';
        }
        
        $startDate = null;
        $endDate = null;

        if ($datePreset === 'today') {
            $startDate = Carbon::today();
            $endDate = Carbon::today()->endOfDay();
        } elseif ($datePreset === 'weekly') {
            $startDate = Carbon::now()->startOfWeek();
            $endDate = Carbon::now()->endOfDay();
        } elseif ($datePreset === 'monthly') {
            $startDate = Carbon::now()->startOfMonth();
            $endDate = Carbon::now()->endOfDay();
        } elseif ($datePreset === 'ytd') {
            $startDate = Carbon::now()->startOfYear();
            $endDate = Carbon::now()->endOfDay();
        } elseif ($datePreset === 'custom') {
            $dateFrom = $request->query('date_from');
            $dateTo = $request->query('date_to');
            if ($dateFrom) {
                $startDate = Carbon::parse($dateFrom)->startOfDay();
            }
            if ($dateTo) {
                $endDate = Carbon::parse($dateTo)->endOfDay();
            }
        }
        
        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('created_at', '<=', $endDate);
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
 
        // Compute stats (Cash sales, E-Wallet sales, Expenses, Service Fees, and Cash on Hand)
 
        // 1. Completed, Reserved, and Cancelled Reservation Sales (polled by updated_at to ensure completion/cancellation records on the exact period)
        $todaySalesQuery = Sale::where(function($q) {
            $q->whereIn('status', ['completed', 'reserved'])
              ->orWhere(function($sub) {
                  $sub->where('status', 'cancelled')
                      ->where('payment_method', 'reservation');
              });
        })
            ->with(['items.product', 'branch', 'readiedBy', 'approvedBy']);
 
        if ($startDate) {
            $todaySalesQuery->where('updated_at', '>=', $startDate);
        }
        if ($endDate) {
            $todaySalesQuery->where('updated_at', '<=', $endDate);
        }

        if ($branchId) {
            $todaySalesQuery->where('branch_id', $branchId);
        } elseif (!$user->hasRole('System Administrator') && $user->branch_id) {
            $todaySalesQuery->where('branch_id', $user->branch_id);
        }
        $todaySales = $todaySalesQuery->get();
 
        $todaySalesSum = 0;
        $todayCashSalesSum = 0;
        $todayEwalletSalesSum = 0;
        $todayHomeCreditSalesSum = 0;
        $todayReservationSalesSum = 0;
 
        foreach ($todaySales as $sale) {
            $saleRevenue = $sale->items->sum(fn($item) => ceil($item->quantity * $item->price));
            if ($sale->payment_method === 'cash') {
                $todayCashSalesSum += $saleRevenue;
                $todaySalesSum += $saleRevenue;
            } elseif ($sale->payment_method === 'e-wallet') {
                $todayEwalletSalesSum += $saleRevenue;
                $todaySalesSum += $saleRevenue;
            } elseif ($sale->payment_method === 'split_bill') {
                $todaySalesSum += $saleRevenue;
                $todayCashSalesSum += (float)$sale->cash_received;
                $todayEwalletSalesSum += (float)$sale->split_ewallet_amount;
            } elseif ($sale->payment_method === 'home_credit') {
                $todayHomeCreditSalesSum += $saleRevenue;
                $todaySalesSum += $saleRevenue;
                if ($sale->downpayment > 0) {
                    $todayCashSalesSum += $sale->downpayment;
                }
            } elseif ($sale->payment_method === 'reservation') {
                if ($sale->status === 'reserved') {
                    $todayReservationSalesSum += $saleRevenue;
                    $todaySalesSum += $saleRevenue;
                    $todayCashSalesSum += $sale->downpayment;
                } elseif ($sale->status === 'completed') {
                    $todayReservationSalesSum += $saleRevenue;
                    $todaySalesSum += $saleRevenue;
                    if ($sale->ewallet_provider) {
                        if (!$startDate || $sale->created_at >= $startDate) {
                            $todayCashSalesSum += $sale->downpayment;
                        }
                        $todayEwalletSalesSum += ($saleRevenue - $sale->downpayment);
                    } else {
                        if (!$startDate || $sale->created_at >= $startDate) {
                            $todayCashSalesSum += $saleRevenue;
                        } else {
                            $todayCashSalesSum += ($saleRevenue - $sale->downpayment);
                        }
                    }
                } elseif ($sale->status === 'cancelled') {
                    if (!$startDate || $sale->created_at >= $startDate) {
                        $todayReservationSalesSum += $sale->downpayment;
                        $todaySalesSum += $sale->downpayment;
                        $todayCashSalesSum += $sale->downpayment;
                    }
                }
            }
        }
 
        // 2. Expenses
        $todayExpensesQuery = Expense::query();
        if ($startDate) {
            $todayExpensesQuery->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $todayExpensesQuery->where('created_at', '<=', $endDate);
        }
        $todayExpensesQuery->with('creator');
 
        if ($branchId) {
            $todayExpensesQuery->where('branch_id', $branchId);
        } elseif (!$user->hasRole('System Administrator') && $user->branch_id) {
            $todayExpensesQuery->where('branch_id', $user->branch_id);
        }
        $todayExpenses = $todayExpensesQuery->get();
        $todayExpensesSum = $todayExpenses->sum('amount');
 
        // 3. Service Fees
        $todayServiceFeesQuery = ServiceFee::query()
            ->where(function($q) {
                $q->whereNull('sale_id')
                  ->orWhereHas('sale', function($sq) {
                      $sq->whereIn('status', ['completed', 'reserved']);
                  });
            });
        if ($startDate) {
            $todayServiceFeesQuery->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $todayServiceFeesQuery->where('created_at', '<=', $endDate);
        }
        $todayServiceFeesQuery->with(['creator', 'sale']);
 
        if ($branchId) {
            $todayServiceFeesQuery->where('branch_id', $branchId);
        } elseif (!$user->hasRole('System Administrator') && $user->branch_id) {
            $todayServiceFeesQuery->where('branch_id', $user->branch_id);
        }
        $todayServiceFees = $todayServiceFeesQuery->get();
        $todayServiceFeesSum = $todayServiceFees->sum('amount');
        
        $todayServiceFeesCashSum = $todayServiceFees->sum(function ($fee) {
            if (($fee->payment_method ?? 'cash') === 'cash') {
                return (float)$fee->amount;
            } elseif ($fee->payment_method === 'split_bill') {
                return (float)($fee->cash_received ?? 0);
            }
            return 0.0;
        });
 
        // 4. Returns (for Cash on Hand deduction)
        $todayReturnsQuery = SaleReturn::where('return_type', 'refund');
        if ($startDate) {
            $todayReturnsQuery->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $todayReturnsQuery->where('created_at', '<=', $endDate);
        }
        if ($branchId) {
            $todayReturnsQuery->whereHas('sale', fn($q) => $q->where('branch_id', $branchId));
        } elseif (!$user->hasRole('System Administrator') && $user->branch_id) {
            $todayReturnsQuery->whereHas('sale', fn($q) => $q->where('branch_id', $user->branch_id));
        }
        $todayReturnsSum = $todayReturnsQuery->sum('refund_amount');

        // 5. Cash on Hand
        $cashOnHand = $todayCashSalesSum + $todayServiceFeesCashSum - $todayExpensesSum - $todayReturnsSum;
 
        $stats = [
            'today_sales' => (float)$todaySalesSum,
            'today_cash_sales' => (float)$todayCashSalesSum,
            'today_ewallet_sales' => (float)$todayEwalletSalesSum,
            'today_home_credit_sales' => (float)$todayHomeCreditSalesSum,
            'today_reservation_sales' => (float)$todayReservationSalesSum,
            'today_expenses' => (float)$todayExpensesSum,
            'today_service_fees' => (float)$todayServiceFeesSum,
            'today_returns_sum' => (float)$todayReturnsSum,
            'cash_on_hand' => (float)$cashOnHand,
        ];
        
        $sales = $query->paginate(10)->withQueryString();
        
        return Inertia::render('Sales/Index', [
            'sales' => $sales,
            'stats' => $stats,
            'filters' => $request->only(['search', 'date_from', 'date_to', 'status_filter', 'payment_method', 'date_preset']),
            'todaySales' => $todaySales,
            'todayExpenses' => $todayExpenses,
            'todayServiceFees' => $todayServiceFees,
        ]);
    }

    /**
     * Print the filtered list of sales
     */
    public function printList(Request $request)
    {
        $user = auth()->user();
        
        $query = Sale::with(['items.product', 'branch', 'readiedBy', 'approvedBy', 'serviceFees'])
            ->latest();
            
        // Reuse identical filters from index
        $statusFilter = $request->query('status_filter', 'all');
        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        } else {
            $query->whereIn('status', ['completed', 'cancelled', 'reserved']);
        }

        // Payment Method Filter
        $paymentMethodFilter = $request->query('payment_method', 'all');
        if ($paymentMethodFilter !== 'all') {
            $query->where('payment_method', $paymentMethodFilter);
        }
            
        // Date Preset / Range Calculation
        $datePreset = $request->query('date_preset', 'today');
        if ($user->hasRole('Branch Administrator') && !$user->hasRole('System Administrator')) {
            $datePreset = 'today';
        }
        
        $startDate = null;
        $endDate = null;

        if ($datePreset === 'today') {
            $startDate = Carbon::today();
            $endDate = Carbon::today()->endOfDay();
        } elseif ($datePreset === 'weekly') {
            $startDate = Carbon::now()->startOfWeek();
            $endDate = Carbon::now()->endOfDay();
        } elseif ($datePreset === 'monthly') {
            $startDate = Carbon::now()->startOfMonth();
            $endDate = Carbon::now()->endOfDay();
        } elseif ($datePreset === 'ytd') {
            $startDate = Carbon::now()->startOfYear();
            $endDate = Carbon::now()->endOfDay();
        } elseif ($datePreset === 'custom') {
            $dateFrom = $request->query('date_from');
            $dateTo = $request->query('date_to');
            if ($dateFrom) {
                $startDate = Carbon::parse($dateFrom)->startOfDay();
            }
            if ($dateTo) {
                $endDate = Carbon::parse($dateTo)->endOfDay();
            }
        }
        
        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('created_at', '<=', $endDate);
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
            'filters' => $request->only(['search', 'date_from', 'date_to', 'status_filter', 'payment_method', 'date_preset']),
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
        
        $sale->load(['items.product', 'branch', 'readiedBy', 'approvedBy', 'serviceFees']);
        
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
                'products.code',
                'products.barcode',
                'products.qr_code',
                'products.price',
                'products.image_path',
                'branch_products.quantity as available_quantity'
            )
            ->get();
        
        // Get readied or reserved sales pending approval (for branch admins)
        $pendingSales = Sale::with(['items.product', 'readiedBy', 'serviceFees'])
            ->where('branch_id', $branchId)
            ->whereIn('status', ['readied', 'reserved'])
            ->latest()
            ->get();
        
        return Inertia::render('Sales/Create', [
            'products' => $products,
            'pendingSales' => $pendingSales,
        ]);
    }

    /**
     * Get pending sales for the branch (polled by UI)
     */
    public function getPendingSales()
    {
        $user = auth()->user();
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;
        
        if (!$branchId) {
            return response()->json(['error' => 'User does not belong to a branch or active branch not selected'], 403);
        }
        
        $pendingSales = Sale::with(['items.product', 'readiedBy', 'serviceFees'])
            ->where('branch_id', $branchId)
            ->whereIn('status', ['readied', 'reserved'])
            ->latest()
            ->get();
            
        return response()->json($pendingSales);
    }

    /**
     * Search products in branch inventory
     */
    public function search(Request $request)
    {
        $search = $request->query('search');
        if (!$search) return response()->json([]);
        
        $user = auth()->user();
        $branchId = $request->query('branch_id') ?: (($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id);
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
                'code' => $p->code,
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
                'products.code',
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
            'items.*.custom_code' => 'nullable|string',
            'items.*.note' => 'nullable|string',
            'notes' => 'nullable|string',
            'add_service_fee' => 'nullable|boolean',
            'service_fee_name' => 'nullable|string|max:255',
            'service_fee_amount' => 'nullable|numeric|min:0',
            'service_fee_payment_method' => 'required_if:add_service_fee,true|nullable|in:cash,e-wallet,split_bill',
            'service_fee_cash_received' => 'required_if:service_fee_payment_method,split_bill|nullable|numeric|min:0',
            'service_fee_split_ewallet_amount' => 'required_if:service_fee_payment_method,split_bill|nullable|numeric|min:0',
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
                    'custom_code' => $item['custom_code'] ?? null,
                    'note' => $item['note'] ?? null,
                ]);
            }

            if ($request->add_service_fee && $request->service_fee_amount > 0) {
                ServiceFee::create([
                    'branch_id' => $branchId,
                    'name' => $request->service_fee_name ?: 'Service Fee',
                    'amount' => $request->service_fee_amount,
                    'created_by' => $user->id,
                    'sale_id' => $sale->id,
                    'payment_method' => $request->service_fee_payment_method ?? 'cash',
                    'cash_received' => $request->service_fee_payment_method === 'split_bill' ? $request->service_fee_cash_received : null,
                    'split_ewallet_amount' => $request->service_fee_payment_method === 'split_bill' ? $request->service_fee_split_ewallet_amount : null,
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
    public function approve(Sale $sale, Request $request, \App\Services\OneSignalService $oneSignal)
    {
        $user = auth()->user();
        
        // Only branch admins can approve
        if (!$user->hasRole('Branch Administrator') && !$user->hasRole('System Administrator')) {
            abort(403, 'Only administrators can approve sales');
        }
        
        if ($sale->status !== 'readied' && $sale->status !== 'reserved') {
            return redirect()->back()->with('error', 'Sale is not in a status that can be approved');
        }

        $isCompleting = $request->input('is_completing_reservation') === true || $request->input('is_completing_reservation') === 'true' || $sale->status === 'reserved';

        $rules = [
            'payment_method' => 'required|in:cash,e-wallet,home_credit,reservation,split_bill',
            'ewallet_provider' => 'required_if:payment_method,e-wallet,split_bill|nullable|string',
            'proof_of_payment' => 'required_if:payment_method,e-wallet,split_bill|nullable|image|max:5120', // 5MB max
            'cash_received' => 'required_if:payment_method,cash,split_bill|nullable|numeric|min:0',
            'change_amount' => 'required_if:payment_method,cash|nullable|numeric|min:0',
            'split_ewallet_amount' => 'required_if:payment_method,split_bill|nullable|numeric|min:0',
            'home_credited_name' => 'required_if:payment_method,home_credit|nullable|string',
            'downpayment' => 'nullable|numeric|min:0',
        ];

        if ($isCompleting) {
            $rules['reservation_final_method'] = 'required|in:cash,e-wallet';
            $rules['reservation_cash_received'] = 'required_if:reservation_final_method,cash|nullable|numeric|min:0';
            $rules['reservation_change_amount'] = 'required_if:reservation_final_method,cash|nullable|numeric|min:0';
            $rules['reservation_ewallet_provider'] = 'required_if:reservation_final_method,e-wallet|nullable|string';
            $rules['reservation_proof_of_payment'] = 'required_if:reservation_final_method,e-wallet|nullable|image|max:5120';
        } else {
            $rules['customer_name'] = 'required_if:payment_method,reservation|nullable|string';
            $rules['reservation_buy_date'] = 'nullable|date';
            $rules['downpayment'] = 'required_if:payment_method,reservation|nullable|numeric|min:0';
        }

        $request->validate($rules);
        
        DB::transaction(function () use ($sale, $user, $request, $isCompleting) {
            if ($isCompleting) {
                $updateData = [
                    'status' => 'completed',
                    'approved_by' => $user->id,
                ];

                if ($request->reservation_final_method === 'e-wallet') {
                    $updateData['ewallet_provider'] = $request->reservation_ewallet_provider;
                    if ($request->hasFile('reservation_proof_of_payment')) {
                        $path = $request->file('reservation_proof_of_payment')->store('proofs', 'public');
                        $updateData['proof_of_payment_path'] = $path;
                    }
                } else {
                    $updateData['cash_received'] = $request->reservation_cash_received;
                    $updateData['change_amount'] = $request->reservation_change_amount;
                }

                $sale->update($updateData);
            } else {
                // Deduct inventory for each item
                foreach ($sale->items as $item) {
                    DB::table('branch_products')
                        ->where('branch_id', $sale->branch_id)
                        ->where('product_id', $item->product_id)
                        ->decrement('quantity', $item->quantity);
                }
                
                $updateData = [
                    'approved_by' => $user->id,
                    'payment_method' => $request->payment_method,
                ];

                if ($request->payment_method === 'reservation') {
                    $updateData['status'] = 'reserved';
                    $updateData['customer_name'] = $request->customer_name;
                    $updateData['downpayment'] = $request->downpayment;
                    $updateData['reservation_buy_date'] = $request->reservation_buy_date;
                } elseif ($request->payment_method === 'e-wallet') {
                    $updateData['status'] = 'completed';
                    $updateData['ewallet_provider'] = $request->ewallet_provider;
                    if ($request->hasFile('proof_of_payment')) {
                        $path = $request->file('proof_of_payment')->store('proofs', 'public');
                        $updateData['proof_of_payment_path'] = $path;
                    }
                } elseif ($request->payment_method === 'split_bill') {
                    $updateData['status'] = 'completed';
                    $updateData['cash_received'] = $request->cash_received;
                    $updateData['change_amount'] = 0.00;
                    $updateData['split_ewallet_amount'] = $request->split_ewallet_amount;
                    $updateData['ewallet_provider'] = $request->ewallet_provider;
                    if ($request->hasFile('proof_of_payment')) {
                        $path = $request->file('proof_of_payment')->store('proofs', 'public');
                        $updateData['proof_of_payment_path'] = $path;
                    }
                } elseif ($request->payment_method === 'home_credit') {
                    $updateData['status'] = 'completed';
                    $updateData['home_credited_name'] = $request->home_credited_name;
                    $updateData['downpayment'] = $request->downpayment;
                } else {
                    $updateData['status'] = 'completed';
                    $updateData['cash_received'] = $request->cash_received;
                    $updateData['change_amount'] = $request->change_amount;
                }

                $sale->update($updateData);
            }
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

        return redirect()->back()->with('success', 'Sale approved successfully.');
    }

    /**
     * Cancel a readied sale
     */
    public function cancel(Sale $sale, \App\Services\OneSignalService $oneSignal)
    {
        if ($sale->status !== 'readied' && $sale->status !== 'reserved') {
            return redirect()->back()->with('error', 'Only readied or reserved sales can be cancelled');
        }
        
        DB::transaction(function () use ($sale) {
            // Restore inventory if it was reserved
            if ($sale->status === 'reserved') {
                foreach ($sale->items as $item) {
                    DB::table('branch_products')
                        ->where('branch_id', $sale->branch_id)
                        ->where('product_id', $item->product_id)
                        ->increment('quantity', $item->quantity);
                }
            }
            $sale->update(['status' => 'cancelled']);
            // Delete associated service fees
            $sale->serviceFees()->delete();
        });
        
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
        
        $returnsQuery = SaleReturn::with(['sale.branch', 'product', 'replacementProduct', 'returnedBy'])->latest();

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

        // Date Preset / Range Calculation for selecting a sale in returns
        $datePreset = $request->query('date_preset', 'today');
        
        $startDate = null;
        $endDate = null;

        if ($datePreset === 'today') {
            $startDate = Carbon::today();
            $endDate = Carbon::today()->endOfDay();
        } elseif ($datePreset === 'weekly') {
            $startDate = Carbon::now()->startOfWeek();
            $endDate = Carbon::now()->endOfDay();
        } elseif ($datePreset === 'monthly') {
            $startDate = Carbon::now()->startOfMonth();
            $endDate = Carbon::now()->endOfDay();
        } elseif ($datePreset === 'ytd') {
            $startDate = Carbon::now()->startOfYear();
            $endDate = Carbon::now()->endOfDay();
        } elseif ($datePreset === 'custom') {
            $dateFrom = $request->query('date_from');
            $dateTo = $request->query('date_to');
            if ($dateFrom) {
                $startDate = Carbon::parse($dateFrom)->startOfDay();
            }
            if ($dateTo) {
                $endDate = Carbon::parse($dateTo)->endOfDay();
            }
        }

        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
            $returnsQuery->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('created_at', '<=', $endDate);
            $returnsQuery->where('created_at', '<=', $endDate);
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
            'filters' => $request->only(['search', 'date_preset', 'date_from', 'date_to']),
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
            'return_type' => 'required|in:refund,exchange',
            'replacement_product_id' => 'required_if:return_type,exchange|nullable|exists:products,id',
            'replacement_quantity' => 'required_if:return_type,exchange|nullable|integer|min:1',
            'restored_to_inventory' => 'required|boolean',
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
        
        // Calculate refund amount if type is refund
        $refundAmount = 0.00;
        if ($request->return_type === 'refund') {
            $refundAmount = $request->quantity * $saleItem->price;
        }

        DB::transaction(function () use ($request, $sale, $user, $refundAmount) {
            // Create return record
            SaleReturn::create([
                'sale_id' => $sale->id,
                'product_id' => $request->product_id,
                'quantity' => $request->quantity,
                'returned_by' => $user->id,
                'reason' => $request->reason,
                'return_type' => $request->return_type,
                'replacement_product_id' => $request->return_type === 'exchange' ? $request->replacement_product_id : null,
                'replacement_quantity' => $request->return_type === 'exchange' ? $request->replacement_quantity : null,
                'refund_amount' => $refundAmount,
                'restored_to_inventory' => (bool)$request->restored_to_inventory,
            ]);
            
            // Restore original item to inventory if specified
            if ($request->restored_to_inventory) {
                DB::table('branch_products')
                    ->where('branch_id', $sale->branch_id)
                    ->where('product_id', $request->product_id)
                    ->increment('quantity', $request->quantity);
            }

            // Deduct replacement item inventory if exchange
            if ($request->return_type === 'exchange') {
                DB::table('branch_products')
                    ->where('branch_id', $sale->branch_id)
                    ->where('product_id', $request->replacement_product_id)
                    ->decrement('quantity', $request->replacement_quantity);
            }
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
                
                $message = "Return processed for Sale #{$sale->id}: {$request->quantity}x {$productName}";
                if ($request->return_type === 'exchange') {
                    $replacement = \App\Models\Product::find($request->replacement_product_id);
                    $replacementName = $replacement ? $replacement->name : 'replacement';
                    $message .= " exchanged for {$request->replacement_quantity}x {$replacementName}";
                } else {
                    $message .= " refunded (₱" . number_format($refundAmount, 2) . " cash)";
                }
                $message .= " by {$user->name}.";

                $oneSignal->sendNotification(
                    $message,
                    $adminPlayerIds,
                    "Return/Exchange Processed"
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send return notification: " . $e->getMessage());
        }

        $successMsg = $request->return_type === 'exchange' 
            ? 'Exchange processed successfully and inventory updated.' 
            : 'Return processed and cash refund recorded.';

        return redirect()->back()->with('success', $successMsg);
    }

    /**
     * Get completed sales for the active branch filtered by a specific date
     */
    public function getCompletedSales(Request $request)
    {
        $user = auth()->user();
        
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : null;
            
        $query = Sale::with(['items.product', 'branch', 'readiedBy', 'approvedBy'])
            ->where('status', 'completed')
            ->latest();

        if ($branchId) {
            $query->where('branch_id', $branchId);
        } elseif (!$user->hasRole('System Administrator') && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        if ($request->has('date') && $request->date) {
            $query->whereDate('created_at', $request->date);
        }

        $sales = $query->take(100)->get();

        return response()->json($sales);
    }

    /**
     * Delete all historical sales and transfers for the active branch and sync with Google Sheets.
     */
    public function deleteBranchHistory(Request $request, \App\Services\GoogleSheetsService $sheetsService)
    {
        $user = auth()->user();

        // 1. Double check role limit (even with middleware)
        if (!$user->hasRole('System Administrator')) {
            abort(403, 'Unauthorized. Only System Administrators can perform this action.');
        }

        // 2. Validate request
        $request->validate([
            'password' => 'required|string',
            'type' => 'required|in:sales,transfers',
        ]);

        // 3. Verify password
        if (!\Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
            return back()->withErrors(['password' => 'The provided password is incorrect.']);
        }

        // 4. Retrieve active branch ID
        $branchId = session('active_branch_id');
        if (!$branchId) {
            return back()->withErrors(['error' => 'No active branch selected. Please select a branch first.']);
        }

        $type = $request->type;

        // 5. Delete historical records in database without triggering event listeners
        DB::transaction(function () use ($branchId, $type) {
            if ($type === 'sales') {
                // Delete historical Sales (completed, cancelled)
                Sale::withoutEvents(function () use ($branchId) {
                    Sale::where('branch_id', $branchId)
                        ->whereIn('status', ['completed', 'cancelled'])
                        ->delete();
                });
            } else if ($type === 'transfers') {
                // Delete historical Transfers (completed, rejected, or involving a soft-deleted branch)
                $deletedBranchIds = \App\Models\Branch::onlyTrashed()->pluck('id')->toArray();

                \App\Models\Transfer::withoutEvents(function () use ($branchId, $deletedBranchIds) {
                    \App\Models\Transfer::where(function ($query) use ($branchId) {
                        $query->where('source_branch_id', $branchId)
                              ->orWhere('destination_branch_id', $branchId);
                    })
                    ->where(function ($query) use ($deletedBranchIds) {
                        $query->whereIn('status', ['completed', 'rejected'])
                              ->orWhereIn('source_branch_id', $deletedBranchIds)
                              ->orWhereIn('destination_branch_id', $deletedBranchIds);
                    })
                    ->delete();
                });
            }
        });

        // 6. Bulk rewrite the corresponding sheet to Google Sheets to clear deleted items
        if ($type === 'sales') {
            $sheetsService->syncSalesSheet();
            $successMsg = 'Historical sales for the active branch have been successfully cleared.';
        } else {
            $sheetsService->syncTransfersSheet();
            $successMsg = 'Historical transfers for the active branch have been successfully cleared.';
        }

        return redirect()->back()->with('success', $successMsg);
    }
}
