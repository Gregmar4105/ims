<?php

namespace App\Observers;

use App\Models\BranchProduct;
use App\Services\GoogleSheetsService;

class BranchProductObserver
{
    protected $sheetsService;

    public function __construct(GoogleSheetsService $sheetsService)
    {
        $this->sheetsService = $sheetsService;
    }

    public function saved(BranchProduct $branchProduct): void
    {
        $this->sync($branchProduct);
    }

    public function deleted(BranchProduct $branchProduct): void
    {
        $branch = $branchProduct->branch;
        $product = $branchProduct->product;

        if ($branch) {
            $this->sheetsService->removeProductFromBranch($branch->branch_name, $branchProduct->product_id);
        }

        if ($product) {
            $allBranches = \App\Models\Branch::all();
            $product->load(['brand', 'category', 'supplier', 'branches']);

            $needsReorder = $product->branches->contains(function ($b) {
                return !is_null($b->pivot->reorder_level) && 
                       $b->pivot->reorder_level > 0 && 
                       $b->pivot->quantity <= $b->pivot->reorder_level;
            });

            if ($needsReorder) {
                $this->sheetsService->upsertProductInReorders($product, $allBranches->all());
            } else {
                $this->sheetsService->removeProductFromReorders($product->id);
            }
        }
    }

    protected function sync(BranchProduct $branchProduct)
    {
        $branch = $branchProduct->branch;
        $product = $branchProduct->product;

        if (!$branch || !$product) {
            return;
        }

        // 1. Sync to the specific branch sheet
        $data = [
            $product->id,
            $product->name,
            $product->brand?->name,
            $product->category?->name,
            $product->supplier?->name,
            $product->barcode,
            $product->qr_code,
            $product->code,
            $product->code_2,
            $product->sku,
            $branchProduct->variations ?? $product->variations,
            $branchProduct->physical_location,
            $product->description,
            $branchProduct->reorder_level,
            $product->price,
            $branchProduct->quantity,
        ];

        $this->sheetsService->upsertProductInBranch($branch->branch_name, $data, $product->id);

        // 2. Sync to the "Reorders" tab
        $allBranches = \App\Models\Branch::all();
        $product->load(['brand', 'category', 'supplier', 'branches']);

        $needsReorder = $product->branches->contains(function ($b) {
            return !is_null($b->pivot->reorder_level) && 
                   $b->pivot->reorder_level > 0 && 
                   $b->pivot->quantity <= $b->pivot->reorder_level;
        });

        if ($needsReorder) {
            $this->sheetsService->upsertProductInReorders($product, $allBranches->all());
        } else {
            $this->sheetsService->removeProductFromReorders($product->id);
        }
    }
}
