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
        $branchId = $user->branch_id;
        $date = $request->input('date') ? Carbon::parse($request->input('date')) : Carbon::today();

        // Base Query Helpers
        $salesQuery = function($query) use ($branchId) {
            return $query->whereHas('sale', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId)
                  ->where('status', 'completed');
            });
        };

        // --- Stats Cards (Based on Revenue) ---
        $dailySales = $salesQuery(SaleItem::query())
            ->whereHas('sale', fn($q) => $q->whereDate('created_at', Carbon::today()))
            ->sum(DB::raw('quantity * price'));
        
        $weeklySales = $salesQuery(SaleItem::query())
            ->whereHas('sale', fn($q) => $q->whereBetween('created_at', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()]))
            ->sum(DB::raw('quantity * price'));
        
        $monthlySales = $salesQuery(SaleItem::query())
            ->whereHas('sale', fn($q) => $q->whereMonth('created_at', Carbon::now()->month)->whereYear('created_at', Carbon::now()->year))
            ->sum(DB::raw('quantity * price'));
        
        $ytdSales = $salesQuery(SaleItem::query())
            ->whereHas('sale', fn($q) => $q->whereYear('created_at', Carbon::now()->year))
            ->sum(DB::raw('quantity * price'));

        // --- Manual Date Tracking ---
        // Handle Range: start_date to end_date
        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : null;
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date'))->endOfDay() : null;
        
        $selectedDateSales = 0;
        if ($startDate && $endDate) {
             $selectedDateSales = $salesQuery(SaleItem::query())
                ->whereHas('sale', fn($q) => $q->whereBetween('created_at', [$startDate, $endDate]))
                ->sum(DB::raw('quantity * price'));
        } elseif ($startDate) {
             // Fallback if only start date provided (though frontend should enforce both or handle logic)
             $selectedDateSales = $salesQuery(SaleItem::query())
                ->whereHas('sale', fn($q) => $q->whereDate('created_at', $startDate))
                ->sum(DB::raw('quantity * price'));
        }

        // --- Charts ---
        // Sales Trend (Last 7 Days)
        $salesTrend = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = Carbon::today()->subDays($i);
            $revenue = $salesQuery(SaleItem::query())
                ->whereHas('sale', fn($q) => $q->whereDate('created_at', $day))
                ->sum(DB::raw('quantity * price'));
            $salesTrend[] = ['name' => $day->format('M d'), 'sales' => (float)$revenue];
        }

        // Sales Distribution (By Category) - Eloquent Collection approaches for reliability
        // Only select what we need to avoid memory issues, though usually acceptable for small datasets
        $salesDistribution = SaleItem::with(['product.category'])
            ->whereHas('sale', function ($query) use ($branchId) {
                $query->where('branch_id', $branchId)
                      ->where('status', 'completed')
                      ->whereYear('created_at', Carbon::now()->year);
            })
            ->get()
            ->groupBy(fn($item) => $item->product?->category?->name ?? 'Uncategorized')
            ->map(function ($items, $categoryName) {
                return ['name' => $categoryName, 'value' => (float)$items->sum(fn($item) => $item->quantity * $item->price)];
            })
            ->values()
            ->sortByDesc('value')
            ->take(5)
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
            
            // Outgoing Transfers (count remains count?)
            // Usually dashboard counts items, but maybe revenue too? 
            // The prompt asks for "sales dashboard", usually transfers are internal operations.
            // I'll keep outgoing as count for now as it's not "sales revenue".
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

        return Inertia::render('BranchDashboard', [
            'stats' => [
                'daily' => (float)$dailySales,
                'weekly' => (float)$weeklySales,
                'monthly' => (float)$monthlySales,
                'ytd' => (float)$ytdSales,
            ],
            'chartData' => $salesTrend,
            'pieData' => $salesDistribution,
            'leaderboard' => $leaderboard,
            'filters' => [
                'start_date' => $startDate ? $startDate->format('Y-m-d') : null,
                'end_date' => $endDate ? $endDate->format('Y-m-d') : null,
                'selectedDateSales' => (float)$selectedDateSales,
            ],
        ]);
    }
}
