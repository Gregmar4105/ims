<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Illuminate\Validation\Rule;

class PermissionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->query('search');
        $permissions = Permission::query()
            ->when($search, fn($q) => $q->where('name', 'like', "%{$search}%"))
            ->latest()
            ->get();

        return response()->json(['data' => $permissions]);
    }

    /**
     * Store a newly created permission.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('permissions', 'name')],
        ]);

        $permission = Permission::create(['name' => $validated['name']]);

        return response()->json(['message' => 'Permission created successfully.', 'data' => $permission], 201);
    }

    /**
     * Display the specified permission.
     */
    public function show(int $id)
    {
        $permission = Permission::findOrFail($id);
        return response()->json(['data' => $permission]);
    }

    /**
     * Update the specified permission.
     */
    public function update(Request $request, int $id)
    {
        $permission = Permission::findOrFail($id);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('permissions', 'name')->ignore($permission->id)],
        ]);

        $permission->update(['name' => $validated['name']]);

        return response()->json(['message' => 'Permission updated successfully.', 'data' => $permission]);
    }

    /**
     * Remove the specified permission.
     */
    public function destroy(int $id)
    {
        $permission = Permission::findOrFail($id);
        $permission->delete();
        return response()->json(['message' => 'Permission deleted successfully.']);
    }
}
