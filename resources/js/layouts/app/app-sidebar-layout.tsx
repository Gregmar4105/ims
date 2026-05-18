import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { AppMobileHeader } from '@/components/app-mobile-header';
import { BottomNav } from '@/components/bottom-nav';
import SEO from '@/components/seo';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell variant="sidebar">
            <SEO />
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden pt-16 md:pt-0 pb-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] md:pb-0">

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

