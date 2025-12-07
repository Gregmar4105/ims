$user = App\Models\User::whereHas('roles', fn($q) => $q->where('name', 'Branch Administrator'))->first() ?? App\Models\User::first();
echo "User: " . $user->name . " (Branch: " . $user->branch_id . ")\n";
$branchId = $user->branch_id;

echo "--- raw count ---\n";
echo App\Models\SaleItem::whereHas('sale', fn($q) => $q->where('branch_id', $branchId))->count() . "\n";

echo "--- category query ---\n";
try {
    $dist = App\Models\Category::select('categories.name')
        ->join('products', 'categories.id', '=', 'products.category_id')
        ->join('sale_items', 'products.id', '=', 'sale_items.product_id')
        ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
        ->where('sales.branch_id', $branchId)
        ->selectRaw('SUM(sale_items.quantity) as value')
        ->groupBy('categories.name')
        ->orderByDesc('value')
        ->limit(5)
        ->get();
    print_r($dist->toArray());
} catch (\Exception $e) {
    echo $e->getMessage();
}
