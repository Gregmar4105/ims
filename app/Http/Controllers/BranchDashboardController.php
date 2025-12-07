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
                $q->where('branch_id', $branchId);
            });
        };

        // --- Stats Cards (Based on Quantity) ---
        $dailySales = $salesQuery(SaleItem::query())->whereHas('sale', fn($q) => $q->whereDate('created_at', Carbon::today()))->sum('quantity');
        
        $weeklySales = $salesQuery(SaleItem::query())->whereHas('sale', fn($q) => $q->whereBetween('created_at', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()]))->sum('quantity');
        
        $monthlySales = $salesQuery(SaleItem::query())->whereHas('sale', fn($q) => $q->whereMonth('created_at', Carbon::now()->month)->whereYear('created_at', Carbon::now()->year))->sum('quantity');
        
        $ytdSales = $salesQuery(SaleItem::query())->whereHas('sale', fn($q) => $q->whereYear('created_at', Carbon::now()->year))->sum('quantity');

        // --- Manual Date Tracking ---
        // Handle Range: start_date to end_date
        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : null;
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date'))->endOfDay() : null;
        
        $selectedDateSales = 0;
        if ($startDate && $endDate) {
             $selectedDateSales = $salesQuery(SaleItem::query())
                ->whereHas('sale', fn($q) => $q->whereBetween('created_at', [$startDate, $endDate]))
                ->sum('quantity');
        } elseif ($startDate) {
             // Fallback if only start date provided (though frontend should enforce both or handle logic)
             $selectedDateSales = $salesQuery(SaleItem::query())
                ->whereHas('sale', fn($q) => $q->whereDate('created_at', $startDate))
                ->sum('quantity');
        }

        // --- Charts ---
        // Sales Trend (Last 7 Days)
        $salesTrend = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = Carbon::today()->subDays($i);
            $qty = $salesQuery(SaleItem::query())->whereHas('sale', fn($q) => $q->whereDate('created_at', $day))->sum('quantity');
            $salesTrend[] = ['name' => $day->format('M d'), 'sales' => (int)$qty];
        }

        // Sales Distribution (By Category) - Eloquent Collection approaches for reliability
        $salesDistribution = SaleItem::with(['product.category'])
            ->whereHas('sale', function ($query) use ($branchId) {
                $query->where('branch_id', $branchId)
                      ->whereYear('created_at', Carbon::now()->year);
            })
            ->get()
            ->groupBy(fn($item) => $item->product?->category?->name ?? 'Uncategorized')
            ->map(function ($items, $categoryName) {
                return ['name' => $categoryName, 'value' => (int)$items->sum('quantity')];
            })
            ->values()
            ->sortByDesc('value')
            ->take(5)
            ->values()
            ->all();

        // Get all users in the branch
        $users = User::where('branch_id', $branchId)->get();
        
        $leaderboard = $users->map(function ($employee) use ($branchId) {
            // Helper to get quantities for this specific user
            $getUserQty = function ($query) use ($employee, $branchId) {
                return $query->whereHas('sale', function ($q) use ($employee, $branchId) {
                    $q->where('branch_id', $branchId)->where('readied_by', $employee->id);
                })->sum('quantity');
            };

            $daily = $getUserQty(SaleItem::whereHas('sale', fn($q) => $q->whereDate('created_at', Carbon::today())));
            $weekly = $getUserQty(SaleItem::whereHas('sale', fn($q) => $q->whereBetween('created_at', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])));
            $monthly = $getUserQty(SaleItem::whereHas('sale', fn($q) => $q->whereMonth('created_at', Carbon::now()->month)->whereYear('created_at', Carbon::now()->year)));
            $total = $getUserQty(SaleItem::query());
            
            // Outgoing Transfers
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
                'daily' => (int)$daily,
                'weekly' => (int)$weekly,
                'monthlyContribution' => (int)$monthly,
                'sales' => (int)$total,
                'outgoing' => $outgoing,
            ];
        })->sortByDesc('monthlyContribution')->values();

        return Inertia::render('BranchDashboard', [
            'stats' => [
                'daily' => (int)$dailySales,
                'weekly' => (int)$weeklySales,
                'monthly' => (int)$monthlySales,
                'ytd' => (int)$ytdSales,
            ],
            'chartData' => $salesTrend,
            'pieData' => $salesDistribution,
            'leaderboard' => $leaderboard,
            'filters' => [
                'start_date' => $startDate ? $startDate->format('Y-m-d') : null,
                'end_date' => $endDate ? $endDate->format('Y-m-d') : null,
                'selectedDateSales' => (int)$selectedDateSales,
            ],
        ]);
    }
}
