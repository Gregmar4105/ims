<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Branch;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Determine selected branch filter
        $branchId = $user->branch_id;
        if ($user->hasRole('System Administrator')) {
            $branchId = $request->input('branch_id', 'all');
        } else {
            // Branch Administrators are locked to their own branch
            $branchId = $user->branch_id;
        }

        // --- Date Preset / Range Calculation ---
        $datePreset = $request->input('date_preset', 'monthly');
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
            $dateFrom = $request->input('date_from');
            $dateTo = $request->input('date_to');
            if ($dateFrom) {
                $startDate = Carbon::parse($dateFrom)->startOfDay();
            }
            if ($dateTo) {
                $endDate = Carbon::parse($dateTo)->endOfDay();
            }
        }

        // --- Overview Stats (Financial Summary) ---
        $salesQuery = Sale::where('status', 'completed');
        if ($branchId !== 'all') {
            $salesQuery->where('branch_id', $branchId);
        }
        if ($startDate) {
            $salesQuery->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $salesQuery->where('created_at', '<=', $endDate);
        }
        $sales = $salesQuery->with('items')->get();

        $totalRevenue = 0;
        $totalItemsSold = 0;
        foreach ($sales as $sale) {
            foreach ($sale->items as $item) {
                $totalRevenue += $item->quantity * $item->price;
                $totalItemsSold += $item->quantity;
            }
        }

        // Expenses
        $expenseQuery = \App\Models\Expense::query();
        if ($branchId !== 'all') {
            $expenseQuery->where('branch_id', $branchId);
        }
        if ($startDate) {
            $expenseQuery->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $expenseQuery->where('created_at', '<=', $endDate);
        }
        $totalExpenses = (float)$expenseQuery->sum('amount');

        // Service Fees
        $feeQuery = \App\Models\ServiceFee::query();
        if ($branchId !== 'all') {
            $feeQuery->where('branch_id', $branchId);
        }
        if ($startDate) {
            $feeQuery->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $feeQuery->where('created_at', '<=', $endDate);
        }
        $totalFees = (float)$feeQuery->sum('amount');

        // Returns
        $returnQuery = \App\Models\SaleReturn::query();
        if ($branchId !== 'all') {
            $returnQuery->whereHas('sale', fn($q) => $q->where('branch_id', $branchId));
        }
        if ($startDate) {
            $returnQuery->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $returnQuery->where('created_at', '<=', $endDate);
        }
        $totalReturns = (float)$returnQuery->sum('refund_amount');
        $totalReturnsCount = $returnQuery->count();

        // Calculate Net Profit indicator
        $netProfit = $totalRevenue + $totalFees - $totalExpenses - $totalReturns;

        // --- Trending / Fast-Moving Items ---
        $trendingItemsQuery = SaleItem::whereHas('sale', function ($q) use ($branchId, $startDate, $endDate) {
            $q->where('status', 'completed');
            if ($branchId !== 'all') {
                $q->where('branch_id', $branchId);
            }
            if ($startDate) {
                $q->where('created_at', '>=', $startDate);
            }
            if ($endDate) {
                $q->where('created_at', '<=', $endDate);
            }
        });

        $trendingItems = $trendingItemsQuery->with('product.category')
            ->select('product_id', DB::raw('SUM(quantity) as total_qty'), DB::raw('SUM(quantity * price) as total_revenue'))
            ->groupBy('product_id')
            ->orderByDesc('total_qty')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->product_id,
                    'name' => $item->product?->name ?? 'Unknown Product',
                    'sku' => $item->product?->sku ?? '',
                    'category' => $item->product?->category?->name ?? 'Uncategorized',
                    'quantity_sold' => (int)$item->total_qty,
                    'revenue' => (float)$item->total_revenue,
                    'avg_price' => $item->total_qty > 0 ? (float)($item->total_revenue / $item->total_qty) : 0,
                ];
            });

        // --- Branch Stock & Sales Matrix ---
        $branches = Branch::all();
        $searchQuery = $request->input('search');

        $productsQuery = Product::with(['category', 'branches']);
        if ($searchQuery) {
            $productsQuery->where(function($q) use ($searchQuery) {
                $q->where('name', 'like', "%{$searchQuery}%")
                  ->orWhere('sku', 'like', "%{$searchQuery}%")
                  ->orWhere('code', 'like', "%{$searchQuery}%");
            });
        }
        $products = $productsQuery->limit(50)->get();

        $branchMatrix = $products->map(function ($product) use ($branches, $startDate, $endDate) {
            $branchData = [];
            foreach ($branches as $branch) {
                $branchProduct = $product->branches->firstWhere('id', $branch->id);
                $stock = $branchProduct ? $branchProduct->pivot->quantity : 0;
                
                $salesQty = SaleItem::where('product_id', $product->id)
                    ->whereHas('sale', function ($q) use ($branch, $startDate, $endDate) {
                        $q->where('branch_id', $branch->id)
                          ->where('status', 'completed');
                        if ($startDate) {
                            $q->where('created_at', '>=', $startDate);
                        }
                        if ($endDate) {
                            $q->where('created_at', '<=', $endDate);
                        }
                    })->sum('quantity');

                $branchData[$branch->id] = [
                    'stock' => (int)$stock,
                    'sales' => (int)$salesQty,
                ];
            }

            return [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku ?? '',
                'category' => $product->category?->name ?? 'Uncategorized',
                'price' => (float)$product->price,
                'branches' => $branchData,
                'total_stock' => (int)$product->branches->sum('pivot.quantity'),
                'total_sales' => (int)SaleItem::where('product_id', $product->id)
                    ->whereHas('sale', function ($q) use ($startDate, $endDate) {
                        $q->where('status', 'completed');
                        if ($startDate) {
                            $q->where('created_at', '>=', $startDate);
                        }
                        if ($endDate) {
                            $q->where('created_at', '<=', $endDate);
                        }
                    })->sum('quantity'),
            ];
        });

        // --- Sales Trend Timeline ---
        $salesTrend = [];
        if ($datePreset === 'today') {
            for ($i = 6; $i >= 0; $i--) {
                $day = Carbon::today()->subDays($i);
                $revenue = SaleItem::whereHas('sale', function ($q) use ($branchId, $day) {
                    $q->where('status', 'completed')
                      ->whereDate('created_at', $day);
                    if ($branchId !== 'all') {
                        $q->where('branch_id', $branchId);
                    }
                })->sum(DB::raw('quantity * price'));
                
                $salesTrend[] = ['name' => $day->format('M d'), 'sales' => (float)$revenue];
            }
        } elseif ($datePreset === 'weekly') {
            $start = Carbon::now()->startOfWeek();
            for ($i = 0; $i < 7; $i++) {
                $day = $start->copy()->addDays($i);
                $revenue = SaleItem::whereHas('sale', function ($q) use ($branchId, $day) {
                    $q->where('status', 'completed')
                      ->whereDate('created_at', $day);
                    if ($branchId !== 'all') {
                        $q->where('branch_id', $branchId);
                    }
                })->sum(DB::raw('quantity * price'));
                
                $salesTrend[] = ['name' => $day->format('D'), 'sales' => (float)$revenue];
            }
        } elseif ($datePreset === 'monthly') {
            $start = Carbon::now()->startOfMonth();
            $daysInMonth = Carbon::now()->daysInMonth;
            for ($i = 0; $i < $daysInMonth; $i++) {
                $day = $start->copy()->addDays($i);
                if ($day->gt(Carbon::today())) continue;
                
                $revenue = SaleItem::whereHas('sale', function ($q) use ($branchId, $day) {
                    $q->where('status', 'completed')
                      ->whereDate('created_at', $day);
                    if ($branchId !== 'all') {
                        $q->where('branch_id', $branchId);
                    }
                })->sum(DB::raw('quantity * price'));
                
                $salesTrend[] = ['name' => $day->format('d'), 'sales' => (float)$revenue];
            }
        } elseif ($datePreset === 'custom') {
            if ($startDate && $endDate) {
                $diffInDays = $startDate->diffInDays($endDate);
                if ($diffInDays <= 31) {
                    for ($i = 0; $i <= $diffInDays; $i++) {
                        $day = $startDate->copy()->addDays($i);
                        $revenue = SaleItem::whereHas('sale', function ($q) use ($branchId, $day) {
                            $q->where('status', 'completed')
                              ->whereDate('created_at', $day);
                            if ($branchId !== 'all') {
                                $q->where('branch_id', $branchId);
                            }
                        })->sum(DB::raw('quantity * price'));
                        
                        $salesTrend[] = ['name' => $day->format('M d'), 'sales' => (float)$revenue];
                    }
                } else {
                    $diffInMonths = $startDate->diffInMonths($endDate);
                    for ($i = 0; $i <= $diffInMonths; $i++) {
                        $month = $startDate->copy()->addMonths($i);
                        $revenue = SaleItem::whereHas('sale', function ($q) use ($branchId, $month) {
                            $q->where('status', 'completed')
                              ->whereMonth('created_at', $month->month)
                              ->whereYear('created_at', $month->year);
                            if ($branchId !== 'all') {
                                $q->where('branch_id', $branchId);
                            }
                        })->sum(DB::raw('quantity * price'));
                        
                        $salesTrend[] = ['name' => $month->format('M Y'), 'sales' => (float)$revenue];
                    }
                }
            }
        } else {
            // ytd
            $currentMonth = Carbon::now()->month;
            for ($i = 1; $i <= $currentMonth; $i++) {
                $month = Carbon::create(Carbon::now()->year, $i, 1);
                $revenue = SaleItem::whereHas('sale', function ($q) use ($branchId, $i) {
                    $q->where('status', 'completed')
                      ->whereMonth('created_at', $i)
                      ->whereYear('created_at', Carbon::now()->year);
                    if ($branchId !== 'all') {
                        $q->where('branch_id', $branchId);
                    }
                })->sum(DB::raw('quantity * price'));
                
                $salesTrend[] = ['name' => $month->format('M'), 'sales' => (float)$revenue];
            }
        }

        // --- Sales Distribution by Category ---
        $salesDistribution = SaleItem::with(['product.category'])
            ->whereHas('sale', function ($q) use ($branchId, $startDate, $endDate) {
                $q->where('status', 'completed');
                if ($branchId !== 'all') {
                    $q->where('branch_id', $branchId);
                }
                if ($startDate) {
                    $q->where('created_at', '>=', $startDate);
                }
                if ($endDate) {
                    $q->where('created_at', '<=', $endDate);
                }
            })
            ->get()
            ->groupBy(fn($item) => $item->product?->category?->name ?? 'Uncategorized')
            ->map(function ($items, $categoryName) {
                return [
                    'name' => $categoryName,
                    'value' => (float)$items->sum(fn($item) => $item->quantity * $item->price),
                    'count' => (int)$items->sum('quantity'),
                ];
            })
            ->values()
            ->all();

        // --- Sales Distribution by Payment Method ---
        $paymentMethodDistribution = Sale::where('status', 'completed')
            ->when($branchId !== 'all', fn($q) => $q->where('branch_id', $branchId))
            ->when($startDate, fn($q) => $q->where('created_at', '>=', $startDate))
            ->when($endDate, fn($q) => $q->where('created_at', '<=', $endDate))
            ->get()
            ->groupBy('payment_method')
            ->map(function ($sales, $method) {
                $total = $sales->sum(function($sale) {
                    return $sale->items->sum(fn($item) => $item->quantity * $item->price);
                });
                return [
                    'name' => ucfirst(str_replace('_', ' ', $method)),
                    'value' => (float)$total,
                    'count' => $sales->count(),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Reports/Index', [
            'branches' => $branches,
            'branchId' => $branchId,
            'datePreset' => $datePreset,
            'dateFrom' => $request->input('date_from', ''),
            'dateTo' => $request->input('date_to', ''),
            'search' => $searchQuery ?? '',
            'stats' => [
                'revenue' => (float)$totalRevenue,
                'expenses' => (float)$totalExpenses,
                'fees' => (float)$totalFees,
                'returns' => (float)$totalReturns,
                'returns_count' => (int)$totalReturnsCount,
                'net_profit' => (float)$netProfit,
                'items_sold' => (int)$totalItemsSold,
            ],
            'trendingItems' => $trendingItems,
            'branchMatrix' => $branchMatrix,
            'chartData' => $salesTrend,
            'pieData' => $salesDistribution,
            'paymentData' => $paymentMethodDistribution,
        ]);
    }
}
