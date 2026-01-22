<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Transfer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployeeDashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        
        $preparedSales = Sale::where('status', 'readied')
            ->where('branch_id', $user->branch_id)
            ->with(['readiedBy', 'items.product'])
            ->latest()
            ->get();

        $readiedTransfers = Transfer::where('status', 'readied')
            ->where('source_branch_id', $user->branch_id)
            ->with(['destinationBranch', 'items.product'])
            ->latest()
            ->get();

        return Inertia::render('EmployeeDashboard', [
            'preparedSales' => $preparedSales,
            'readiedTransfers' => $readiedTransfers,
        ]);
    }
}
