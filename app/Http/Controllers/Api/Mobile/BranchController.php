<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BranchController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $branches = Branch::withCount(['users', 'products'])
            ->when($request->query('search'), function ($query, $search) {
                $query->where('branch_name', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            })
            ->get();

        return response()->json(['data' => $branches]);
    }

    /**
     * Store a newly created branch.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_name' => ['required', 'string', 'max:255', Rule::unique('branches', 'branch_name')],
            'location' => ['required', 'string', 'max:255'],
            'branch_status' => ['required', 'string', 'in:Active,Inactive'],
            'google_maps_embed_code' => ['nullable', 'string'],
        ]);

        $branch = Branch::create($validated);

        return response()->json(['message' => 'Branch created successfully.', 'data' => $branch], 201);
    }

    /**
     * Display the specified branch.
     */
    public function show(int $id)
    {
        $branch = Branch::withCount(['users', 'products'])->findOrFail($id);
        return response()->json(['data' => $branch]);
    }

    /**
     * Update the specified branch.
     */
    public function update(Request $request, int $id)
    {
        $branch = Branch::findOrFail($id);
        $validated = $request->validate([
            'branch_name' => ['required', 'string', 'max:255', Rule::unique('branches', 'branch_name')->ignore($branch->id)],
            'location' => ['required', 'string', 'max:255'],
            'branch_status' => ['required', 'string', 'in:Active,Inactive'],
            'google_maps_embed_code' => ['nullable', 'string'],
        ]);

        $branch->update($validated);

        return response()->json(['message' => 'Branch updated successfully.', 'data' => $branch]);
    }

    /**
     * Remove the specified branch.
     */
    public function destroy(int $id)
    {
        $branch = Branch::findOrFail($id);
        $branch->delete();
        return response()->json(['message' => 'Branch deleted successfully.']);
    }
}
