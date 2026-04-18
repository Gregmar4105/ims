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
        // 1. Check for token and role immediately
        const configStr = localStorage.getItem('lm2_mobile_api_config');
        const config = configStr ? JSON.parse(configStr) : {};
        const hasToken = !!config.auth_token;
        const currentPath = window.location.pathname;
        const roles: string[] = config.auth_user?.roles || [];

        // 2. Handle immediate redirection if needed
        const isMobileRoute = currentPath.startsWith('/mobile') || currentPath === '/dashboard' || currentPath === '/';
        
        if (isMobileRoute) {
            if (!hasToken && currentPath !== '/settings/mobile-api') {
                router.visit('/settings/mobile-api', { replace: true });
            } else if (hasToken && currentPath === '/') {
                router.visit('/dashboard', { replace: true });
            }
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
