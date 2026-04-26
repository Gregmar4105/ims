<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Branch;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->query('search');

        $users = User::with(['branch', 'roles'])
            ->when($search, function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('branch', function ($q) use ($search) {
                        $q->where('branch_name', 'like', "%{$search}%");
                    });
            })
            ->orderBy('id', 'desc')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => $users->items(),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
            ]
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(int $id)
    {
        $user = User::with(['branch', 'roles'])->findOrFail($id);
        return response()->json(['data' => $user]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)],
            'password' => 'required|string|min:8',
            'branch_id' => 'nullable|exists:branches,id',
            'role' => 'required|exists:roles,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'branch_id' => $validated['branch_id'] ?? null,
        ]);

        if (isset($validated['role'])) {
            $role = Role::find($validated['role']);
            $user->assignRole($role);
        }

        return response()->json(['message' => 'User created successfully.', 'data' => $user->load('branch', 'roles')], 201);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, int $id)
    {
        $user = User::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)->ignore($user->id)],
            'password' => 'nullable|string|min:8',
            'branch_id' => 'nullable|exists:branches,id',
            'role' => 'required|exists:roles,id',
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->branch_id = $validated['branch_id'];

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        if (isset($validated['role'])) {
            $role = Role::findById($validated['role']);
            $user->syncRoles($role);
        }

        return response()->json(['message' => 'User updated successfully.', 'data' => $user->load('branch', 'roles')]);
    }

    /**
     * Remove the specified user.
     */
    public function destroy(int $id)
    {
        $user = User::findOrFail($id);
        $user->delete();
        return response()->json(['message' => 'User deleted successfully.']);
    }
}
