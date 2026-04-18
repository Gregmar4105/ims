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
            \Native\Mobile\Facades\PushNotifications::enroll();
        }
    }

    public function register(): void
    {
        //
    }
}
