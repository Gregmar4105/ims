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
    // --- DEBUG START ---
    // Get the currently authenticated user
    // $user = $request->user();

    // dd([
    //     'User Name' => $user->name,
    //     'User Email' => $user->email,
    //     'Assigned Roles' => $user->getRoleNames(),       // Returns a collection of role names
    //     'Direct Permissions' => $user->getPermissionNames(), // Returns direct permissions
    //     'All Permissions' => $user->getAllPermissions()->pluck('name'), // Returns ALL permissions (including those inherited from roles)
    // ]);
    // --- DEBUG END ---

    $search = $request->query('search');

    $airlines = User::when($search, function ($query) use ($search) {
            $query->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('email_verified_at', 'like', "%{$search}%")
                ->orWhere('created_at', 'like', "%{$search}%");
        })
        ->paginate(5)
        ->withQueryString();

    return Inertia::render('Users/Index', [
        'users' => $airlines,
        'filters' => [
            'search' => $search,
        ],
    ]);
}

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Users/Create',[
            'branches' => Branch::get(),
            'roles' => User::with('roles')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        // 1. Validate all fields, including the new branch_id and role
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)],
            'password' => 'required|string|min:8',
            //'branch_id' => 'required|exists:branches,id', // Ensures the branch exists
            //'role' => 'required|string',
        ]);

        // 2. Create the user
        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            //'branch_id' => $validated['branch_id'],
            //'role' => $validated['role'],
        ]);

        // 3. Redirect with a proper key-value pair for the toast message
        // You likely want to go back to the list ('users.index') or stay on create
        return redirect()->route('users.index')->with('success', 'User created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $id)
    {
        return Inertia::render('Users/Edit', [
            'users' => $id,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
