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
        Schema::table('transfers', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            // We make source_branch_id nullable if it's not already, or we handle it in logic.
            // Assuming source_branch_id is already nullable or we need to make it nullable?
            // Let's check the previous migration content for transfers if possible, but safely we can just add supplier_id.
            $table->foreignId('source_branch_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transfers', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropColumn('supplier_id');
            // We can't easily revert source_branch_id to not null without knowing if data violates it, so we leave it.
        });
    }
};
