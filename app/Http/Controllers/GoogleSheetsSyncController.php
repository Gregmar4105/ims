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
        set_time_limit(600);
        
        try {
            $branches = Branch::all();
            
            $headers = [
                'ID', 'Product Name', 'Brand', 'Category', 'Supplier', 
                'Barcode', 'QR Code', 'Code', '2code', 'SKU', 
                'Variations', 'Physical Location', 'Description', 
                'Reorder Level', 'Price', 'Quantity'
            ];

            foreach ($branches as $branch) {
                $rows = [$headers];
                
                $branchProducts = BranchProduct::where('branch_id', $branch->id)
                    ->with(['product.brand', 'product.category', 'product.supplier'])
                    ->get();
                
                foreach ($branchProducts as $bp) {
                    $product = $bp->product;
                    if (!$product) continue;

                    $rows[] = array_values([
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
                        json_encode($bp->variations ?: $product->variations),
                        $bp->physical_location,
                        $product->description,
                        $bp->reorder_level,
                        $product->price,
                        $bp->quantity,
                    ]);
                }

                $this->sheetsService->updateSheetContent($branch->branch_name, array_values($rows));
            }

            return back()->with('success', 'Full sync completed successfully.');
        } catch (\Exception $e) {
            Log::error('Full Google Sheets Sync Error: ' . $e->getMessage());
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
