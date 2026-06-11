import '../css/app.css';
import './echo';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LoadingScreen } from '@/components/loading-screen';
import { initializeTheme } from './hooks/use-appearance';
import axios from 'axios';


// Axios Config
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.withCredentials = true;

declare global {
    interface Window {
        median?: any;
        gonative?: any;
    }
}

const appName = import.meta.env.VITE_APP_NAME || 'LM2 Bicycle Trading';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <App {...props} />
                <LoadingScreen />
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

// Handle dynamic import / chunk loading failures gracefully (e.g., after new deployments/builds)
window.addEventListener('error', (e) => {
    const isChunkError = 
        e.message?.includes('Failed to fetch dynamically imported module') || 
        e.message?.includes('Importing a module script failed') ||
        e.message?.includes('dynamic import');
    if (isChunkError) {
        window.location.reload();
    }
});

window.addEventListener('unhandledrejection', (e) => {
    const isChunkError = 
        e.reason?.message?.includes('Failed to fetch dynamically imported module') || 
        e.reason?.message?.includes('Importing a module script failed') ||
        e.reason?.message?.includes('dynamic import') ||
        (e.reason && String(e.reason).includes('Failed to fetch dynamically imported module'));
    if (isChunkError) {
        window.location.reload();
    }
});
