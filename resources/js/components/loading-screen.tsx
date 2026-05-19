import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export function LoadingScreen() {
    const isMobile = useIsMobile();
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        let interval: ReturnType<typeof setInterval>;

        const start = () => {
            if (!isMobile) return;

            setIsExiting(false);
            setIsVisible(true);
            setProgress(0);
            
            // Simulated progress for better UX
            let simulatedProgress = 0;
            interval = setInterval(() => {
                simulatedProgress += Math.random() * 15;
                if (simulatedProgress > 95) {
                    simulatedProgress = 95;
                    clearInterval(interval);
                }
                setProgress(simulatedProgress);
            }, 150);
        };

        const finish = () => {
            clearInterval(interval);
            setProgress(100);
            setIsExiting(true);
            timeout = setTimeout(() => {
                setIsVisible(false);
                setIsExiting(false);
            }, 500);
        };

        const unbindStart = router.on('start', (event) => {
            if (event.detail.visit.only.length > 0) return;
            start();
        });
        const unbindFinish = router.on('finish', (event) => {
            finish();
        });

        return () => {
            unbindStart();
            unbindFinish();
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [isMobile]);

    if (!isVisible) return null;

    return (
        <div 
            className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center transition-opacity duration-500 ${
                isExiting ? 'opacity-0' : 'opacity-100'
            }`}
        >
            {/* Full Screen Background Splash */}
            <div className="absolute inset-0 z-[-1]">
                <img 
                    src="/splash.png" 
                    alt="" 
                    className="h-full w-full object-cover"
                />
            </div>

            {/* Simple Gray/Black Loading Bar - Positioned 15% lower than center (65% height) */}
            <div className="fixed top-[65%] w-full max-w-[250px] px-4">
                <div className="w-full h-[4px] bg-[#cccccc] rounded-full overflow-hidden relative shadow-lg">
                    {/* Deep Black Progress Line - Thicker and definitely on top */}
                    <div 
                        className="absolute top-0 left-0 h-full bg-black transition-all duration-500 ease-out z-20"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
