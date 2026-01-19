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
                    if ($cmd->target_servers === 'all' || $cmd->target_servers === 'both') {
                        $proxmoxService->shutdownAllNodes();
                    } else {
                        // Implement single server shutdown if needed later, for now logic is "all" primarily based on request
                         $proxmoxService->shutdownAllNodes();
                    }
                }
                
                $cmd->update(['status' => 'completed']);
                Log::info("Scheduled Proxmox command {$cmd->id} completed.");
            } catch (\Exception $e) {
                $cmd->update(['status' => 'failed']);
                Log::error("Scheduled Proxmox command {$cmd->id} failed: " . $e->getMessage());
            }
        }
    }
}
