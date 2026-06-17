<?php

use App\Models\User;
use App\Models\Branch;
use App\Models\Expense;
use App\Models\ServiceFee;
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
