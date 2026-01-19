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
        // Immediate shutdown
        $result = $this->proxmox->shutdownAllNodes();
        
        return response()->json([
            'message' => 'Shutdown command sent to all servers',
            'result' => $result
        ]);
    }

    public function scheduleShutdown(Request $request)
    {
        $request->validate([
            'scheduled_at' => 'required|date|after:now',
        ]);

        $scheduledAt = Carbon::parse($request->scheduled_at);

        $command = ScheduledCommand::create([
            'command' => 'shutdown',
            'target_servers' => 'all',
            'scheduled_at' => $scheduledAt,
            'status' => 'pending',
            'user_id' => auth()->id(),
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
