<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Mobile\AuthController;
use App\Http\Controllers\Api\Mobile\DashboardController;
use App\Http\Controllers\Api\Mobile\ProductController;
use App\Http\Controllers\Api\Mobile\SaleController;
use App\Http\Controllers\Api\Mobile\TransferController;

/*
|--------------------------------------------------------------------------
| Mobile REST API Routes
|--------------------------------------------------------------------------
| These routes are consumed by the NativePHP Android app.
| Auth: Laravel Sanctum token-based authentication.
| Base URL: /api/mobile/
*/

// ── Public: Login / Token issuance ───────────────────────────────────────────
Route::prefix('mobile')->name('mobile.')->group(function () {

    Route::post('login',  [AuthController::class, 'login'])->name('login');
    Route::post('logout', [AuthController::class, 'logout'])
        ->middleware('auth:sanctum')
        ->name('logout');

    // ── Protected ────────────────────────────────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Auth / User
        Route::get('user', [AuthController::class, 'user'])->name('user');

        // Dashboard summary
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

        // Products
        Route::get('products',       [ProductController::class, 'index'])->name('products.index');
        Route::get('products/{id}',  [ProductController::class, 'show'])->name('products.show');
        Route::get('products/search/{query}', [ProductController::class, 'search'])->name('products.search');

        // Sales
        Route::get('sales',          [SaleController::class, 'index'])->name('sales.index');
        Route::get('sales/{id}',     [SaleController::class, 'show'])->name('sales.show');
        Route::post('sales',         [SaleController::class, 'store'])->name('sales.store');

        // Transfers
        Route::get('transfers',      [TransferController::class, 'index'])->name('transfers.index');
        Route::get('transfers/{id}', [TransferController::class, 'show'])->name('transfers.show');
        Route::post('transfers/{id}/confirm', [TransferController::class, 'confirm'])->name('transfers.confirm');

        // Sync: App pushes local data up to server
        Route::post('sync/push', [DashboardController::class, 'syncPush'])->name('sync.push');

        // Sync: App pulls latest data from server
        Route::get('sync/pull', [DashboardController::class, 'syncPull'])->name('sync.pull');
    });
});
