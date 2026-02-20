<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('branch_products', function (Blueprint $table) {
            $table->integer('reorder_level')->nullable()->default(0)->after('quantity');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('reorder_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->integer('reorder_level')->nullable()->default(0)->after('supplier_id');
        });

        Schema::table('branch_products', function (Blueprint $table) {
            $table->dropColumn('reorder_level');
        });
    }
};
