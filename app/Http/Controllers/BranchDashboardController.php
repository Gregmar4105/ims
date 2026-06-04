<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BranchDashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Handle branch override for System Administrators
        $branchId = $user->branch_id;
        if ($user->hasRole('System Administrator')) {
            if ($request->has('branch_id')) {
                $branchId = $request->input('branch_id');
                session(['active_branch_id' => $branchId]);
            } else {
                $branchId = session('active_branch_id', $user->branch_id);
            }
        }

        $date = $request->input('date') ? Carbon::parse($request->input('date')) : Carbon::today();

        // Base Query Helpers
        $salesQuery = function($query) use ($branchId) {
            return $query->whereHas('sale', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId)
                  ->where('status', 'completed');
            });
        };

        // --- Date Preset / Range Calculation ---
        $datePreset = $request->input('date_preset', 'today');
        
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

        // --- Stats Cards (Based on Revenue) ---
        // Overwrite "daily" sales with the selected period's sales
        $periodSalesQuery = SaleItem::query();
        $periodSalesQuery = $salesQuery($periodSalesQuery);
        if ($startDate) {
            $periodSalesQuery->whereHas('sale', fn($q) => $q->where('created_at', '>=', $startDate));
        }
        if ($endDate) {
            $periodSalesQuery->whereHas('sale', fn($q) => $q->where('created_at', '<=', $endDate));
        }
        $dailySales = (float)$periodSalesQuery->sum(DB::raw('quantity * price'));

        $weeklySales = $salesQuery(SaleItem::query())
            ->whereHas('sale', fn($q) => $q->whereBetween('created_at', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()]))
            ->sum(DB::raw('quantity * price'));
        
        $monthlySales = $salesQuery(SaleItem::query())
            ->whereHas('sale', fn($q) => $q->whereMonth('created_at', Carbon::now()->month)->whereYear('created_at', Carbon::now()->year))
            ->sum(DB::raw('quantity * price'));
        
        $ytdSales = $salesQuery(SaleItem::query())
            ->whereHas('sale', fn($q) => $q->whereYear('created_at', Carbon::now()->year))
            ->sum(DB::raw('quantity * price'));

        $selectedDateSales = $dailySales;

        // --- Charts ---
        $salesTrend = [];
        $ytdTrend = [];

        if ($datePreset === 'today') {
            for ($i = 6; $i >= 0; $i--) {
                $day = Carbon::today()->subDays($i);
                $revenue = $salesQuery(SaleItem::query())
                    ->whereHas('sale', fn($q) => $q->whereDate('created_at', $day))
                    ->sum(DB::raw('quantity * price'));
                $salesTrend[] = ['name' => $day->format('M d'), 'sales' => (float)$revenue];
            }
        } elseif ($datePreset === 'weekly') {
            $start = Carbon::now()->startOfWeek();
            for ($i = 0; $i < 7; $i++) {
                $day = $start->copy()->addDays($i);
                $revenue = $salesQuery(SaleItem::query())
                    ->whereHas('sale', fn($q) => $q->whereDate('created_at', $day))
                    ->sum(DB::raw('quantity * price'));
                $salesTrend[] = ['name' => $day->format('D'), 'sales' => (float)$revenue];
            }
        } elseif ($datePreset === 'monthly') {
            $start = Carbon::now()->startOfMonth();
            $daysInMonth = Carbon::now()->daysInMonth;
            for ($i = 0; $i < $daysInMonth; $i++) {
                $day = $start->copy()->addDays($i);
                if ($day->gt(Carbon::today())) {
                    continue;
                }
                $revenue = $salesQuery(SaleItem::query())
                    ->whereHas('sale', fn($q) => $q->whereDate('created_at', $day))
                    ->sum(DB::raw('quantity * price'));
                $salesTrend[] = ['name' => $day->format('d'), 'sales' => (float)$revenue];
            }
        } elseif ($datePreset === 'custom') {
            if ($startDate && $endDate) {
                $diffInDays = $startDate->diffInDays($endDate);
                if ($diffInDays <= 31) {
                    for ($i = 0; $i <= $diffInDays; $i++) {
                        $day = $startDate->copy()->addDays($i);
                        $revenue = $salesQuery(SaleItem::query())
                            ->whereHas('sale', fn($q) => $q->whereDate('created_at', $day))
                            ->sum(DB::raw('quantity * price'));
                        $salesTrend[] = ['name' => $day->format('M d'), 'sales' => (float)$revenue];
                    }
                } else {
                    $diffInMonths = $startDate->diffInMonths($endDate);
                    for ($i = 0; $i <= $diffInMonths; $i++) {
                        $month = $startDate->copy()->addMonths($i);
                        $revenue = $salesQuery(SaleItem::query())
                            ->whereHas('sale', fn($q) => $q->whereMonth('created_at', $month->month)->whereYear('created_at', $month->year))
                            ->sum(DB::raw('quantity * price'));
                        $salesTrend[] = ['name' => $month->format('M Y'), 'sales' => (float)$revenue];
                    }
                }
            }
        } else {
            // 'ytd' or 'all'
            $currentMonth = Carbon::now()->month;
            for ($i = 1; $i <= $currentMonth; $i++) {
                $month = Carbon::create(Carbon::now()->year, $i, 1);
                $revenue = $salesQuery(SaleItem::query())
                    ->whereHas('sale', fn($q) => $q->whereMonth('created_at', $i)->whereYear('created_at', Carbon::now()->year))
                    ->sum(DB::raw('quantity * price'));
                $salesTrend[] = ['name' => $month->format('M'), 'sales' => (float)$revenue];
            }
        }

        // Static trends for sparklines
        $weeklyTrend = [];
        for ($i = 3; $i >= 0; $i--) {
            $start = Carbon::now()->subWeeks($i)->startOfWeek();
            $end = Carbon::now()->subWeeks($i)->endOfWeek();
            $revenue = $salesQuery(SaleItem::query())
                ->whereHas('sale', fn($q) => $q->whereBetween('created_at', [$start, $end]))
                ->sum(DB::raw('quantity * price'));
            $weeklyTrend[] = ['name' => 'Wk ' . (4 - $i), 'sales' => (float)$revenue];
        }

        $monthlyTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $revenue = $salesQuery(SaleItem::query())
                ->whereHas('sale', fn($q) => $q->whereMonth('created_at', $month->month)->whereYear('created_at', $month->year))
                ->sum(DB::raw('quantity * price'));
            $monthlyTrend[] = ['name' => $month->format('M'), 'sales' => (float)$revenue];
        }

        // Build static YTD trend for card sparkline
        $currentMonth = Carbon::now()->month;
        for ($i = 1; $i <= $currentMonth; $i++) {
            $month = Carbon::create(Carbon::now()->year, $i, 1);
            $revenue = $salesQuery(SaleItem::query())
                ->whereHas('sale', fn($q) => $q->whereMonth('created_at', $i)->whereYear('created_at', Carbon::now()->year))
                ->sum(DB::raw('quantity * price'));
            $ytdTrend[] = ['name' => $month->format('M'), 'sales' => (float)$revenue];
        }

        // Sales Distribution (By Category) - filtered by selected period
        $salesDistributionQuery = SaleItem::with(['product.category'])
            ->whereHas('sale', function ($query) use ($branchId, $startDate, $endDate) {
                $query->where('branch_id', $branchId)
                      ->where('status', 'completed');
                if ($startDate) {
                    $query->where('created_at', '>=', $startDate);
                }
                if ($endDate) {
                    $query->where('created_at', '<=', $endDate);
                }
            });
        $salesDistribution = $salesDistributionQuery->get()
            ->groupBy(fn($item) => $item->product?->category?->name ?? 'Uncategorized')
            ->map(function ($items, $categoryName) {
                return ['name' => $categoryName, 'value' => (float)$items->sum(fn($item) => $item->quantity * $item->price)];
            })
            ->values()
            ->all();

        // Product Distribution - filtered by selected period
        $productDistributionQuery = SaleItem::with(['product'])
            ->whereHas('sale', function ($query) use ($branchId, $startDate, $endDate) {
                $query->where('branch_id', $branchId)
                      ->where('status', 'completed');
                if ($startDate) {
                    $query->where('created_at', '>=', $startDate);
                }
                if ($endDate) {
                    $query->where('created_at', '<=', $endDate);
                }
            });
        $productDistribution = $productDistributionQuery->get()
            ->groupBy(fn($item) => $item->product?->name ?? 'Unknown Product')
            ->map(function ($items, $productName) {
                return ['name' => $productName, 'value' => (float)$items->sum('quantity')];
            })
            ->values()
            ->sortByDesc('value')
            ->values()
            ->all();

        // Get all users in the branch
        $users = User::where('branch_id', $branchId)->get();
        
        $leaderboard = $users->map(function ($employee) use ($branchId) {
            // Helper to get revenue for this specific user
            $getUserRevenue = function ($query) use ($employee, $branchId) {
                return $query->whereHas('sale', function ($q) use ($employee, $branchId) {
                    $q->where('branch_id', $branchId)
                      ->where('status', 'completed')
                      ->where('readied_by', $employee->id);
                })->sum(DB::raw('quantity * price'));
            };

            $daily = $getUserRevenue(SaleItem::whereHas('sale', fn($q) => $q->whereDate('created_at', Carbon::today())));
            $weekly = $getUserRevenue(SaleItem::whereHas('sale', fn($q) => $q->whereBetween('created_at', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])));
            $monthly = $getUserRevenue(SaleItem::whereHas('sale', fn($q) => $q->whereMonth('created_at', Carbon::now()->month)->whereYear('created_at', Carbon::now()->year)));
            $total = $getUserRevenue(SaleItem::query());
            
            $outgoing = 0;
            if (class_exists(\App\Models\Transfer::class)) {
                $outgoing = \App\Models\Transfer::where('source_branch_id', $branchId)
                            ->where('readied_by', $employee->id)
                            ->count();
            }

            return [
                'id' => $employee->id,
                'name' => $employee->name,
                'role' => $employee->getRoleNames()->first() ?? 'Employee',
                'joined' => $employee->created_at->format('Y-m-d'),
                'profile_photo_url' => $employee->profile_photo_url,
                'daily' => (float)$daily,
                'weekly' => (float)$weekly,
                'monthlyContribution' => (float)$monthly,
                'sales' => (float)$total,
                'outgoing' => $outgoing,
            ];
        })->sortByDesc('monthlyContribution')->values();

        $branch = \App\Models\Branch::find($branchId);
        $branchLocation = $branch ? $branch->location : 'Manila';

        $pendingSalesCount = Sale::where('branch_id', $branchId)
            ->where('status', 'readied')
            ->count();

        $pendingTransfersCount = \App\Models\Transfer::where(function($q) use ($branchId) {
            $q->where(function($inner) use ($branchId) {
                $inner->where('destination_branch_id', $branchId)
                      ->whereIn('status', ['outgoing', 'incomplete']);
            })->orWhere(function($inner) use ($branchId) {
                $inner->where('source_branch_id', $branchId)
                      ->where('status', 'readied');
            });
        })->count();

        $reordersCount = \App\Models\Product::whereHas('branches', function ($query) use ($branchId) {
            $query->where('branch_id', $branchId)
                  ->whereNotNull('branch_products.reorder_level')
                  ->where('branch_products.reorder_level', '>', 0)
                  ->whereRaw('branch_products.quantity <= branch_products.reorder_level');
        })->count();

        return Inertia::render('BranchDashboard', [
            'branchLocation' => $branchLocation,
            'stats' => [
                'daily' => (float)$dailySales,
                'weekly' => (float)$weeklySales,
                'monthly' => (float)$monthlySales,
                'ytd' => (float)$ytdSales,
                'dailyTrend' => $salesTrend,
                'weeklyTrend' => $weeklyTrend,
                'monthlyTrend' => $monthlyTrend,
                'ytdTrend' => $ytdTrend,
            ],
            'chartData' => $salesTrend,
            'pieData' => $salesDistribution,
            'productData' => $productDistribution,
            'leaderboard' => $leaderboard,
            'filters' => [
                'date_preset' => $datePreset,
                'date_from' => $request->input('date_from'),
                'date_to' => $request->input('date_to'),
                'start_date' => $startDate ? $startDate->format('Y-m-d') : null,
                'end_date' => $endDate ? $endDate->format('Y-m-d') : null,
                'selectedDateSales' => (float)$selectedDateSales,
            ],
            'pendingCounts' => [
                'sales' => $pendingSalesCount,
                'transfers' => $pendingTransfersCount,
                'reorders' => $reordersCount,
            ],
        ]);
    }

    public function getPendingCounts(Request $request)
    {
        $user = $request->user();
        
        $branchId = $user->branch_id;
        if ($user->hasRole('System Administrator')) {
            $branchId = session('active_branch_id', $user->branch_id);
        }

        if (!$branchId) {
            return response()->json([
                'sales' => 0,
                'transfers' => 0,
                'reorders' => 0,
            ]);
        }

        $pendingSalesCount = Sale::where('branch_id', $branchId)
            ->where('status', 'readied')
            ->count();

        $pendingTransfersCount = \App\Models\Transfer::where(function($q) use ($branchId) {
            $q->where(function($inner) use ($branchId) {
                $inner->where('destination_branch_id', $branchId)
                      ->whereIn('status', ['outgoing', 'incomplete']);
            })->orWhere(function($inner) use ($branchId) {
                $inner->where('source_branch_id', $branchId)
                      ->where('status', 'readied');
            });
        })->count();

        $reordersCount = \App\Models\Product::whereHas('branches', function ($query) use ($branchId) {
            $query->where('branch_id', $branchId)
                  ->whereNotNull('branch_products.reorder_level')
                  ->where('branch_products.reorder_level', '>', 0)
                  ->whereRaw('branch_products.quantity <= branch_products.reorder_level');
        })->count();

        return response()->json([
            'sales' => $pendingSalesCount,
            'transfers' => $pendingTransfersCount,
            'reorders' => $reordersCount,
        ]);
    }

    public function searchProducts(Request $request)
    {
        $search = $request->query('search');
        if (!$search) return response()->json([]);

        $products = \App\Models\Product::where('name', 'like', "%{$search}%")
            ->orWhere('code', 'like', "%{$search}%")
            ->orWhere('sku', 'like', "%{$search}%")
            ->limit(10)
            ->get(['id', 'name', 'code']);

        return response()->json($products);
    }

    public function getProductDistribution(\App\Models\Product $product)
    {
        $distribution = $product->branches()
            ->get()
            ->map(function ($branch) {
                return [
                    'name' => $branch->branch_name,
                    'value' => (int)$branch->pivot->quantity
                ];
            });

        return response()->json([
            'product' => $product->name,
            'distribution' => $distribution
        ]);
    }
}
