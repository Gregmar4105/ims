<?php

namespace App\Providers;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Schema;
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
            // ── Run migrations after ALL providers have fully booted ────────
            // app()->booted() is the safest time to call Artisan commands.
            $this->app->booted(function () {
                try {
                    // Only migrate if the schema is not already up to date.
                    // Schema::hasTable('users') is a quick check — if it
                    // doesn't exist we definitely need to migrate.
                    if (! Schema::hasTable('users') || $this->hasPendingMigrations()) {
                        Artisan::call('migrate', ['--force' => true]);
                    }
                } catch (\Throwable $e) {
                    logger()->error('[NativePHP] Migration failed: ' . $e->getMessage());
                }
            });
        }
    }

    /**
     * Check if there are any migrations that haven't been run yet.
     */
    private function hasPendingMigrations(): bool
    {
        try {
            $ran     = \Illuminate\Support\Facades\DB::table('migrations')->pluck('migration')->toArray();
            $files   = glob(database_path('migrations/*.php'));
            $pending = array_filter($files, function ($file) use ($ran) {
                return ! in_array(pathinfo($file, PATHINFO_FILENAME), $ran, true);
            });
            return count($pending) > 0;
        } catch (\Throwable) {
            return true; // Assume pending if we can't check
        }
    }
}
