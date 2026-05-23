<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Str;

class TemporaryPhotoUploadController extends Controller
{
    use \App\Traits\IntelligentSearch;

    /**
     * Resolve the target branch ID for the current user.
     * System Admins use the session-stored active branch; others use their own branch.
     */
    protected function resolveTargetBranchId($user, bool $isSystemAdmin): ?int
    {
        if ($isSystemAdmin) {
            return session('active_branch_id', $user->branch_id);
        }
        return $user->branch_id;
    }

    public function index()
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');
        $targetBranchId = $this->resolveTargetBranchId($user, $isSystemAdmin);

        $query = Product::query();

        if ($targetBranchId) {
            $query->whereHas('branches', function ($q) use ($targetBranchId) {
                $q->where('branches.id', $targetBranchId);
            });
        } elseif (!$isSystemAdmin) {
            $query->whereRaw('1 = 0');
        }

        $productsMissingImages = $query->get()->filter(function ($product) {
            return empty($product->image_path) || !Storage::disk('public')->exists($product->image_path);
        })->values();

        $currentBranch = $targetBranchId ? Branch::find($targetBranchId) : null;

        return Inertia::render('Products/TemporaryPhotoUpload', [
            'productsMissingImages' => $productsMissingImages,
            'missingCount' => $productsMissingImages->count(),
            'isSystemAdmin' => $isSystemAdmin,
            'currentBranch' => $currentBranch ? [
                'id' => $currentBranch->id,
                'branch_name' => $currentBranch->branch_name,
            ] : null,
        ]);
    }

    public function missingStats()
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');
        $targetBranchId = $this->resolveTargetBranchId($user, $isSystemAdmin);

        $query = Product::query();

        if ($targetBranchId) {
            $query->whereHas('branches', function ($q) use ($targetBranchId) {
                $q->where('branches.id', $targetBranchId);
            });
        } elseif (!$isSystemAdmin) {
            $query->whereRaw('1 = 0');
        }

        $productsMissingImages = $query->get()->filter(function ($product) {
            return empty($product->image_path) || !Storage::disk('public')->exists($product->image_path);
        })->values();

        return response()->json([
            'productsMissingImages' => $productsMissingImages,
            'missingCount' => $productsMissingImages->count(),
        ]);
    }

    public function search(Request $request)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');
        $targetBranchId = $this->resolveTargetBranchId($user, $isSystemAdmin);

        $products = $this->performIntelligentSearch(
            $request->query('query', ''),
            ['sku', 'barcode', 'qr_code', 'code', 'code_2'],
            $targetBranchId
        );

        return response()->json($products->map(fn($p) => [
            'id' => $p->id, 
            'name' => $p->name, 
            'sku' => $p->sku, 
            'barcode' => $p->barcode,
            'qr_code' => $p->qr_code,
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

        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');
        $targetBranchId = $this->resolveTargetBranchId($user, $isSystemAdmin);

        if (!$targetBranchId && !$isSystemAdmin) {
            return back()->withErrors(['error' => 'You must be assigned to a branch to update photos.']);
        }

        DB::transaction(function () use ($validated, $request, $targetBranchId) {
            foreach ($validated['mappings'] as $index => $mapping) {
                $productId = $mapping['productId'];
                $product = Product::findOrFail($productId);

                // Enforce branch boundaries
                if ($targetBranchId) {
                    $hasBranch = $product->branches()->where('branches.id', $targetBranchId)->exists();
                    if (!$hasBranch) {
                        abort(403, 'Unauthorized action for this branch.');
                    }
                }
                
                // Retrieve the specific file for this mapping
                $file = $request->file("mappings.{$index}.photo");

                if (!$file) {
                    continue;
                }

                // Delete old image if exists
                if ($product->image_path && Storage::disk('public')->exists($product->image_path)) {
                    Storage::disk('public')->delete($product->image_path);
                }

                // Retrieve branch name for folder organization
                $targetBranch = $targetBranchId ? Branch::find($targetBranchId) : null;
                $branchName = $targetBranch ? $targetBranch->branch_name : 'System';

                // Generate filename similar to ProductController
                $safeName = Str::slug($product->name);
                $extension = $file->getClientOriginalExtension();
                $filename = "bulk_{$productId}_{$safeName}_" . time() . ".{$extension}";
                
                // Store in branch-organized folder
                $folderPath = 'products/bulk-uploads/' . Str::slug($branchName);
                $path = $file->storeAs($folderPath, $filename, 'public');

                $product->update([
                    'image_path' => $path,
                ]);
            }
        });

        return back()->with('success', 'Products updated successfully.');
    }
}

