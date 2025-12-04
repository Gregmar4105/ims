import '../css/app.css';
import './echo';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import axios from 'axios';

declare global {
    interface Window {
        median?: any;
        gonative?: any;
    }
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Median.co (GoNative) OneSignal Integration
        if (props.initialPage.props.auth?.user) {
            const savePlayerId = (attempts = 0) => {
                if (attempts > 10) return;

                const median = window.median || window.gonative;
                if (median) {
                    median.onesignal.info().then((info: any) => {
                        if (info && info.oneSignalUserId) {
                            axios.post('/user/onesignal-id', {
                                player_id: info.oneSignalUserId
                            }).catch(err => console.error('Failed to save Player ID', err));
                        } else {
                            // Median loaded but info not ready, retry
                            setTimeout(() => savePlayerId(attempts + 1), 1000);
                        }
                    }).catch(() => {
                        // Promise failed, retry
                        setTimeout(() => savePlayerId(attempts + 1), 1000);
                    });
                } else {
                    // Median not loaded, retry
                    setTimeout(() => savePlayerId(attempts + 1), 1000);
                }
            };

            savePlayerId();
        }

        root.render(
            <StrictMode>
                <App {...props} />
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
