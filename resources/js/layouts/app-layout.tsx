import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import { Toaster } from 'sonner';

import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default function AppLayout({ children, breadcrumbs, ...props }: AppLayoutProps) {
    const { auth, flash } = usePage().props as any;
    const [isCapacitorWrapper, setIsCapacitorWrapper] = useState(false);
    const [testingNotification, setTestingNotification] = useState(false);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    // OneSignal Logic
    useEffect(() => {
        if (auth?.user) {
            // ── Median / GoNative wrapper ────────────────────────────────
            const savePlayerId = (attempts = 0) => {
                if (attempts > 20) return;

                const median = window.median || window.gonative;
                if (median) {
                    // Ensure OneSignal is registered
                    if (median.onesignal) {
                        median.onesignal.register();

                        median.onesignal.info().then((info: any) => {
                            // We need the OneSignal Player ID (UUID) for include_player_ids targeting
                            // prioritized over oneSignalUserId (External ID)
                            const playerId = info.oneSignalId || info.userId;

                            if (playerId) {
                                axios.post('/user/onesignal-id', {
                                    player_id: playerId
                                }).catch(err => console.error('OneSignal Save Error:', err));
                            } else {
                                setTimeout(() => savePlayerId(attempts + 1), 1000);
                            }
                        }).catch(() => setTimeout(() => savePlayerId(attempts + 1), 1000));
                    }
                } else {
                    setTimeout(() => savePlayerId(attempts + 1), 1000);
                }
            };

            savePlayerId();

            // ── Capacitor Android Wrapper ────────────────────────────────
            // The native MainActivity injects `window.__onesignal_player_id`
            // and dispatches an 'onesignal-ready' custom event.
            const handleCapacitorOneSignal = (playerId: string) => {
                if (playerId) {
                    setIsCapacitorWrapper(true);
                    axios.post('/user/onesignal-id', {
                        player_id: playerId
                    }).then(() => {
                        console.log('[Capacitor] OneSignal Player ID saved:', playerId);
                    }).catch(err => console.error('[Capacitor] OneSignal Save Error:', err));
                }
            };

            // Listen for native injection event
            const handleOneSignalReady = (e: any) => {
                const playerId = e.detail?.playerId;
                handleCapacitorOneSignal(playerId);
            };
            window.addEventListener('onesignal-ready', handleOneSignalReady);

            // Check if already set (native resolved before React mounted)
            if ((window as any).__onesignal_player_id) {
                handleCapacitorOneSignal((window as any).__onesignal_player_id);
            }

            // Also check for the Capacitor wrapper flag
            if ((window as any).__is_capacitor_wrapper) {
                setIsCapacitorWrapper(true);
            }

            return () => {
                window.removeEventListener('onesignal-ready', handleOneSignalReady);
            };
        }
    }, [auth?.user?.id]);

    const handleTestNotification = async () => {
        setTestingNotification(true);
        try {
            const response = await axios.post('/push-notification/test');
            toast.success(response.data.message || 'Test notification sent!');
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Failed to send test notification.';
            toast.error(errorMsg);
        } finally {
            setTestingNotification(false);
        }
    };

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
            {children}
            <Toaster position="top-center" richColors closeButton duration={3000} visibleToasts={5} />

            {/* Floating Test Notification Button — only in Capacitor wrapper */}
            {isCapacitorWrapper && (
                <button
                    onClick={handleTestNotification}
                    disabled={testingNotification}
                    title="Send test push notification"
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        zIndex: 9999,
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff',
                        fontSize: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                        cursor: testingNotification ? 'wait' : 'pointer',
                        opacity: testingNotification ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                    }}
                >
                    {testingNotification ? '⏳' : '🔔'}
                </button>
            )}
        </AppLayoutTemplate>
    );
}
