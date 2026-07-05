<?php

use App\Models\User;
use App\Models\Branch;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\ServiceFee;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

test('can ready sale with split bill service fee and save correctly', function () {
    $branch = Branch::create([
        'branch_name' => 'Test Branch',
        'location' => 'Test Location',
    ]);

    $employee = User::factory()->create(['branch_id' => $branch->id]);
    $employee->assignRole('Employee');

    $product = Product::create([
        'name' => 'Bike Chain',
        'price' => 150.00,
        'sku' => 'CHAIN-001',
    ]);
    $product->branches()->attach($branch->id, ['quantity' => 10]);

    $response = $this->actingAs($employee)->post('/sales', [
        'items' => [
            [
                'product_id' => $product->id,
                'quantity' => 1,
                'price' => 150.00,
                'original_price' => 150.00,
                'custom_code' => 'CUSTOM-CHAIN',
            ]
        ],
        'notes' => 'Split fee test',
        'add_service_fee' => true,
        'service_fee_name' => 'Chain Installation',
        'service_fee_amount' => 50.00,
        'service_fee_payment_method' => 'split_bill',
        'service_fee_cash_received' => 20.00,
        'service_fee_split_ewallet_amount' => 30.00,
    ]);

    $response->assertRedirect();
    
    $sale = Sale::latest()->first();
    $fee = ServiceFee::latest()->first();

    expect($sale)->not->toBeNull();
    expect($fee)->not->toBeNull();
    expect($fee->sale_id)->toBe($sale->id);
    expect($fee->payment_method)->toBe('split_bill');
    expect((float)$fee->cash_received)->toBe(20.00);
    expect((float)$fee->split_ewallet_amount)->toBe(30.00);
});

test('can log a new service fee directly with e-wallet payment', function () {
    $branch = Branch::create([
        'branch_name' => 'Test Branch',
        'location' => 'Test Location',
    ]);

    $admin = User::factory()->create(['branch_id' => $branch->id]);
    $admin->assignRole('Branch Administrator');

    $response = $this->actingAs($admin)->post('/service-fees', [
        'name' => 'Tire Replacement Service',
        'amount' => 120.00,
        'payment_method' => 'e-wallet',
    ]);

    $response->assertRedirect();
    
    $fee = ServiceFee::latest()->first();
    expect($fee)->not->toBeNull();
    expect($fee->name)->toBe('Tire Replacement Service');
    expect((float)$fee->amount)->toBe(120.00);
    expect($fee->payment_method)->toBe('e-wallet');
    expect($fee->cash_received)->toBeNull();
    expect($fee->split_ewallet_amount)->toBeNull();
});

test('cash on hand sums only the cash portion of service fees', function () {
    $branch = Branch::create([
        'branch_name' => 'Test Branch',
        'location' => 'Test Location',
    ]);

    $admin = User::factory()->create(['branch_id' => $branch->id]);
    $admin->assignRole('Branch Administrator');

    // 1. Direct Cash Fee: 100
    ServiceFee::create([
        'branch_id' => $branch->id,
        'name' => 'Cash Fee',
        'amount' => 100.00,
        'created_by' => $admin->id,
        'payment_method' => 'cash',
        'created_at' => Carbon::now(),
    ]);

    // 2. Direct E-Wallet Fee: 200 (should not be in cash on hand)
    ServiceFee::create([
        'branch_id' => $branch->id,
        'name' => 'E-Wallet Fee',
        'amount' => 200.00,
        'created_by' => $admin->id,
        'payment_method' => 'e-wallet',
        'created_at' => Carbon::now(),
    ]);

    // 3. Direct Split Fee: 300 total (50 cash, 250 e-wallet) (only 50 should be in cash on hand)
    ServiceFee::create([
        'branch_id' => $branch->id,
        'name' => 'Split Fee',
        'amount' => 300.00,
        'created_by' => $admin->id,
        'payment_method' => 'split_bill',
        'cash_received' => 50.00,
        'split_ewallet_amount' => 250.00,
        'created_at' => Carbon::now(),
    ]);

    // Perform request to see dashboard stats
    $response = $this->actingAs($admin)->get('/branch-dashboard');
    
    // We expect today_service_fees to be 600.00, but cash_on_hand from fees to be 150.00
    // Total cash sales = 0, expenses = 0, returns = 0. Cash on hand should be 150.00.
    // Inertia views can be inspected on the response via $response->assertInertia(fn($page) => ...)
    $response->assertInertia(function ($page) {
        $stats = $page->toArray()['props']['stats'];
        expect((float)$stats['today_service_fees'])->toBe(600.00);
        expect((float)$stats['cash_on_hand'])->toBe(150.00); // 100 cash + 50 split cash portion
    });
});
