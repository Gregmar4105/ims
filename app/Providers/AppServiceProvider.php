<?php

namespace App\Providers;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * register() runs before ANY provider's boot(), making it the
     * correct place to override the database config for NativePHP mobile
     * so that nothing accidentally opens a MySQL connection on Android.
     */
    public function register(): void
    {
        if (config('nativephp-internal.running')) {
            // ── Force SQLite before anything touches the database ──────────
            $dbPath = database_path('database.sqlite');

            // Ensure the file exists (NativePHP may not create it on first boot)
            if (! file_exists($dbPath)) {
                @touch($dbPath);
            }

            Config::set('database.default', 'sqlite');
            Config::set('database.connections.sqlite.database', $dbPath);

            // Disable services that require a server
            Config::set('broadcasting.default', 'null');
            Config::set('queue.default', 'sync');
            Config::set('mail.default', 'log');
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (config('nativephp-internal.running')) {
            // Run ONLY the mobile baseline migrations (not the full app schema).
            // All app data (products, sales, branches) come from the remote API.
            $this->app->booted(function () {
                try {
                    Artisan::call('migrate', [
                        '--force' => true,
                        '--path'  => 'database/migrations/mobile',
                    ]);
                } catch (\Throwable $e) {
                    logger()->error('[NativePHP] Migration failed: ' . $e->getMessage());
                }
            });
        }
    }
}
