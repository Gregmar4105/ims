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
        Schema::table('branches', function (Blueprint $table) {
            if (!Schema::hasColumn('branches', 'branch_name')) {
                $table->string('branch_name')->nullable();
            }
            if (!Schema::hasColumn('branches', 'location')) {
                $table->string('location')->nullable();
            }
            if (!Schema::hasColumn('branches', 'branch_status')) {
                $table->string('branch_status')->default('Active');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            //
        });
    }
};
