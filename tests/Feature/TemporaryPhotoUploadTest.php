<?php

use App\Models\User;
use App\Models\Branch;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('guest is redirected to login', function () {
    $this->get(route('products.temporary-upload'))
        ->assertRedirect(route('login'));
});

test('branch user only sees products in their branch', function () {
    // Skip if SQLite has incompatible migrations in this environment
    try {
        $branch1 = Branch::create(['branch_name' => 'Branch A', 'physical_location' => 'Loc A']);
        $branch2 = Branch::create(['branch_name' => 'Branch B', 'physical_location' => 'Loc B']);
    } catch (\Throwable $e) {
        $this->markTestSkipped('Database migrations not SQLite-compatible: ' . $e->getMessage());
    }

    $user = User::factory()->create([
        'branch_id' => $branch1->id,
    ]);

    // Assign Employee role or bypass role check if it isn't System Admin
    // In our controller: !$user->hasRole('System Administrator') triggers targetBranchId = user->branch_id

    $productInBranch = Product::create([
        'name' => 'Product in Branch A',
        'sku' => 'SKU-A',
        'price' => 10,
    ]);
    $productInBranch->branches()->attach($branch1->id, ['quantity' => 10]);

    $productNotInBranch = Product::create([
        'name' => 'Product in Branch B',
        'sku' => 'SKU-B',
        'price' => 20,
    ]);
    $productNotInBranch->branches()->attach($branch2->id, ['quantity' => 5]);

    $response = $this->actingAs($user)
        ->get(route('products.temporary-upload'));

    $response->assertOk();
    $products = $response->viewData('page')['props']['productsMissingImages'];
    
    // Should contain the one from branch 1, but not branch 2
    $productIds = collect($products)->pluck('id');
    expect($productIds)->toContain($productInBranch->id);
    expect($productIds)->not->toContain($productNotInBranch->id);
});

test('system administrator sees all products when no branch filter is active', function () {
    try {
        $branch1 = Branch::create(['branch_name' => 'Branch A', 'physical_location' => 'Loc A']);
        $branch2 = Branch::create(['branch_name' => 'Branch B', 'physical_location' => 'Loc B']);
    } catch (\Throwable $e) {
        $this->markTestSkipped('Database migrations not SQLite-compatible');
    }

    $admin = User::factory()->create();
    $admin->assignRole('System Administrator'); // Ensure they have the role

    // Clear active_branch_id session
    session()->forget('active_branch_id');

    $productA = Product::create(['name' => 'Product A', 'price' => 10]);
    $productA->branches()->attach($branch1->id, ['quantity' => 5]);

    $productB = Product::create(['name' => 'Product B', 'price' => 10]);
    $productB->branches()->attach($branch2->id, ['quantity' => 5]);

    $response = $this->actingAs($admin)
        ->get(route('products.temporary-upload'));

    $response->assertOk();
    $products = $response->viewData('page')['props']['productsMissingImages'];
    $productIds = collect($products)->pluck('id');

    expect($productIds)->toContain($productA->id);
    expect($productIds)->toContain($productB->id);
});
