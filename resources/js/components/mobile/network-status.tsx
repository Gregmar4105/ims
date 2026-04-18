import { WifiOff, AlertTriangle } from 'lucide-react';
import { useMobileApi } from '@/hooks/use-mobile-api';

export function NetworkStatus() {
    const { isOnline } = useMobileApi();

    if (isOnline) return null;

    return (
        <div className="fixed top-0 left-0 w-full z-[100] animate-in slide-in-from-top duration-500 ease-out">
            <div className="bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-between shadow-lg border-b border-white/10">
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
