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
        Schema::table('brands', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->dropUnique(['slug']);
            $table->unique(['name', 'branch_id']);
            $table->unique(['slug', 'branch_id']);
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->dropUnique(['slug']);
            $table->unique(['name', 'branch_id']);
            $table->unique(['slug', 'branch_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            $table->dropUnique(['name', 'branch_id']);
            $table->dropUnique(['slug', 'branch_id']);
            $table->unique('name');
            $table->unique('slug');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['name', 'branch_id']);
            $table->dropUnique(['slug', 'branch_id']);
            $table->unique('name');
            $table->unique('slug');
        });
    }
};
