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
        Schema::table('service_fees', function (Blueprint $table) {
            $table->string('payment_method')->default('cash')->after('amount');
            $table->decimal('cash_received', 12, 2)->nullable()->after('payment_method');
            $table->decimal('split_ewallet_amount', 12, 2)->nullable()->after('cash_received');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_fees', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'cash_received', 'split_ewallet_amount']);
        });
    }
};
