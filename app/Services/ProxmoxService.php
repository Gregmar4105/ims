<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Log;

class ProxmoxService
{
    protected $server1;
    protected $server2;
    protected $user;
    protected $password;

    public function __construct()
    {
        $this->server1 = env('PROXMOX_SERVER_1');
        $this->server2 = env('PROXMOX_SERVER_2');
        $this->user = env('PROXMOX_USER');
        $this->password = env('PROXMOX_PASSWORD');
    }

    /**
     * Get monitoring data from both servers.
     */
    public function getSystemStats()
    {
        $responses = Http::pool(fn (Pool $pool) => [
            $pool->as('server1')->withoutVerifying()->post("https://{$this->server1}/api2/json/access/ticket", [
                'username' => $this->user,
                'password' => $this->password,
            ]),
            $pool->as('server2')->withoutVerifying()->post("https://{$this->server2}/api2/json/access/ticket", [
                'username' => $this->user,
                'password' => $this->password,
            ]),
        ]);

        $data = [
            'server1' => ['status' => 'offline', 'cpu' => 0, 'ram' => 0, 'disk' => 0, 'uptime' => 0],
            'server2' => ['status' => 'offline', 'cpu' => 0, 'ram' => 0, 'disk' => 0, 'uptime' => 0],
        ];

        // Process Server 1
        if ($responses['server1']->successful()) {
            $ticket = $responses['server1']->json()['data']['ticket'];
            $csrf = $responses['server1']->json()['data']['CSRFPreventionToken'];
            $nodeData = $this->getNodeStatus($this->server1, $ticket, $csrf);
            if ($nodeData) $data['server1'] = $nodeData;
        }

        // Process Server 2
        if ($responses['server2']->successful()) {
            $ticket = $responses['server2']->json()['data']['ticket'];
            $csrf = $responses['server2']->json()['data']['CSRFPreventionToken'];
            $nodeData = $this->getNodeStatus($this->server2, $ticket, $csrf);
            if ($nodeData) $data['server2'] = $nodeData;
        }

        return $data;
    }

    protected function getNodeStatus($host, $ticket, $csrf)
    {
        // First get the node name (usually pve, but dynamic is better)
        $nodes = Http::withoutVerifying()->withHeaders(['Cookie' => "PVEAuthCookie=$ticket"])
            ->get("https://{$host}/api2/json/nodes");
        
        if ($nodes->failed()) return null;
        
        $nodeList = $nodes->json()['data'];
        $nodeName = $nodeList[0]['node'] ?? 'pve'; 

        // Get status
        $status = Http::withoutVerifying()->withHeaders(['Cookie' => "PVEAuthCookie=$ticket"])
            ->get("https://{$host}/api2/json/nodes/{$nodeName}/status");

        if ($status->failed()) return null;
        
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
            'raw' => $s // Keep full data just in case
        ];
    }

    /**
     * Shutdown all servers immediately in parallel.
     */
    public function shutdownAllNodes()
    {
        // Authenticate first to get tickets
        $tickets = $this->getAuthTickets();
        
        $requests = [];
        
        if ($tickets['server1']) {
            $requests[] = Http::withoutVerifying()
                ->withHeaders([
                    'Cookie' => "PVEAuthCookie={$tickets['server1']['ticket']}",
                    'CSRFPreventionToken' => $tickets['server1']['csrf']
                ])
                ->post("https://{$this->server1}/api2/json/nodes/{$tickets['server1']['node']}/status", [
                    'command' => 'shutdown'
                ]);
        }
        
        if ($tickets['server2']) {
            $requests[] = Http::withoutVerifying()
                ->withHeaders([
                    'Cookie' => "PVEAuthCookie={$tickets['server2']['ticket']}",
                    'CSRFPreventionToken' => $tickets['server2']['csrf']
                ])
                ->post("https://{$this->server2}/api2/json/nodes/{$tickets['server2']['node']}/status", [
                    'command' => 'shutdown'
                ]);
        }

        // We can execute these asynchronously if we want, or just fire and forget.
        // Since we already prepared them, let's just run them if we can wrap them in a pool or just sequential is fast enough since it's just a POST. 
        // But for "simultaneous", using pool is better.
        
        // Refactoring to use pool properly with the prepared data is tricky because `pool` builds the requests.
        // Let's do it in a cleaner way.
        
        $responses = Http::pool(fn (Pool $pool) => [
             $tickets['server1'] ? $pool->as('s1')->withoutVerifying()
                ->withHeaders(['Cookie' => "PVEAuthCookie={$tickets['server1']['ticket']}", 'CSRFPreventionToken' => $tickets['server1']['csrf']])
                ->post("https://{$this->server1}/api2/json/nodes/{$tickets['server1']['node']}/status", ['command' => 'shutdown']) : null,
                
             $tickets['server2'] ? $pool->as('s2')->withoutVerifying()
                ->withHeaders(['Cookie' => "PVEAuthCookie={$tickets['server2']['ticket']}", 'CSRFPreventionToken' => $tickets['server2']['csrf']])
                ->post("https://{$this->server2}/api2/json/nodes/{$tickets['server2']['node']}/status", ['command' => 'shutdown']) : null,
        ]);
        
        return [
            'server1' => isset($responses['s1']) ? $responses['s1']->successful() : false,
            'server2' => isset($responses['s2']) ? $responses['s2']->successful() : false,
        ];
    }

    protected function getAuthTickets()
    {
        $responses = Http::pool(fn (Pool $pool) => [
            $pool->as('server1')->withoutVerifying()->post("https://{$this->server1}/api2/json/access/ticket", [
                'username' => $this->user,
                'password' => $this->password,
            ]),
            $pool->as('server2')->withoutVerifying()->post("https://{$this->server2}/api2/json/access/ticket", [
                'username' => $this->user,
                'password' => $this->password,
            ]),
        ]);

        $result = ['server1' => null, 'server2' => null];

        if ($responses['server1']->successful()) {
            $data = $responses['server1']->json()['data'];
            // Need node name
            $nodeName = $this->fetchNodeName($this->server1, $data['ticket']);
            if ($nodeName) {
                $result['server1'] = [
                    'ticket' => $data['ticket'], 
                    'csrf' => $data['CSRFPreventionToken'],
                    'node' => $nodeName
                ];
            }
        }

        if ($responses['server2']->successful()) {
            $data = $responses['server2']->json()['data'];
             // Need node name
            $nodeName = $this->fetchNodeName($this->server2, $data['ticket']);
            if ($nodeName) {
                $result['server2'] = [
                    'ticket' => $data['ticket'], 
                    'csrf' => $data['CSRFPreventionToken'],
                    'node' => $nodeName
                ];
            }
        }

        return $result;
    }
    
    protected function fetchNodeName($host, $ticket) {
         $nodes = Http::withoutVerifying()->withHeaders(['Cookie' => "PVEAuthCookie=$ticket"])
            ->get("https://{$host}/api2/json/nodes");
        return $nodes->successful() ? ($nodes->json()['data'][0]['node'] ?? 'pve') : null;
    }
}
