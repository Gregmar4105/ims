<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mobile Baseline Migration
 *
 * This is the ONLY migration that runs on the NativePHP Android device.
 * It creates just enough tables for Laravel to boot correctly.
 *
 * All app data (products, sales, branches, etc.) comes from the remote
 * REST API at https://lm2bicycletrading.larable.dev — NOT from local DB.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Users / Auth / Sessions ──────────────────────────────────────────
        // Needed so Laravel's session/auth system can function locally.
        // The mobile app user logs in via the REMOTE API and stores a token
        // in the local settings file — but Laravel still needs these tables.
        if (! Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password')->nullable(); // nullable — auth is via remote API token
                $table->rememberToken();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        if (! Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }

        // ── Cache ────────────────────────────────────────────────────────────
        // Used to cache API responses locally for offline resilience.
        if (! Schema::hasTable('cache')) {
            Schema::create('cache', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->mediumText('value');
                $table->integer('expiration');
            });
        }

        if (! Schema::hasTable('cache_locks')) {
            Schema::create('cache_locks', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->string('owner');
                $table->integer('expiration');
            });
        }

        // ── Jobs ─────────────────────────────────────────────────────────────
        // Needed in case queue driver is not fully set to sync.
        if (! Schema::hasTable('jobs')) {
            Schema::create('jobs', function (Blueprint $table) {
                $table->id();
                $table->string('queue')->index();
                $table->longText('payload');
                $table->unsignedTinyInteger('attempts');
                $table->unsignedInteger('reserved_at')->nullable();
                $table->unsignedInteger('available_at');
                $table->unsignedInteger('created_at');
            });
        }

        if (! Schema::hasTable('failed_jobs')) {
            Schema::create('failed_jobs', function (Blueprint $table) {
                $table->id();
                $table->string('uuid')->unique();
                $table->text('connection');
                $table->text('queue');
                $table->longText('payload');
                $table->longText('exception');
                $table->timestamp('failed_at')->useCurrent();
            });
        }

        // ── Mobile API Config ─────────────────────────────────────────────────
        // Key-value store for the app's local settings (API URL, cached token, etc.)
        if (! Schema::hasTable('mobile_settings')) {
            Schema::create('mobile_settings', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->text('value')->nullable();
                $table->timestamps();
            });

            // Seed the default remote server URL
            \Illuminate\Support\Facades\DB::table('mobile_settings')->insert([
                ['key' => 'server_url', 'value' => 'https://lm2bicycletrading.larable.dev', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'api_token',  'value' => null, 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'auth_user',  'value' => null, 'created_at' => now(), 'updated_at' => now()],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('mobile_settings');
        Schema::dropIfExists('failed_jobs');
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
