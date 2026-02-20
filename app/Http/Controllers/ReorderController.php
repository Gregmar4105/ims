<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\Product;
use App\Models\BranchProduct;

class ReorderController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $reorders = collect();

        if ($isSystemAdmin) {
            // For System Admin, get products globally where global quantity or any branch quantity is <= reorder_level
            // To simplify based on how quantity is handled (global vs branch), we'll fetch products that have a reorder_level > 0
            
            // Get global products that need reorder (no branches = 0 stock)
            $globalReorders = Product::whereNotNull('reorder_level')
                ->where('reorder_level', '>', 0)
                ->doesntHave('branches')
                ->with(['brand', 'category', 'supplier'])
                ->get();

            // Get branch-specific products that need reorder
            $branchReorders = Product::whereNotNull('reorder_level')
                ->where('reorder_level', '>', 0)
                ->whereHas('branches', function ($query) {
                    $query->whereRaw('branch_products.quantity <= products.reorder_level');
                })
                ->with(['brand', 'category', 'supplier', 'branches'])->get();

            // Format for frontend
            foreach ($globalReorders as $product) {
                $reorders->push([
                    'id' => $product->id,
                    'name' => $product->name,
                    'code' => $product->code,
                    'sku' => $product->sku,
                    'image_path' => $product->image_path,
                    'quantity' => $product->quantity ?? 0,
                    'reorder_level' => $product->reorder_level,
                    'brand' => $product->brand,
                    'category' => $product->category,
                    'supplier' => $product->supplier,
                    'branch' => null
                ]);
            }

            foreach ($branchReorders as $product) {
                foreach ($product->branches as $branch) {
                    if ($branch->pivot->quantity <= $product->reorder_level) {
                        $reorders->push([
                            'id' => $product->id,
                            'name' => $product->name,
                            'code' => $product->code,
                            'sku' => $product->sku,
                            'image_path' => $product->image_path,
                            'quantity' => $branch->pivot->quantity,
                            'reorder_level' => $product->reorder_level,
                            'brand' => $product->brand,
                            'category' => $product->category,
                            'supplier' => $product->supplier,
                            'branch' => [
                                'id' => $branch->id,
                                'name' => $branch->branch_name
                            ]
                        ]);
                    }
                }
            }

        } else if ($user->branch_id) {
            // For Branch Admin / Employee: Only fetch products in their branch where branch_products.quantity <= reorder_level
            $branchProducts = Product::whereNotNull('reorder_level')
                ->where('reorder_level', '>', 0)
                ->whereHas('branches', function ($query) use ($user) {
                    $query->where('branch_id', $user->branch_id)
                          ->whereRaw('branch_products.quantity <= products.reorder_level');
                })
                ->with(['brand', 'category', 'supplier', 'branches' => function($query) use ($user) {
                    $query->where('branch_id', $user->branch_id);
                }])->get();

            foreach ($branchProducts as $product) {
                $branchQuantity = $product->branches->first()->pivot->quantity ?? 0;
                $reorders->push([
                    'id' => $product->id,
                    'name' => $product->name,
                    'code' => $product->code,
                    'sku' => $product->sku,
                    'image_path' => $product->image_path,
                    'quantity' => $branchQuantity,
                    'reorder_level' => $product->reorder_level,
                    'brand' => $product->brand,
                    'category' => $product->category,
                    'supplier' => $product->supplier,
                    'branch' => null // Don't need to specify branch for localized users
                ]);
            }
        }

        return Inertia::render('Reorders/Index', [
            'reorders' => $reorders->values()->all(),
        ]);
    }
}
