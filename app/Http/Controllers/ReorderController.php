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
            // For System Admin, get products globally where ANY branch quantity is <= its specific reorder_level
            
            // Get branch-specific products that need reorder
            $branchReorders = Product::whereHas('branches', function ($query) {
                    $query->whereNotNull('branch_products.reorder_level')
                          ->where('branch_products.reorder_level', '>', 0)
                          ->whereRaw('branch_products.quantity <= branch_products.reorder_level');
                })
                ->with(['brand', 'category', 'supplier', 'branches'])->get();

            // Format for frontend
            foreach ($branchReorders as $product) {
                foreach ($product->branches as $branch) {
                    if ($branch->pivot->reorder_level > 0 && $branch->pivot->quantity <= $branch->pivot->reorder_level) {
                        $reorders->push([
                            'id' => $product->id,
                            'name' => $product->name,
                            'code' => $product->code,
                            'sku' => $product->sku,
                            'image_path' => $product->image_path,
                            'quantity' => $branch->pivot->quantity,
                            'reorder_level' => $branch->pivot->reorder_level,
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
            // For Branch Admin / Employee: Only fetch products in their branch where branch_products.quantity <= branch_products.reorder_level
            $branchProducts = Product::whereHas('branches', function ($query) use ($user) {
                    $query->where('branch_id', $user->branch_id)
                          ->whereNotNull('branch_products.reorder_level')
                          ->where('branch_products.reorder_level', '>', 0)
                          ->whereRaw('branch_products.quantity <= branch_products.reorder_level');
                })
                ->with(['brand', 'category', 'supplier', 'branches' => function($query) use ($user) {
                    $query->where('branch_id', $user->branch_id);
                }])->get();

            foreach ($branchProducts as $product) {
                $branchPivot = $product->branches->first()->pivot;
                $branchQuantity = $branchPivot->quantity ?? 0;
                $reorderLevel = $branchPivot->reorder_level ?? 0;
                
                $reorders->push([
                    'id' => $product->id,
                    'name' => $product->name,
                    'code' => $product->code,
                    'sku' => $product->sku,
                    'image_path' => $product->image_path,
                    'quantity' => $branchQuantity,
                    'reorder_level' => $reorderLevel,
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
