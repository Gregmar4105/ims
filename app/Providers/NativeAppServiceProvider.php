<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Artisan;

class NativeAppServiceProvider extends ServiceProvider
{
    /**
     * Executed once the native mobile application has been booted.
     * Configure app-specific settings for the Android/iOS environment.
     */
    public function boot(): void
    {
        // ── 1. Force SQLite for the on-device local database ───────────────
        Config::set('database.default', 'sqlite');

        $dbPath = database_path('database.sqlite');
        Config::set('database.connections.sqlite.database', $dbPath);

        // Create the SQLite file if it doesn't exist yet
        // (NativePHP may not create it automatically on first boot)
        if (! file_exists($dbPath)) {
            touch($dbPath);
        }

        // ── 2. Run all pending migrations on every boot ────────────────────
        // This is safe — migrate is idempotent (skips already-run migrations).
        // Ensures the DB schema is always up to date after an app update.
        try {
            Artisan::call('migrate', ['--force' => true]);
        } catch (\Throwable $e) {
            // Log but don't crash — app can still function for non-DB pages
            logger()->error('NativePHP migration failed: ' . $e->getMessage());
        }

        // ── 3. Disable services that require a server ─────────────────────
        Config::set('broadcasting.default', 'null');
        Config::set('queue.default', 'sync');
    }

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }
}
