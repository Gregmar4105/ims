<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Reset cached roles and permissions
        // This is crucial when using Spatie to ensure the cache doesn't hold onto old data
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 2. Define the Roles
        $roles = [
            'System Administrator',
            'Branch Administrator',
            'Employee',
        ];

        // 3. Create the Roles
        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName]);
        }
    }
}