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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'user_status')) {
                $table->string('user_status', 10)->default('Active')->after('email_verified_at');
            }
            if (!Schema::hasColumn('users', 'branch_id')) {
                $table->unsignedBigInteger('branch_id')->nullable()->after('user_status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'branch_id')) {
                $table->dropColumn('branch_id');
            }
            if (Schema::hasColumn('users', 'user_status')) {
                $table->dropColumn('user_status');
            }
        });
    }
};
