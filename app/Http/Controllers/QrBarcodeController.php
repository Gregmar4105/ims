<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class QrBarcodeController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $query = Product::query()
            ->where(function ($q) {
                $q->whereNull('barcode')->orWhereNull('qr_code');
            })
            ->with(['branch', 'brand', 'category', 'creator']);

        if (!$isSystemAdmin) {
            if (!$user->branch_id) {
                // User has no branch and is not Admin, show nothing.
                $query->whereRaw('1 = 0');
            } else {
                $query->where('branch_id', $user->branch_id);
            }
        }

        $products = $query->latest()->paginate(10);

        return Inertia::render('QrBarcodes/Index', [
            'products' => $products,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required_without:generate_all|exists:products,id',
            'generate_all' => 'boolean',
        ]);

        $user = auth()->user();

        if ($request->generate_all) {
            $query = Product::where(function ($q) {
                $q->whereNull('barcode')->orWhereNull('qr_code');
            });

            if (!$user->hasRole('System Administrator')) {
                $query->where('branch_id', $user->branch_id);
            }

            $products = $query->get();
            $count = 0;

            foreach ($products as $product) {
                $this->generateCodesForProduct($product);
                $count++;
            }

            return redirect()->back()->with('success', "$count products updated with new codes.");
        }

        $product = Product::findOrFail($request->product_id);
        
        // Ensure user has permission to update this product
        if (!$user->hasRole('System Administrator') && $product->branch_id !== $user->branch_id) {
            abort(403, 'Unauthorized action.');
        }

        $this->generateCodesForProduct($product);

        return redirect()->back()->with('success', 'Codes generated successfully.');
    }

    private function generateCodesForProduct(Product $product)
    {
        // Generate Barcode: 12 digit number (EAN-13 style without check digit logic for simplicity, or just random)
        // Let's use a format: B-{BranchId}-{ProductId}-{Random4} to ensure uniqueness and readability
        if (!$product->barcode) {
            $product->barcode = 'P-' . str_pad($product->branch_id, 3, '0', STR_PAD_LEFT) . '-' . str_pad($product->id, 5, '0', STR_PAD_LEFT) . '-' . strtoupper(Str::random(4));
        }

        // Generate QR Code Content: JSON with ID and Name, or a URL
        // For now, let's store a JSON string that can be scanned
        if (!$product->qr_code) {
            $product->qr_code = json_encode([
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->barcode,
                'url' => route('products.show', $product->id), // Assuming show route exists or will exist
            ]);
        }

        $product->save();
    }
}
