<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\User;
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
            'google_maps_embed_code' => ['nullable', 'string'],
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
            'google_maps_embed_code' => ['nullable', 'string'],
        ]);

        $branch->update($validated);

        return redirect()->route('branches.index')->with('success', 'Branch updated successfully.');
    }

    /**
     * Soft-archive the branch.
     *
     * The branch row is NEVER physically removed so all historical FK references
     * (sales, transfers, messages, branch_products) remain intact.
     * We:
     *   1. Rename it with an [ARCHIVED] prefix so it is identifiable in raw DB views.
     *   2. Set branch_id = null for every user who belonged to it.
     *   3. Soft-delete (sets deleted_at) — Laravel automatically excludes it from
     *      every Branch query across the entire application.
     */
    public function destroy(Branch $branch)
    {
        // 1. Rename to make the archive state visible in raw DB queries
        $branch->branch_name = '[ARCHIVED] ' . $branch->branch_name;
        $branch->branch_status = 'Inactive';
        $branch->save();

        // 2. Detach all users so they don't get routed into dead branch flows
        User::where('branch_id', $branch->id)->update(['branch_id' => null]);

        // 3. Soft-delete (sets deleted_at — excluded from all future queries)
        $branch->delete();

        return redirect()->route('branches.index')->with('success', 'Branch archived successfully.');
    }

    public function locations()
    {
        $branches = Branch::where('branch_status', 'Active')->get();
        return Inertia::render('Locations/Index', [
            'branches' => $branches
        ]);
    }

    public function switch(Request $request)
    {
        $request->validate([
            'branch_id' => 'required|exists:branches,id'
        ]);

        if ($request->user()->hasRole('System Administrator')) {
            session(['active_branch_id' => $request->branch_id]);
        }

        return back();
    }
}
