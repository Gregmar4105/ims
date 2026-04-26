<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $query = Brand::query();

        if (!$isSystemAdmin) {
            if ($user->branch_id) {
                $query->where('branch_id', $user->branch_id);
            } else {
                return response()->json(['data' => []]);
            }
        }

        $brands = $query->when($request->query('search'), function ($q, $search) {
                $q->where('name', 'like', "%{$search}%");
            })
            ->latest()
            ->get();

        return response()->json(['data' => $brands]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'status' => 'required|in:Active,Inactive',
        ]);

        $user = $request->user();
        $branchId = $user->branch_id;

        if (!$branchId && !$user->hasRole('System Administrator')) {
            return response()->json(['message' => 'You must be assigned to a branch to create brands.'], 403);
        }

        $brand = Brand::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'status' => $request->status,
            'branch_id' => $branchId,
            'created_by' => $user->id,
        ]);

        return response()->json(['message' => 'Brand created successfully.', 'data' => $brand], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(int $id)
    {
        $brand = Brand::findOrFail($id);
        return response()->json(['data' => $brand]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, int $id)
    {
        $brand = Brand::findOrFail($id);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('brands')->ignore($brand->id)],
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        $validated['slug'] = Str::slug($validated['name']);
        $brand->update($validated);

        return response()->json(['message' => 'Brand updated successfully.', 'data' => $brand]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(int $id)
    {
        $brand = Brand::findOrFail($id);
        $brand->delete();
        return response()->json(['message' => 'Brand deleted successfully.']);
    }
}
