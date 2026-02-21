<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use App\Models\Product;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Supplier;
use App\Models\BranchProduct;

class ImportTransferController extends Controller
{
    public function index()
    {
        return Inertia::render('Transfers/Import/Index', [
            'brands' => Brand::orderBy('name')->get(),
            'categories' => Category::orderBy('name')->get(),
            'suppliers' => Supplier::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:10240', // Max 10MB
        ]);

        $image = $request->file('image');
        
        // Send to n8n Webhook
        try {
            $response = Http::attach(
                'data', file_get_contents($image), $image->getClientOriginalName()
            )->post(config('services.n8n.webhook_url'));

            if ($response->successful()) {
                $raw = $response->json();
                // Handle n8n output structure: [{ "output": { "inventory_items": [...] } }]
                // Or sometimes it might be just the object. Check both.
                $items = $raw[0]['output']['inventory_items']
                    ?? $raw['output']['inventory_items']
                    ?? $raw['inventory_items']
                    ?? [];

                $branchId = auth()->user()->branch_id;
                
                if (is_array($items)) {
                    foreach ($items as &$item) {
                        $item['exists_in_branch'] = false;
                        if (isset($item['item_name']) && $branchId) {
                            $product = Product::with(['branches' => function ($query) use ($branchId) {
                                $query->where('branches.id', $branchId);
                            }])->where('name', 'like', '%' . trim($item['item_name']) . '%')->first();

                            if ($product && $product->branches->isNotEmpty()) {
                                $item['exists_in_branch'] = true;
                                $item['product_id'] = $product->id;
                                $item['brand_id'] = (string) $product->brand_id;
                                $item['category_id'] = (string) $product->category_id;
                                $item['supplier_id'] = (string) $product->supplier_id;
                                $item['price'] = $product->price;
                                $item['code'] = $product->code;
                                $item['code_2'] = $product->code_2;
                                $item['sku'] = $product->sku;
                                
                                $branchProduct = $product->branches->first()->pivot;
                                $item['current_stock'] = $branchProduct->quantity;
                                $item['physical_location'] = $branchProduct->physical_location;
                            } else {
                                $item['exists_in_branch'] = false;
                                $item['current_stock'] = 0;
                            }
                        }
                    }
                }

                return Inertia::render('Transfers/Import/Index', [
                    'analysis_result' => ['inventory_items' => $items],
                    'success' => 'Analysis complete. Found ' . count($items) . ' items.',
                    'brands' => Brand::orderBy('name')->get(),
                    'categories' => Category::orderBy('name')->get(),
                    'suppliers' => Supplier::orderBy('name')->get(),
                ]);
            } else {
                return back()->with('error', 'Failed to process image. Status: ' . $response->status());
            }

        } catch (\Exception $e) {
            return back()->with('error', 'Error communicating with AI service: ' . $e->getMessage());
        }
    }

    public function updateStock(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity_added' => 'required|integer|min:1',
        ]);

        $branchId = auth()->user()->branch_id;

        $branchProduct = BranchProduct::where('product_id', $request->product_id)
            ->where('branch_id', $branchId)
            ->first();

        return response()->json(['success' => false, 'message' => 'Product not found in this branch.'], 404);
    }

    public function bulkStore(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.category_id' => 'required|exists:categories,id',
            'items.*.brand_id' => 'required|exists:brands,id',
            'items.*.supplier_id' => 'nullable|exists:suppliers,id',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.quantity' => 'required|integer|min:0',
            'items.*.code' => 'nullable|string|max:255',
            'items.*.code_2' => 'nullable|string|max:255',
            'items.*.sku' => 'nullable|string|max:255',
            'items.*.physical_location' => 'nullable|string|max:255',
        ]);

        $branchId = auth()->user()->branch_id;

        foreach ($request->items as $item) {
            $product = Product::create([
                'name' => $item['item_name'],
                'category_id' => $item['category_id'],
                'brand_id' => $item['brand_id'],
                'supplier_id' => $item['supplier_id'] ?? null,
                'price' => $item['price'],
                'code' => $item['code'] ?? null,
                'code_2' => $item['code_2'] ?? null,
                'sku' => $item['sku'] ?? null,
                'created_by' => auth()->id(),
                'image_path' => 'New Product from Import Page', // Requested placeholder text
            ]);

            BranchProduct::create([
                'branch_id' => $branchId,
                'product_id' => $product->id,
                'quantity' => $item['quantity'],
                'physical_location' => $item['physical_location'] ?? null,
                'reorder_level' => 0, // Default via schema or here
            ]);
        }

        return redirect()->route('products.index')->with('success', 'Successfully imported and created new products.');
    }
}
