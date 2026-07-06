<?php

use App\Models\User;
use App\Models\Branch;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    Storage::fake('public');
});

test('branch admin can approve a sale with cash payment', function () {
    $branch = Branch::create([
        'branch_name' => 'Test Branch',
        'location' => 'Test Location',
    ]);

    $admin = User::factory()->create(['branch_id' => $branch->id]);
    $admin->assignRole('Branch Administrator');

    $employee = User::factory()->create(['branch_id' => $branch->id]);
    $employee->assignRole('Employee');

    $product = Product::create([
        'name' => 'Bike Helper',
        'price' => 500.00,
        'sku' => 'BIKE-HELP-1',
    ]);
    $product->branches()->attach($branch->id, ['quantity' => 10]);

    $sale = Sale::create([
        'branch_id' => $branch->id,
        'status' => 'readied',
        'readied_by' => $employee->id,
        'notes' => 'Test cash sale',
    ]);

    $saleItem = SaleItem::create([
        'sale_id' => $sale->id,
        'product_id' => $product->id,
        'quantity' => 2,
        'price' => 500.00,
        'original_price' => 500.00,
        'custom_code' => 'CUSTOMCODE-001',
    ]);

    $response = $this->actingAs($admin)->post("/sales/{$sale->id}/approve", [
        'payment_method' => 'cash',
        'cash_received' => 1000.00,
        'change_amount' => 0.00,
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    // Check DB sale updates
    $sale->refresh();
    expect($sale->status)->toBe('completed');
    expect($sale->approved_by)->toBe($admin->id);
    expect($sale->payment_method)->toBe('cash');
    expect((float)$sale->cash_received)->toBe(1000.00);
    expect((float)$sale->change_amount)->toBe(0.00);

    // Verify custom code persists on the sale item
    $saleItem->refresh();
    expect($saleItem->custom_code)->toBe('CUSTOMCODE-001');

    // Verify inventory deduction
    $pivotQuantity = $product->branches()->find($branch->id)->pivot->quantity;
    expect($pivotQuantity)->toBe(8); // 10 - 2
});

test('branch admin can approve a sale with e-wallet payment and proof upload', function () {
    $branch = Branch::create([
        'branch_name' => 'Test Branch',
        'location' => 'Test Location',
    ]);

    $admin = User::factory()->create(['branch_id' => $branch->id]);
    $admin->assignRole('Branch Administrator');

    $employee = User::factory()->create(['branch_id' => $branch->id]);
    $employee->assignRole('Employee');

    $product = Product::create([
        'name' => 'Gears Set',
        'price' => 250.00,
        'sku' => 'GEARS-001',
    ]);
    $product->branches()->attach($branch->id, ['quantity' => 5]);

    $sale = Sale::create([
        'branch_id' => $branch->id,
        'status' => 'readied',
        'readied_by' => $employee->id,
        'notes' => 'Test ewallet sale',
    ]);

    $saleItem = SaleItem::create([
        'sale_id' => $sale->id,
        'product_id' => $product->id,
        'quantity' => 1,
        'price' => 250.00,
        'original_price' => 250.00,
        'custom_code' => 'GEARS-CUSTOM-001',
    ]);

    $file = UploadedFile::fake()->image('payment_proof.jpg');

    $response = $this->actingAs($admin)->post("/sales/{$sale->id}/approve", [
        'payment_method' => 'e-wallet',
        'ewallet_provider' => 'GCash',
        'proof_of_payment' => $file,
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    // Check DB sale updates
    $sale->refresh();
    expect($sale->status)->toBe('completed');
    expect($sale->approved_by)->toBe($admin->id);
    expect($sale->payment_method)->toBe('e-wallet');
    expect($sale->ewallet_provider)->toBe('GCash');
    expect($sale->proof_of_payment_path)->not->toBeNull();

    // Verify proof file exists in fake storage
    Storage::disk('public')->assertExists($sale->proof_of_payment_path);

    // Verify inventory deduction
    $pivotQuantity = $product->branches()->find($branch->id)->pivot->quantity;
    expect($pivotQuantity)->toBe(4); // 5 - 1
});

test('approving a sale fails validation if required fields are missing', function () {
    $branch = Branch::create([
        'branch_name' => 'Test Branch',
        'location' => 'Test Location',
    ]);

    $admin = User::factory()->create(['branch_id' => $branch->id]);
    $admin->assignRole('Branch Administrator');

    $employee = User::factory()->create(['branch_id' => $branch->id]);
    $employee->assignRole('Employee');

    $sale = Sale::create([
        'branch_id' => $branch->id,
        'status' => 'readied',
        'readied_by' => $employee->id,
    ]);

    // Test missing cash details
    $response1 = $this->actingAs($admin)->post("/sales/{$sale->id}/approve", [
        'payment_method' => 'cash',
        // cash_received missing
    ]);
    $response1->assertSessionHasErrors(['cash_received']);

    // Test missing e-wallet provider and proof
    $response2 = $this->actingAs($admin)->post("/sales/{$sale->id}/approve", [
        'payment_method' => 'e-wallet',
        // ewallet_provider and proof_of_payment missing
    ]);
    $response2->assertSessionHasErrors(['ewallet_provider', 'proof_of_payment']);
});

test('branch admin can approve a sale with split bill payment', function () {
    $branch = Branch::create([
        'branch_name' => 'Test Branch',
        'location' => 'Test Location',
    ]);

    $admin = User::factory()->create(['branch_id' => $branch->id]);
    $admin->assignRole('Branch Administrator');

    $employee = User::factory()->create(['branch_id' => $branch->id]);
    $employee->assignRole('Employee');

    $product = Product::create([
        'name' => 'Gears Set',
        'price' => 250.00,
        'sku' => 'GEARS-001',
    ]);
    $product->branches()->attach($branch->id, ['quantity' => 5]);

    $sale = Sale::create([
        'branch_id' => $branch->id,
        'status' => 'readied',
        'readied_by' => $employee->id,
        'notes' => 'Test split bill sale',
    ]);

    $saleItem = SaleItem::create([
        'sale_id' => $sale->id,
        'product_id' => $product->id,
        'quantity' => 2, // total sale is 500
        'price' => 250.00,
        'original_price' => 250.00,
        'custom_code' => 'SPLIT-001',
    ]);

    $file = UploadedFile::fake()->image('payment_proof.jpg');

    $response = $this->actingAs($admin)->post("/sales/{$sale->id}/approve", [
        'payment_method' => 'split_bill',
        'cash_received' => 200.00,
        'split_ewallet_amount' => 300.00,
        'ewallet_provider' => 'GCash',
        'proof_of_payment' => $file,
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    // Check DB sale updates
    $sale->refresh();
    expect($sale->status)->toBe('completed');
    expect($sale->approved_by)->toBe($admin->id);
    expect($sale->payment_method)->toBe('split_bill');
    expect((float)$sale->cash_received)->toBe(200.00);
    expect((float)$sale->split_ewallet_amount)->toBe(300.00);
    expect($sale->ewallet_provider)->toBe('GCash');
    expect($sale->proof_of_payment_path)->not->toBeNull();

    // Verify proof file exists in fake storage
    Storage::disk('public')->assertExists($sale->proof_of_payment_path);

    // Verify inventory deduction
    $pivotQuantity = $product->branches()->find($branch->id)->pivot->quantity;
    expect($pivotQuantity)->toBe(3); // 5 - 2
});

test('returns of e-wallet sales deduct from e-wallet sales stats and not cash on hand', function () {
    $branch = Branch::create([
        'branch_name' => 'Test Branch',
        'location' => 'Test Location',
    ]);

    $admin = User::factory()->create(['branch_id' => $branch->id]);
    $admin->assignRole('Branch Administrator');

    $employee = User::factory()->create(['branch_id' => $branch->id]);
    $employee->assignRole('Employee');

    $product = Product::create([
        'name' => 'E-Wallet Item',
        'price' => 1000.00,
        'sku' => 'E-WAL-1',
    ]);
    $product->branches()->attach($branch->id, ['quantity' => 10]);

    // Create a completed e-wallet sale
    $sale = Sale::create([
        'branch_id' => $branch->id,
        'status' => 'completed',
        'payment_method' => 'e-wallet',
        'ewallet_provider' => 'GCash',
        'readied_by' => $employee->id,
        'approved_by' => $admin->id,
    ]);

    $saleItem = SaleItem::create([
        'sale_id' => $sale->id,
        'product_id' => $product->id,
        'quantity' => 2, // Total sale amount = 2000.00
        'price' => 1000.00,
        'original_price' => 1000.00,
    ]);

    // Check initial stats on sales-list page
    $response = $this->actingAs($admin)->get('/sales-list');
    $stats = $response->viewData('page')['props']['stats'];
    expect($stats['today_ewallet_sales'])->toBe(2000.00);
    expect($stats['today_cash_sales'])->toBe(0.00);
    expect($stats['cash_on_hand'])->toBe(0.00);

    // Process a return (refund) of 1 item
    $this->actingAs($admin)->post('/sale-returns', [
        'sale_id' => $sale->id,
        'product_id' => $product->id,
        'quantity' => 1,
        'reason' => 'Defective',
        'return_type' => 'refund',
        'restored_to_inventory' => true,
    ])->assertRedirect()->assertSessionHasNoErrors();

    // Check stats again on sales-list page
    $response2 = $this->actingAs($admin)->get('/sales-list');
    $stats2 = $response2->viewData('page')['props']['stats'];
    // E-wallet sales should deduct the refund amount of 1000.00
    expect($stats2['today_ewallet_sales'])->toBe(1000.00);
    expect($stats2['today_sales'])->toBe(1000.00);
    // Cash on hand should remain 0.00 (not be -1000.00)
    expect($stats2['cash_on_hand'])->toBe(0.00);
    expect($stats2['today_returns_sum'])->toBe(0.00); // Because it is e-wallet, not cash return
});
