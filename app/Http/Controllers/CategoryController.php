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
        $request->validate([
            'name' => 'required|string|max:255',
            'status' => 'required|in:Active,Inactive',
        ]);

        $user = auth()->user();
        $branchId = $user->branch_id;

        if (!$branchId && !$user->hasRole('System Administrator')) {
             return back()->withErrors(['branch' => 'You must be assigned to a branch to create categories.']);
        }

        // Check if category already exists for this branch
        $existingCategory = Category::where('name', $request->name)
            ->where('branch_id', $branchId)
            ->first();

        if ($existingCategory) {
            return redirect()->back()->with('success', 'Category already exists.');
        }

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
}
