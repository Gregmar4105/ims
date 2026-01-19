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
        Schema::create('scheduled_commands', function (Blueprint $table) {
            $table->id();
            $table->string('command'); // e.g., 'shutdown'
            $table->string('target_servers'); // e.g., 'all', 'server1', 'server2'
            $table->timestamp('scheduled_at');
            $table->string('status')->default('pending'); // pending, completed, failed, cancelled
            $table->foreignId('user_id')->nullable()->constrained();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scheduled_commands');
    }
};
