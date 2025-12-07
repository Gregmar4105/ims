$user = App\Models\User::where('branch_id', '!=', null)->first(); 
echo "Checking Branch: " . $user->branch_id . "\n";

$sale = App\Models\Sale::where('branch_id', $user->branch_id)->latest()->first();
if (!$sale) {
    echo "No sales found for branch " . $user->branch_id . "\n";
    // Try any branch
    $sale = App\Models\Sale::latest()->first();
    echo "Using random sale from branch " . $sale?->branch_id . "\n";
}

if ($sale) {
    echo "Found Sale ID: " . $sale->id . "\n";
    $item = $sale->saleItems()->first();
    if ($item) {
        echo "Found SaleItem ID: " . $item->id . " (Qty: " . $item->quantity . ")\n";
        $product = $item->product;
        if ($product) {
            echo "Found Product ID: " . $product->id . " (Category ID: " . $product->category_id . ")\n";
            $category = $product->category;
            if ($category) {
                echo "Found Category: " . $category->name . "\n";
            } else {
                echo "Category is NULL!\n";
            }
        } else {
            echo "Product is NULL!\n";
        }
    } else {
        echo "Sale has NO items!\n";
    }
} else {
    echo "No sales in system.\n";
}
