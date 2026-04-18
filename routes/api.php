<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Mobile\AuthController;
use App\Http\Controllers\Api\Mobile\DashboardController;
use App\Http\Controllers\Api\Mobile\ProductController;
use App\Http\Controllers\Api\Mobile\SaleController;
use App\Http\Controllers\Api\Mobile\TransferController;
use App\Http\Controllers\Api\Mobile\SystemDashboardController;
use App\Http\Controllers\Api\Mobile\UserController;
use App\Http\Controllers\Api\Mobile\RoleController;
use App\Http\Controllers\Api\Mobile\PermissionController;
use App\Http\Controllers\Api\Mobile\BranchController;
use App\Http\Controllers\Api\Mobile\BrandController;
use App\Http\Controllers\Api\Mobile\CategoryController;
use App\Http\Controllers\Api\Mobile\ChatController;
use App\Http\Controllers\Api\Mobile\NotificationController;
use App\Http\Controllers\Api\Mobile\ReorderController;

/*
|--------------------------------------------------------------------------
| Mobile REST API Routes
|--------------------------------------------------------------------------
| These routes are consumed by the NativePHP Android app.
| Auth: Laravel Sanctum token-based authentication.
| Base URL: /api/mobile/
*/

Route::prefix('mobile')->name('mobile.')->group(function () {

    // ── Public: Login / Token issuance ───────────────────────────────────────────
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

        // ── System Administrator Only ───────────────────────────────────────────
        Route::middleware('role:System Administrator')->group(function () {
            // System Dashboard Stats
            Route::get('system-dashboard/stats', [SystemDashboardController::class, 'getData'])->name('system.dashboard.stats');
            
            // Users Management
            Route::apiResource('users', UserController::class);

            // Roles & Permissions
            Route::apiResource('roles', RoleController::class);
            Route::apiResource('permissions', PermissionController::class);
        });

        // ── Read-only for Employees (or Restricted) ──────────────────────────────
        Route::middleware('restrict.employee')->group(function () {
            Route::apiResource('branches', BranchController::class);
            Route::apiResource('brands', BrandController::class);
            Route::apiResource('categories', CategoryController::class);
        });

        // ── Products ─────────────────────────────────────────────────────────────
        Route::middleware('restrict.employee')->group(function () {
            Route::get('products',       [ProductController::class, 'index'])->name('products.index');
            Route::get('products/{product}',  [ProductController::class, 'show'])->name('products.show');
        });
        Route::get('products/search/{query}', [ProductController::class, 'search'])->name('products.search');

        // ── Sales ────────────────────────────────────────────────────────────────
        Route::get('sales',          [SaleController::class, 'index'])->name('sales.index');
        Route::get('sales/{sale}',     [SaleController::class, 'show'])->name('sales.show');
        Route::post('sales',         [SaleController::class, 'store'])->name('sales.store');
        Route::post('sales/{sale}/approve', [SaleController::class, 'approve'])->name('sales.approve');
        Route::post('sales/{sale}/cancel', [SaleController::class, 'cancel'])->name('sales.cancel');

        // ── Transfers ────────────────────────────────────────────────────────────
        Route::get('transfers',      [TransferController::class, 'index'])->name('transfers.index');
        Route::get('transfers/{transfer}', [TransferController::class, 'show'])->name('transfers.show');
        Route::post('transfers/{transfer}/confirm', [TransferController::class, 'confirm'])->name('transfers.confirm');
        Route::post('transfers', [TransferController::class, 'store'])->name('transfers.store');
        
        // ── Chats & Notifications ────────────────────────────────────────────────
        Route::middleware('role:Employee')->group(function () {
            Route::get('branch-chats', [ChatController::class, 'indexBranch'])->name('branch-chats.index');
            Route::post('branch-chats/messages', [ChatController::class, 'storeMessage'])->name('branch-chats.store');
        });

        Route::get('chats', [ChatController::class, 'index'])->name('chats.index');
        Route::get('chats/{branch}', [ChatController::class, 'show'])->name('chats.show');
        Route::post('chats/{branch}', [ChatController::class, 'store'])->name('chats.store');

        Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::post('notifications/mark-read', [NotificationController::class, 'markAsRead'])->name('notifications.markRead');
        Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.markAllRead');

        Route::get('reorders', [ReorderController::class, 'index'])->name('reorders.index');

        // ── Sync: App pushes/pulls data ─────────────────────────────────────────
        Route::post('sync/push', [DashboardController::class, 'syncPush'])->name('sync.push');
        Route::get('sync/pull', [DashboardController::class, 'syncPull'])->name('sync.pull');
    });
});
