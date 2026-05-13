import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import { Toaster } from '@/components/ui/sonner';
import SEO from '@/components/seo';
import { type BreadcrumbItem } from '@/types';
import type { PropsWithChildren } from 'react';

export default function AppHeaderLayout({
    children
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell>
            <SEO />
            <Toaster position="top-right" closeButton />
            <AppHeader/>
            <AppContent>{children}</AppContent>
        </AppShell>
    );
}
