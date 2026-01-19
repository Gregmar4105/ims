<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Log;

class ProxmoxService
{
    protected $server1;
    protected $server2;
    protected $token1;
    protected $token2;

    public function __construct()
    {
        $this->server1 = env('PROXMOX_SERVER_1');
        $this->server2 = env('PROXMOX_SERVER_2');
        
        $this->token1 = "PVEAPIToken=" . env('PROXMOX_1_TOKEN_ID') . "=" . env('PROXMOX_1_SECRET');
        $this->token2 = "PVEAPIToken=" . env('PROXMOX_2_TOKEN_ID') . "=" . env('PROXMOX_2_SECRET');
    }

    /**
     * Get monitoring data from both servers.
     */
    public function getSystemStats()
    {
        // We can't query the node status directly without knowing the node name. 
        // Best practice: Query /api2/json/nodes first to get the list of nodes, then query status.
        // Or we can assume the user provided ID "main" and "backup" are the node names? 
        // "larable-api@main" -> main? 
        // Let's stick to dynamic discovery.

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
        ];
    }

    /**
     * Shutdown all servers immediately in parallel.
     */
    public function shutdownAllNodes()
    {
        // 1. Get Node names first (parallel)
        $nodeResponses = Http::pool(fn (Pool $pool) => [
            $pool->as('s1')->withoutVerifying()->withHeaders(['Authorization' => $this->token1])->get("https://{$this->server1}/api2/json/nodes"),
            $pool->as('s2')->withoutVerifying()->withHeaders(['Authorization' => $this->token2])->get("https://{$this->server2}/api2/json/nodes"),
        ]);
        
        $node1 = $nodeResponses['s1']->successful() ? ($nodeResponses['s1']->json()['data'][0]['node'] ?? null) : null;
        $node2 = $nodeResponses['s2']->successful() ? ($nodeResponses['s2']->json()['data'][0]['node'] ?? null) : null;
        
        // 2. Send Shutdown command (parallel)
        $shutdownResponses = Http::pool(fn (Pool $pool) => [
             $node1 ? $pool->as('s1')->withoutVerifying()
                ->withHeaders(['Authorization' => $this->token1])
                ->post("https://{$this->server1}/api2/json/nodes/{$node1}/status", ['command' => 'shutdown']) : null,
                
             $node2 ? $pool->as('s2')->withoutVerifying()
                ->withHeaders(['Authorization' => $this->token2])
                ->post("https://{$this->server2}/api2/json/nodes/{$node2}/status", ['command' => 'shutdown']) : null,
        ]);
        
        return [
            'server1' => isset($shutdownResponses['s1']) ? $shutdownResponses['s1']->successful() : false,
            'server2' => isset($shutdownResponses['s2']) ? $shutdownResponses['s2']->successful() : false,
        ];
    }
}
