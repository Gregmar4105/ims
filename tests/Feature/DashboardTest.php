<?php

use App\Models\User;
use Database\Seeders\RoleSeeder;

test('guests are redirected to the login page', function () {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $this->seed(RoleSeeder::class);
    $user = User::factory()->create();
    $user->assignRole('Employee');
    
    $this->actingAs($user);

    $this->get(route('dashboard'))->assertRedirect('/employee-dashboard');
});