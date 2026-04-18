<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Config;

class NativeAppServiceProvider extends ServiceProvider
{
    /**
     * Executed once the native mobile application has been booted.
     * Configure app-specific settings for the Android/iOS environment.
     */
    public function boot(): void
    {
        // Force SQLite for the mobile app's local database
        Config::set('database.default', 'sqlite');
        Config::set('database.connections.sqlite.database', database_path('database.sqlite'));

        // Disable broadcasting/reverb on mobile (no WebSocket server on-device)
        Config::set('broadcasting.default', 'null');

        // Disable queue workers (sync mode is fine for mobile)
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
