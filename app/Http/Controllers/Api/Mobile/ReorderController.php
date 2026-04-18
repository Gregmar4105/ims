<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Product;
use Illuminate\Support\Facades\Auth;

class ReorderController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isSystemAdmin = $user->hasRole('System Administrator');
        $reorders = collect();

        if ($isSystemAdmin) {
            $branchReorders = Product::whereHas('branches', function ($query) {
                    $query->whereNotNull('branch_products.reorder_level')
                          ->where('branch_products.reorder_level', '>', 0)
                          ->whereRaw('branch_products.quantity <= branch_products.reorder_level');
                })
                ->with(['brand', 'category', 'branches'])->get();

            foreach ($branchReorders as $product) {
                foreach ($product->branches as $branch) {
                    if ($branch->pivot->reorder_level > 0 && $branch->pivot->quantity <= $branch->pivot->reorder_level) {
                        $reorders->push([
                            'id' => $product->id,
                            'name' => $product->name,
                            'code' => $product->code,
                            'quantity' => $branch->pivot->quantity,
                            'reorder_level' => $branch->pivot->reorder_level,
                            'brand' => $product->brand?->brand_name,
                            'category' => $product->category?->category_name,
                            'branch' => $branch->branch_name
                        ]);
                    }
                }
            }
        } else if ($user->branch_id) {
            $branchProducts = Product::whereHas('branches', function ($query) use ($user) {
                    $query->where('branch_id', $user->branch_id)
                          ->whereNotNull('branch_products.reorder_level')
                          ->where('branch_products.reorder_level', '>', 0)
                          ->whereRaw('branch_products.quantity <= branch_products.reorder_level');
                })
                ->with(['brand', 'category', 'branches' => function($query) use ($user) {
                    $query->where('branch_id', $user->branch_id);
                }])->get();

            foreach ($branchProducts as $product) {
                $branchPivot = $product->branches->first()->pivot;
                $reorders->push([
                    'id' => $product->id,
                    'name' => $product->name,
                    'code' => $product->code,
                    'quantity' => $branchPivot->quantity,
                    'reorder_level' => $branchPivot->reorder_level,
                    'brand' => $product->brand?->brand_name,
                    'category' => $product->category?->category_name,
                    'branch' => null
                ]);
            }
        }

        return response()->json([
            'data' => $reorders->values()
        ]);
    }
}
