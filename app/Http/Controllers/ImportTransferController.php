<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use App\Models\Product;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Supplier;

class ImportTransferController extends Controller
{
    public function index()
    {
        return Inertia::render('Transfers/Import/Index', [
            'brands' => Brand::orderBy('name')->get(),
            'categories' => Category::orderBy('name')->get(),
            'suppliers' => Supplier::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:10240', // Max 10MB
        ]);

        $image = $request->file('image');
        
        // Send to n8n Webhook
        try {
            $response = Http::attach(
                'data', file_get_contents($image), $image->getClientOriginalName()
            )->post(config('services.n8n.webhook_url'));

            if ($response->successful()) {
                $raw = $response->json();
                // Handle n8n output structure: [{ "output": { "inventory_items": [...] } }]
                // Or sometimes it might be just the object. Check both.
                $items = $raw[0]['output']['inventory_items']
                    ?? $raw['output']['inventory_items']
                    ?? $raw['inventory_items']
                    ?? [];

                $branchId = auth()->user()->branch_id;
                
                if (is_array($items)) {
                    foreach ($items as &$item) {
                        $item['exists_in_branch'] = false;
                        if (isset($item['item_name']) && $branchId) {
                            $exists = Product::where('name', 'like', '%' . trim($item['item_name']) . '%')
                                ->whereHas('branches', function ($query) use ($branchId) {
                                    $query->where('branches.id', $branchId);
                                })->exists();
                            $item['exists_in_branch'] = $exists;
                        }
                    }
                }

                return Inertia::render('Transfers/Import/Index', [
                    'analysis_result' => ['inventory_items' => $items],
                    'success' => 'Analysis complete. Found ' . count($items) . ' items.',
                    'brands' => Brand::orderBy('name')->get(),
                    'categories' => Category::orderBy('name')->get(),
                    'suppliers' => Supplier::orderBy('name')->get(),
                ]);
            } else {
                return back()->with('error', 'Failed to process image. Status: ' . $response->status());
            }

        } catch (\Exception $e) {
            return back()->with('error', 'Error communicating with AI service: ' . $e->getMessage());
        }
    }
}
