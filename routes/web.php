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

    Route::get('qr-and-barcode-scanner' , [QrAndBarcodeController::class, 'index']);
});

require __DIR__.'/settings.php';
