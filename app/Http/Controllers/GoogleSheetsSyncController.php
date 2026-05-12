<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\BranchProduct;
use App\Services\GoogleSheetsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleSheetsSyncController extends Controller
{
    protected $sheetsService;

    public function __construct(GoogleSheetsService $sheetsService)
    {
        $this->sheetsService = $sheetsService;
    }

    /**
     * Perform a full sync of all branches and their products to Google Sheets.
     */
    public function syncAll()
    {
        try {
            $branches = Branch::all();
            
            foreach ($branches as $branch) {
                // Ensure sheet exists and has headers
                $this->sheetsService->createBranchSheet($branch->branch_name);
                
                // Get all products for this branch
                $branchProducts = BranchProduct::where('branch_id', $branch->id)
                    ->with(['product.brand', 'product.category', 'product.supplier'])
                    ->get();
                
                foreach ($branchProducts as $bp) {
                    $product = $bp->product;
                    if (!$product) continue;

                    $data = [
                        $product->id,
                        $product->name,
                        $product->brand?->brand_name ?? 'N/A',
                        $product->category?->category_name ?? 'N/A',
                        $product->supplier?->supplier_name ?? 'N/A',
                        $product->barcode,
                        $product->qr_code,
                        $product->code,
                        $product->code_2,
                        $product->sku,
                        json_encode($bp->variations ?: $product->variations),
                        $bp->physical_location,
                        $product->description,
                        $bp->reorder_level,
                        $product->price,
                        $bp->quantity,
                    ];

                    $this->sheetsService->upsertProductInBranch($branch->branch_name, $data, $product->id);
                }
            }

            return response()->json(['success' => true, 'message' => 'Full sync completed successfully.']);
        } catch (\Exception $e) {
            Log::error('Full Google Sheets Sync Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
