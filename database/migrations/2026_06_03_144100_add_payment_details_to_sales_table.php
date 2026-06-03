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
        Schema::table('sales', function (Blueprint $table) {
            $table->string('payment_method')->nullable()->after('status');
            $table->string('ewallet_provider')->nullable()->after('payment_method');
            $table->string('proof_of_payment_path')->nullable()->after('ewallet_provider');
            $table->decimal('cash_received', 15, 2)->nullable()->after('proof_of_payment_path');
            $table->decimal('change_amount', 15, 2)->nullable()->after('cash_received');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn([
                'payment_method',
                'ewallet_provider',
                'proof_of_payment_path',
                'cash_received',
                'change_amount'
            ]);
        });
    }
};
