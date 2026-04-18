import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { SplashScreen } from './splash-screen';

interface BootContext {
    isBooted: boolean;
}

const BootContext = createContext<BootContext>({ isBooted: false });

export const useBoot = () => useContext(BootContext);

export function BootProvider({ children }: { children: React.ReactNode }) {
    const [isBooted, setIsBooted] = useState(false);

    useEffect(() => {
        // 1. Check for token immediately
        const configStr = localStorage.getItem('lm2_mobile_api_config');
        const config = configStr ? JSON.parse(configStr) : {};
        const hasToken = !!config.auth_token;
        const currentPath = window.location.pathname;

        // 2. Handle immediate redirection if needed
        // We only redirect if we're on a mobile/dashboard route and don't have a token
        const isMobileRoute = currentPath.startsWith('/mobile') || currentPath === '/dashboard';
        
        if (isMobileRoute && !hasToken && currentPath !== '/settings/mobile-api') {
            router.visit('/settings/mobile-api', { replace: true });
        }

        // Delay slightly for hydration safety
        const timer = setTimeout(() => {
            setIsBooted(true);
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    return (
        <BootContext.Provider value={{ isBooted }}>
            {children}
        </BootContext.Provider>
    );
}
