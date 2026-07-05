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

        // --- Active Branch IDs list for filtering ---
        $activeBranchIds = Branch::where('branch_status', 'Active')->pluck('id');

        // --- Overview Stats (Financial Summary) ---
        $salesQuery = Sale::where('status', 'completed');
        if ($branchId !== 'all') {
            $salesQuery->where('branch_id', $branchId);
        } else {
            $salesQuery->whereIn('branch_id', $activeBranchIds);
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
                $totalRevenue += ceil($item->quantity * $item->price);
                $totalItemsSold += $item->quantity;
            }
        }

        // Expenses
        $expenseQuery = \App\Models\Expense::query();
        if ($branchId !== 'all') {
            $expenseQuery->where('branch_id', $branchId);
        } else {
            $expenseQuery->whereIn('branch_id', $activeBranchIds);
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
        } else {
            $feeQuery->whereIn('branch_id', $activeBranchIds);
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
        } else {
            $returnQuery->whereHas('sale', fn($q) => $q->whereIn('branch_id', $activeBranchIds));
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
        $trendingItemsQuery = SaleItem::whereHas('sale', function ($q) use ($branchId, $startDate, $endDate, $activeBranchIds) {
            $q->where('status', 'completed');
            if ($branchId !== 'all') {
                $q->where('branch_id', $branchId);
            } else {
                $q->whereIn('branch_id', $activeBranchIds);
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
        $branches = Branch::where('branch_status', 'Active')->get();
        $searchQuery = $request->input('search');

        $productsPaginator = Product::with(['category', 'branches'])
            ->when($searchQuery, function($q) use ($searchQuery) {
                $q->where(function($sub) use ($searchQuery) {
                    $sub->where('name', 'like', "%{$searchQuery}%")
                        ->orWhere('sku', 'like', "%{$searchQuery}%")
                        ->orWhere('code', 'like', "%{$searchQuery}%");
                });
            })
            ->paginate(10, ['*'], 'matrix_page')
            ->withQueryString();

        // Eager load sales sums in 1 query for these 10 products
        $salesSums = SaleItem::select('product_id', 'sales.branch_id', DB::raw('SUM(quantity) as total_sales'))
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', 'completed')
            ->whereIn('product_id', $productsPaginator->pluck('id'))
            ->when($startDate, fn($q) => $q->where('sales.created_at', '>=', $startDate))
            ->when($endDate, fn($q) => $q->where('sales.created_at', '<=', $endDate))
            ->groupBy('product_id', 'sales.branch_id')
            ->get()
            ->groupBy('product_id');

        $branchMatrixData = collect($productsPaginator->items())->map(function ($product) use ($branches, $salesSums) {
            $branchData = [];
            $productSales = $salesSums->get($product->id);

            foreach ($branches as $branch) {
                $branchProduct = $product->branches->firstWhere('id', $branch->id);
                $stock = $branchProduct ? $branchProduct->pivot->quantity : 0;
                
                $salesQty = $productSales ? $productSales->firstWhere('branch_id', $branch->id)?->total_sales ?? 0 : 0;

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
                'total_stock' => (int)$product->branches->whereIn('id', $branches->pluck('id'))->sum('pivot.quantity'),
                'total_sales' => $productSales ? (int)$productSales->sum('total_sales') : 0,
            ];
        });

        $branchMatrix = [
            'data' => $branchMatrixData,
            'current_page' => $productsPaginator->currentPage(),
            'last_page' => $productsPaginator->lastPage(),
            'per_page' => $productsPaginator->perPage(),
            'total' => $productsPaginator->total(),
            'links' => $productsPaginator->linkCollection()->toArray(),
        ];

        // --- Sales Trend Timeline ---
        $salesTrend = [];
        if ($datePreset === 'today') {
            for ($i = 6; $i >= 0; $i--) {
                $day = Carbon::today()->subDays($i);
                $revenue = SaleItem::whereHas('sale', function ($q) use ($branchId, $day, $activeBranchIds) {
                    $q->where('status', 'completed')
                      ->whereDate('created_at', $day);
                    if ($branchId !== 'all') {
                        $q->where('branch_id', $branchId);
                    } else {
                        $q->whereIn('branch_id', $activeBranchIds);
                    }
                })->sum(DB::raw('quantity * price'));
                
                $salesTrend[] = ['name' => $day->format('M d'), 'sales' => (float)$revenue];
            }
        } elseif ($datePreset === 'weekly') {
            $start = Carbon::now()->startOfWeek();
            for ($i = 0; $i < 7; $i++) {
                $day = $start->copy()->addDays($i);
                $revenue = SaleItem::whereHas('sale', function ($q) use ($branchId, $day, $activeBranchIds) {
                    $q->where('status', 'completed')
                      ->whereDate('created_at', $day);
                    if ($branchId !== 'all') {
                        $q->where('branch_id', $branchId);
                    } else {
                        $q->whereIn('branch_id', $activeBranchIds);
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
                
                $revenue = SaleItem::whereHas('sale', function ($q) use ($branchId, $day, $activeBranchIds) {
                    $q->where('status', 'completed')
                      ->whereDate('created_at', $day);
                    if ($branchId !== 'all') {
                        $q->where('branch_id', $branchId);
                    } else {
                        $q->whereIn('branch_id', $activeBranchIds);
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
                        $revenue = SaleItem::whereHas('sale', function ($q) use ($branchId, $day, $activeBranchIds) {
                            $q->where('status', 'completed')
                              ->whereDate('created_at', $day);
                            if ($branchId !== 'all') {
                                $q->where('branch_id', $branchId);
                            } else {
                                $q->whereIn('branch_id', $activeBranchIds);
                            }
                        })->sum(DB::raw('quantity * price'));
                        
                        $salesTrend[] = ['name' => $day->format('M d'), 'sales' => (float)$revenue];
                    }
                } else {
                    $diffInMonths = $startDate->diffInMonths($endDate);
                    for ($i = 0; $i <= $diffInMonths; $i++) {
                        $month = $startDate->copy()->addMonths($i);
                        $revenue = SaleItem::whereHas('sale', function ($q) use ($branchId, $month, $activeBranchIds) {
                            $q->where('status', 'completed')
                              ->whereMonth('created_at', $month->month)
                              ->whereYear('created_at', $month->year);
                            if ($branchId !== 'all') {
                                $q->where('branch_id', $branchId);
                            } else {
                                $q->whereIn('branch_id', $activeBranchIds);
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
                $revenue = SaleItem::whereHas('sale', function ($q) use ($branchId, $i, $activeBranchIds) {
                    $q->where('status', 'completed')
                      ->whereMonth('created_at', $i)
                      ->whereYear('created_at', Carbon::now()->year);
                    if ($branchId !== 'all') {
                        $q->where('branch_id', $branchId);
                    } else {
                        $q->whereIn('branch_id', $activeBranchIds);
                    }
                })->sum(DB::raw('quantity * price'));
                
                $salesTrend[] = ['name' => $month->format('M'), 'sales' => (float)$revenue];
            }
        }

        // --- Sales Distribution by Category ---
        $salesDistribution = SaleItem::with(['product.category'])
            ->whereHas('sale', function ($q) use ($branchId, $startDate, $endDate, $activeBranchIds) {
                $q->where('status', 'completed');
                if ($branchId !== 'all') {
                    $q->where('branch_id', $branchId);
                } else {
                    $q->whereIn('branch_id', $activeBranchIds);
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
                    'value' => (float)$items->sum(fn($item) => ceil($item->quantity * $item->price)),
                    'count' => (int)$items->sum('quantity'),
                ];
            })
            ->values()
            ->all();

        // --- Sales Distribution by Payment Method ---
        $paymentMethodDistribution = Sale::where('status', 'completed')
            ->when($branchId !== 'all', fn($q) => $q->where('branch_id', $branchId), fn($q) => $q->whereIn('branch_id', $activeBranchIds))
            ->when($startDate, fn($q) => $q->where('created_at', '>=', $startDate))
            ->when($endDate, fn($q) => $q->where('created_at', '<=', $endDate))
            ->get()
            ->groupBy('payment_method')
            ->map(function ($sales, $method) {
                $total = $sales->sum(function($sale) {
                    return $sale->items->sum(fn($item) => ceil($item->quantity * $item->price));
                });
                return [
                    'name' => ucfirst(str_replace('_', ' ', $method)),
                    'value' => (float)$total,
                    'count' => $sales->count(),
                ];
            })
            ->values()
            ->all();

        // --- Transfers Analytics ---
        $transfersQuery = \App\Models\Transfer::where('status', 'completed');
        if ($branchId !== 'all') {
            $transfersQuery->where(function($q) use ($branchId) {
                $q->where('source_branch_id', $branchId)
                  ->orWhere('destination_branch_id', $branchId);
            });
        } else {
            $transfersQuery->where(function($q) use ($activeBranchIds) {
                $q->whereIn('source_branch_id', $activeBranchIds)
                  ->orWhereIn('destination_branch_id', $activeBranchIds);
            });
        }

        if ($startDate) {
            $transfersQuery->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $transfersQuery->where('created_at', '<=', $endDate);
        }

        $transfers = $transfersQuery->with('items')->get();

        $totalTransfersCount = $transfers->count();
        $totalQtyTransferred = 0;
        $outgoingTransfersCount = 0;
        $incomingTransfersCount = 0;

        foreach ($transfers as $transfer) {
            $qty = $transfer->items->sum('received_quantity');
            $totalQtyTransferred += $qty;

            if ($branchId !== 'all') {
                if ($transfer->source_branch_id == $branchId) {
                    $outgoingTransfersCount++;
                }
                if ($transfer->destination_branch_id == $branchId) {
                    $incomingTransfersCount++;
                }
            } else {
                if (in_array($transfer->source_branch_id, $activeBranchIds->toArray())) {
                    $outgoingTransfersCount++;
                }
                if (in_array($transfer->destination_branch_id, $activeBranchIds->toArray())) {
                    $incomingTransfersCount++;
                }
            }
        }

        // --- Top Transferred Products ---
        $transferItemsQuery = \App\Models\TransferItem::whereHas('transfer', function($q) use ($branchId, $activeBranchIds, $startDate, $endDate) {
            $q->where('status', 'completed');
            if ($branchId !== 'all') {
                $q->where(function($sub) use ($branchId) {
                    $sub->where('source_branch_id', $branchId)
                        ->orWhere('destination_branch_id', $branchId);
                });
            } else {
                $q->where(function($sub) use ($activeBranchIds) {
                    $sub->whereIn('source_branch_id', $activeBranchIds)
                        ->orWhereIn('destination_branch_id', $activeBranchIds);
                });
            }
            if ($startDate) {
                $q->where('created_at', '>=', $startDate);
            }
            if ($endDate) {
                $q->where('created_at', '<=', $endDate);
            }
        });

        $topTransferred = $transferItemsQuery->with('product.category')
            ->select('product_id', DB::raw('SUM(received_quantity) as total_qty'), DB::raw('count(distinct transfer_id) as transfers_count'))
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
                    'quantity_transferred' => (int)$item->total_qty,
                    'transfers_count' => (int)$item->transfers_count,
                ];
            });

        // --- Transfers Trend Timeline ---
        $transferTrend = [];
        if ($datePreset === 'today') {
            for ($i = 6; $i >= 0; $i--) {
                $day = Carbon::today()->subDays($i);
                $qty = \App\Models\TransferItem::whereHas('transfer', function ($q) use ($branchId, $activeBranchIds, $day) {
                    $q->where('status', 'completed')
                      ->whereDate('created_at', $day);
                    if ($branchId !== 'all') {
                        $q->where(function($sub) use ($branchId) {
                            $sub->where('source_branch_id', $branchId)
                                ->orWhere('destination_branch_id', $branchId);
                        });
                    } else {
                        $q->where(function($sub) use ($activeBranchIds) {
                            $sub->whereIn('source_branch_id', $activeBranchIds)
                                ->orWhereIn('destination_branch_id', $activeBranchIds);
                        });
                    }
                })->sum('received_quantity');
                
                $transferTrend[] = ['name' => $day->format('M d'), 'transfers' => (int)$qty];
            }
        } elseif ($datePreset === 'weekly') {
            $start = Carbon::now()->startOfWeek();
            for ($i = 0; $i < 7; $i++) {
                $day = $start->copy()->addDays($i);
                $qty = \App\Models\TransferItem::whereHas('transfer', function ($q) use ($branchId, $activeBranchIds, $day) {
                    $q->where('status', 'completed')
                      ->whereDate('created_at', $day);
                    if ($branchId !== 'all') {
                        $q->where(function($sub) use ($branchId) {
                            $sub->where('source_branch_id', $branchId)
                                ->orWhere('destination_branch_id', $branchId);
                        });
                    } else {
                        $q->where(function($sub) use ($activeBranchIds) {
                            $sub->whereIn('source_branch_id', $activeBranchIds)
                                ->orWhereIn('destination_branch_id', $activeBranchIds);
                        });
                    }
                })->sum('received_quantity');
                
                $transferTrend[] = ['name' => $day->format('D'), 'transfers' => (int)$qty];
            }
        } elseif ($datePreset === 'monthly') {
            $start = Carbon::now()->startOfMonth();
            $daysInMonth = Carbon::now()->daysInMonth;
            for ($i = 0; $i < $daysInMonth; $i++) {
                $day = $start->copy()->addDays($i);
                if ($day->gt(Carbon::today())) continue;
                
                $qty = \App\Models\TransferItem::whereHas('transfer', function ($q) use ($branchId, $activeBranchIds, $day) {
                    $q->where('status', 'completed')
                      ->whereDate('created_at', $day);
                    if ($branchId !== 'all') {
                        $q->where(function($sub) use ($branchId) {
                            $sub->where('source_branch_id', $branchId)
                                ->orWhere('destination_branch_id', $branchId);
                        });
                    } else {
                        $q->where(function($sub) use ($activeBranchIds) {
                            $sub->whereIn('source_branch_id', $activeBranchIds)
                                ->orWhereIn('destination_branch_id', $activeBranchIds);
                        });
                    }
                })->sum('received_quantity');
                
                $transferTrend[] = ['name' => $day->format('d'), 'transfers' => (int)$qty];
            }
        } elseif ($datePreset === 'custom') {
            if ($startDate && $endDate) {
                $diffInDays = $startDate->diffInDays($endDate);
                if ($diffInDays <= 31) {
                    for ($i = 0; $i <= $diffInDays; $i++) {
                        $day = $startDate->copy()->addDays($i);
                        $qty = \App\Models\TransferItem::whereHas('transfer', function ($q) use ($branchId, $activeBranchIds, $day) {
                            $q->where('status', 'completed')
                              ->whereDate('created_at', $day);
                            if ($branchId !== 'all') {
                                $q->where(function($sub) use ($branchId) {
                                    $sub->where('source_branch_id', $branchId)
                                        ->orWhere('destination_branch_id', $branchId);
                                });
                            } else {
                                $q->where(function($sub) use ($activeBranchIds) {
                                    $sub->whereIn('source_branch_id', $activeBranchIds)
                                        ->orWhereIn('destination_branch_id', $activeBranchIds);
                                });
                            }
                        })->sum('received_quantity');
                        
                        $transferTrend[] = ['name' => $day->format('M d'), 'transfers' => (int)$qty];
                    }
                } else {
                    $diffInMonths = $startDate->diffInMonths($endDate);
                    for ($i = 0; $i <= $diffInMonths; $i++) {
                        $month = $startDate->copy()->addMonths($i);
                        $qty = \App\Models\TransferItem::whereHas('transfer', function ($q) use ($branchId, $activeBranchIds, $month) {
                            $q->where('status', 'completed')
                              ->whereMonth('created_at', $month->month)
                              ->whereYear('created_at', $month->year);
                            if ($branchId !== 'all') {
                                $q->where(function($sub) use ($branchId) {
                                    $sub->where('source_branch_id', $branchId)
                                        ->orWhere('destination_branch_id', $branchId);
                                });
                            } else {
                                $q->where(function($sub) use ($activeBranchIds) {
                                    $sub->whereIn('source_branch_id', $activeBranchIds)
                                        ->orWhereIn('destination_branch_id', $activeBranchIds);
                                });
                            }
                        })->sum('received_quantity');
                        
                        $transferTrend[] = ['name' => $month->format('M Y'), 'transfers' => (int)$qty];
                    }
                }
            }
        } else {
            // ytd
            $currentMonth = Carbon::now()->month;
            for ($i = 1; $i <= $currentMonth; $i++) {
                $month = Carbon::create(Carbon::now()->year, $i, 1);
                $qty = \App\Models\TransferItem::whereHas('transfer', function ($q) use ($branchId, $activeBranchIds, $i) {
                    $q->where('status', 'completed')
                      ->whereMonth('created_at', $i)
                      ->whereYear('created_at', Carbon::now()->year);
                    if ($branchId !== 'all') {
                        $q->where(function($sub) use ($branchId) {
                            $sub->where('source_branch_id', $branchId)
                                ->orWhere('destination_branch_id', $branchId);
                        });
                    } else {
                        $q->where(function($sub) use ($activeBranchIds) {
                            $sub->whereIn('source_branch_id', $activeBranchIds)
                                ->orWhereIn('destination_branch_id', $activeBranchIds);
                        });
                    }
                })->sum('received_quantity');
                
                $transferTrend[] = ['name' => $month->format('M'), 'transfers' => (int)$qty];
            }
        }

        // --- Transfers by Branch (Incoming/Outgoing Comparison) ---
        $transfersByBranch = $branches->map(function ($branch) use ($startDate, $endDate) {
            $outgoingQty = (int)\App\Models\TransferItem::whereHas('transfer', function($q) use ($branch, $startDate, $endDate) {
                $q->where('source_branch_id', $branch->id)
                  ->where('status', 'completed');
                if ($startDate) {
                    $q->where('created_at', '>=', $startDate);
                }
                if ($endDate) {
                    $q->where('created_at', '<=', $endDate);
                }
            })->sum('received_quantity');

            $incomingQty = (int)\App\Models\TransferItem::whereHas('transfer', function($q) use ($branch, $startDate, $endDate) {
                $q->where('destination_branch_id', $branch->id)
                  ->where('status', 'completed');
                if ($startDate) {
                    $q->where('created_at', '>=', $startDate);
                }
                if ($endDate) {
                    $q->where('created_at', '<=', $endDate);
                }
            })->sum('received_quantity');

            return [
                'branch_name' => $branch->branch_name,
                'incoming_qty' => $incomingQty,
                'outgoing_qty' => $outgoingQty,
            ];
        })->values()->toArray();

        // --- Unsold Products (3 Months) ---
        $threeMonthsAgoForUnsold = Carbon::now()->subMonths(3);

        $unsoldProductsQuery = Product::whereHas('branches', function ($query) use ($branchId, $activeBranchIds) {
            if ($branchId !== 'all') {
                $query->where('branches.id', $branchId);
            } else {
                $query->whereIn('branches.id', $activeBranchIds);
            }
        })
        ->whereNotExists(function ($query) use ($threeMonthsAgoForUnsold, $branchId, $activeBranchIds) {
            $query->select(DB::raw(1))
                  ->from('sale_items')
                  ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                  ->whereColumn('sale_items.product_id', 'products.id')
                  ->where('sales.status', 'completed')
                  ->where('sales.created_at', '>=', $threeMonthsAgoForUnsold);
            if ($branchId !== 'all') {
                $query->where('sales.branch_id', $branchId);
            } else {
                $query->whereIn('sales.branch_id', $activeBranchIds);
            }
        })
        ->select('products.*')
        ->selectSub(function($query) use ($branchId, $activeBranchIds) {
            $query->select('sales.created_at')
                  ->from('sale_items')
                  ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
                  ->whereColumn('sale_items.product_id', 'products.id')
                  ->where('sales.status', 'completed');
            if ($branchId !== 'all') {
                $query->where('sales.branch_id', $branchId);
            } else {
                $query->whereIn('sales.branch_id', $activeBranchIds);
            }
            $query->latest('sales.created_at')->limit(1);
        }, 'last_sold_date')
        ->with(['category', 'branches'])
        ->orderByRaw('last_sold_date IS NULL DESC, last_sold_date ASC');

        $unsoldProductsPaginator = $unsoldProductsQuery->paginate(10, ['*'], 'unsold_page')->withQueryString();

        $unsoldProductsData = collect($unsoldProductsPaginator->items())->map(function ($product) use ($branchId, $activeBranchIds) {
            // Calculate stock
            $stock = 0;
            if ($branchId !== 'all') {
                $bp = $product->branches->firstWhere('id', $branchId);
                $stock = $bp ? $bp->pivot->quantity : 0;
            } else {
                $stock = $product->branches->whereIn('id', $activeBranchIds)->sum('pivot.quantity');
            }

            return [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku ?? '',
                'category' => $product->category?->name ?? 'Uncategorized',
                'price' => (float)$product->price,
                'stock' => (int)$stock,
                'last_sold_date' => $product->last_sold_date,
            ];
        });

        $unsoldProducts = [
            'data' => $unsoldProductsData,
            'current_page' => $unsoldProductsPaginator->currentPage(),
            'last_page' => $unsoldProductsPaginator->lastPage(),
            'per_page' => $unsoldProductsPaginator->perPage(),
            'total' => $unsoldProductsPaginator->total(),
            'links' => $unsoldProductsPaginator->linkCollection()->toArray(),
        ];

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
            'transferStats' => [
                'total_transfers' => (int)$totalTransfersCount,
                'total_qty_transferred' => (int)$totalQtyTransferred,
                'outgoing_transfers' => (int)$outgoingTransfersCount,
                'incoming_transfers' => (int)$incomingTransfersCount,
            ],
            'transferChartData' => $transferTrend,
            'topTransferredProducts' => $topTransferred,
            'transfersByBranch' => $transfersByBranch,
            'unsoldProducts' => $unsoldProducts,
        ]);
    }
}

