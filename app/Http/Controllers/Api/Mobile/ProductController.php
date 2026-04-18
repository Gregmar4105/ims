<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * List products for the authenticated user's branch.
     */
    public function index(Request $request)
    {
        $user     = $request->user();
        $isAdmin  = $user->hasRole('System Administrator');
        $branchId = $user->branch_id;

        $products = Product::with(['brand:id,name', 'category:id,name'])
            ->when(! $isAdmin && $branchId, function ($q) use ($branchId) {
                $q->whereHas('branches', fn ($b) => $b->where('branches.id', $branchId));
            })
            ->when($request->filled('category'), function ($q) use ($request) {
                $q->whereHas('category', fn ($c) => $c->where('name', $request->category));
            })
            ->when($request->filled('brand'), function ($q) use ($request) {
                $q->whereHas('brand', fn ($b) => $b->where('name', $request->brand));
            })
            ->orderBy('name')
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'data'       => $products->map(fn ($p) => $this->formatProduct($p)),
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page'    => $products->lastPage(),
                'per_page'     => $products->perPage(),
                'total'        => $products->total(),
            ],
        ]);
    }

    /**
     * Show a single product.
     */
    public function show(Request $request, int $id)
    {
        $product = Product::with(['brand', 'category', 'branches'])
            ->findOrFail($id);

        return response()->json($this->formatProduct($product, detailed: true));
    }

    /**
     * Search products by name, code, or SKU.
     */
    public function search(Request $request, string $query)
    {
        $user     = $request->user();
        $isAdmin  = $user->hasRole('System Administrator');
        $branchId = $user->branch_id;

        $results = Product::with(['brand:id,name', 'category:id,name'])
            ->when(! $isAdmin && $branchId, function ($q) use ($branchId) {
                $q->whereHas('branches', fn ($b) => $b->where('branches.id', $branchId));
            })
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('code', 'like', "%{$query}%")
                  ->orWhere('sku', 'like', "%{$query}%")
                  ->orWhere('barcode', 'like', "%{$query}%");
            })
            ->limit(30)
            ->get()
            ->map(fn ($p) => $this->formatProduct($p));

        return response()->json(['data' => $results, 'query' => $query]);
    }

    private function formatProduct(Product $product, bool $detailed = false): array
    {
        $base = [
            'id'        => $product->id,
            'name'      => $product->name,
            'code'      => $product->code,
            'code_2'    => $product->code_2,
            'sku'       => $product->sku,
            'barcode'   => $product->barcode,
            'price'     => $product->price,
            'brand'     => $product->brand?->name,
            'category'  => $product->category?->name,
            'image_url' => $product->image_path ? asset('storage/' . $product->image_path) : null,
        ];

        if ($detailed) {
            $base['description'] = $product->description;
            $base['variations']  = $product->variations;
            $base['branches']    = $product->branches->map(fn ($b) => [
                'id'                => $b->id,
                'name'              => $b->branch_name,
                'quantity'          => $b->pivot->quantity,
                'physical_location' => $b->pivot->physical_location,
                'reorder_level'     => $b->pivot->reorder_level,
            ]);
        }

        return $base;
    }
}
