<?php

namespace App\Http\Controllers;

use App\Models\ServiceFee;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class ServiceFeeController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if (!$branchId) {
            abort(403, 'User does not belong to a branch or active branch not selected');
        }

        $query = ServiceFee::with('creator')
            ->where('branch_id', $branchId)
            ->latest();

        // Search Filter (for historical list)
        if ($request->query('search')) {
            $search = $request->query('search');
            $query->where('name', 'like', "%{$search}%");
        }

        // Date Filters (for historical list)
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');

        if ($dateFrom) {
            $query->where('created_at', '>=', Carbon::parse($dateFrom)->startOfDay());
        }
        if ($dateTo) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        $serviceFees = $query->paginate(10)->withQueryString();

        // Today's service fees (resets at midnight - created on the current calendar date)
        $todayFees = ServiceFee::with('creator')
            ->where('branch_id', $branchId)
            ->whereDate('created_at', Carbon::today())
            ->latest()
            ->get();

        $todayFeesSum = $todayFees->sum('amount');

        return Inertia::render('Sales/ServiceFees', [
            'serviceFees' => $serviceFees,
            'todayFees' => $todayFees,
            'todayFeesSum' => (float)$todayFeesSum,
            'filters' => $request->only(['search', 'date_from', 'date_to']),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
        ]);

        $user = auth()->user();
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if (!$branchId) {
            abort(403, 'User does not belong to a branch or active branch not selected');
        }

        ServiceFee::create([
            'branch_id' => $branchId,
            'name' => $request->name,
            'amount' => $request->amount,
            'created_by' => $user->id,
        ]);

        return redirect()->back()->with('success', 'Service fee logged successfully.');
    }

    public function destroy(ServiceFee $serviceFee)
    {
        $user = auth()->user();
        $branchId = ($user->hasRole('System Administrator') && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if ($serviceFee->branch_id !== $branchId) {
            abort(403, 'Unauthorized to delete this service fee');
        }

        $serviceFee->delete();

        return redirect()->back()->with('success', 'Service fee deleted successfully.');
    }
}
