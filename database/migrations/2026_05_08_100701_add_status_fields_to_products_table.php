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
        Schema::table('products', function (Blueprint $table) {
            $table->string('status', 20)->default('active')->after('supplier_id');
            $table->integer('active_until_zero_days')->nullable()->after('status');
            $table->timestamp('out_of_stock_since')->nullable()->after('active_until_zero_days');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['status', 'active_until_zero_days', 'out_of_stock_since']);
        });
    }
};
