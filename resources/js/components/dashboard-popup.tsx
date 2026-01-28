import { SharedData } from '@/types';
import { usePage, Link } from '@inertiajs/react';
import { X, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface DashboardPopupProps {
    className?: string;
}

export function DashboardPopup({ className }: DashboardPopupProps) {
    const { auth } = usePage<SharedData & { auth: { roles: string[] } }>().props;
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    // Get the dashboard URL based on user role
    const getDashboardUrl = (): string | null => {
        const roles = auth.roles || [];

        if (roles.includes('System Administrator')) {
            return '/system-dashboard';
        }
        if (roles.includes('Branch Manager') || roles.includes('Branch')) {
            return '/branch-dashboard';
        }
        if (roles.includes('Employee')) {
            return '/employee-dashboard';
        }

        // Default fallback - if user has any role, show branch dashboard
        if (roles.length > 0) {
            return '/branch-dashboard';
        }

        return null;
    };

    const getDashboardLabel = (): string => {
        const roles = auth.roles || [];

        if (roles.includes('System Administrator')) {
            return 'System Dashboard';
        }
        if (roles.includes('Branch Manager') || roles.includes('Branch')) {
            return 'Branch Dashboard';
        }
        if (roles.includes('Employee')) {
            return 'Employee Dashboard';
        }

        return 'Dashboard';
    };

    const dashboardUrl = getDashboardUrl();

    useEffect(() => {
        // Only show popup if user is logged in and has a valid dashboard
        if (auth.user && dashboardUrl) {
            // Check if popup was dismissed in this session
            const dismissed = sessionStorage.getItem('dashboard_popup_dismissed');
            if (!dismissed) {
                // Delay showing popup for better UX
                const timer = setTimeout(() => {
                    setIsVisible(true);
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [auth.user, dashboardUrl]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            sessionStorage.setItem('dashboard_popup_dismissed', 'true');
        }, 300);
    };

    if (!auth.user || !dashboardUrl || !isVisible) {
        return null;
    }

    return (
        <div
            className={`fixed top-20 right-4 z-50 ${isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'} ${className}`}
        >
            <div className="relative overflow-hidden rounded-xl border border-sidebar-border/80 bg-background/95 backdrop-blur shadow-lg max-w-xs">
                {/* Decorative gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />

                {/* Content */}
                <div className="p-4 pt-5">
                    {/* Header with close button */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                <LayoutDashboard className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Welcome back!</p>
                                <p className="text-xs text-muted-foreground">{auth.user.name}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="text-muted-foreground hover:text-foreground transition-colors -mt-1 -mr-1 p-1 rounded-md hover:bg-muted"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-muted-foreground mb-4">
                        Access your personalized dashboard to manage your tasks and view analytics.
                    </p>

                    {/* Action button */}
                    <Link href={dashboardUrl} className="block">
                        <Button className="w-full" size="sm">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Go to {getDashboardLabel()}
                        </Button>
                    </Link>
                </div>

                {/* Pointer arrow */}
                <div className="absolute -top-2 right-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-background" />
            </div>
        </div>
    );
}

export default DashboardPopup;
