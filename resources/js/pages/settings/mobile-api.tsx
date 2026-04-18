import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * ── NativePHP Android body-parsing workaround ─────────────────────────────
 *
 * NativePHP's Android PHP built-in server doesn't reliably parse
 * `application/json` POST bodies from the Android WebView. Any `axios.post()`
 * to http://127.0.0.1 arrives with an empty body, so validation always fails
 * with "field is required" even when fields are filled.
 *
 * Solution: store ALL config in localStorage (client-side).
 * No local PHP POST calls are made. The PHP controller only serves the initial
 * Inertia render. Token, user, and server URL live in localStorage.
 *
 * remoteApi  - calls the PRODUCTION server (Bearer token, no credentials)
 * localStorage - source of truth for mobile config on the device
 */

const STORAGE_KEY = 'lm2_mobile_api_config';

function loadConfig(): Record<string, any> {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
        return {};
    }
}

function persistConfig(updates: Record<string, any>): void {
    const merged = { ...loadConfig(), ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

/** Dedicated axios instance for cross-origin calls to the production server.
 *  withCredentials MUST be false — Bearer token auth, wildcard CORS. */
const remoteApi = axios.create({ withCredentials: false });

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    /** Server-side defaults (Inertia props) — used only as initial fallback */
    serverUrl:    string;
    isConnected:  boolean;
    lastSyncedAt: string | null;
    authUser:     { name: string; email: string; roles: string[] } | null;
}

export default function MobileApiSettings(props: Props) {

    // ── State: read from localStorage, fall back to Inertia server props ──────
    const [cfg, setCfg] = useState<Record<string, any>>({});
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const stored = loadConfig();
        // Merge server defaults (first boot) with stored values (subsequent boots)
        const merged = {
            server_url:    props.serverUrl,
            is_connected:  props.isConnected,
            last_synced_at: props.lastSyncedAt,
            auth_user:     props.authUser,
            ...stored,   // localStorage values win
        };
        setCfg(merged);
        setHydrated(true);
    }, []);

    const serverUrl   = cfg.server_url   ?? props.serverUrl;
    const isConnected = cfg.is_connected ?? props.isConnected;
    const authUser    = cfg.auth_user    ?? props.authUser;
    const lastSyncedAt = cfg.last_synced_at ?? props.lastSyncedAt;

    // ── Server URL ────────────────────────────────────────────────────────────
    const [editUrl, setEditUrl]     = useState(props.serverUrl);
    const [urlSaving, setUrlSaving] = useState(false);
    const [urlSaved, setUrlSaved]   = useState(false);

    useEffect(() => { if (hydrated) setEditUrl(serverUrl); }, [hydrated]);

    const saveUrl = (e: React.FormEvent) => {
        e.preventDefault();
        setUrlSaving(true);
        const url = editUrl.replace(/\/$/, '');
        // Persist directly to localStorage — no local PHP POST needed
        persistConfig({ server_url: url, is_connected: false, auth_user: null, auth_token: null });
        setCfg(c => ({ ...c, server_url: url, is_connected: false, auth_user: null, auth_token: null }));
        setTimeout(() => { setUrlSaving(false); setUrlSaved(true); }, 300);
        setTimeout(() => setUrlSaved(false), 2500);
    };

    // ── Login ─────────────────────────────────────────────────────────────────
    const [email, setEmail]               = useState('');
    const [password, setPassword]         = useState('');
    const [loginError, setLoginError]     = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [testLoading, setTestLoading]   = useState(false);
    const [testResult, setTestResult]     = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);
        try {
            const base = serverUrl.replace(/\/$/, '');

            // Single cross-origin call — no local POST at all
            const res = await remoteApi.post(`${base}/api/mobile/login`, { email, password });

            const update = {
                auth_token:    res.data.token,
                auth_user:     res.data.user,
                is_connected:  true,
                last_synced_at: new Date().toISOString(),
            };

            // Save directly to localStorage (avoids NativePHP body-parsing bug)
            persistConfig(update);
            setCfg(c => ({ ...c, ...update }));

            setEmail('');
            setPassword('');

            // Redirect into the app
            router.visit('/dashboard');
        } catch (err: any) {
            const msg = err?.response?.data?.message
                ?? err?.response?.data?.errors?.email?.[0]
                ?? 'Login failed. Check the URL and credentials.';
            setLoginError(msg);
        } finally {
            setLoginLoading(false);
        }
    };

    const handleDisconnect = () => {
        const update = { is_connected: false, auth_token: null, auth_user: null };
        persistConfig(update);
        setCfg(c => ({ ...c, ...update }));
        setTestResult(null);
    };

    const handleTest = async () => {
        setTestLoading(true);
        setTestResult(null);
        try {
            const base  = serverUrl.replace(/\/$/, '');
            const token = loadConfig().auth_token;
            if (!token) { setTestResult('❌ No token stored. Please log in first.'); return; }
            const res = await remoteApi.get(`${base}/api/mobile/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const s = res.data.summary;
            setTestResult(`✅ Connected! Sales: ${s.total_sales} | Pending: ${s.pending_sales} | Low stock: ${s.low_stock_items}`);
        } catch (err: any) {
            setTestResult(`❌ ${err?.response?.data?.message ?? 'Connection test failed.'}`);
        } finally {
            setTestLoading(false);
        }
    };

    if (!hydrated) return null; // avoid flash

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title="Mobile API Settings" />

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                </div>
                <div>
                    <p className="font-semibold text-sm">LM2 IMS Mobile</p>
                    <p className="text-xs text-muted-foreground">API Configuration</p>
                </div>
                <div className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium
                    ${isConnected ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    {isConnected ? 'Connected' : 'Not connected'}
                </div>
            </div>

            <div className="mx-auto max-w-lg space-y-6 px-6 py-8">

                {/* ── Server URL ────────────────────────────────────────────── */}
                <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                    <div>
                        <p className="font-semibold text-sm">Remote Server URL</p>
                        <p className="text-xs text-muted-foreground mt-0.5">The web server this app syncs data with</p>
                    </div>
                    <form onSubmit={saveUrl} className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="server_url">Server URL</Label>
                            <Input
                                id="server_url"
                                type="url"
                                placeholder="https://lm2bicycletrading.larable.dev"
                                value={editUrl}
                                onChange={e => setEditUrl(e.target.value)}
                                className="font-mono text-sm"
                                required
                            />
                        </div>
                        <Button type="submit" disabled={urlSaving} size="sm" variant={urlSaved ? 'outline' : 'default'}>
                            {urlSaving ? 'Saving…' : urlSaved ? '✓ Saved' : 'Save URL'}
                        </Button>
                    </form>
                </section>

                {/* ── Auth ───────────────────────────────────────────────────── */}
                <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                    {isConnected && authUser ? (
                        <>
                            <div>
                                <p className="font-semibold text-sm">Logged In</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Authenticated against the remote server</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1 text-sm">
                                <p><span className="text-muted-foreground">Name:</span> <span className="font-medium">{authUser.name}</span></p>
                                <p><span className="text-muted-foreground">Email:</span> {authUser.email}</p>
                                <p><span className="text-muted-foreground">Roles:</span> {(authUser as any).roles?.join(', ') || '—'}</p>
                                {lastSyncedAt && (
                                    <p><span className="text-muted-foreground">Logged in:</span> {new Date(lastSyncedAt).toLocaleString()}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleDisconnect}>Disconnect</Button>
                                <Button variant="outline" size="sm" onClick={handleTest} disabled={testLoading}>
                                    {testLoading ? 'Testing…' : 'Test Connection'}
                                </Button>
                            </div>
                            {testResult && (
                                <p className={`rounded-md px-3 py-2 text-xs font-mono ${
                                    testResult.startsWith('✅')
                                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                        : 'bg-destructive/10 text-destructive'
                                }`}>{testResult}</p>
                            )}
                        </>
                    ) : (
                        <>
                            <div>
                                <p className="font-semibold text-sm">Connect to Server</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Log in with your account on <span className="font-mono break-all">{serverUrl}</span>
                                </p>
                            </div>
                            <form onSubmit={handleLogin} className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="api_email">Email</Label>
                                    <Input
                                        id="api_email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="api_password">Password</Label>
                                    <Input
                                        id="api_password"
                                        type="password"
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                {loginError && (
                                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{loginError}</p>
                                )}
                                <Button type="submit" disabled={loginLoading} className="w-full">
                                    {loginLoading ? 'Connecting…' : 'Connect to Server'}
                                </Button>
                            </form>
                        </>
                    )}
                </section>

                {/* ── API Endpoint Reference ───────────────────────────────── */}
                <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
                    <p className="font-semibold text-sm">Available API Endpoints</p>
                    <div className="space-y-2 text-xs font-mono text-muted-foreground">
                        {([
                            ['POST', '/api/mobile/login',                 'Authenticate & get token'],
                            ['GET',  '/api/mobile/user',                  'Current user info'],
                            ['GET',  '/api/mobile/dashboard',             'Summary stats'],
                            ['GET',  '/api/mobile/products',              'List products'],
                            ['GET',  '/api/mobile/products/search/{q}',   'Search products'],
                            ['GET',  '/api/mobile/sales',                 'List sales'],
                            ['POST', '/api/mobile/sales',                 'Create sale'],
                            ['GET',  '/api/mobile/transfers',             'List transfers'],
                            ['POST', '/api/mobile/transfers/{id}/confirm', 'Confirm transfer'],
                            ['GET',  '/api/mobile/sync/pull',             'Pull all data'],
                            ['POST', '/api/mobile/sync/push',             'Push events'],
                        ] as [string, string, string][]).map(([method, path, desc]) => (
                            <div key={`${method}-${path}`} className="flex items-start gap-3">
                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    method === 'GET' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                    : 'bg-green-500/10 text-green-600 dark:text-green-400'
                                }`}>{method}</span>
                                <span className="text-foreground">{path}</span>
                                <span className="ml-auto text-right hidden sm:block">{desc}</span>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
}
