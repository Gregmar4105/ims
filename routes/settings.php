<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\BranchProfileController;
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;
use App\Http\Controllers\Settings\MobileApiSettingsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/branch-profile', [BranchProfileController::class, 'edit'])->name('branch-profile.edit');
    Route::post('settings/branch-profile', [BranchProfileController::class, 'update'])->name('branch-profile.update');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('user-password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance.edit');

    Route::get('settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])
        ->name('two-factor.show');

    // Mobile App / REST API Settings (NativePHP)
    Route::get('settings/mobile-api',          [MobileApiSettingsController::class, 'edit'])->name('mobile-api.edit');
    Route::post('settings/mobile-api',         [MobileApiSettingsController::class, 'update'])->name('mobile-api.update');
    Route::post('settings/mobile-api/token',   [MobileApiSettingsController::class, 'storeToken'])->name('mobile-api.token');
    Route::post('settings/mobile-api/disconnect', [MobileApiSettingsController::class, 'disconnect'])->name('mobile-api.disconnect');
    Route::get('settings/mobile-api/config',   [MobileApiSettingsController::class, 'getConfig'])->name('mobile-api.config');
});
