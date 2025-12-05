import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import { Toaster } from 'sonner';

import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default function AppLayout({ children, breadcrumbs, ...props }: AppLayoutProps) {
    const { auth, flash } = usePage().props as any;

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
            const savePlayerId = (attempts = 0) => {
                if (attempts > 10) return;

                const median = window.median || window.gonative;
                if (median) {
                    // Ensure OneSignal is registered
                    if (median.onesignal) {
                        median.onesignal.register();

                        median.onesignal.info().then((info: any) => {
                            if (info && info.oneSignalUserId) {
                                // Only send if we haven't already (optional optimization, but safe to resend)
                                axios.post('/user/onesignal-id', {
                                    player_id: info.oneSignalUserId
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
        }
    }, [auth?.user?.id]);

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
            {children}
            <Toaster position="top-center" richColors closeButton />
        </AppLayoutTemplate>
    );
}
