import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

const STORAGE_KEY = 'lm2_mobile_api_config';

function loadConfig(): Record<string, any> {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); }
    catch { return {}; }
}

/** Cross-origin axios — no credentials needed, uses Bearer token */
const remoteApi = axios.create({ withCredentials: false });

interface Summary {
    total_sales: number;
    pending_sales: number;
    approved_sales: number;
    pending_transfers: number;
    low_stock_items: number;
}

interface DashboardData {
    summary: Summary;
    branch: { id: number; branch_name: string; address: string } | null;
    synced_at: string;
}

export default function MobileDashboard() {
    const [cfg]    = useState(() => loadConfig());
    const [data, setData]     = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState('');

    const authUser    = cfg.auth_user ?? null;
    const serverUrl   = (cfg.server_url ?? 'https://lm2bicycletrading.larable.dev').replace(/\/$/, '');
    const token       = cfg.auth_token ?? null;

    // Guard: if no token, send back to setup page
    useEffect(() => {
        if (!token) {
            router.visit('/settings/mobile-api');
            return;
        }
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await remoteApi.get<DashboardData>(`${serverUrl}/api/mobile/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setData(res.data);
        } catch (err: any) {
            if (err?.response?.status === 401) {
                // Token expired — redirect back to settings
                router.visit('/settings/mobile-api');
                return;
            }
            setError(err?.response?.data?.message ?? 'Failed to load dashboard. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = () => {
        localStorage.removeItem(STORAGE_KEY);
        router.visit('/settings/mobile-api');
    };

    const s = data?.summary;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title="Dashboard — LM2 IMS Mobile" />

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="border-b border-border bg-card px-5 py-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">LM2 IMS</p>
                    <p className="text-xs text-muted-foreground truncate">
                        {data?.branch?.branch_name ?? authUser?.name ?? 'Loading…'}
                    </p>
                </div>
                <button onClick={fetchDashboard} disabled={loading}
                    className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
                <button onClick={handleDisconnect}
                    className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>

            <div className="px-5 py-6 space-y-5">

                {error && (
                    <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                        {error}
                        <button onClick={fetchDashboard} className="ml-2 underline font-medium">Retry</button>
                    </div>
                )}

                {/* ── Summary cards ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                    <StatCard
                        label="Total Sales"
                        value={s?.total_sales}
                        loading={loading}
                        accent="blue"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />}
                    />
                    <StatCard
                        label="Pending Sales"
                        value={s?.pending_sales}
                        loading={loading}
                        accent="yellow"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    />
                    <StatCard
                        label="Approved Sales"
                        value={s?.approved_sales}
                        loading={loading}
                        accent="green"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    />
                    <StatCard
                        label="Pending Transfers"
                        value={s?.pending_transfers}
                        loading={loading}
                        accent="purple"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />}
                    />
                </div>

                {/* ── Low stock alert ────────────────────────────────────── */}
                {!loading && s && s.low_stock_items > 0 && (
                    <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 flex items-center gap-3">
                        <svg className="h-5 w-5 shrink-0 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                {s.low_stock_items} Low Stock {s.low_stock_items === 1 ? 'Item' : 'Items'}
                            </p>
                            <p className="text-xs text-orange-500/70">Items below reorder level</p>
                        </div>
                    </div>
                )}

                {/* ── Quick actions ─────────────────────────────────────── */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-3">
                        <ActionButton href="/settings/mobile-api" label="API Settings" icon={
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        } />
                        <ActionButton label="Refresh" onClick={fetchDashboard} icon={
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        } />
                    </div>
                </div>

                {/* ── Sync info ──────────────────────────────────────────── */}
                {data?.synced_at && (
                    <p className="text-center text-xs text-muted-foreground">
                        Last synced: {new Date(data.synced_at).toLocaleString()}
                    </p>
                )}
            </div>
        </div>
    );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const accentMap: Record<string, string> = {
    blue:   'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10',
    green:  'text-green-600 dark:text-green-400 bg-green-500/10',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
};

function StatCard({ label, value, loading, accent, icon }: {
    label: string; value?: number; loading: boolean; accent: string; icon: React.ReactNode;
}) {
    const cls = accentMap[accent] ?? accentMap.blue;
    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cls}`}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
            </div>
            <p className="text-2xl font-bold">
                {loading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-muted" /> : (value ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function ActionButton({ href, label, onClick, icon }: {
    href?: string; label: string; onClick?: () => void; icon: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick ?? (() => href && router.visit(href))}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left
                       hover:bg-muted/50 active:scale-95 transition-all"
        >
            <svg className="h-5 w-5 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icon}
            </svg>
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
}
