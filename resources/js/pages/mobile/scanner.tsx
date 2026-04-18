import MobileLayout from '@/layouts/mobile-layout';
import { QrCode, X, Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';

export default function MobileScanner() {
    const [scanned, setScanned] = useState<string | null>(null);
    const [torch, setTorch] = useState(false);

    // Mock scanning behavior for now
    useEffect(() => {
        const timer = setTimeout(() => {
            // Logic for real scanner would go here
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col font-sans">
            <div className="p-6 flex items-center justify-between z-10 text-white">
                <button onClick={() => router.back()} className="p-2 rounded-full bg-white/10">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <p className="font-bold text-lg">Scan QR Code</p>
                <button onClick={() => setTorch(!torch)} className={`p-2 rounded-full ${torch ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white'}`}>
                    <Zap className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="relative w-full max-w-[280px] aspect-square rounded-[3rem] border-2 border-white/20 flex items-center justify-center overflow-hidden">
                    {/* Scanner Background - in real app this would be the video feed */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-primary/20 animate-pulse" />
                    
                    {/* Scan Frame */}
                    <div className="w-[80%] h-[80%] border-2 border-primary rounded-2xl relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary -mt-1 -ml-1 rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary -mt-1 -mr-1 rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary -mb-1 -ml-1 rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary -mb-1 -mr-1 rounded-br-xl" />
                        
                        {/* Scanning Line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.5)] animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                </div>

                <div className="mt-12 text-center text-white/60">
                    <p className="text-sm font-medium">Place the code inside the frame</p>
                    <p className="text-[10px] uppercase tracking-widest mt-2 opacity-50">Auto-Detecting...</p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan {
                    0%, 100% { top: 0%; }
                    50% { top: 100%; }
                }
            `}} />
        </div>
    );
}
