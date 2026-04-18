<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (config('nativephp-internal.running')) {
            $defaultConnection = env('DB_CONNECTION', 'mysql');
            config([
                'database.connections.nativephp' => config("database.connections.{$defaultConnection}")
            ]);
            \Illuminate\Support\Facades\DB::purge('nativephp');
        }
    }
}
