<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class DragAndDropUploadController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $isSystemAdmin = $user->hasRole('System Administrator');
        $targetBranchId = null;

        if ($isSystemAdmin) {
            $targetBranchId = session('active_branch_id');
        } else {
            $targetBranchId = $user->branch_id;
        }

        $currentBranch = $targetBranchId ? DB::table('branches')->where('id', $targetBranchId)->first() : null;

        return Inertia::render('Products/DragAndDropUpload', [
            'brands' => Brand::where('status', 'Active')->get(),
            'categories' => Category::where('status', 'Active')->get(),
            'suppliers' => Supplier::all(),
            'isSystemAdmin' => $isSystemAdmin,
            'currentBranch' => $currentBranch ? [
                'id' => $currentBranch->id,
                'branch_name' => $currentBranch->branch_name,
            ] : null,
        ]);
    }

    public function validateField(Request $request)
    {
        $field = $request->input('field');
        $value = $request->input('value');
        $excludeId = $request->input('excludeId');

        if (!$field || !$value) {
            return response()->json(['exists' => false]);
        }

        $query = Product::where($field, $value);
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        // Also check barcode/qr_code cross-uniqueness
        if ($field === 'barcode' || $field === 'qr_code') {
            $exists = Product::where(function ($q) use ($value) {
                $q->where('barcode', $value)->orWhere('qr_code', $value);
            });
            if ($excludeId) {
                $exists->where('id', '!=', $excludeId);
            }
            return response()->json(['exists' => $exists->exists()]);
        }

        return response()->json(['exists' => $query->exists()]);
    }

    public function getDetails(Request $request)
    {
        $field = $request->input('field', 'name');
        $value = $request->input('value');
        $user = Auth::user();
        $isSystemAdmin = $user->hasRole('System Administrator');
        $targetBranchId = $isSystemAdmin ? session('active_branch_id') : $user->branch_id;

        if (!$value) {
            return response()->json(null);
        }

        $product = Product::where($field, $value)
            ->with(['brand', 'category', 'supplier'])
            ->first();

        if (!$product) {
            // Also check cross-codes
            if ($field === 'barcode' || $field === 'qr_code') {
                $product = Product::where('barcode', $value)
                    ->orWhere('qr_code', $value)
                    ->with(['brand', 'category', 'supplier'])
                    ->first();
            }
        }

        if ($product) {
            $branchProduct = $product->branches()->where('branch_id', $targetBranchId)->first();
            
            // Map pivot data to product object for frontend convenience
            $product->quantity = $branchProduct ? $branchProduct->pivot->quantity : 0;
            $product->physical_location = $branchProduct ? $branchProduct->pivot->physical_location : '';
            $product->reorder_level = $branchProduct ? $branchProduct->pivot->reorder_level : 0;
            
            // Brand, Category, Supplier names instead of just IDs for autocompletes
            $product->brand_name = $product->brand ? $product->brand->name : '';
            $product->category_name = $product->category ? $product->category->name : '';
            $product->supplier_name = $product->supplier ? $product->supplier->name : '';

            return response()->json($product);
        }

        return response()->json(null);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $isSystemAdmin = $user->hasRole('System Administrator');
        
        // Resolve target branch: System Admin uses session branch, others use their own
        $targetBranchId = $isSystemAdmin ? session('active_branch_id') : $user->branch_id;

        if (!$targetBranchId && !$isSystemAdmin) {
            return back()->withErrors(['error' => 'You must be assigned to a branch to add products.']);
        }

        $validated = $request->validate([
            'products' => 'required|array',
            'products.*.name' => 'required|string|max:255',
            'products.*.brand' => 'required|string|max:255',
            'products.*.category' => 'required|string|max:255',
            'products.*.supplier' => 'nullable|string|max:255',
            'products.*.quantity' => 'required|integer|min:0',
            'products.*.price' => 'nullable|numeric|min:0',
            'products.*.sku' => 'nullable|string|max:255',
            'products.*.barcode' => 'nullable|string|max:255',
            'products.*.qr_code' => 'nullable|string|max:255',
            'products.*.code' => 'nullable|string|max:255',
            'products.*.code_2' => 'nullable|string|max:255',
            'products.*.reorder_level' => 'nullable|integer|min:0',
            'products.*.active_until_zero_days' => 'nullable|integer|min:0',
            'products.*.physical_location' => 'nullable|string|max:255',
            'products.*.description' => 'nullable|string',
            'products.*.variations' => 'nullable|array',
            'products.*.photo' => 'nullable|image|max:5120', // Optional if updating existing
        ]);

        $processedCount = DB::transaction(function () use ($validated, $request, $targetBranchId, $user) {
            $count = 0;
            foreach ($validated['products'] as $index => $productData) {
                // Find existing product by name, sku, barcode, or qr_code
                $product = Product::where('name', $productData['name'])
                    ->when($productData['sku'], function ($q) use ($productData) {
                        return $q->orWhere('sku', $productData['sku']);
                    })
                    ->when($productData['barcode'], function ($q) use ($productData) {
                        return $q->orWhere('barcode', $productData['barcode'])
                                 ->orWhere('qr_code', $productData['barcode']);
                    })
                    ->when($productData['qr_code'], function ($q) use ($productData) {
                        return $q->orWhere('qr_code', $productData['qr_code'])
                                 ->orWhere('barcode', $productData['qr_code']);
                    })
                    ->first();

                // Resolve Brand
                $brand = Brand::firstOrCreate(
                    ['name' => $productData['brand'], 'branch_id' => $targetBranchId],
                    ['slug' => Str::slug($productData['brand']), 'status' => 'Active', 'created_by' => $user->id]
                );

                // Resolve Category
                $category = Category::firstOrCreate(
                    ['name' => $productData['category'], 'branch_id' => $targetBranchId],
                    ['slug' => Str::slug($productData['category']), 'status' => 'Active', 'created_by' => $user->id]
                );

                // Resolve Supplier
                $supplierId = null;
                if (!empty($productData['supplier'])) {
                    $supplier = \App\Models\Supplier::firstOrCreate(['name' => $productData['supplier']]);
                    $supplierId = $supplier->id;
                }

                // Handle Photo
                $path = $product ? $product->image_path : null;
                $file = $request->file("products.{$index}.photo");
                if ($file) {
                    // Delete old image if exists
                    if ($path && Storage::disk('public')->exists($path)) {
                        Storage::disk('public')->delete($path);
                    }
                    $safeName = Str::slug($productData['name']);
                    $filename = "bulk_{$safeName}_" . time() . "_" . $index . "." . $file->getClientOriginalExtension();
                    $path = $file->storeAs('products', $filename, 'public');
                }

                // Update or Create Product
                $product = Product::updateOrCreate(
                    ['name' => $productData['name']],
                    [
                        'brand_id' => $brand->id,
                        'category_id' => $category->id,
                        'sku' => $productData['sku'] ?? ($product ? $product->sku : null),
                        'barcode' => $productData['barcode'] ?? ($product ? $product->barcode : null),
                        'qr_code' => $productData['qr_code'] ?? ($product ? $product->qr_code : null),
                        'code' => $productData['code'] ?? ($product ? $product->code : null),
                        'code_2' => $productData['code_2'] ?? ($product ? $product->code_2 : null),
                        'price' => $productData['price'] ?? ($product ? $product->price : 0),
                        'description' => $productData['description'] ?? ($product ? $product->description : null),
                        'variations' => $productData['variations'] ?? ($product ? $product->variations : null),
                        'supplier_id' => $supplierId ?? ($product ? $product->supplier_id : null),
                        'image_path' => $path,
                        'active_until_zero_days' => $productData['active_until_zero_days'] ?? ($product ? $product->active_until_zero_days : null),
                        'created_by' => $product ? $product->created_by : $user->id,
                        'status' => 'active',
                    ]
                );

                // Update or Create Branch Product
                if ($targetBranchId) {
                    \App\Models\BranchProduct::updateOrCreate(
                        ['branch_id' => $targetBranchId, 'product_id' => $product->id],
                        [
                            'quantity' => $productData['quantity'],
                            'physical_location' => $productData['physical_location'] ?? null,
                            'description' => $productData['description'] ?? null,
                            'variations' => $productData['variations'] ?? null,
                            'reorder_level' => $productData['reorder_level'] ?? 0,
                        ]
                    );
                }

                $count++;
            }
            return $count;
        });

        return back()->with('success', "{$processedCount} products processed successfully.");
    }
}
