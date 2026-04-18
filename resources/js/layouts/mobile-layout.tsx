import { Head } from '@inertiajs/react';
import { FloatingHeader } from '@/components/mobile/floating-header';
import { FloatActionButton } from '@/components/mobile/fab';
import { useMobileApi } from '@/hooks/use-mobile-api';
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
        <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
            <Head title={title ? `${title} — IMS Mobile` : "IMS Mobile"} />
            
            {/* The Floating Search Bar & Drawer */}
            <FloatingHeader title={title} onSearch={onSearch} />

            {/* Scrollable Content Area */}
            {/* 64px top padding gives room for the floating header */}
            <main className="h-screen overflow-y-auto pb-24 pt-20 px-4">
                {children}
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
