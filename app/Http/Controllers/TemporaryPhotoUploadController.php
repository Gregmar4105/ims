<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Str;

class TemporaryPhotoUploadController extends Controller
{
    public function index()
    {
        $productsMissingImages = Product::whereNull('image_path')
            ->orWhere('image_path', '')
            ->latest()
            ->get();

        return Inertia::render('Products/TemporaryPhotoUpload', [
            'productsMissingImages' => $productsMissingImages,
            'missingCount' => $productsMissingImages->count(),
        ]);
    }

    public function search(Request $request)
    {
        $search = $request->query('query');
        
        if (!$search) {
            return response()->json([]);
        }

        $products = Product::where('name', 'like', "%{$search}%")
            ->orWhere('sku', 'like', "%{$search}%")
            ->orWhere('barcode', 'like', "%{$search}%")
            ->orWhere('qr_code', 'like', "%{$search}%")
            ->limit(10)
            ->get(['id', 'name', 'sku', 'image_path']);

        return response()->json($products);
    }

    public function update(Request $request)
    {
        $request->validate([
            'mappings' => 'required|array',
            'mappings.*.productId' => 'required|exists:products,id',
            'mappings.*.photo' => 'required|image|max:5120', // 5MB max
        ]);

        $mappings = $request->input('mappings');
        $files = $request->file('mappings');

        DB::transaction(function () use ($mappings, $files) {
            foreach ($mappings as $index => $mapping) {
                $productId = $mapping['productId'];
                $product = Product::findOrFail($productId);
                $file = $files[$index]['photo'];

                // Delete old image if exists
                if ($product->image_path && Storage::disk('public')->exists($product->image_path)) {
                    Storage::disk('public')->delete($product->image_path);
                }

                // Generate filename similar to ProductController
                $safeName = Str::slug($product->name);
                $extension = $file->getClientOriginalExtension();
                $filename = "bulk_{$productId}_{$safeName}_{$index}_" . time() . ".{$extension}";
                
                $path = $file->storeAs('products/bulk-uploads', $filename, 'public');

                $product->update([
                    'image_path' => $path,
                ]);
            }
        });

        return back()->with('success', 'Products updated successfully.');
    }
}
