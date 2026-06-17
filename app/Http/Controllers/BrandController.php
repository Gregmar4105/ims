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
        $user = auth()->user();
        $branchId = $user->branch_id;

        if (!$branchId && !$user->hasRole('System Administrator')) {
             return back()->withErrors(['branch' => 'You must be assigned to a branch to create brands.']);
        }

        $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('brands')->where(function ($query) use ($branchId) {
                    return $query->where('branch_id', $branchId);
                }),
            ],
            'status' => 'required|in:Active,Inactive',
        ], [
            'name.unique' => 'A brand with this name already exists in your branch.',
        ]);

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

    public function deleteAll(Request $request)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        if (!$isSystemAdmin) {
            abort(403, 'Unauthorized action. Only System Administrators can delete all brands.');
        }

        $branchId = (session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if (!$branchId) {
            return back()->with('error', 'No active branch selected.');
        }

        Brand::where('branch_id', $branchId)->delete();

        return redirect()->back()->with('success', 'All brands for this branch have been deleted successfully.');
    }

    public function search(Request $request)
    {
        $search = $request->query('search');
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $query = Brand::where('status', 'Active');

        if (!$isSystemAdmin) {
            $query->where('branch_id', $user->branch_id);
        }

        $brands = $query->where('name', 'like', "%{$search}%")
            ->orWhereRaw('LOWER(name) LIKE ?', ["%" . strtolower($search) . "%"])
            ->latest()
            ->take(10)
            ->get(['id', 'name']);

        return response()->json($brands);
    }
}
