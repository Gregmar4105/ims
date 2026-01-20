<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\ProxmoxService;
use App\Models\ScheduledCommand;
use Carbon\Carbon;

class SystemDashboardController extends Controller
{
    protected $proxmox;

    public function __construct(ProxmoxService $proxmox)
    {
        $this->proxmox = $proxmox;
    }

    public function index()
    {
        return Inertia::render('SystemDashboard');
    }

    public function getData()
    {
        return response()->json($this->proxmox->getSystemStats());
    }

    public function shutdown(Request $request)
    {
        $url = config('services.webhook.shutdown');

        if (!$url) {
            \Illuminate\Support\Facades\Log::error('Shutdown Webhook URL is not configured.');
            return response()->json(['message' => 'Shutdown URL not configured'], 500);
        }

        try {
            $response = \Illuminate\Support\Facades\Http::withoutVerifying()->post($url);

            if ($response->successful()) {
                return response()->json([
                    'message' => 'Shutdown command sent associated webhook',
                    'result' => true
                ]);
            }

            \Illuminate\Support\Facades\Log::error("Shutdown webhook failed: " . $response->status());
            return response()->json(['message' => 'Failed to trigger shutdown webhook'], 500);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Shutdown webhook exception: " . $e->getMessage());
            return response()->json(['message' => 'Error processing shutdown request'], 500);
        }
    }

    public function scheduleShutdown(Request $request)
    {
        $request->validate([
            'scheduled_at' => 'required|date|after:now',
            'is_recurring' => 'boolean',
        ]);

        $scheduledAt = Carbon::parse($request->scheduled_at);

        $command = ScheduledCommand::create([
            'command' => 'shutdown',
            'target_servers' => 'all',
            'scheduled_at' => $scheduledAt,
            'status' => 'pending',
            'user_id' => auth()->id(),
            'is_recurring' => $request->boolean('is_recurring'),
        ]);

        return response()->json([
            'message' => 'Shutdown scheduled successfully',
            'command' => $command
        ]);
    }

    public function getSchedules()
    {
        $schedules = ScheduledCommand::where('status', 'pending')
            ->orderBy('scheduled_at', 'asc')
            ->get();
            
        return response()->json($schedules);
    }

    public function cancelSchedule(ScheduledCommand $command)
    {
        $command->update(['status' => 'cancelled']);
        return response()->json(['message' => 'Schedule cancelled']);
    }
}
