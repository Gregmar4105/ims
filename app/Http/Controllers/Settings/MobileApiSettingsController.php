<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MobileApiSettingsController extends Controller
{
    private const CONFIG_FILE = 'mobile_api_config.json';

    /**
     * Show the Mobile API settings page.
     */
    public function edit()
    {
        $config = $this->loadConfig();

        return Inertia::render('settings/mobile-api', [
            'serverUrl'    => $config['server_url'] ?? 'https://lm2bicycletrading.larable.dev',
            'isConnected'  => $config['is_connected'] ?? false,
            'lastSyncedAt' => $config['last_synced_at'] ?? null,
            'authUser'     => $config['auth_user'] ?? null,
        ]);
    }

    /**
     * Save the server URL.
     */
    public function update(Request $request)
    {
        $request->validate([
            'server_url' => ['required', 'url', 'max:255'],
        ]);

        $config = $this->loadConfig();
        $config['server_url'] = rtrim($request->server_url, '/');

        // If URL changed, clear auth state so user re-logs in
        if (isset($config['server_url']) && $config['server_url'] !== rtrim($request->server_url, '/')) {
            $config['is_connected']  = false;
            $config['auth_token']    = null;
            $config['auth_user']     = null;
            $config['last_synced_at'] = null;
        }

        $this->saveConfig($config);

        return back()->with('success', 'Server URL updated successfully.');
    }

    /**
     * Store authenticated API token + user info (called after successful API login).
     */
    public function storeToken(Request $request)
    {
        $request->validate([
            'token' => ['required', 'string'],
            'user'  => ['required', 'array'],
        ]);

        $config                  = $this->loadConfig();
        $config['auth_token']    = $request->token;
        $config['auth_user']     = $request->user;
        $config['is_connected']  = true;
        $config['last_synced_at'] = now()->toISOString();

        $this->saveConfig($config);

        return response()->json(['message' => 'Token stored.']);
    }

    /**
     * Clear the stored token (disconnect).
     */
    public function disconnect()
    {
        $config                  = $this->loadConfig();
        $config['is_connected']  = false;
        $config['auth_token']    = null;
        $config['auth_user']     = null;

        $this->saveConfig($config);

        return back()->with('success', 'Disconnected from remote server.');
    }

    /**
     * Return stored config as JSON (used by the NativePHP app's JS layer).
     */
    public function getConfig()
    {
        $config = $this->loadConfig();

        return response()->json([
            'server_url'    => $config['server_url'] ?? 'https://lm2bicycletrading.larable.dev',
            'is_connected'  => $config['is_connected'] ?? false,
            'auth_token'    => $config['auth_token'] ?? null,
            'auth_user'     => $config['auth_user'] ?? null,
            'last_synced_at'=> $config['last_synced_at'] ?? null,
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function loadConfig(): array
    {
        $path = storage_path('app/' . self::CONFIG_FILE);

        if (! file_exists($path)) {
            return ['server_url' => 'https://lm2bicycletrading.larable.dev'];
        }

        return json_decode(file_get_contents($path), true) ?? [];
    }

    private function saveConfig(array $config): void
    {
        $path = storage_path('app/' . self::CONFIG_FILE);
        file_put_contents($path, json_encode($config, JSON_PRETTY_PRINT));
    }
}
