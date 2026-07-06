<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Branch;
use App\Models\Transfer;
use App\Models\TransferItem;
use App\Models\Message;
use App\Events\MessageSent;
use App\Services\OneSignalService;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RequestOrderController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $search = $request->query('search');
        $filterBrand = $request->query('brand');
        $filterCategory = $request->query('category');

        // Query products that are present in LM2 Main Bodega (Branch ID = 1)
        $query = Product::with(['brand', 'category', 'creator', 'supplier', 'branches'])
            ->whereHas('branches', function ($q) {
                $q->where('branches.id', 1);
            });

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('barcode', $search)
                  ->orWhere('qr_code', $search)
                  ->orWhere('sku', $search)
                  ->orWhere('code', $search)
                  ->orWhere('code_2', $search)
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($filterBrand && $filterBrand !== 'all') {
            $query->whereHas('brand', function ($q) use ($filterBrand) {
                $q->where('name', $filterBrand);
            });
        }

        if ($filterCategory && $filterCategory !== 'all') {
            $query->whereHas('category', function ($q) use ($filterCategory) {
                $q->where('name', 'like', "{$filterCategory}%");
            });
        }

        $products = $query->latest()->paginate(12)->withQueryString();

        // Transform collections to contain LM2 Main Bodega stock quantity and location
        $products->getCollection()->transform(function ($product) {
            $branchData = $product->branches->firstWhere('id', 1);
            $product->quantity = $branchData ? $branchData->pivot->quantity : 0;
            $product->physical_location = $branchData ? $branchData->pivot->physical_location : null;
            return $product;
        });

        // Get options for filters
        $brands = Brand::where('status', 'Active')->pluck('name')->unique()->values();
        $categories = Category::where('status', 'Active')->pluck('name')->unique()->values();

        // Check active branch for title / visual purposes
        $branchId = ($isSystemAdmin && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        $requestingBranch = $branchId ? Branch::find($branchId) : null;

        return Inertia::render('Products/RequestOrders', [
            'products' => $products,
            'filters' => [
                'search' => $search,
                'brand' => $filterBrand,
                'category' => $filterCategory,
            ],
            'options' => [
                'brands' => $brands,
                'categories' => $categories,
            ],
            'requestingBranch' => $requestingBranch ? [
                'id' => $requestingBranch->id,
                'branch_name' => $requestingBranch->branch_name
            ] : null,
            'isSystemAdmin' => $isSystemAdmin,
        ]);
    }

    public function store(Request $request, OneSignalService $oneSignal)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.selected_variations' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $user = auth()->user();
        $isSystemAdmin = $user->hasRole('System Administrator');

        $branchId = ($isSystemAdmin && session()->has('active_branch_id'))
            ? session('active_branch_id')
            : $user->branch_id;

        if (!$branchId) {
            return back()->withErrors(['error' => 'You must belong to a branch or select an active branch to request orders.']);
        }

        if ($branchId == 1) {
            return back()->withErrors(['error' => 'LM2 Main Bodega cannot place a Request Order to itself.']);
        }

        $requestingBranch = Branch::find($branchId);
        $requestingBranchName = $requestingBranch ? $requestingBranch->branch_name : 'Unknown Branch';

        $transfer = null;
        $totalItemsCount = 0;

        DB::transaction(function () use ($request, $user, $branchId, &$transfer, &$totalItemsCount) {
            // Create a Request Transfer: Source is LM2 Main Bodega (ID 1), Destination is Requesting Branch
            $transfer = Transfer::create([
                'source_branch_id' => 1,
                'destination_branch_id' => $branchId,
                'status' => 'requested',
                'is_request' => true,
                'readied_by' => $user->id,
                'notes' => $request->notes,
            ]);

            foreach ($request->items as $item) {
                TransferItem::create([
                    'transfer_id' => $transfer->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'status' => 'pending',
                    'selected_variations' => $item['selected_variations'] ?? null,
                ]);
                $totalItemsCount += $item['quantity'];
            }
        });

        // 1. Notify Branch Administrators of LM2 Main Bodega
        try {
            $lm2AdminPlayerIds = \App\Models\User::role('Branch Administrator')
                ->where('branch_id', 1)
                ->whereNotNull('onesignal_player_id')
                ->pluck('onesignal_player_id')
                ->toArray();

            if (!empty($lm2AdminPlayerIds)) {
                $oneSignal->sendNotification(
                    "New Request Order #{$transfer->id} submitted by {$requestingBranchName} for {$totalItemsCount} items.",
                    $lm2AdminPlayerIds,
                    "New Request Order"
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send request notification to LM2 Main Bodega: " . $e->getMessage());
        }

        // 2. Notify other Administrators of Requesting Branch
        try {
            $destAdminPlayerIds = \App\Models\User::role('Branch Administrator')
                ->where('branch_id', $branchId)
                ->where('id', '!=', $user->id)
                ->whereNotNull('onesignal_player_id')
                ->pluck('onesignal_player_id')
                ->toArray();

            if (!empty($destAdminPlayerIds)) {
                $oneSignal->sendNotification(
                    "Request Order #{$transfer->id} submitted successfully to LM2 Main Bodega.",
                    $destAdminPlayerIds,
                    "Request Order Submitted"
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to send request notification to requesting branch admins: " . $e->getMessage());
        }

        // 3. Post an automated message in the chat thread between Requesting Branch and LM2 Main Bodega
        try {
            $message = Message::create([
                'sender_id' => $user->id,
                'receiver_branch_id' => 1, // LM2 Main Bodega
                'content' => "📦 **Request Order Submitted**\n\nA new Request Order #{$transfer->id} has been submitted by {$requestingBranchName} for {$totalItemsCount} items.\n\n*Click outgoing/incoming transfers page to view.*",
            ]);

            $message->load('sender');
            broadcast(new MessageSent($message))->toOthers();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to generate automated chat message for Request Order #{$transfer->id}: " . $e->getMessage());
        }

        return redirect()->route('transfers.incoming')->with('success', 'Request Order submitted successfully.');
    }
}
