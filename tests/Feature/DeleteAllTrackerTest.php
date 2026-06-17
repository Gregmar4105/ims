<?php

use App\Models\User;
use App\Models\Branch;
use App\Models\Expense;
use App\Models\ServiceFee;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Supplier;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

// --- Expense Delete All Tests ---

test('guest is redirected to login when deleting all expenses', function () {
    $this->post(route('expenses.deleteAll'))
        ->assertRedirect(route('login'));
});

test('employee is forbidden from deleting all expenses', function () {
    $employee = User::factory()->create();
    $employee->assignRole('Employee');

    $this->actingAs($employee)
        ->post(route('expenses.deleteAll'))
        ->assertStatus(403);
});

test('branch admin is forbidden from deleting all expenses', function () {
    $branchAdmin = User::factory()->create();
    $branchAdmin->assignRole('Branch Administrator');

    $this->actingAs($branchAdmin)
        ->post(route('expenses.deleteAll'))
        ->assertStatus(403);
});

test('system administrator can delete all expenses for active branch only', function () {
    $branch1 = Branch::create(['branch_name' => 'Branch One', 'physical_location' => 'Location One']);
    $branch2 = Branch::create(['branch_name' => 'Branch Two', 'physical_location' => 'Location Two']);

    $admin = User::factory()->create();
    $admin->assignRole('System Administrator');

    // Create expenses for branch 1
    Expense::create([
        'branch_id' => $branch1->id,
        'name' => 'Expense 1 Branch 1',
        'amount' => 100.00,
        'created_by' => $admin->id,
    ]);
    Expense::create([
        'branch_id' => $branch1->id,
        'name' => 'Expense 2 Branch 1',
        'amount' => 150.00,
        'created_by' => $admin->id,
    ]);

    // Create expense for branch 2
    Expense::create([
        'branch_id' => $branch2->id,
        'name' => 'Expense 1 Branch 2',
        'amount' => 200.00,
        'created_by' => $admin->id,
    ]);

    // Set active branch to branch 1 in session
    $this->actingAs($admin)
        ->withSession(['active_branch_id' => $branch1->id])
        ->post(route('expenses.deleteAll'))
        ->assertRedirect()
        ->assertSessionHas('success');

    // Verify branch 1 expenses are deleted
    expect(Expense::where('branch_id', $branch1->id)->count())->toBe(0);

    // Verify branch 2 expenses are intact
    expect(Expense::where('branch_id', $branch2->id)->count())->toBe(1);
});

// --- Service Fee Delete All Tests ---

test('guest is redirected to login when deleting all service fees', function () {
    $this->post(route('serviceFees.deleteAll'))
        ->assertRedirect(route('login'));
});

test('employee is forbidden from deleting all service fees', function () {
    $employee = User::factory()->create();
    $employee->assignRole('Employee');

    $this->actingAs($employee)
        ->post(route('serviceFees.deleteAll'))
        ->assertStatus(403);
});

test('branch admin is forbidden from deleting all service fees', function () {
    $branchAdmin = User::factory()->create();
    $branchAdmin->assignRole('Branch Administrator');

    $this->actingAs($branchAdmin)
        ->post(route('serviceFees.deleteAll'))
        ->assertStatus(403);
});

test('system administrator can delete all service fees for active branch only', function () {
    $branch1 = Branch::create(['branch_name' => 'Branch One', 'physical_location' => 'Location One']);
    $branch2 = Branch::create(['branch_name' => 'Branch Two', 'physical_location' => 'Location Two']);

    $admin = User::factory()->create();
    $admin->assignRole('System Administrator');

    // Create service fees for branch 1
    ServiceFee::create([
        'branch_id' => $branch1->id,
        'name' => 'Service 1 Branch 1',
        'amount' => 50.00,
        'created_by' => $admin->id,
    ]);
    ServiceFee::create([
        'branch_id' => $branch1->id,
        'name' => 'Service 2 Branch 1',
        'amount' => 75.00,
        'created_by' => $admin->id,
    ]);

    // Create service fee for branch 2
    ServiceFee::create([
        'branch_id' => $branch2->id,
        'name' => 'Service 1 Branch 2',
        'amount' => 120.00,
        'created_by' => $admin->id,
    ]);

    // Set active branch to branch 1 in session
    $this->actingAs($admin)
        ->withSession(['active_branch_id' => $branch1->id])
        ->post(route('serviceFees.deleteAll'))
        ->assertRedirect()
        ->assertSessionHas('success');

    // Verify branch 1 service fees are deleted
    expect(ServiceFee::where('branch_id', $branch1->id)->count())->toBe(0);

    // Verify branch 2 service fees are intact
    expect(ServiceFee::where('branch_id', $branch2->id)->count())->toBe(1);
});

// --- Brand Delete All Tests ---

test('guest is redirected to login when deleting all brands', function () {
    $this->post(route('brands.deleteAll'))
        ->assertRedirect(route('login'));
});

test('employee is forbidden from deleting all brands', function () {
    $employee = User::factory()->create();
    $employee->assignRole('Employee');

    $this->actingAs($employee)
        ->post(route('brands.deleteAll'))
        ->assertStatus(403);
});

test('branch admin is forbidden from deleting all brands', function () {
    $branchAdmin = User::factory()->create();
    $branchAdmin->assignRole('Branch Administrator');

    $this->actingAs($branchAdmin)
        ->post(route('brands.deleteAll'))
        ->assertStatus(403);
});

test('system administrator can delete all brands for active branch only', function () {
    $branch1 = Branch::create(['branch_name' => 'Branch One', 'physical_location' => 'Location One']);
    $branch2 = Branch::create(['branch_name' => 'Branch Two', 'physical_location' => 'Location Two']);

    $admin = User::factory()->create();
    $admin->assignRole('System Administrator');

    // Create brands for branch 1
    Brand::create([
        'branch_id' => $branch1->id,
        'name' => 'Brand 1 Branch 1',
        'slug' => 'brand-1-branch-1',
        'status' => 'Active',
        'created_by' => $admin->id,
    ]);
    Brand::create([
        'branch_id' => $branch1->id,
        'name' => 'Brand 2 Branch 1',
        'slug' => 'brand-2-branch-1',
        'status' => 'Active',
        'created_by' => $admin->id,
    ]);

    // Create brand for branch 2
    Brand::create([
        'branch_id' => $branch2->id,
        'name' => 'Brand 1 Branch 2',
        'slug' => 'brand-1-branch-2',
        'status' => 'Active',
        'created_by' => $admin->id,
    ]);

    // Set active branch to branch 1 in session
    $this->actingAs($admin)
        ->withSession(['active_branch_id' => $branch1->id])
        ->post(route('brands.deleteAll'))
        ->assertRedirect()
        ->assertSessionHas('success');

    // Verify branch 1 brands are deleted
    expect(Brand::where('branch_id', $branch1->id)->count())->toBe(0);

    // Verify branch 2 brands are intact
    expect(Brand::where('branch_id', $branch2->id)->count())->toBe(1);
});

// --- Category Delete All Tests ---

test('guest is redirected to login when deleting all categories', function () {
    $this->post(route('categories.deleteAll'))
        ->assertRedirect(route('login'));
});

test('employee is forbidden from deleting all categories', function () {
    $employee = User::factory()->create();
    $employee->assignRole('Employee');

    $this->actingAs($employee)
        ->post(route('categories.deleteAll'))
        ->assertStatus(403);
});

test('branch admin is forbidden from deleting all categories', function () {
    $branchAdmin = User::factory()->create();
    $branchAdmin->assignRole('Branch Administrator');

    $this->actingAs($branchAdmin)
        ->post(route('categories.deleteAll'))
        ->assertStatus(403);
});

test('system administrator can delete all categories for active branch only', function () {
    $branch1 = Branch::create(['branch_name' => 'Branch One', 'physical_location' => 'Location One']);
    $branch2 = Branch::create(['branch_name' => 'Branch Two', 'physical_location' => 'Location Two']);

    $admin = User::factory()->create();
    $admin->assignRole('System Administrator');

    // Create categories for branch 1
    Category::create([
        'branch_id' => $branch1->id,
        'name' => 'Category 1 Branch 1',
        'slug' => 'category-1-branch-1',
        'status' => 'Active',
        'created_by' => $admin->id,
    ]);
    Category::create([
        'branch_id' => $branch1->id,
        'name' => 'Category 2 Branch 1',
        'slug' => 'category-2-branch-1',
        'status' => 'Active',
        'created_by' => $admin->id,
    ]);

    // Create category for branch 2
    Category::create([
        'branch_id' => $branch2->id,
        'name' => 'Category 1 Branch 2',
        'slug' => 'category-1-branch-2',
        'status' => 'Active',
        'created_by' => $admin->id,
    ]);

    // Set active branch to branch 1 in session
    $this->actingAs($admin)
        ->withSession(['active_branch_id' => $branch1->id])
        ->post(route('categories.deleteAll'))
        ->assertRedirect()
        ->assertSessionHas('success');

    // Verify branch 1 categories are deleted
    expect(Category::where('branch_id', $branch1->id)->count())->toBe(0);

    // Verify branch 2 categories are intact
    expect(Category::where('branch_id', $branch2->id)->count())->toBe(1);
});

// --- Supplier Delete All Tests ---

test('guest is redirected to login when deleting all suppliers', function () {
    $this->post(route('suppliers.deleteAll'))
        ->assertRedirect(route('login'));
});

test('employee is forbidden from deleting all suppliers', function () {
    $employee = User::factory()->create();
    $employee->assignRole('Employee');

    $this->actingAs($employee)
        ->post(route('suppliers.deleteAll'))
        ->assertStatus(403);
});

test('branch admin is forbidden from deleting all suppliers', function () {
    $branchAdmin = User::factory()->create();
    $branchAdmin->assignRole('Branch Administrator');

    $this->actingAs($branchAdmin)
        ->post(route('suppliers.deleteAll'))
        ->assertStatus(403);
});

test('system administrator can delete all suppliers globally', function () {
    $admin = User::factory()->create();
    $admin->assignRole('System Administrator');

    // Create suppliers (global)
    Supplier::create([
        'name' => 'Supplier One',
        'email' => 'one@example.com',
    ]);
    Supplier::create([
        'name' => 'Supplier Two',
        'email' => 'two@example.com',
    ]);

    $this->actingAs($admin)
        ->post(route('suppliers.deleteAll'))
        ->assertRedirect()
        ->assertSessionHas('success');

    // Verify all suppliers are deleted globally
    expect(Supplier::count())->toBe(0);
});
