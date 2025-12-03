<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class BrandController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');

        $user = auth()->user();
        $query = Brand::query();

        // Strictly filter by user's branch_id. If no branch, show nothing.
        $isSystemAdmin = $user->hasRole('System Administrator');

        if ($isSystemAdmin) {
            // System Admin sees all brands
        } elseif ($user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        } else {
            // User has no branch and is not Admin, show nothing.
            $query->whereRaw('1 = 0');
        }

        $brands = $query->when($search, function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->with('creator')
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Brands/Index', [
            'brands' => $brands,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'status' => 'required|in:Active,Inactive',
        ]);

        $user = auth()->user();
        $branchId = $user->branch_id;

        if (!$branchId && !$user->hasRole('System Administrator')) {
             return back()->withErrors(['branch' => 'You must be assigned to a branch to create brands.']);
        }

        // Check if brand already exists for this branch
        $existingBrand = Brand::where('name', $request->name)
            ->where('branch_id', $branchId)
            ->first();

        if ($existingBrand) {
            return redirect()->back()->with('success', 'Brand already exists.');
        }

        Brand::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'status' => $request->status,
            'branch_id' => $branchId,
            'created_by' => $user->id,
        ]);

        return redirect()->back()->with('success', 'Brand created successfully.');
    }

    public function update(Request $request, Brand $brand)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('brands')->ignore($brand->id)],
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        $brand->update($validated);

        return redirect()->back()->with('success', 'Brand updated successfully.');
    }

    public function destroy(Brand $brand)
    {
        $brand->delete();
        return redirect()->back()->with('success', 'Brand deleted successfully.');
    }
}
