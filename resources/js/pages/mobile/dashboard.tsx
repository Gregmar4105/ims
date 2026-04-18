import React, { useState, useEffect } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Plus } from 'lucide-react';
import { router } from '@inertiajs/react';
import axios from 'axios';

interface Summary {
    total_sales: number;
    pending_sales: number;
    approved_sales: number;
    pending_transfers: number;
    low_stock_items: number;
}

interface DashboardData {
    summary: Summary;
    branch: { id: number; branch_name: string; location: string } | null;
    synced_at: string;
}

export default function MobileDashboard() {
    const { remoteApi, authUser, logout, serverUrl, isHydrated, token } = useMobileApi();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const roles = authUser?.roles || [];
    const isSystemAdmin = roles.includes('System Administrator');
    const isBranchAdmin = roles.includes('Branch Administrator');
    const isEmployee = roles.includes('Employee');

    useEffect(() => {
        if (isHydrated && serverUrl) {
            if (token) {
                fetchDashboard();
            }
            
            // Fallback: trigger enrollment
            axios.get('/mobile/push-enroll').catch(() => {});
        }
    }, [isHydrated, serverUrl, token]);

    const fetchDashboard = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await remoteApi.get<DashboardData>(`${serverUrl}/api/mobile/dashboard`);
            setData(res.data);
        } catch (err: any) {
            console.error('API Error:', err?.response?.data);
            const msg = err?.response?.data?.message || err?.message || 'Failed to load dashboard.';
            setError(`${msg} (HTTP ${err?.response?.status || 'Unknown'})`);
        } finally {
            setLoading(false);
        }
    };

    const s = data?.summary;
    const title = data?.branch?.branch_name ?? authUser?.name ?? 'Dashboard';

    return (
        <MobileLayout 
            title={title}
            fab={{
                icon: <Plus className="w-6 h-6" />,
                label: "New Sale",
                onClick: () => router.visit('/mobile/sales/create')
            }}
        >
            <div className="space-y-5">
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
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />}
                    />
                    <StatCard
                        label="Pending Sales"
                        value={s?.pending_sales}
                        loading={loading}
                        accent="yellow"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    />
                    <StatCard
                        label="Approved Sales"
                        value={s?.approved_sales}
                        loading={loading}
                        accent="green"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    />
                    <StatCard
                        label="Pending Transfers"
                        value={s?.pending_transfers}
                        loading={loading}
                        accent="purple"
                        icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />}
                    />
                </div>

                {/* ── Low stock alert ────────────────────────────────────── */}
                {!loading && s && s.low_stock_items > 0 && (
                    <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 flex items-center gap-3">
                        <svg className="h-5 w-5 shrink-0 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
                {/* ── Role-Specific Sections ─────────────────────────────────────── */}
                
                {/* SYSTEM ADMINISTRATOR SECTION */}
                {isSystemAdmin && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-1">System Management</p>
                        <div className="grid grid-cols-2 gap-3">
                            <ActionButton 
                                href="/mobile/users" 
                                label="Users" 
                                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />} 
                            />
                            <ActionButton 
                                href="/mobile/branches" 
                                label="Branches" 
                                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />} 
                            />
                            <ActionButton 
                                href="/settings/appearance" 
                                label="Appearance" 
                                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />} 
                            />
                            <ActionButton 
                                href="/dashboard" // This is essentially the system dashboard view
                                label="System Stats" 
                                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />} 
                            />
                        </div>
                    </div>
                )}

                {/* BRANCH ADMINISTRATOR SECTION */}
                {(isBranchAdmin || isSystemAdmin) && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-75">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-1">Branch Operations</p>
                        <div className="grid grid-cols-2 gap-3">
                            <ActionButton 
                                href="/mobile/sales" 
                                label="Sales History" 
                                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />} 
                            />
                            <ActionButton 
                                href="/mobile/transfers" 
                                label="Transfers" 
                                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />} 
                            />
                            <ActionButton 
                                href="/mobile/chats" 
                                label="Messages" 
                                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />} 
                            />
                            <ActionButton 
                                href="/mobile/products" 
                                label="Inventory" 
                                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />} 
                            />
                        </div>
                    </div>
                )}

                {/* EMPLOYEE SECTION */}
                {isEmployee && !isSystemAdmin && !isBranchAdmin && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-1">My Workplace</p>
                        <div className="grid grid-cols-2 gap-3">
                            <ActionButton 
                                href="/mobile/sales/create" 
                                label="New Sale" 
                                icon={<Plus className="w-5 h-5" />} 
                            />
                            <ActionButton 
                                href="/mobile/chats" 
                                label="Branch Chat" 
                                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />} 
                            />
                        </div>
                    </div>
                )}

                {/* ── Utilities ─────────────────────────────────────────── */}
                <div className="pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">Utilities</p>
                    <div className="grid grid-cols-2 gap-3">
                        <ActionButton href="/settings/mobile-api" label="Connect" icon={
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        } />
                        <ActionButton label="Sync Now" onClick={fetchDashboard} icon={
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        } />
                        <ActionButton href="/mobile/push-test" label="Push Test" icon={
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        } />
                    </div>
                </div>

                {/* ── Sync info ──────────────────────────────────────────── */}
                {data?.synced_at && (
                    <p className="text-center text-xs text-muted-foreground pb-4">
                        Last seen: {new Date(data.synced_at).toLocaleString()}
                    </p>
                )}
            </div>
        </MobileLayout>
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
        <div className="rounded-xl border border-border bg-card p-4 space-y-2 relative overflow-hidden">
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
                       hover:bg-muted/50 active:scale-95 transition-all w-full"
        >
            <svg className="h-5 w-5 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {icon}
            </svg>
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
}
