<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->query('search');
        $roles = Role::with('permissions')
            ->when($search, fn($q) => $q->where('name', 'like', "%{$search}%"))
            ->withCount('users')
            ->get();

        return response()->json(['data' => $roles]);
    }

    /**
     * Store a newly created role.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')],
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = Role::create(['name' => $validated['name']]);

        if (!empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        return response()->json(['message' => 'Role created successfully.', 'data' => $role->load('permissions')], 201);
    }

    /**
     * Display the specified role.
     */
    public function show(int $id)
    {
        $role = Role::with('permissions')->findOrFail($id);
        return response()->json(['data' => $role]);
    }

    /**
     * Update the specified role.
     */
    public function update(Request $request, int $id)
    {
        $role = Role::findOrFail($id);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')->ignore($role->id)],
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role->update(['name' => $validated['name']]);

        if (isset($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        return response()->json(['message' => 'Role updated successfully.', 'data' => $role->load('permissions')]);
    }

    /**
     * Remove the specified role.
     */
    public function destroy(int $id)
    {
        $role = Role::findOrFail($id);
        if ($role->name === 'System Administrator') {
            return response()->json(['message' => 'Cannot delete System Administrator role.'], 403);
        }
        $role->delete();
        return response()->json(['message' => 'Role deleted successfully.']);
    }
}
