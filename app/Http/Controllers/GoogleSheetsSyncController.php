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
        file_put_contents(base_path('sync_debug.txt'), "\n--- New Sync Attempt ---\n", FILE_APPEND);
        file_put_contents(base_path('sync_debug.txt'), 'Server Time: ' . now()->toDateTimeString() . ' (' . config('app.timezone') . ")\n", FILE_APPEND);
        
        // Increase execution time for large syncs
        set_time_limit(300);
        
        Log::info('Manual Full Sync Started');

        try {
            $branches = Branch::all();
            file_put_contents(base_path('sync_debug.txt'), 'Found ' . $branches->count() . " branches\n", FILE_APPEND);
            Log::info('Syncing ' . $branches->count() . ' branches');
            
            $headers = [
                'ID', 'Product Name', 'Brand', 'Category', 'Supplier', 
                'Barcode', 'QR Code', 'Code', '2code', 'SKU', 
                'Variations', 'Physical Location', 'Description', 
                'Reorder Level', 'Price', 'Quantity'
            ];

            foreach ($branches as $branch) {
                file_put_contents(base_path('sync_debug.txt'), 'Processing Branch: ' . $branch->branch_name . "\n", FILE_APPEND);
                Log::info('Syncing Branch: ' . $branch->branch_name);
                
                // Collect all rows for this branch starting with headers
                $rows = [$headers];
                
                // Get all products for this branch
                $branchProducts = BranchProduct::where('branch_id', $branch->id)
                    ->with(['product.brand', 'product.category', 'product.supplier'])
                    ->get();
                
                file_put_contents(base_path('sync_debug.txt'), 'Found ' . $branchProducts->count() . " products\n", FILE_APPEND);
                Log::info('Found ' . $branchProducts->count() . ' products for branch ' . $branch->branch_name);

                foreach ($branchProducts as $bp) {
                    $product = $bp->product;
                    if (!$product) continue;

                    $rows[] = array_values([
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
                    ]);
                }

                // Batch update the entire sheet for this branch
                $result = $this->sheetsService->updateSheetContent($branch->branch_name, array_values($rows));
                
                file_put_contents(base_path('sync_debug.txt'), 'Sheet Update Result: ' . ($result ? 'SUCCESS' : 'FAILED') . "\n", FILE_APPEND);
                Log::info('Branch ' . $branch->branch_name . ' sync finished');
            }

            file_put_contents(base_path('sync_debug.txt'), "Sync Completed Successfully\n", FILE_APPEND);
            Log::info('Manual Full Sync Completed Successfully');
            return back()->with('success', 'Full sync completed successfully.');
        } catch (\Exception $e) {
            file_put_contents(base_path('sync_debug.txt'), 'FATAL ERROR: ' . $e->getMessage() . "\n", FILE_APPEND);
            Log::error('Full Google Sheets Sync Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
