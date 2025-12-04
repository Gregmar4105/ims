import '../css/app.css';
import './echo';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
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

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Debug Component
const DebugOverlay = ({ logs }: { logs: string[] }) => {
    if (logs.length === 0) return null;
    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0,0,0,0.8)',
            color: '#0f0',
            padding: '10px',
            fontSize: '12px',
            zIndex: 9999,
            maxHeight: '200px',
            overflowY: 'auto',
            pointerEvents: 'none'
        }}>
            {logs.map((log, i) => <div key={i}>{log}</div>)}
        </div>
    );
};

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        const AppWrapper = (appProps: any) => {
            const [logs, setLogs] = useState<string[]>([]);
            const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

            useEffect(() => {
                if (appProps.initialPage.props.auth?.user) {
                    addLog('User logged in. Starting OneSignal check...');

                    const savePlayerId = (attempts = 0) => {
                        if (attempts > 10) {
                            addLog('Gave up after 10 attempts.');
                            return;
                        }

                        const median = window.median || window.gonative;
                        if (median) {
                            addLog('Median/GoNative object found!');

                            // Ensure OneSignal is registered
                            if (median.onesignal) {
                                median.onesignal.register(); // Prompt for permission

                                median.onesignal.info().then((info: any) => {
                                    addLog(`Info received: ${JSON.stringify(info)}`);
                                    if (info && info.oneSignalUserId) {
                                        addLog(`Player ID found: ${info.oneSignalUserId}`);
                                        axios.post('/user/onesignal-id', {
                                            player_id: info.oneSignalUserId
                                        }).then(() => {
                                            addLog('SUCCESS: Player ID saved to backend.');
                                        }).catch(err => {
                                            addLog(`ERROR: Backend save failed: ${err.message}`);
                                        });
                                    } else {
                                        addLog('Info received but no oneSignalUserId. Retrying...');
                                        setTimeout(() => savePlayerId(attempts + 1), 1000);
                                    }
                                }).catch((err: any) => {
                                    addLog(`Median Info Promise Failed: ${err}`);
                                    setTimeout(() => savePlayerId(attempts + 1), 1000);
                                });
                            } else {
                                addLog('median.onesignal is undefined!');
                            }
                        } else {
                            addLog(`Median not found (Attempt ${attempts + 1}/10)`);
                            setTimeout(() => savePlayerId(attempts + 1), 1000);
                        }
                    };

                    savePlayerId();
                }
            }, []);

            return (
                <>
                    <App {...appProps} />
                    <DebugOverlay logs={logs} />
                </>
            );
        };

        root.render(
            <StrictMode>
                <AppWrapper {...props} />
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
