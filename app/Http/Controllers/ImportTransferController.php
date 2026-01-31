<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class ImportTransferController extends Controller
{
    public function index()
    {
        return Inertia::render('Transfers/Import/Index');
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

                return back()->with('analysis_result', ['inventory_items' => $items]);
            } else {
                return back()->with('error', 'Failed to process image. Status: ' . $response->status());
            }

        } catch (\Exception $e) {
            return back()->with('error', 'Error communicating with AI service: ' . $e->getMessage());
        }
    }
}
