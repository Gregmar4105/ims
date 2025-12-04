<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create the new pivot table
        Schema::create('branch_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->integer('quantity')->default(0);
            $table->string('physical_location')->nullable();
            $table->timestamps();
        });

        // 2. Migrate existing data
        $products = DB::table('products')->get();
        foreach ($products as $product) {
            DB::table('branch_products')->insert([
                'branch_id' => $product->branch_id,
                'product_id' => $product->id,
                'quantity' => $product->quantity,
                'physical_location' => $product->physical_location,
                'created_at' => $product->created_at,
                'updated_at' => $product->updated_at,
            ]);
        }

        // 3. Modify the products table to remove branch-specific columns
        Schema::table('products', function (Blueprint $table) {
            // Drop foreign key first if it exists. 
            // Note: The constraint name usually follows table_column_foreign convention.
            $table->dropForeign(['branch_id']);
            $table->dropColumn(['branch_id', 'quantity', 'physical_location']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Add columns back to products
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('cascade');
            $table->integer('quantity')->default(0);
            $table->string('physical_location')->nullable();
        });

        // 2. Restore data (This is tricky because multiple branches might have the same product ID conceptually, 
        // but in this refactor we kept the original product IDs. So we can just take the first branch_product entry 
        // or just leave it empty as this is a destructive reverse).
        // For safety, let's just try to restore from the first available branch_product.
        
        $branchProducts = DB::table('branch_products')->get();
        foreach ($branchProducts as $bp) {
            DB::table('products')->where('id', $bp->product_id)->update([
                'branch_id' => $bp->branch_id,
                'quantity' => $bp->quantity,
                'physical_location' => $bp->physical_location,
            ]);
        }

        // 3. Drop the pivot table
        Schema::dropIfExists('branch_products');
    }
};
