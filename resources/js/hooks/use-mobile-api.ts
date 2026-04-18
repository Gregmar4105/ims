import { useEffect, useState } from 'react';
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

    return {
        remoteApi,
        serverUrl,
        token,
        authUser,
        isHydrated,
        logout: () => {
            localStorage.removeItem(STORAGE_KEY);
            router.visit('/settings/mobile-api');
        }
    };
}
