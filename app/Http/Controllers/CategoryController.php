<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');

        $user = auth()->user();
        $query = Category::query();

        $isSystemAdmin = $user->hasRole('System Administrator');

        if (!$isSystemAdmin) {
            if (!$user->branch_id) {
                $query->whereRaw('1 = 0');
            } else {
                $query->where('branch_id', $user->branch_id);
            }
        }

        $categories = $query->when($search, function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->with('creator')
            ->latest()
            ->paginate(10);

        return Inertia::render('Categories/Index', [
            'categories' => $categories,
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
             return back()->withErrors(['branch' => 'You must be assigned to a branch to create categories.']);
        }

        $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories')->where(function ($query) use ($branchId) {
                    return $query->where('branch_id', $branchId);
                }),
            ],
            'status' => 'required|in:Active,Inactive',
        ], [
            'name.unique' => 'A category with this name already exists in your branch.',
        ]);

        Category::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'status' => $request->status,
            'branch_id' => $branchId,
            'created_by' => $user->id,
        ]);

        return redirect()->back()->with('success', 'Category created successfully.');
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('categories')->ignore($category->id)],
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        $category->update($validated);

        return redirect()->back()->with('success', 'Category updated successfully.');
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return redirect()->back()->with('success', 'Category deleted successfully.');
    }

    public function deleteAll(Request $request)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        if (!$isSystemAdmin) {
            abort(403, 'Unauthorized action. Only System Administrators can delete all categories.');
        }

        Category::query()->delete();

        return redirect()->back()->with('success', 'All categories have been deleted successfully.');
    }

    public function search(Request $request)
    {
        $search = $request->query('search');
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $query = Category::where('status', 'Active');

        if (!$isSystemAdmin) {
            $query->where('branch_id', $user->branch_id);
        }

        $categories = $query->where('name', 'like', "%{$search}%")
            ->orWhereRaw('LOWER(name) LIKE ?', ["%" . strtolower($search) . "%"])
            ->latest()
            ->take(10)
            ->get(['id', 'name']);

        return response()->json($categories);
    }
}
