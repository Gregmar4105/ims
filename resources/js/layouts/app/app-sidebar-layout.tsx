import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { AppMobileHeader } from '@/components/app-mobile-header';
import { BottomNav } from '@/components/bottom-nav';
import SEO from '@/components/seo';
import { type BreadcrumbItem } from '@/types';
import { useEffect, type PropsWithChildren } from 'react';
import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { url } = usePage();
    useEffect(() => {
        const checkAndApplyMobileStyles = () => {
            const isMobileViewport = window.innerWidth < 768; // md breakpoint is 768px
            if (isMobileViewport) {
                document.documentElement.style.overflow = 'hidden';
                document.documentElement.style.height = '100svh';
                document.documentElement.style.overscrollBehavior = 'none';

                document.body.style.overflow = 'hidden';
                document.body.style.height = '100svh';
                document.body.style.overscrollBehavior = 'none';
            } else {
                document.documentElement.style.overflow = '';
                document.documentElement.style.height = '';
                document.documentElement.style.overscrollBehavior = '';

                document.body.style.overflow = '';
                document.body.style.height = '';
                document.body.style.overscrollBehavior = '';
            }
        };

        checkAndApplyMobileStyles();
        window.addEventListener('resize', checkAndApplyMobileStyles);

        return () => {
            window.removeEventListener('resize', checkAndApplyMobileStyles);
            document.documentElement.style.overflow = '';
            document.documentElement.style.height = '';
            document.documentElement.style.overscrollBehavior = '';

            document.body.style.overflow = '';
            document.body.style.height = '';
            document.body.style.overscrollBehavior = '';
        };
    }, []);

    return (
        <AppShell variant="sidebar">
            <SEO />
            <AppSidebar />
            <AppContent 
                variant="sidebar" 
                className={cn(
                    "overflow-x-hidden h-svh overflow-y-auto overscroll-behavior-y-contain md:h-auto md:overflow-visible md:pb-0",
                    url.includes('chat') 
                        ? "pt-0 md:pt-0 pb-[env(safe-area-inset-bottom,0px)]" 
                        : "pt-16 md:pt-0 pb-[calc(env(safe-area-inset-bottom,0px)+4.5rem)]"
                )}
            >
                <div className="hidden md:block">
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                </div>
                <div className="block md:hidden">
                    <AppMobileHeader />
                </div>
                {children}
            </AppContent>
            <BottomNav />
        </AppShell>
    );
}

