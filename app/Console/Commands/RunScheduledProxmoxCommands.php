<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ScheduledCommand;
use App\Services\ProxmoxService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class RunScheduledProxmoxCommands extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'proxmox:run-scheduled';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run scheduled Proxmox commands (e.g., shutdown)';

    /**
     * Execute the console command.
     */
    public function handle(ProxmoxService $proxmoxService)
    {
        $now = Carbon::now();
        
        $commands = ScheduledCommand::where('status', 'pending')
            ->where('scheduled_at', '<=', $now)
            ->get();

        if ($commands->isEmpty()) {
            return;
        }

        foreach ($commands as $cmd) {
            $this->info("Running command {$cmd->id}: {$cmd->command} on {$cmd->target_servers}");
            
            try {
                if ($cmd->command === 'shutdown') {
                    $proxmoxService->shutdownAllNodes();
                }
                
                $cmd->update(['status' => 'completed']);
                Log::info("Scheduled Proxmox command {$cmd->id} completed.");

                if ($cmd->is_recurring) {
                    $nextRun = $cmd->scheduled_at->copy()->addDay();
                    ScheduledCommand::create([
                        'command' => $cmd->command,
                        'target_servers' => $cmd->target_servers,
                        'scheduled_at' => $nextRun,
                        'status' => 'pending',
                        'user_id' => $cmd->user_id,
                        'is_recurring' => true,
                    ]);
                    Log::info("Rescheduled Proxmox command {$cmd->id} for $nextRun.");
                }
            } catch (\Exception $e) {
                $cmd->update(['status' => 'failed']);
                Log::error("Scheduled Proxmox command {$cmd->id} failed: " . $e->getMessage());
            }
        }
    }
}
