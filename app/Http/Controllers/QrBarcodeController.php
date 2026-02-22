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
            'barcode' => 'nullable|string|digits:13|unique:products,barcode,' . $productId,
            'qr_code' => 'nullable|string|digits:13|unique:products,qr_code,' . $productId,
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
        // For custom input, if only one is provided, we can assign it to both or leave them separate if user provided both
        if ($customBarcode || $customQrCode) {
            $product->barcode = $customBarcode ?? $customQrCode;
            $product->qr_code = $customQrCode ?? $customBarcode;
        } else {
            // Generate a unique 13-digit number
            $isUnique = false;
            $uniqueCode = '';
            
            while (!$isUnique) {
                // Generate a random 13 digit string, e.g., using mt_rand
                // mt_rand max is technically smaller on 32-bit systems, but strings are safer
                $uniqueCode = '';
                for ($i = 0; $i < 13; $i++) {
                    // First digit should not be 0 ideally for integer casting issues later, but string is fine
                    $uniqueCode .= mt_rand(0, 9);
                }

                // Check uniqueness in both fields
                $exists = Product::where('barcode', $uniqueCode)
                            ->orWhere('qr_code', $uniqueCode)
                            ->exists();
                
                if (!$exists) {
                    $isUnique = true;
                }
            }

            $product->barcode = $uniqueCode;
            $product->qr_code = $uniqueCode; // Same identical string for both
        }

        $product->save();
    }
}
