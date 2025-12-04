<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\QrAndBarcodeController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
    Route::get('system-dashboard', function () {
        return Inertia::render('SystemDashboard');
    })->name('system.dashboard')->middleware('role:System Administrator');
    Route::get('branch-dashboard', function () {
        return Inertia::render('BranchDashboard');
    })->name('branch.dashboard')->middleware('role:Branch Administrator');
    Route::get('employee-dashboard', function () {
        return Inertia::render('EmployeeDashboard');
    })->name('employee.dashboard')->middleware('role:Employee');

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

    Route::get('qr-and-barcode-scanner' , [QrAndBarcodeController::class, 'index']);
    
    Route::get('outgoing', [\App\Http\Controllers\TransferController::class, 'outgoing'])->name('transfers.outgoing');
    Route::get('transfers/create', [\App\Http\Controllers\TransferController::class, 'create'])->name('transfers.create');
    Route::post('transfers', [\App\Http\Controllers\TransferController::class, 'store'])->name('transfers.store');
    Route::post('transfers/{transfer}/reject', [\App\Http\Controllers\TransferController::class, 'reject'])->name('transfers.reject');
    Route::post('transfers/{transfer}/initiate', [\App\Http\Controllers\TransferController::class, 'initiate'])->name('transfers.initiate');
    Route::post('transfers/{transfer}/confirm', [\App\Http\Controllers\TransferController::class, 'confirmReceipt'])->name('transfers.confirm');
    Route::get('incoming', [\App\Http\Controllers\TransferController::class, 'incoming'])->name('transfers.incoming');
    Route::get('transfer-list', [\App\Http\Controllers\TransferController::class, 'index'])->name('transfers.index');

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
    Route::get('chats', [\App\Http\Controllers\ChatController::class, 'index'])->name('chats.index');
    Route::get('chats/{branch}', [\App\Http\Controllers\ChatController::class, 'show'])->name('chats.show');
    Route::post('chats/{branch}', [\App\Http\Controllers\ChatController::class, 'store'])->name('chats.store');
});

require __DIR__.'/settings.php';
