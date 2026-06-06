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
        Schema::table('sale_returns', function (Blueprint $table) {
            $table->string('return_type')->default('refund')->after('reason'); // 'refund' or 'exchange'
            $table->foreignId('replacement_product_id')->nullable()->constrained('products')->onDelete('set null')->after('return_type');
            $table->integer('replacement_quantity')->nullable()->after('replacement_product_id');
            $table->decimal('refund_amount', 10, 2)->default(0.00)->after('replacement_quantity');
            $table->boolean('restored_to_inventory')->default(true)->after('refund_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sale_returns', function (Blueprint $table) {
            $table->dropForeign(['replacement_product_id']);
            $table->dropColumn([
                'return_type',
                'replacement_product_id',
                'replacement_quantity',
                'refund_amount',
                'restored_to_inventory',
            ]);
        });
    }
};
