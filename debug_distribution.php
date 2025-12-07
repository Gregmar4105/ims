<?php

use App\Models\User;
use App\Models\SaleItem;
use App\Models\Category;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

// mimic the controller logic
// assume the first user or a specific user who has data.
// Let's list users and their branch IDs first to pick one.
$user = User::whereHas('roles', function($q) {
    $q->where('name', 'Branch Administrator')->orWhere('name', 'Manager');
})->first();

if (!$user) {
    echo "No Branch Admin found. Using first user.\n";
    $user = User::first();
}

if (!$user) {
    echo "No users found.\n";
    exit;
}

$branchId = $user->branch_id;
echo "Testing for User: " . $user->name . " (ID: " . $user->id . ")\n";
echo "Branch ID: " . $branchId . "\n";

// Check raw sale items count for this branch
$itemCount = SaleItem::whereHas('sale', function($q) use ($branchId) {
    $q->where('branch_id', $branchId);
})->count();
echo "Total Sale Items for Branch: $itemCount\n";

if ($itemCount == 0) {
    echo "No sale items found for this branch!\n";
    // Check if there are ANY sales in the system?
    echo "Total sales in system: " . \App\Models\Sale::count() . "\n";
} else {
    // Run the distribution query
    echo "Running Distribution Query...\n";
    try {
        $salesDistribution = Category::select('categories.name')
            ->join('products', 'categories.id', '=', 'products.category_id')
            ->join('sale_items', 'products.id', '=', 'sale_items.product_id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.branch_id', $branchId)
            // Commenting out date filter first to see if ANY data exists with this join
            // ->whereYear('sales.created_at', Carbon::now()->year) 
            ->selectRaw('SUM(sale_items.quantity) as value')
            ->groupBy('categories.name')
            ->orderByDesc('value')
            ->limit(5)
            ->get();
        
        echo "Distribution Result (No Date Filter):\n";
        print_r($salesDistribution->toArray());

        // Now with scalar subquery or whatever we used
        $salesDistributionYTD = Category::select('categories.name')
            ->join('products', 'categories.id', '=', 'products.category_id')
            ->join('sale_items', 'products.id', '=', 'sale_items.product_id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.branch_id', $branchId)
            ->whereYear('sales.created_at', Carbon::now()->year) 
            ->selectRaw('SUM(sale_items.quantity) as value')
            ->groupBy('categories.name')
            ->orderByDesc('value')
            ->limit(5)
            ->get();

        echo "Distribution Result (YTD):\n";
        print_r($salesDistributionYTD->toArray());

    } catch (\Exception $e) {
        echo "Query Error: " . $e->getMessage() . "\n";
    }
}
