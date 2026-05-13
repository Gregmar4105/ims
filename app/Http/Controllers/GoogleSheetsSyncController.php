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
                        $product->brand?->name,
                        $product->category?->name,
                        $product->supplier?->name,
                        $product->barcode,
                        $product->qr_code,
                        $product->code,
                        $product->code_2,
                        $product->sku,
                        $bp->variations ?? $product->variations,
                        $bp->physical_location,
                        $product->description,
                        $bp->reorder_level,
                        $product->price,
                        $bp->quantity,
                    ]);
                }

                $this->sheetsService->updateSheetContent($branch->branch_name, array_values($rows));
            }

            // --- Reorders Tab Sync ---
            $reorderHeaders = ['ID', 'Product Name', 'Brand', 'Category', 'Supplier'];
            foreach ($branches as $branch) {
                $reorderHeaders[] = $branch->branch_name . ' Stock';
                $reorderHeaders[] = $branch->branch_name . ' Reorder';
            }

            $reorderRows = [$reorderHeaders];
            
            // Get all products that have at least one branch in reorder state
            $productsWithReorders = \App\Models\Product::whereHas('branches', function ($query) {
                $query->whereNotNull('branch_products.reorder_level')
                      ->where('branch_products.reorder_level', '>', 0)
                      ->whereRaw('branch_products.quantity <= branch_products.reorder_level');
            })->with(['brand', 'category', 'supplier', 'branches'])->get();

            foreach ($productsWithReorders as $product) {
                $row = [
                    $product->id,
                    $product->name,
                    $product->brand?->name,
                    $product->category?->name,
                    $product->supplier?->name,
                ];

                foreach ($branches as $branch) {
                    $bp = $product->branches->where('id', $branch->id)->first();
                    $row[] = $bp ? $bp->pivot->quantity : 0;
                    $row[] = $bp ? $bp->pivot->reorder_level : 0;
                }
                $reorderRows[] = $row;
            }

            $this->sheetsService->updateSheetContent('Reorders', array_values($reorderRows));

            // --- Sales Tab Sync (All History) ---
            $salesHeaders = ['Sale ID', 'Branch', 'Status', 'Date', 'Readied By', 'Approved By', 'Items', 'Total Price', 'Notes'];
            $salesRows = [$salesHeaders];
            $allSales = \App\Models\Sale::with(['branch', 'readiedBy', 'approvedBy', 'items.product'])->orderBy('created_at', 'desc')->get();
            
            foreach ($allSales as $sale) {
                $itemsSummary = $sale->items->map(function($item) {
                    return ($item->product->name ?? 'Unknown') . ' x ' . $item->quantity . ' @ ' . $item->price;
                })->implode(', ');

                $total = $sale->items->sum(function($item) {
                    return $item->price * $item->quantity;
                });

                $salesRows[] = [
                    $sale->id,
                    $sale->branch?->branch_name,
                    $sale->status,
                    $sale->created_at->format('Y-m-d H:i'),
                    $sale->readiedBy?->name,
                    $sale->approvedBy?->name,
                    $itemsSummary,
                    $total,
                    $sale->notes,
                ];
            }
            $this->sheetsService->updateSheetContent('Sales', array_values($salesRows));

            // --- Transfers Tab Sync (All History) ---
            $transferHeaders = ['Transfer ID', 'Source Branch', 'Destination', 'Status', 'Date', 'Readied By', 'Approved By', 'Received By', 'Items', 'Notes'];
            $transferRows = [$transferHeaders];
            $allTransfers = \App\Models\Transfer::with(['sourceBranch', 'destinationBranch', 'supplier', 'readiedBy', 'approvedBy', 'receivedBy', 'items.product'])->orderBy('created_at', 'desc')->get();

            foreach ($allTransfers as $transfer) {
                $itemsSummary = $transfer->items->map(function($item) {
                    $summary = ($item->product->name ?? 'Unknown') . ' x ' . $item->quantity;
                    if ($item->received_quantity !== null) {
                        $summary .= " [Rec: {$item->received_quantity}]";
                    }
                    return $summary;
                })->implode(', ');

                $destination = $transfer->destinationBranch?->branch_name ?? $transfer->supplier?->name ?? 'Unknown';

                $transferRows[] = [
                    $transfer->id,
                    $transfer->sourceBranch?->branch_name,
                    $destination,
                    $transfer->status,
                    $transfer->created_at->format('Y-m-d H:i'),
                    $transfer->readiedBy?->name,
                    $transfer->approvedBy?->name,
                    $transfer->receivedBy?->name,
                    $itemsSummary,
                    $transfer->notes,
                ];
            }
            $this->sheetsService->updateSheetContent('Transfers', array_values($transferRows));

            return back()->with('success', 'Full sync completed successfully.');
        } catch (\Exception $e) {
            Log::error('Full Google Sheets Sync Error: ' . $e->getMessage());
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
