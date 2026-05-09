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
            'products.*.brand_id' => 'required|exists:brands,id',
            'products.*.category_id' => 'required|exists:categories,id',
            'products.*.supplier_id' => 'nullable|exists:suppliers,id',
            'products.*.quantity' => 'required|integer|min:0',
            'products.*.price' => 'nullable|numeric|min:0',
            'products.*.sku' => 'nullable|string|max:255',
            'products.*.barcode' => 'nullable|string|max:255',
            'products.*.qr_code' => 'nullable|string|max:255',
            'products.*.physical_location' => 'nullable|string|max:255',
            'products.*.description' => 'nullable|string',
            'products.*.photo' => 'required|image|max:5120', // 5MB max
        ]);

        $results = DB::transaction(function () use ($validated, $request, $targetBranchId, $user) {
            $createdCount = 0;
            foreach ($validated['products'] as $index => $productData) {
                // Double check uniqueness in DB during transaction
                $exists = Product::where('name', $productData['name'])
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
                    ->exists();

                if ($exists) {
                    continue; 
                }

                $file = $request->file("products.{$index}.photo");
                $path = null;
                if ($file) {
                    $safeName = Str::slug($productData['name']);
                    $filename = "bulk_create_{$safeName}_" . time() . "_" . $index . "." . $file->getClientOriginalExtension();
                    $path = $file->storeAs('products', $filename, 'public');
                }

                $product = Product::create([
                    'brand_id' => $productData['brand_id'],
                    'category_id' => $productData['category_id'],
                    'name' => $productData['name'],
                    'sku' => $productData['sku'] ?? null,
                    'barcode' => $productData['barcode'] ?? null,
                    'qr_code' => $productData['qr_code'] ?? null,
                    'price' => $productData['price'] ?? 0,
                    'description' => $productData['description'] ?? null,
                    'supplier_id' => $productData['supplier_id'] ?? null,
                    'image_path' => $path,
                    'created_by' => $user->id,
                    'status' => 'active',
                ]);

                if ($targetBranchId) {
                    \App\Models\BranchProduct::create([
                        'branch_id' => $targetBranchId,
                        'product_id' => $product->id,
                        'quantity' => $productData['quantity'],
                        'physical_location' => $productData['physical_location'] ?? null,
                        'description' => $productData['description'] ?? null,
                    ]);
                }

                $createdCount++;
            }
            return $createdCount;
        });

        return back()->with('success', "{$results} products created successfully.");
    }
}
