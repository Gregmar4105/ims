<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class NativeAppServiceProvider extends ServiceProvider
{
    /**
     * Mobile-specific startup logic.
     * Database config and migrations are handled in AppServiceProvider,
     * which is registered in bootstrap/providers.php and runs first.
     */
    public function boot(): void
    {
        if (config('nativephp-internal.running')) {
            // Wait for the native bridge to be potentially ready
            $this->app->booted(function () {
                try {
                    \Native\Mobile\Facades\PushNotifications::enroll();
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("[NativePHP] Push enrollment failed: " . $e->getMessage());
                }
            });
        }
    }

    public function register(): void
    {
        //
    }
}
