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
        Schema::table('branch_products', function (Blueprint $table) {
            $table->text('description')->nullable()->after('quantity');
            $table->json('variations')->nullable()->after('description');
        });

        // Migrate existing data
        $products = DB::table('products')->get();
        foreach ($products as $product) {
            DB::table('branch_products')
                ->where('product_id', $product->id)
                ->update([
                    'description' => $product->description,
                    'variations' => $product->variations,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('branch_products', function (Blueprint $table) {
            $table->dropColumn(['description', 'variations']);
        });
    }
};
