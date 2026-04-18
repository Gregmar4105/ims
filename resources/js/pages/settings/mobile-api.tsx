import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Mobile API Settings', href: '/settings/mobile-api' },
];

interface Props {
    serverUrl: string;
    isConnected: boolean;
    lastSyncedAt: string | null;
    authUser: { name: string; email: string; roles: string[] } | null;
}

export default function MobileApiSettings({ serverUrl, isConnected, lastSyncedAt, authUser }: Props) {
    // ── Server URL form ───────────────────────────────────────────────────────
    const urlForm = useForm({ server_url: serverUrl });

    const saveUrl = (e: React.FormEvent) => {
        e.preventDefault();
        urlForm.post('/settings/mobile-api', {
            preserveScroll: true,
        });
    };

    // ── Login form ────────────────────────────────────────────────────────────
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [testLoading, setTestLoading]   = useState(false);
    const [testResult, setTestResult]     = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);

        try {
            const base = urlForm.data.server_url.replace(/\/$/, '');
            const res  = await axios.post(`${base}/api/mobile/login`, { email, password });

            // Store the token back to our NativePHP local settings
            await axios.post('/settings/mobile-api/token', {
                token: res.data.token,
                user:  res.data.user,
            });

            router.reload({ only: ['isConnected', 'authUser', 'lastSyncedAt'] });
        } catch (err: any) {
            setLoginError(err?.response?.data?.message ?? 'Login failed. Check the URL and your credentials.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleDisconnect = () => {
        router.post('/settings/mobile-api/disconnect', {}, { preserveScroll: true });
    };

    // ── Connection test ───────────────────────────────────────────────────────
    const handleTest = async () => {
        setTestLoading(true);
        setTestResult(null);
        try {
            const base    = urlForm.data.server_url.replace(/\/$/, '');
            const config  = await axios.get('/settings/mobile-api/config');
            const token   = config.data.auth_token;

            if (! token) {
                setTestResult('❌ No token stored. Please log in first.');
                return;
            }

            const res = await axios.get(`${base}/api/mobile/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const s = res.data.summary;
            setTestResult(
                `✅ Connected! Sales: ${s.total_sales} | Pending: ${s.pending_sales} | Low stock: ${s.low_stock_items}`
            );
        } catch (err: any) {
            setTestResult(`❌ ${err?.response?.data?.message ?? 'Connection test failed.'}`);
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mobile API Settings" />

            <SettingsLayout>
                <div className="space-y-10">
                    {/* ── Header ─────────────────────────────────────────── */}
                    <HeadingSmall
                        title="Mobile API Settings"
                        description="Configure the remote server this NativePHP app syncs data with."
                    />

                    {/* ── Server URL ─────────────────────────────────────── */}
                    <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Remote Server URL</p>
                                <p className="text-xs text-muted-foreground">The deployed web app this Android app communicates with</p>
                            </div>
                        </div>

                        <form onSubmit={saveUrl} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="server_url">Server URL</Label>
                                <Input
                                    id="server_url"
                                    type="url"
                                    placeholder="https://lm2bicycletrading.larable.dev"
                                    value={urlForm.data.server_url}
                                    onChange={e => urlForm.setData('server_url', e.target.value)}
                                    className="font-mono text-sm"
                                />
                                {urlForm.errors.server_url && (
                                    <p className="text-xs text-destructive">{urlForm.errors.server_url}</p>
                                )}
                            </div>

                            <Button type="submit" disabled={urlForm.processing} size="sm">
                                {urlForm.processing ? 'Saving…' : 'Save URL'}
                            </Button>
                        </form>
                    </section>

                    {/* ── Connection Status ──────────────────────────────── */}
                    <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className={`flex h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                                <p className="font-semibold text-sm">
                                    {isConnected ? 'Connected' : 'Not Connected'}
                                </p>
                            </div>
                            {isConnected && (
                                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                                    Disconnect
                                </Button>
                            )}
                        </div>

                        {isConnected && authUser ? (
                            <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1 text-sm">
                                <p><span className="text-muted-foreground">Logged in as:</span> <span className="font-medium">{authUser.name}</span></p>
                                <p><span className="text-muted-foreground">Email:</span> {authUser.email}</p>
                                <p><span className="text-muted-foreground">Roles:</span> {authUser.roles?.join(', ') || '—'}</p>
                                {lastSyncedAt && (
                                    <p><span className="text-muted-foreground">Last synced:</span> {new Date(lastSyncedAt).toLocaleString()}</p>
                                )}
                            </div>
                        ) : (
                            /* ── Login Form ─────────────────────────────── */
                            <form onSubmit={handleLogin} className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Log in with your account on <span className="font-mono text-xs">{urlForm.data.server_url}</span> to authenticate this device.
                                </p>

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

                                <Button type="submit" disabled={loginLoading} size="sm">
                                    {loginLoading ? 'Connecting…' : 'Connect to Server'}
                                </Button>
                            </form>
                        )}
                    </section>

                    {/* ── Connection Test ────────────────────────────────── */}
                    {isConnected && (
                        <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                                    <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Test Connection</p>
                                    <p className="text-xs text-muted-foreground">Fetch a live data summary from the server</p>
                                </div>
                            </div>

                            <Button variant="outline" size="sm" onClick={handleTest} disabled={testLoading}>
                                {testLoading ? 'Testing…' : 'Run Test'}
                            </Button>

                            {testResult && (
                                <p className={`rounded-md px-3 py-2 text-xs font-mono ${
                                    testResult.startsWith('✅') ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-destructive/10 text-destructive'
                                }`}>
                                    {testResult}
                                </p>
                            )}
                        </section>
                    )}

                    {/* ── API Reference ──────────────────────────────────── */}
                    <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                        <p className="font-semibold text-sm">Available API Endpoints</p>
                        <div className="space-y-2 text-xs font-mono text-muted-foreground">
                            {[
                                ['POST', '/api/mobile/login',              'Authenticate & get token'],
                                ['POST', '/api/mobile/logout',             'Revoke token'],
                                ['GET',  '/api/mobile/user',               'Get current user info'],
                                ['GET',  '/api/mobile/dashboard',          'Summary stats'],
                                ['GET',  '/api/mobile/products',           'List products'],
                                ['GET',  '/api/mobile/products/search/:q', 'Search products'],
                                ['GET',  '/api/mobile/sales',              'List sales'],
                                ['POST', '/api/mobile/sales',              'Create a sale'],
                                ['GET',  '/api/mobile/transfers',          'List transfers'],
                                ['POST', '/api/mobile/transfers/:id/confirm', 'Confirm transfer receipt'],
                                ['GET',  '/api/mobile/sync/pull',          'Pull all latest data'],
                                ['POST', '/api/mobile/sync/push',          'Push app-recorded events'],
                            ].map(([method, path, desc]) => (
                                <div key={path} className="flex items-start gap-3">
                                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                        method === 'GET'  ? 'bg-blue-500/10 text-blue-600' :
                                        method === 'POST' ? 'bg-green-500/10 text-green-600' : 'bg-orange-500/10 text-orange-600'
                                    }`}>{method}</span>
                                    <span className="text-foreground">{path}</span>
                                    <span className="text-muted-foreground ml-auto text-right hidden sm:block">{desc}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
