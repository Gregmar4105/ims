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
    const [logs, setLogs] = useState<string[]>([]);
    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

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
            addLog(`User ID: ${auth.user.id}. Starting check...`);

            const savePlayerId = (attempts = 0) => {
                if (attempts > 20) {
                    addLog('Gave up after 20 attempts.');
                    return;
                }

                const median = window.median || window.gonative;
                if (median) {
                    addLog('Median found!');
                    // Ensure OneSignal is registered
                    if (median.onesignal) {
                        median.onesignal.register();

                        median.onesignal.info().then((info: any) => {
                            addLog(`Info: ${JSON.stringify(info)}`);
                            // Check for oneSignalUserId OR oneSignalId (based on user feedback)
                            const playerId = info.oneSignalUserId || info.oneSignalId;

                            if (playerId) {
                                axios.post('/user/onesignal-id', {
                                    player_id: playerId
                                }).then(() => {
                                    addLog('SUCCESS: Saved to DB');
                                }).catch(err => addLog(`POST Error: ${err.message}`));
                            } else {
                                addLog('No Player ID in info. Retrying...');
                                setTimeout(() => savePlayerId(attempts + 1), 1000);
                            }
                        }).catch((err: any) => {
                            addLog(`Info Error: ${err}`);
                            setTimeout(() => savePlayerId(attempts + 1), 1000);
                        });
                    } else {
                        addLog('median.onesignal missing');
                    }
                } else {
                    addLog(`Median not found (${attempts}/20)`);
                    setTimeout(() => savePlayerId(attempts + 1), 1000);
                }
            };

            savePlayerId();
        } else {
            addLog('No auth user found.');
        }
    }, [auth?.user?.id]);

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
            {children}
            <Toaster position="top-center" richColors closeButton />

            {/* Debug Overlay */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(0,0,0,0.8)',
                color: '#0f0',
                padding: '10px',
                fontSize: '10px',
                zIndex: 9999,
                maxHeight: '150px',
                overflowY: 'auto',
                pointerEvents: 'none'
            }}>
                <div style={{ borderBottom: '1px solid #333' }}>LAYOUT DEBUG</div>
                {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
        </AppLayoutTemplate>
    );
}
