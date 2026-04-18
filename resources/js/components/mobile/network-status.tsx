import { WifiOff, AlertTriangle } from 'lucide-react';
import { useMobileApi } from '@/hooks/use-mobile-api';

export function NetworkStatus() {
    const { isOnline } = useMobileApi();

    if (isOnline) return null;

    return (
        <div className="w-full z-[30] animate-in slide-in-from-top duration-500 ease-out px-4 py-2">
            <div className="bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-between shadow-lg border border-white/10 rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-full">
                        <WifiOff className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-tight">Network Error</p>
                        <p className="text-[10px] opacity-80 font-medium whitespace-nowrap">Please check your internet connection</p>
                    </div>
                </div>
                <AlertTriangle className="w-5 h-5 opacity-40 animate-pulse" />
            </div>
        </div>
    );
}
