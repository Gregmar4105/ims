<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BranchController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->query('search');

        $branches = Branch::query()
            ->when($search, function ($query) use ($search) {
                $query->where('branch_name', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhere('branch_status', 'like', "%{$search}%");
            })
            ->orderBy('id', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Branches/Index', [
            'branches' => $branches,
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
        return Inertia::render('Branches/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_name' => ['required', 'string', 'max:255', Rule::unique('branches', 'branch_name')],
            'location' => ['required', 'string', 'max:255'],
            'branch_status' => ['required', 'string', 'in:Active,Inactive'],
        ]);

        Branch::create($validated);

        return redirect()->route('branches.index')->with('success', 'Branch created successfully.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Branch $branch)
    {
        return Inertia::render('Branches/Edit', [
            'branch' => $branch,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'branch_name' => ['required', 'string', 'max:255', Rule::unique('branches', 'branch_name')->ignore($branch->id)],
            'location' => ['required', 'string', 'max:255'],
            'branch_status' => ['required', 'string', 'in:Active,Inactive'],
        ]);

        $branch->update($validated);

        return redirect()->route('branches.index')->with('success', 'Branch updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Branch $branch)
    {
        $branch->delete();
        return redirect()->route('branches.index')->with('success', 'Branch deleted successfully.');
    }
}
