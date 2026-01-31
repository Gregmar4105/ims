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
            // Removed 'branch' from with() as it doesn't exist on Product model
            ->with(['brand', 'category', 'creator']);

        if (!$isSystemAdmin) {
            if (!$user->branch_id) {
                // User has no branch and is not Admin, show nothing.
                $query->whereRaw('1 = 0');
            } else {
                // Use whereHas to filter by the user's branch
                $query->whereHas('branches', function ($q) use ($user) {
                    $q->where('branches.id', $user->branch_id);
                });
            }
        }

        $products = $query->latest()->paginate(10);

        return Inertia::render('QrBarcodes/Index', [
            'products' => $products,
        ]);
    }

    public function store(Request $request)
    {
        $productId = $request->input('product_id');
        
        $request->validate([
            'product_id' => 'required_without:generate_all|exists:products,id',
            'generate_all' => 'boolean',
            'barcode' => 'nullable|string|max:255|unique:products,barcode,' . $productId,
            'qr_code' => 'nullable|string|unique:products,qr_code,' . $productId,
        ]);

        $user = auth()->user();

        if ($request->generate_all) {
            $query = Product::where(function ($q) {
                $q->whereNull('barcode')->orWhereNull('qr_code');
            });

            if (!$user->hasRole('System Administrator')) {
                 if (!$user->branch_id) {
                     return redirect()->back()->with('error', 'User does not belong to a branch.');
                 }
                $query->whereHas('branches', function ($q) use ($user) {
                    $q->where('branches.id', $user->branch_id);
                });
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
        if (!$user->hasRole('System Administrator')) {
             // Check if product belongs to user's branch
             $belongsToBranch = $product->branches()->where('branches.id', $user->branch_id)->exists();
             if (!$belongsToBranch) {
                  abort(403, 'Unauthorized action.');
             }
        }

        // For single product update, we strictly follow the user input.
        // User requested NO auto-generation for single items unless "Generate All" is used.
        $product->barcode = $request->barcode;
        $product->qr_code = $request->qr_code;
        $product->save();

        return redirect()->back()->with('success', 'Codes updated successfully.');
    }

    private function generateCodesForProduct(Product $product, $customBarcode = null, $customQrCode = null)
    {
        // Generate Barcode: 12 digit number (EAN-13 style without check digit logic for simplicity, or just random)
        // Format: P-{BranchId}-{ProductId}-{Random4}
        // Since product doesn't have a single branch_id, we use the current user's branch_id if available,
        // or a default '000' for System Admin generated items that contextually don't belong to a specific branch edit.
        
        $userBranchId = auth()->user()->branch_id ?? 0;

        if ($customBarcode) {
            $product->barcode = $customBarcode;
        } elseif (!$product->barcode) {
             // Use user's branch ID for the barcode generation to track origin of the barcode assignment
            $product->barcode = 'P-' . str_pad($userBranchId, 3, '0', STR_PAD_LEFT) . '-' . str_pad($product->id, 5, '0', STR_PAD_LEFT) . '-' . strtoupper(Str::random(4));
        }

        // Generate QR Code Content: JSON with ID and Name, or a URL
        if ($customQrCode) {
            $product->qr_code = $customQrCode;
        } elseif (!$product->qr_code) {
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
