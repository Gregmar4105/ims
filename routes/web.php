<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\QrAndBarcodeController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', [\App\Http\Controllers\WelcomeController::class, 'index'])->name('home');
Route::get('/shop', [\App\Http\Controllers\ShopController::class, 'index'])->name('shop.index'); // Search/Index route
Route::get('/shop/suggestions', [\App\Http\Controllers\ShopController::class, 'suggestions'])->name('shop.suggestions'); // Live Search Suggestions
Route::get('/shop/{slug}', [\App\Http\Controllers\ShopController::class, 'show'])->name('shop.category');
Route::get('/product/{product}', [\App\Http\Controllers\WelcomeController::class, 'show'])->name('product.show');
Route::get('/locations', [\App\Http\Controllers\BranchController::class, 'locations'])->name('locations.index');

Route::get('/suppliers', [\App\Http\Controllers\SupplierPortalController::class, 'index'])->name('suppliers.portal');
Route::post('/suppliers/send', [\App\Http\Controllers\SupplierPortalController::class, 'store'])->name('suppliers.send');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('system-dashboard', [\App\Http\Controllers\SystemDashboardController::class, 'index'])
        ->name('system.dashboard')->middleware('role:System Administrator');

    // Personalization Routes
    Route::get('personalization', [\App\Http\Controllers\PersonalizationController::class, 'index'])
        ->name('personalization.index')->middleware('role:System Administrator');
    Route::post('personalization/banner', [\App\Http\Controllers\PersonalizationController::class, 'updateBanner'])
        ->name('personalization.banner')->middleware('role:System Administrator');
    Route::post('personalization/banner/reset', [\App\Http\Controllers\PersonalizationController::class, 'resetBanner'])
        ->name('personalization.banner.reset')->middleware('role:System Administrator');

    Route::prefix('system-dashboard/api')->name('system.dashboard.')->middleware(['role:System Administrator'])->group(function () {
        Route::get('/stats', [\App\Http\Controllers\SystemDashboardController::class, 'getData'])->name('stats');
        Route::post('/shutdown', [\App\Http\Controllers\SystemDashboardController::class, 'shutdown'])->name('shutdown');
        Route::post('/schedule', [\App\Http\Controllers\SystemDashboardController::class, 'scheduleShutdown'])->name('schedule');
        Route::get('/schedules', [\App\Http\Controllers\SystemDashboardController::class, 'getSchedules'])->name('schedules');
        Route::post('/schedules/{command}/cancel', [\App\Http\Controllers\SystemDashboardController::class, 'cancelSchedule'])->name('cancel');
    });
    Route::get('branch-dashboard', [\App\Http\Controllers\BranchDashboardController::class, 'index'])
        ->name('branch.dashboard');
    Route::get('employee-dashboard', [\App\Http\Controllers\EmployeeDashboardController::class, 'index'])
        ->name('employee.dashboard')->middleware('role:Employee');

    Route::get('users' , [UserController::class , 'index'])->name('users.index');
    Route::get('users.create' , [UserController::class , 'create'])->name('users.create');
    Route::post('users.store' , [UserController::class , 'store'])->name('users.store');
    Route::get('users.edit/{user}', [UserController::class, 'edit'])->name('users.edit');
    Route::put('users.update/{user}', [UserController::class, 'update'])->name('users.update');
    Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

    // Role Management Routes
    Route::resource('roles', \App\Http\Controllers\RoleController::class);
    Route::resource('permissions', \App\Http\Controllers\PermissionController::class);
    Route::resource('branches', \App\Http\Controllers\BranchController::class);
    Route::resource('brands', \App\Http\Controllers\BrandController::class);
    Route::resource('categories', \App\Http\Controllers\CategoryController::class);
    Route::resource('qr-barcodes', \App\Http\Controllers\QrBarcodeController::class)->only(['index', 'store']);
    Route::resource('products', \App\Http\Controllers\ProductController::class);
    Route::resource('product-suppliers', \App\Http\Controllers\SupplierController::class)->parameters(['product-suppliers' => 'supplier']);

    Route::get('qr-and-barcode-scanner' , [QrAndBarcodeController::class, 'index']);
    


    Route::get('outgoing', [\App\Http\Controllers\TransferController::class, 'outgoing'])->name('transfers.outgoing');
    Route::get('transfers/create', [\App\Http\Controllers\TransferController::class, 'create'])->name('transfers.create');
    Route::post('transfers', [\App\Http\Controllers\TransferController::class, 'store'])->name('transfers.store');
    Route::post('transfers/{transfer}/reject', [\App\Http\Controllers\TransferController::class, 'reject'])->name('transfers.reject');
    Route::post('transfers/{transfer}/initiate', [\App\Http\Controllers\TransferController::class, 'initiate'])->name('transfers.initiate');
    Route::post('transfers/{transfer}/confirm', [\App\Http\Controllers\TransferController::class, 'confirmReceipt'])->name('transfers.confirm');
    Route::get('incoming', [\App\Http\Controllers\TransferController::class, 'incoming'])->name('transfers.incoming');
    Route::get('transfer-list', [\App\Http\Controllers\TransferController::class, 'index'])->name('transfers.index');
    Route::get('import-transfer', [\App\Http\Controllers\ImportTransferController::class, 'index'])->name('transfers.import');
    Route::post('import-transfer', [\App\Http\Controllers\ImportTransferController::class, 'store'])->name('transfers.import.store');

    // Sales routes
    Route::get('sales-list', [\App\Http\Controllers\SaleController::class, 'index'])->name('sales.index');
    Route::get('new-sales', [\App\Http\Controllers\SaleController::class, 'create'])->name('sales.create');
    Route::post('sales', [\App\Http\Controllers\SaleController::class, 'store'])->name('sales.store');
    Route::post('sales/lookup', [\App\Http\Controllers\SaleController::class, 'lookup'])->name('sales.lookup');
    Route::post('sales/{sale}/approve', [\App\Http\Controllers\SaleController::class, 'approve'])->name('sales.approve');
    Route::post('sales/{sale}/cancel', [\App\Http\Controllers\SaleController::class, 'cancel'])->name('sales.cancel');
    Route::get('return-items', [\App\Http\Controllers\SaleController::class, 'returns'])->name('sales.returns');
    Route::post('sale-returns', [\App\Http\Controllers\SaleController::class, 'storeReturn'])->name('sales.storeReturn');

    // Chat Routes
    Route::get('/chats', [App\Http\Controllers\ChatController::class, 'index'])->name('chats.index');
    Route::get('/chats/{branch}/media', [App\Http\Controllers\ChatController::class, 'media'])->name('chats.media'); // Specific route first
    Route::get('/chats/{branch}', [App\Http\Controllers\ChatController::class, 'show'])->name('chats.show');
    Route::post('/chats/{branch}', [App\Http\Controllers\ChatController::class, 'store'])->name('chats.store');
    Route::post('/user/onesignal-id', [App\Http\Controllers\ChatController::class, 'storeOneSignalId'])->name('user.onesignal.store');
    
    // Notification Route
    Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.index');
    
});

require __DIR__.'/settings.php';
