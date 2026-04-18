import { Bike } from 'lucide-react';
import React from 'react';

export function SplashScreen() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden">
            {/* Background Layer with Dark Overlay for readability */}
            <div 
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
                style={{ backgroundImage: 'url("/splash.png")' }}
            />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

            {/* Content Layer */}
            <div className="relative z-10 flex flex-col items-center">
                <div className="relative mb-8">
                    {/* Pulsing Outer Ring */}
                    <div className="absolute inset-[-20px] rounded-full border-2 border-primary/30 animate-ping opacity-20" />
                    
                    {/* Bike Animation Container */}
                    <div className="bg-white/10 backdrop-blur-md p-8 rounded-full border border-white/20 shadow-2xl">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                            <Bike className="w-16 h-16 text-white animate-bounce" />
                            
                            {/* Spinning Wheels Sub-Animation */}
                            <div className="absolute bottom-1 left-2 w-6 h-6 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                            <div className="absolute bottom-1 right-2 w-6 h-6 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                        </div>
                    </div>
                </div>

                <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom duration-1000">
                    <p className="text-3xl font-black text-white tracking-tighter uppercase italic">LM2 Bicycle</p>
                    <p className="text-[10px] font-bold text-primary/80 uppercase tracking-[0.4em] ml-1">Trading System</p>
                </div>
            </div>

            {/* Bottom Loading Progress */}
            <div className="absolute bottom-20 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-progress-indeterminant" style={{ width: '40%' }} />
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes progress-indeterminant {
                    0% { transform: translateX(-100%); width: 30%; }
                    50% { width: 60%; }
                    100% { transform: translateX(400%); width: 30%; }
                }
                .animate-progress-indeterminant {
                    animation: progress-indeterminant 2s infinite ease-in-out;
                }
            `}} />
        </div>
    );
}
