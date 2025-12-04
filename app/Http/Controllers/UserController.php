<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
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
                    ->orWhere('email_verified_at', 'like', "%{$search}%")
                    ->orWhere('created_at', 'like', "%{$search}%")
                    ->orWhereHas('branch', function ($q) use ($search) {
                        $q->where('branch_name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('roles', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            })
            ->orderBy('id', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Users/Index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
            ],
            'branches' => Branch::all(),
            'roles' => Role::all(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Users/Create', [
            'branches' => Branch::all(),
            'roles' => Role::all(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)],
            'password' => 'required|string|min:8',
            'branch_name' => 'nullable|exists:branches,id',
            'role' => 'required|exists:roles,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'branch_id' => $validated['branch_name'] ?? null,
        ]);

        if (isset($validated['role'])) {
            $role = Role::find($validated['role']);
            $user->assignRole($role);
        }

        return redirect()->route('users.index')->with('success', 'User created successfully.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $user)
    {
        // Load the user's current role to pass to the view
        $user->load('roles');
        // We'll attach a 'role' attribute to the user object for the frontend to use easily
        $user->role = $user->roles->first()?->id;

        return Inertia::render('Users/Edit', [
            'users' => $user,
            'branches' => Branch::all(),
            'roles' => Role::all(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
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

        return redirect()->route('users.index')->with('success', 'User updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        $user->delete();
        return redirect()->route('users.index')->with('success', 'User deleted successfully.');
    }
}
