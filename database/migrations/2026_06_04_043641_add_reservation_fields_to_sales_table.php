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
            $table->string('customer_name')->nullable()->after('status');
            $table->date('reservation_buy_date')->nullable()->after('customer_name');
        });

        // Update the status enum column in mysql
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE sales MODIFY COLUMN status ENUM('readied', 'completed', 'cancelled', 'reserved') NOT NULL DEFAULT 'readied'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['customer_name', 'reservation_buy_date']);
        });

        \Illuminate\Support\Facades\DB::statement("ALTER TABLE sales MODIFY COLUMN status ENUM('readied', 'completed', 'cancelled') NOT NULL DEFAULT 'readied'");
    }
};
