import { Head } from '@inertiajs/react';
import { FloatingHeader } from '@/components/mobile/floating-header';
import { FloatActionButton } from '@/components/mobile/fab';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { NetworkStatus } from '@/components/mobile/network-status';
import React from 'react';

export default function MobileLayout({
    children,
    title,
    onSearch,
    fab
}: {
    children: React.ReactNode;
    title?: string;
    onSearch?: (q: string) => void;
    fab?: { icon: React.ReactNode; label?: string; onClick?: () => void; href?: string; }
}) {
    const { isHydrated } = useMobileApi();

    if (!isHydrated) return null; // Avoid snap-in flashes

    return (
        <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
            <Head title={title ? `${title} — LM2 Bicycle Trading` : "LM2 Bicycle Trading"} />
            
            <style dangerouslySetInnerHTML={{ __html: `
                body { padding-right: 0px !important; }
                [data-radix-scroll-area-viewport] { scroll-behavior: smooth; }
            `}} />

            <NetworkStatus />

            {/* The Floating Search Bar & Drawer */}
            <FloatingHeader title={title} onSearch={onSearch} />

            {/* Scrollable Content Area */}
            <main className="pb-24 pt-24">
                <div className="px-4">
                    {children}
                </div>
            </main>

            {/* Floating Action Button */}
            {fab && (
                <FloatActionButton
                    icon={fab.icon}
                    label={fab.label}
                    onClick={fab.onClick}
                    href={fab.href}
                />
            )}
        </div>
    );
}
