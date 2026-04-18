import { Head } from '@inertiajs/react';
import { FloatingHeader } from '@/components/mobile/floating-header';
import { FloatActionButton } from '@/components/mobile/fab';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { NetworkStatus } from '@/components/mobile/network-status';
import React, { useState } from 'react';
import { QrCode } from 'lucide-react';
import { ScannerModal } from '@/components/mobile/scanner-modal';

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
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    if (!isHydrated) return null; // Avoid snap-in flashes

    return (
        <div className="min-h-screen bg-background font-sans text-foreground pb-safe">
            <Head title={title ? `${title} — LM2 Bicycle Trading` : "LM2 Bicycle Trading"} />
            
            <style dangerouslySetInnerHTML={{ __html: `
                body { padding-right: 0px !important; }
                [data-radix-scroll-area-viewport] { scroll-behavior: smooth; }
            `}} />

            <NetworkStatus />

            {/* The Floating Search Bar & Drawer */}
            <FloatingHeader title={title} onSearch={onSearch} />

            {/* Scrollable Content Area */}
            <main className="pb-24 pt-24 min-h-screen">
                <div className="px-4">
                    {children}
                </div>
            </main>

            {/* Global QR Scanner Button */}
            <FloatActionButton
                icon={<QrCode className="w-6 h-6" />}
                onClick={() => setIsScannerOpen(true)}
                customBottom={fab ? 'bottom-[calc(7.5rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(1.5rem+env(safe-area-inset-bottom))]'}
                variant="secondary"
            />

            {/* QR Scanner Modal */}
            <ScannerModal 
                isOpen={isScannerOpen} 
                onClose={() => setIsScannerOpen(false)} 
            />

            {/* Page-Specific Action Button */}
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
