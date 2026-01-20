<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class ProxmoxService
{
    protected $server1;
    protected $server2;
    protected $token1;
    protected $token2;
    protected $sshUser;
    protected $sshPassword;

    public function __construct()
    {
        $this->server1 = env('PROXMOX_SERVER_1');
        $this->server2 = env('PROXMOX_SERVER_2');
        
        $this->token1 = "PVEAPIToken=" . env('PROXMOX_1_TOKEN_ID') . "=" . env('PROXMOX_1_SECRET');
        $this->token2 = "PVEAPIToken=" . env('PROXMOX_2_TOKEN_ID') . "=" . env('PROXMOX_2_SECRET');

        $this->sshUser = env('PROXMOX_SSH_USER');
        $this->sshPassword = env('PROXMOX_SSH_PASSWORD');
    }

    /**
     * Get monitoring data from both servers.
     */
    public function getSystemStats()
    {
        $responses = Http::pool(fn (Pool $pool) => [
            $pool->as('server1')->withoutVerifying()
                ->withHeaders(['Authorization' => $this->token1])
                ->get("https://{$this->server1}/api2/json/nodes"),
                
            $pool->as('server2')->withoutVerifying()
                ->withHeaders(['Authorization' => $this->token2])
                ->get("https://{$this->server2}/api2/json/nodes"),
        ]);

        $data = [
            'server1' => ['status' => 'offline', 'cpu' => 0, 'ram' => 0, 'disk' => 0, 'uptime' => 0],
            'server2' => ['status' => 'offline', 'cpu' => 0, 'ram' => 0, 'disk' => 0, 'uptime' => 0],
        ];

        // Process Server 1
        if ($responses['server1']->successful()) {
            $nodeList = $responses['server1']->json()['data'];
            $nodeName = $nodeList[0]['node'] ?? null;
            
            if ($nodeName) {
                 $nodeData = $this->getNodeStatus($this->server1, $this->token1, $nodeName);
                 if ($nodeData) $data['server1'] = $nodeData;
            } else {
                 Log::error("Proxmox Server 1: No nodes found.");
            }
        } else {
            Log::error("Proxmox Server 1 Auth/Conn Failed: " . $responses['server1']->status());
        }

        // Process Server 2
        if ($responses['server2']->successful()) {
            $nodeList = $responses['server2']->json()['data'];
            $nodeName = $nodeList[0]['node'] ?? null;
             
            if ($nodeName) {
                 $nodeData = $this->getNodeStatus($this->server2, $this->token2, $nodeName);
                 if ($nodeData) $data['server2'] = $nodeData;
            } else {
                 Log::error("Proxmox Server 2: No nodes found.");
            }
        } else {
             Log::error("Proxmox Server 2 Auth/Conn Failed: " . $responses['server2']->status());
        }

        return $data;
    }

    protected function getNodeStatus($host, $token, $nodeName)
    {
        $status = Http::withoutVerifying()
            ->withHeaders(['Authorization' => $token])
            ->get("https://{$host}/api2/json/nodes/{$nodeName}/status");

        if ($status->failed()) {
            Log::error("Proxmox Node Status Failed ($host): " . $status->status());
            return null;
        }
        
        $s = $status->json()['data'];
        $storage = $this->getStorageStats($host, $token, $nodeName);
        
        return [
            'status' => 'online',
            'node' => $nodeName,
            'cpu' => isset($s['cpu']) ? round($s['cpu'] * 100, 2) : 0,
            'ram_used' => isset($s['memory']['used']) ? $s['memory']['used'] : 0,
            'ram_total' => isset($s['memory']['total']) ? $s['memory']['total'] : 0,
            'ram_percent' => isset($s['memory']['total']) && $s['memory']['total'] > 0 ? round(($s['memory']['used'] / $s['memory']['total']) * 100, 2) : 0,
            'disk_used' => isset($s['rootfs']['used']) ? $s['rootfs']['used'] : 0,
            'disk_total' => isset($s['rootfs']['total']) ? $s['rootfs']['total'] : 0,
            'disk_percent' => isset($s['rootfs']['total']) && $s['rootfs']['total'] > 0 ? round(($s['rootfs']['used'] / $s['rootfs']['total']) * 100, 2) : 0,
            'uptime' => isset($s['uptime']) ? $s['uptime'] : 0,
            'storage' => $storage,
        ];
    }

    protected function getStorageStats($host, $token, $nodeName)
    {
        $response = Http::withoutVerifying()
            ->withHeaders(['Authorization' => $token])
            ->get("https://{$host}/api2/json/nodes/{$nodeName}/storage");

        if ($response->failed()) {
            return [];
        }

        return $response->json()['data'] ?? [];
    }

    /**
     * Shutdown all servers via n8n Webhook.
     */
    public function shutdownAllNodes()
    {
        $url = config('services.webhook.shutdown');

        if (!$url) {
            Log::error("Shutdown Webhook URL is not configured.");
            return ['error' => 'Shutdown Webhook URL is not configured'];
        }

        try {
            $response = Http::withoutVerifying()->post($url);

            if ($response->successful()) {
                Log::info("Shutdown webhook triggered successfully.");
                return ['success' => true, 'message' => 'Shutdown command sent via webhook'];
            } else {
                Log::error("Shutdown webhook failed: " . $response->status());
                return ['success' => false, 'message' => 'Failed to trigger shutdown webhook'];
            }
        } catch (\Exception $e) {
            Log::error("Shutdown webhook exception: " . $e->getMessage());
            return ['success' => false, 'message' => 'Exception triggering shutdown webhook'];
        }
    }

    /**
     * Build the SSH command string, injecting sshpass if password is available.
     */
    protected function buildSshCommand($ip, $remoteCommand)
    {
        $user = $this->sshUser;
        $pass = $this->sshPassword;
        
        // Basic SSH part with strict host checking disabled for automation
        $sshPart = "ssh -o BatchMode=yes -o StrictHostKeyChecking=no -p 22 {$user}@{$ip} \"{$remoteCommand}\"";

        if ($pass) {
            // Check if sshpass is available (simple check could be improved)
            // We wrap in sshpass to provide the password non-interactively
            // This requires 'apt-get install sshpass' on the server running this code.
            return "sshpass -p '{$pass}' " . $sshPart;
        }

        return $sshPart;
    }
}

