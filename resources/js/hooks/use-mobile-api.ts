import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';

const STORAGE_KEY = 'lm2_mobile_api_config';

function loadConfig(): Record<string, any> {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
        return {};
    }
}

/** 
 * Dedicated axios instance for cross-origin calls to the production server.
 * withCredentials MUST be false — Bearer token auth, wildcard CORS.
 */
export const remoteApi = axios.create({ withCredentials: false });

export function useMobileApi() {
    const [cfg, setCfg] = useState<Record<string, any>>({});
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setCfg(loadConfig());
        setIsHydrated(true);
    }, []);

    const token = cfg.auth_token ?? null;
    const serverUrl = cfg.server_url ? cfg.server_url.replace(/\/$/, '') : 'https://lm2bicycletrading.larable.dev';
    const authUser = cfg.auth_user ?? null;

    useEffect(() => {
        if (!isHydrated) return;

        if (!token) {
            router.visit('/settings/mobile-api');
            return;
        }

        // Apply token to default headers
        remoteApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Global response interceptor for 401 Unauthorized
        const interceptor = remoteApi.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    console.error('Remote API 401: Token expired or invalid.');
                    localStorage.removeItem(STORAGE_KEY);
                    router.visit('/settings/mobile-api');
                }
                return Promise.reject(error);
            }
        );

        return () => {
            remoteApi.interceptors.response.eject(interceptor);
        };
    }, [token, isHydrated]);

    // Sync localStorage to local PHP SQLite (for NativePHP events/listeners)
    useEffect(() => {
        if (!isHydrated || !token) return;
        
        // Use standard axios (not remoteApi) to call LOCAL host
        axios.get(`/api/local/sync-config?token=${encodeURIComponent(token)}&url=${encodeURIComponent(serverUrl)}`)
            .catch(err => console.error('Local sync failed:', err));
    }, [token, serverUrl, isHydrated]);

    const [isOnline, setIsOnline] = useState(window.navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const logout = () => {
        localStorage.removeItem(STORAGE_KEY);
        router.visit('/settings/mobile-api');
    };

    const refreshUser = async () => {
        try {
            const res = await remoteApi.get(`${serverUrl}/api/mobile/user`);
            const newCfg = { ...cfg, auth_user: res.data };
            setCfg(newCfg);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newCfg));
            return res.data;
        } catch (err) {
            console.error('Failed to refresh user info:', err);
            return null;
        }
    };

    const resolveImageUrl = (path: string | undefined | null) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        // Clean up path
        const cleanPath = path.replace(/^\/+/, '').replace(/^storage\//, '');
        return `${serverUrl}/storage/${cleanPath}`;
    };

    return {
        remoteApi,
        serverUrl,
        token,
        authUser,
        isHydrated,
        isOnline,
        logout,
        refreshUser,
        resolveImageUrl
    };
}
