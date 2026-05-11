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
    use \App\Traits\IntelligentSearch;

    public function index()
    {
        $productsMissingImages = Product::all()->filter(function ($product) {
            return empty($product->image_path) || !Storage::disk('public')->exists($product->image_path);
        })->values();

        return Inertia::render('Products/TemporaryPhotoUpload', [
            'productsMissingImages' => $productsMissingImages,
            'missingCount' => $productsMissingImages->count(),
        ]);
    }

    public function search(Request $request)
    {
        $products = $this->performIntelligentSearch(
            $request->query('query', ''),
            ['sku', 'barcode', 'qr_code', 'code', 'code_2']
        );

        return response()->json($products->map(fn($p) => [
            'id' => $p->id, 
            'name' => $p->name, 
            'sku' => $p->sku, 
            'image_path' => $p->image_path
        ]));
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'mappings' => 'required|array',
            'mappings.*.productId' => 'required|exists:products,id',
            'mappings.*.photo' => 'required|image|max:5120', // 5MB max
        ]);

        DB::transaction(function () use ($validated, $request) {
            foreach ($validated['mappings'] as $index => $mapping) {
                $productId = $mapping['productId'];
                $product = Product::findOrFail($productId);
                
                // Retrieve the specific file for this mapping
                $file = $request->file("mappings.{$index}.photo");

                if (!$file) {
                    continue;
                }

                // Delete old image if exists
                if ($product->image_path && Storage::disk('public')->exists($product->image_path)) {
                    Storage::disk('public')->delete($product->image_path);
                }

                // Generate filename similar to ProductController
                $safeName = Str::slug($product->name);
                $extension = $file->getClientOriginalExtension();
                $filename = "bulk_{$productId}_{$safeName}_" . time() . ".{$extension}";
                
                $path = $file->storeAs('products/bulk-uploads', $filename, 'public');

                $product->update([
                    'image_path' => $path,
                ]);
            }
        });

        return back()->with('success', 'Products updated successfully.');
    }
}
