<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\BranchProduct;

class GoogleSheetSyncObserver
{
    /**
     * When a product is updated globally (e.g. name, price), 
     * we need to update all branch tabs that contain it.
     */
    public function saved(Product $product): void
    {
        $branchProducts = BranchProduct::where('product_id', $product->id)->get();
        
        foreach ($branchProducts as $bp) {
            // Trigger the BranchProductObserver sync
            // Since we aren't using queues, we can just call a static sync or re-save
            // but the most reliable way is to let the BP observer handle it.
            // However, save() might not trigger if nothing changed in BP.
            // We'll use the BP observer directly.
            app(BranchProductObserver::class)->saved($bp);
        }
    }

    public function deleted(Product $product): void
    {
        $branchProducts = BranchProduct::where('product_id', $product->id)->get();
        foreach ($branchProducts as $bp) {
            app(BranchProductObserver::class)->deleted($bp);
        }
    }
}
