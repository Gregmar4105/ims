<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\QrAndBarcodeController;
use App\Http\Controllers\ReorderController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

// ── Home route ────────────────────────────────────────────────────────────────
// On NativePHP Android: redirect to the mobile API settings page.
// On the web server: show the normal public welcome/shop page.
Route::get('/', function (\Illuminate\Http\Request $request) {
    if (preg_match('/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i', $request->userAgent())) {
        return redirect()->route('login');
    }
    return app(\App\Http\Controllers\WelcomeController::class)->index($request);
})->name('home');
Route::get('/shop', [\App\Http\Controllers\ShopController::class, 'index'])->name('shop.index'); // Search/Index route
Route::get('/shop/suggestions', [\App\Http\Controllers\ShopController::class, 'suggestions'])->name('shop.suggestions'); // Live Search Suggestions
Route::get('/shop/{slug}', [\App\Http\Controllers\ShopController::class, 'show'])->name('shop.category');
Route::get('/product/{product}', [\App\Http\Controllers\WelcomeController::class, 'show'])->name('product.show');
Route::get('/clearance-sale', [\App\Http\Controllers\WelcomeController::class, 'clearanceSale'])->name('clearance.index');
Route::get('/locations', [\App\Http\Controllers\BranchController::class, 'locations'])->name('locations.index');
Route::get('/downloads', [\App\Http\Controllers\DownloadController::class, 'index'])->name('downloads');

Route::get('/suppliers', [\App\Http\Controllers\SupplierPortalController::class, 'index'])->name('suppliers.portal');
Route::post('/suppliers/send', [\App\Http\Controllers\SupplierPortalController::class, 'store'])->name('suppliers.send');



Route::get('/api/local/sync-config', function (\Illuminate\Http\Request $request) {
    if (!config('nativephp-internal.running')) return response()->json(['error' => 'Not running on NativePHP'], 403);
    
    $url = $request->query('url');
    $token = $request->query('token');
    
    if ($url) \Illuminate\Support\Facades\DB::table('mobile_settings')->updateOrInsert(['key' => 'server_url'], ['value' => $url, 'updated_at' => now()]);
    if ($token) \Illuminate\Support\Facades\DB::table('mobile_settings')->updateOrInsert(['key' => 'api_token'], ['value' => $token, 'updated_at' => now()]);
    
    return response()->json(['success' => true]);
})->name('local.sync-config');

// ── Web App — Authenticated routes ─────────────────────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function (\Illuminate\Http\Request $request) {
        $user = auth()->user();
        if ($user->hasRole('System Administrator') || $user->hasRole('Branch Administrator')) {
            return redirect('/branch-dashboard');
        }
        if ($user->hasRole('Employee')) {
            return redirect('/employee-dashboard');
        }

        // If the user does not have any of the required roles, log them out
        // to prevent getting stuck in a 403 session redirection loop.
        auth()->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->withErrors([
            'email' => 'Your account does not have any roles assigned. Please contact your system administrator.',
        ]);
    })->name('dashboard');

    Route::get('system-dashboard', [\App\Http\Controllers\SystemDashboardController::class, 'index'])
        ->name('system.dashboard')->middleware('role:System Administrator');

    // Personalization Routes
    Route::get('personalization', [\App\Http\Controllers\PersonalizationController::class, 'index'])
        ->name('personalization.index')->middleware('role:System Administrator');
    Route::post('personalization/banner', [\App\Http\Controllers\PersonalizationController::class, 'updateBanner'])
        ->name('personalization.banner')->middleware('role:System Administrator');
    Route::post('personalization/banner/reset', [\App\Http\Controllers\PersonalizationController::class, 'resetBanner'])
        ->name('personalization.banner.reset')->middleware('role:System Administrator');
    Route::post('personalization/ringtone', [\App\Http\Controllers\PersonalizationController::class, 'updateRingtone'])
        ->name('personalization.ringtone')->middleware('role:System Administrator');
    Route::post('personalization/ringtone/reset', [\App\Http\Controllers\PersonalizationController::class, 'resetRingtone'])
        ->name('personalization.ringtone.reset')->middleware('role:System Administrator');

    Route::prefix('system-dashboard/api')->name('system.dashboard.')->middleware(['role:System Administrator'])->group(function () {
        Route::get('/stats', [\App\Http\Controllers\SystemDashboardController::class, 'getData'])->name('stats');
        Route::post('/shutdown', [\App\Http\Controllers\SystemDashboardController::class, 'shutdown'])->name('shutdown');
        Route::post('/schedule', [\App\Http\Controllers\SystemDashboardController::class, 'scheduleShutdown'])->name('schedule');
        Route::get('/schedules', [\App\Http\Controllers\SystemDashboardController::class, 'getSchedules'])->name('schedules');
        Route::post('/schedules/{command}/cancel', [\App\Http\Controllers\SystemDashboardController::class, 'cancelSchedule'])->name('cancel');
        Route::get('/cloudflare-stats', [\App\Http\Controllers\SystemDashboardController::class, 'getCloudflareStats'])->name('cloudflare-stats');
        Route::get('/entity-stats', [\App\Http\Controllers\SystemDashboardController::class, 'getSystemEntityStats'])->name('entity-stats');
    });
    Route::get('branch-dashboard', [\App\Http\Controllers\BranchDashboardController::class, 'index'])
        ->name('branch.dashboard');
    Route::get('branch-dashboard/api/products/search', [\App\Http\Controllers\BranchDashboardController::class, 'searchProducts'])->name('branch.dashboard.products.search');
    Route::get('branch-dashboard/api/products/{product}/distribution', [\App\Http\Controllers\BranchDashboardController::class, 'getProductDistribution'])->name('branch.dashboard.products.distribution');
    Route::get('branch-dashboard/api/pending-counts', [\App\Http\Controllers\BranchDashboardController::class, 'getPendingCounts'])->name('branch.dashboard.pending-counts');
    Route::get('employee-dashboard', [\App\Http\Controllers\EmployeeDashboardController::class, 'index'])
        ->name('employee.dashboard')->middleware('role:Employee');

    Route::get('users' , [UserController::class , 'index'])->name('users.index');
    Route::get('users.create' , [UserController::class , 'create'])->name('users.create');
    Route::post('users.store' , [UserController::class , 'store'])->name('users.store');
    Route::get('users.edit/{user}', [UserController::class, 'edit'])->name('users.edit');
    Route::put('users.update/{user}', [UserController::class, 'update'])->name('users.update');
    Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

    // Role Management Routes
    Route::resource('roles', \App\Http\Controllers\RoleController::class)->middleware('password.confirm');
    Route::resource('permissions', \App\Http\Controllers\PermissionController::class)->middleware('password.confirm');
    // Protected Resources (Read-only for Employees)
    Route::middleware(['restrict.employee'])->group(function () {
        Route::post('branches/switch', [\App\Http\Controllers\BranchController::class, 'switch'])->name('branches.switch');
        Route::resource('branches', \App\Http\Controllers\BranchController::class);
        Route::resource('brands', \App\Http\Controllers\BrandController::class);
        Route::resource('categories', \App\Http\Controllers\CategoryController::class);
        Route::get('qr-barcodes', [\App\Http\Controllers\QrBarcodeController::class, 'index'])->name('qr-barcodes.index');
        Route::post('qr-barcodes', [\App\Http\Controllers\QrBarcodeController::class, 'store'])->name('qr-barcodes.store');
        Route::get('products/print', [\App\Http\Controllers\ProductController::class, 'print'])->name('products.print');
        Route::post('products/bulk-destroy', [\App\Http\Controllers\ProductController::class, 'bulkDestroy'])->name('products.bulk-destroy');
        Route::post('products/bulk-clearance', [\App\Http\Controllers\ProductController::class, 'bulkClearanceSale'])->name('products.bulk-clearance');
        Route::post('products/{product}/toggle-status', [\App\Http\Controllers\ProductController::class, 'toggleStatus'])->name('products.toggleStatus');
        
        // Temporary Photo Upload Routes
        Route::get('temporary-photo-product-upload', [\App\Http\Controllers\TemporaryPhotoUploadController::class, 'index'])->name('products.temporary-upload');
        Route::get('api/products/search-for-upload', [\App\Http\Controllers\TemporaryPhotoUploadController::class, 'search'])->name('products.search-for-upload');
        Route::get('api/products/missing-photos-count', [\App\Http\Controllers\TemporaryPhotoUploadController::class, 'missingStats'])->name('products.missing-photos-count');
        Route::post('api/products/bulk-photo-update', [\App\Http\Controllers\TemporaryPhotoUploadController::class, 'update'])->name('products.bulk-photo-update');

        // Drag and Drop Upload Routes
        Route::get('drag-and-drop-product-upload', [\App\Http\Controllers\DragAndDropUploadController::class, 'index'])->name('products.drag-and-drop-upload');
        Route::post('api/products/bulk-create', [\App\Http\Controllers\DragAndDropUploadController::class, 'store'])->name('api.products.bulk-create');
        Route::post('api/products/validate-field', [\App\Http\Controllers\DragAndDropUploadController::class, 'validateField'])->name('api.products.validate-field');
        Route::get('api/products/details', [\App\Http\Controllers\DragAndDropUploadController::class, 'getDetails'])->name('api.products.details');

        // Search API for Autocomplete
        Route::get('api/brands/search', [\App\Http\Controllers\BrandController::class, 'search'])->name('brands.search');
        Route::get('api/categories/search', [\App\Http\Controllers\CategoryController::class, 'search'])->name('categories.search');
        Route::get('api/suppliers/search', [\App\Http\Controllers\SupplierController::class, 'search'])->name('suppliers.search');

        Route::get('api/products/search', [\App\Http\Controllers\ProductController::class, 'search'])->name('products.search');
        Route::get('products/{product}/search-printer-app', [\App\Http\Controllers\ProductController::class, 'searchPrinterApp'])->name('products.search-printer-app');
        Route::post('products/{product}/print-ddl', [\App\Http\Controllers\ProductController::class, 'printDdl'])->name('products.print-ddl');
        Route::resource('products', \App\Http\Controllers\ProductController::class);
        Route::resource('product-suppliers', \App\Http\Controllers\SupplierController::class)->parameters(['product-suppliers' => 'supplier']);
    });

    // Employee Internal Branch Chat Routes (Requires POST access)
    Route::middleware(['role:Employee'])->group(function () {
        Route::get('branch-chats', [\App\Http\Controllers\BranchChatController::class, 'index'])->name('branch-chats.index');
        Route::get('branch-chats/messages', [\App\Http\Controllers\BranchChatController::class, 'show'])->name('branch-chats.show');
        Route::post('branch-chats/messages', [\App\Http\Controllers\BranchChatController::class, 'store'])->name('branch-chats.store');
        Route::get('branch-chats/media', [\App\Http\Controllers\BranchChatController::class, 'media'])->name('branch-chats.media');
    });

    Route::get('qr-and-barcode-scanner' , [QrAndBarcodeController::class, 'index']);
    


    Route::get('outgoing', [\App\Http\Controllers\TransferController::class, 'outgoing'])->name('transfers.outgoing');
    Route::get('transfers/create', [\App\Http\Controllers\TransferController::class, 'create'])->name('transfers.create');
    Route::post('transfers', [\App\Http\Controllers\TransferController::class, 'store'])->name('transfers.store');
    Route::post('transfers/{transfer}/reject', [\App\Http\Controllers\TransferController::class, 'reject'])->name('transfers.reject');
    Route::post('transfers/{transfer}/initiate', [\App\Http\Controllers\TransferController::class, 'initiate'])->name('transfers.initiate');
    Route::post('transfers/{transfer}/confirm', [\App\Http\Controllers\TransferController::class, 'confirmReceipt'])->name('transfers.confirm');
    Route::get('incoming', [\App\Http\Controllers\TransferController::class, 'incoming'])->name('transfers.incoming');
    Route::get('transfer-list', [\App\Http\Controllers\TransferController::class, 'index'])->name('transfers.index');
    Route::get('transfer-list/print', [\App\Http\Controllers\TransferController::class, 'printList'])->name('transfers.printList');
    Route::get('transfers/{transfer}/print', [\App\Http\Controllers\TransferController::class, 'printItem'])->name('transfers.printItem');
    Route::get('import-transfer', [\App\Http\Controllers\ImportTransferController::class, 'index'])->name('transfers.import');
    Route::post('import-transfer', [\App\Http\Controllers\ImportTransferController::class, 'store'])->name('transfers.import.store');
    Route::post('import-transfer/parse-file', [\App\Http\Controllers\ImportTransferController::class, 'parseFile'])->name('transfers.import.parseFile');
    Route::post('import-transfer/update-stock', [\App\Http\Controllers\ImportTransferController::class, 'updateStock'])->name('transfers.import.updateStock');
    Route::post('import-transfer/bulk-store', [\App\Http\Controllers\ImportTransferController::class, 'bulkStore'])->name('transfers.import.bulkStore');
    Route::get('api/branches/{branch}/users', [\App\Http\Controllers\BranchController::class, 'getUsers'])->name('branches.users');

    // Sales routes
    Route::get('sales-list', [\App\Http\Controllers\SaleController::class, 'index'])->name('sales.index');
    Route::get('sales-list/print', [\App\Http\Controllers\SaleController::class, 'printList'])->name('sales.printList');
    Route::get('sales/{sale}/print', [\App\Http\Controllers\SaleController::class, 'printItem'])->name('sales.printItem');
    Route::get('new-sales', [\App\Http\Controllers\SaleController::class, 'create'])->name('sales.create');
    Route::post('sales', [\App\Http\Controllers\SaleController::class, 'store'])->name('sales.store');
    Route::get('api/sales/search-products', [\App\Http\Controllers\SaleController::class, 'search'])->name('api.sales.search');
    Route::post('sales/lookup', [\App\Http\Controllers\SaleController::class, 'lookup'])->name('sales.lookup');
    Route::post('sales/{sale}/approve', [\App\Http\Controllers\SaleController::class, 'approve'])->name('sales.approve');
    Route::post('sales/{sale}/cancel', [\App\Http\Controllers\SaleController::class, 'cancel'])->name('sales.cancel');
    Route::get('return-items', [\App\Http\Controllers\SaleController::class, 'returns'])->name('sales.returns');
    Route::post('sale-returns', [\App\Http\Controllers\SaleController::class, 'storeReturn'])->name('sales.storeReturn');

    // Expense Tracker routes
    Route::get('expense-tracker', [\App\Http\Controllers\ExpenseController::class, 'index'])->name('expenses.index');
    Route::post('expense-tracker', [\App\Http\Controllers\ExpenseController::class, 'store'])->name('expenses.store');
    Route::delete('expense-tracker/{expense}', [\App\Http\Controllers\ExpenseController::class, 'destroy'])->name('expenses.destroy');

    // Service Fee routes
    Route::get('service-fees', [\App\Http\Controllers\ServiceFeeController::class, 'index'])->name('service-fees.index');
    Route::post('service-fees', [\App\Http\Controllers\ServiceFeeController::class, 'store'])->name('service-fees.store');
    Route::delete('service-fees/{serviceFee}', [\App\Http\Controllers\ServiceFeeController::class, 'destroy'])->name('service-fees.destroy');

    // End of Day route
    Route::get('end-of-day', function () {
        return Inertia::render('Sales/EndOfDay');
    })->name('end-of-day');

    // Chat Routes
    Route::get('/chats/total-unread', [App\Http\Controllers\ChatController::class, 'totalUnreadCount'])->name('chats.total-unread');
    Route::get('/chats/branches/status', [App\Http\Controllers\ChatController::class, 'branchesStatus'])->name('chats.branches-status');
    Route::get('/chats', [App\Http\Controllers\ChatController::class, 'index'])->name('chats.index');
    Route::get('/chats/{branch}/media', [App\Http\Controllers\ChatController::class, 'media'])->name('chats.media'); // Specific route first
    Route::get('/chats/{branch}', [App\Http\Controllers\ChatController::class, 'show'])->name('chats.show');
    Route::post('/chats/{branch}', [App\Http\Controllers\ChatController::class, 'store'])->name('chats.store');
    Route::post('/user/onesignal-id', [App\Http\Controllers\ChatController::class, 'storeOneSignalId'])->name('user.onesignal.store');

    // Push Notification Test (sends via OneSignal to current user's device)
    Route::post('/push-notification/test', function (\Illuminate\Http\Request $request) {
        $user = auth()->user();
        $playerId = $user->onesignal_player_id;

        if (!$playerId) {
            return response()->json(['error' => 'No OneSignal Player ID registered for your account.'], 400);
        }

        try {
            $oneSignal = app(\App\Services\OneSignalService::class);
            $response = $oneSignal->sendNotification(
                'This is a test push notification from LM2!',
                [$playerId],
                '🔔 Test Notification',
                ['type' => 'push_test']
            );
            return response()->json(['message' => 'Test notification sent!', 'response' => $response]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Push test failed: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to send: ' . $e->getMessage()], 500);
        }
    })->name('push-notification.test');
    
    // Notification Route
    Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/mark-read', [\App\Http\Controllers\NotificationController::class, 'markAsRead'])->name('notifications.markRead');
    Route::post('/notifications/mark-all-read', [\App\Http\Controllers\NotificationController::class, 'markAllAsRead'])->name('notifications.markAllRead');
    Route::get('/notifications-view', [\App\Http\Controllers\NotificationController::class, 'view'])->name('notifications.view');
    
    Route::get('/reorders', [ReorderController::class, 'index'])->name('reorders.index');
    Route::get('/request-orders', [\App\Http\Controllers\RequestOrderController::class, 'index'])->name('request-orders.index');
    Route::post('/request-orders', [\App\Http\Controllers\RequestOrderController::class, 'store'])->name('request-orders.store');
    
    // Google Sheets Sync
    Route::post('/google-sheets/sync-all', [\App\Http\Controllers\GoogleSheetsSyncController::class, 'syncAll'])->name('google-sheets.sync-all');
    Route::get('/google-sheets/pull-compare', [\App\Http\Controllers\GoogleSheetsSyncController::class, 'pullAndCompare'])->name('google-sheets.pull-compare');
    Route::post('/google-sheets/pull-save', [\App\Http\Controllers\GoogleSheetsSyncController::class, 'savePulled'])->name('google-sheets.pull-save');
    Route::post('/google-sheets/reject-row', [\App\Http\Controllers\GoogleSheetsSyncController::class, 'rejectRow'])->name('google-sheets.reject-row');

    // More actions page route
    Route::get('/more', function () {
        return Inertia::render('More');
    })->name('more');
});

// Public Status Endpoint (used for health monitoring)
Route::get('/api/server-status', function () {
    return response()->json([
        'status' => 'online',
        'timestamp' => now()->toIso8601String(),
        'signature' => 'LM2-LIVE-SERVER-' . config('app.key'),
    ])->header('Cache-Control', 'no-cache, no-store, must-revalidate');
});

require __DIR__.'/settings.php';
