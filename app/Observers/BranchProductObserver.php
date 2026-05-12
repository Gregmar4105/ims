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
        if ($branch) {
            $this->sheetsService->removeProductFromBranch($branch->branch_name, $branchProduct->product_id);
        }
    }

    protected function sync(BranchProduct $branchProduct)
    {
        $branch = $branchProduct->branch;
        $product = $branchProduct->product;

        if (!$branch || !$product) {
            return;
        }

        $data = [
            $product->id,
            $product->name,
            $product->brand?->name ?? 'N/A',
            $product->category?->name ?? 'N/A',
            $product->supplier?->name ?? 'N/A',
            $product->barcode,
            $product->qr_code,
            $product->code,
            $product->code_2,
            $product->sku,
            json_encode($branchProduct->variations ?: $product->variations),
            $branchProduct->physical_location,
            $product->description,
            $branchProduct->reorder_level,
            $product->price,
            $branchProduct->quantity,
        ];

        $this->sheetsService->upsertProductInBranch($branch->branch_name, $data, $product->id);
    }
}
