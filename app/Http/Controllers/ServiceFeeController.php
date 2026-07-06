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

        $query = ServiceFee::with(['creator', 'sale'])
            ->where('branch_id', $branchId)
            ->where(function ($q) {
                $q->whereNull('sale_id')
                  ->orWhereHas('sale', function ($sq) {
                      $sq->whereIn('status', ['completed', 'reserved']);
                  });
            })
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

        // Payment Method Filter
        $paymentMethod = $request->query('payment_method');
        if ($paymentMethod && $paymentMethod !== 'all') {
            $query->where('payment_method', $paymentMethod);
        }

        $serviceFees = $query->paginate(10)->withQueryString();

        // Today's service fees (resets at midnight - created on the current calendar date)
        $todayFees = ServiceFee::with(['creator', 'sale'])
            ->where('branch_id', $branchId)
            ->whereDate('created_at', Carbon::today())
            ->where(function ($q) {
                $q->whereNull('sale_id')
                  ->orWhereHas('sale', function ($sq) {
                      $sq->whereIn('status', ['completed', 'reserved']);
                  });
            })
            ->latest()
            ->get();

        $todayFeesSum = $todayFees->sum('amount');

        return Inertia::render('Sales/ServiceFees', [
            'serviceFees' => $serviceFees,
            'todayFees' => $todayFees,
            'todayFeesSum' => (float)$todayFeesSum,
            'filters' => $request->only(['search', 'date_from', 'date_to', 'payment_method']),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,e-wallet,split_bill',
            'cash_received' => 'required_if:payment_method,split_bill|nullable|numeric|min:0',
            'split_ewallet_amount' => 'required_if:payment_method,split_bill|nullable|numeric|min:0',
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
            'payment_method' => $request->payment_method,
            'cash_received' => $request->payment_method === 'split_bill' ? $request->cash_received : null,
            'split_ewallet_amount' => $request->payment_method === 'split_bill' ? $request->split_ewallet_amount : null,
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

    public function deleteAll(Request $request)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        if (!$isSystemAdmin) {
            abort(403, 'Unauthorized action. Only System Administrators can delete all service fees.');
        }

        $branchId = (session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if (!$branchId) {
            return back()->with('error', 'No active branch selected.');
        }

        ServiceFee::where('branch_id', $branchId)->delete();

        return redirect()->back()->with('success', 'All service fees for this branch have been deleted successfully.');
    }
}
