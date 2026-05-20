<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

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

        $products = Product::with(['brand:id,name', 'category:id,name', 'branches'])
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

        $results = Product::with(['brand:id,name', 'category:id,name', 'branches'])
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

    /**
     * Store a newly created product.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:products,name',
            'code' => 'nullable|string|max:255',
            'code_2' => 'nullable|string|max:255',
            'sku' => 'nullable|string|max:255|unique:products,sku',
            'brand_id' => 'required|exists:brands,id',
            'category_id' => 'required|exists:categories,id',
            'quantity' => 'required|integer|min:0',
            'physical_location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'variations' => 'nullable|array',
            'image' => 'nullable|image|max:2048',
            'price' => 'nullable|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'reorder_level' => 'nullable|integer|min:0',
        ]);

        $targetQty = (int)$validated['quantity'];
        if (!empty($validated['variations'])) {
            foreach ($validated['variations'] as $v) {
                if (!isset($v['options']) || !isset($v['name'])) {
                    continue;
                }
                $options = $v['options'];
                if (is_array($options)) {
                    $sumQty = 0;
                    foreach ($options as $opt) {
                        if (!is_array($opt) || !isset($opt['value']) || !isset($opt['quantity'])) {
                            return response()->json(['message' => 'Each option must have a value and quantity.'], 422);
                        }
                        $sumQty += (int)$opt['quantity'];
                    }
                    if ($sumQty !== $targetQty) {
                        return response()->json(['message' => "The sum of quantities for variation '{$v['name']}' ({$sumQty}) must equal the total product quantity ({$targetQty})."], 422);
                    }
                }
            }
        }

        if (!$user->branch && !$isSystemAdmin) {
            return response()->json(['message' => 'You must be assigned to a branch to add products.'], 403);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
        }

        $product = DB::transaction(function () use ($validated, $user, $imagePath) {
            $product = Product::create([
                'brand_id' => $validated['brand_id'],
                'category_id' => $validated['category_id'],
                'name' => $validated['name'],
                'code' => $validated['code'] ?? null,
                'code_2' => $validated['code_2'] ?? null,
                'sku' => $validated['sku'] ?? null,
                'description' => $validated['description'] ?? null,
                'variations' => $validated['variations'] ?? null,
                'image_path' => $imagePath,
                'created_by' => $user->id,
                'price' => $validated['price'] ?? null,
                'supplier_id' => $validated['supplier_id'] ?? null,
            ]);

            if ($user->branch_id) {
                \App\Models\BranchProduct::create([
                    'branch_id' => $user->branch_id,
                    'product_id' => $product->id,
                    'quantity' => $validated['quantity'],
                    'physical_location' => $validated['physical_location'] ?? null,
                    'description' => $validated['description'] ?? null,
                    'variations' => $validated['variations'] ?? null,
                    'reorder_level' => $validated['reorder_level'] ?? 0,
                ]);
            }

            return $product;
        });

        return response()->json([
            'message' => 'Product created successfully.',
            'data' => $this->formatProduct($product->load('branches', 'brand', 'category'))
        ], 201);
    }

    /**
     * Update the specified product.
     */
    public function update(Request $request, int $id)
    {
        $product = Product::findOrFail($id);
        $user = $request->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('products', 'name')->ignore($product->id)],
            'code' => 'nullable|string|max:255',
            'code_2' => 'nullable|string|max:255',
            'sku' => ['nullable', 'string', 'max:255', Rule::unique('products', 'sku')->ignore($product->id)],
            'barcode' => [
                'nullable',
                'string',
                'digits:13',
                Rule::unique('products', 'barcode')->ignore($product->id),
                Rule::unique('products', 'qr_code')->ignore($product->id),
            ],
            'qr_code' => [
                'nullable',
                'string',
                'digits:13',
                Rule::unique('products', 'barcode')->ignore($product->id),
                Rule::unique('products', 'qr_code')->ignore($product->id),
            ],
            'brand_id' => 'required|exists:brands,id',
            'category_id' => 'required|exists:categories,id',
            'quantity' => 'required|integer|min:0',
            'physical_location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'variations' => 'nullable|array',
            'image' => 'nullable|image|max:2048',
            'price' => 'nullable|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'reorder_level' => 'nullable|integer|min:0',
        ]);

        $targetQty = (int)$validated['quantity'];
        if (!empty($validated['variations'])) {
            foreach ($validated['variations'] as $v) {
                if (!isset($v['options']) || !isset($v['name'])) {
                    continue;
                }
                $options = $v['options'];
                if (is_array($options)) {
                    $sumQty = 0;
                    foreach ($options as $opt) {
                        if (!is_array($opt) || !isset($opt['value']) || !isset($opt['quantity'])) {
                            return response()->json(['message' => 'Each option must have a value and quantity.'], 422);
                        }
                        $sumQty += (int)$opt['quantity'];
                    }
                    if ($sumQty !== $targetQty) {
                        return response()->json(['message' => "The sum of quantities for variation '{$v['name']}' ({$sumQty}) must equal the total product quantity ({$targetQty})."], 422);
                    }
                }
            }
        }

        if ($request->hasFile('image')) {
            if ($product->image_path && Storage::disk('public')->exists($product->image_path)) {
                Storage::disk('public')->delete($product->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('products', 'public');
        }

        DB::transaction(function () use ($product, $validated, $user, $isSystemAdmin) {
            $product->update([
                'name' => $validated['name'],
                'code' => $validated['code'] ?? null,
                'code_2' => $validated['code_2'] ?? null,
                'sku' => $validated['sku'] ?? null,
                'barcode' => $validated['barcode'] ?? null,
                'qr_code' => $validated['qr_code'] ?? null,
                'brand_id' => $validated['brand_id'],
                'category_id' => $validated['category_id'],
                'description' => $validated['description'] ?? null,
                'variations' => $validated['variations'] ?? null,
                'image_path' => $validated['image_path'] ?? $product->image_path,
                'price' => $validated['price'] ?? $product->price,
                'supplier_id' => $validated['supplier_id'] ?? $product->supplier_id,
            ]);

            if (!$isSystemAdmin && $user->branch_id) {
                \App\Models\BranchProduct::updateOrCreate(
                    ['branch_id' => $user->branch_id, 'product_id' => $product->id],
                    [
                        'quantity' => $validated['quantity'],
                        'physical_location' => $validated['physical_location'] ?? null,
                        'description' => $validated['description'] ?? null,
                        'variations' => $validated['variations'] ?? null,
                        'reorder_level' => $validated['reorder_level'] ?? 0,
                    ]
                );
            }
        });

        return response()->json([
            'message' => 'Product updated successfully.',
            'data' => $this->formatProduct($product->fresh(['branches', 'brand', 'category']))
        ]);
    }

    /**
     * Remove the specified product.
     */
    public function destroy(int $id)
    {
        $product = Product::findOrFail($id);
        
        if ($product->image_path && Storage::disk('public')->exists($product->image_path)) {
            Storage::disk('public')->delete($product->image_path);
        }

        // Release unique identifiers to allow re-adding
        $timestamp = time();
        $product->update([
            'name' => Str::limit($product->name, 200) . " (deleted-{$timestamp})",
            'sku' => $product->sku ? $product->sku . "-del-{$timestamp}" : null,
            'barcode' => $product->barcode ? $product->barcode . "-del-{$timestamp}" : null,
            'qr_code' => $product->qr_code ? $product->qr_code . "-del-{$timestamp}" : null,
            'code' => $product->code ? $product->code . "-del-{$timestamp}" : null,
            'code_2' => $product->code_2 ? $product->code_2 . "-del-{$timestamp}" : null,
        ]);

        // Clean up branch links and delete
        $product->branches()->detach();
        $product->delete();

        return response()->json(['message' => 'Product deleted successfully.']);
    }

    /**
     * Get options for product creation/editing.
     */
    public function options(Request $request)
    {
        $user = $request->user();
        $branchId = $user->branch_id;
        $isSystemAdmin = $user->hasRole('System Administrator');

        $brandsQuery = Brand::where('status', 'Active');
        $categoriesQuery = Category::where('status', 'Active');

        if (!$isSystemAdmin && $branchId) {
            $brandsQuery->where('branch_id', $branchId);
            $categoriesQuery->where('branch_id', $branchId);
        }

        return response()->json([
            'brands' => $brandsQuery->get(['id', 'name']),
            'categories' => $categoriesQuery->get(['id', 'name']),
            'suppliers' => Supplier::all(['id', 'name']),
        ]);
    }

    private function formatProduct(Product $product, bool $detailed = false): array
    {
        $user = auth()->user();
        $isAdmin = $user->hasRole('System Administrator');
        $branchId = $user->branch_id;

        $base = [
            'id'        => $product->id,
            'name'      => $product->name,
            'code'      => $product->code,
            'code_2'    => $product->code_2,
            'sku'       => $product->sku,
            'barcode'   => $product->barcode,
            'price'     => $product->price,
            'brand'     => $product->brand?->name,
            'brand_id'  => $product->brand_id,
            'category'  => $product->category?->name,
            'category_id' => $product->category_id,
            'image_url' => $product->image_path ? asset('storage/' . $product->image_path) : null,
            'description' => $product->description,
            'variations'  => $product->variations,
            'supplier_id' => $product->supplier_id,
        ];

        // Branch specific data (Stock Level, Reorder Level, etc.)
        if (!$isAdmin && $branchId) {
            $branchData = $product->branches->where('id', $branchId)->first();
            $base['quantity'] = $branchData ? $branchData->pivot->quantity : 0;
            $base['physical_location'] = $branchData ? $branchData->pivot->physical_location : null;
            $base['reorder_level'] = $branchData ? $branchData->pivot->reorder_level : 0;
            
            if ($branchData) {
                $base['description'] = $branchData->pivot->description ?? $base['description'];
                $base['variations'] = $branchData->pivot->variations ?? $base['variations'];
            }
        } else {
            // For admin or if no branch, show aggregate and detailed branch info if detailed requested
            $base['quantity'] = $product->branches->sum('pivot.quantity');
            $base['reorder_level'] = $product->branches->sum('pivot.reorder_level');
            
            if ($detailed) {
                $base['branches'] = $product->branches->map(fn ($b) => [
                    'id'                => $b->id,
                    'name'              => $b->branch_name,
                    'quantity'          => $b->pivot->quantity,
                    'physical_location' => $b->pivot->physical_location,
                    'reorder_level'     => $b->pivot->reorder_level,
                ]);
            }
        }

        return $base;
    }
}
