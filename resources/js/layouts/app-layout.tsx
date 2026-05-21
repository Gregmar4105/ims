import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import { Toaster } from 'sonner';

import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { useBluetoothPrinter } from '@/hooks/useBluetoothPrinter';
import { Printer, Bluetooth, Check, Wifi, X, RefreshCw } from 'lucide-react';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default function AppLayout({ children, breadcrumbs, ...props }: AppLayoutProps) {
    const { auth, flash } = usePage().props as any;
    const [isCapacitorWrapper, setIsCapacitorWrapper] = useState(false);
    const [testingNotification, setTestingNotification] = useState(false);
    const bt = useBluetoothPrinter();
    const [showPrinterModal, setShowPrinterModal] = useState(false);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    // Global listener for opening printer settings modal
    useEffect(() => {
        const handleTriggerSettings = () => {
            setShowPrinterModal(true);
            bt.scan();
        };
        window.addEventListener('trigger-printer-settings', handleTriggerSettings);
        return () => {
            window.removeEventListener('trigger-printer-settings', handleTriggerSettings);
        };
    }, [bt]);

    // OneSignal Logic
    useEffect(() => {
        if (auth?.user) {
            // ── Median / GoNative wrapper ────────────────────────────────
            const savePlayerId = (attempts = 0) => {
                if (attempts > 20) return;

                const median = window.median || window.gonative;
                if (median) {
                    // Ensure OneSignal is registered
                    if (median.onesignal) {
                        median.onesignal.register();

                        median.onesignal.info().then((info: any) => {
                            // We need the OneSignal Player ID (UUID) for include_player_ids targeting
                            // prioritized over oneSignalUserId (External ID)
                            const playerId = info.oneSignalId || info.userId;

                            if (playerId) {
                                axios.post('/user/onesignal-id', {
                                    player_id: playerId
                                }).catch(err => console.error('OneSignal Save Error:', err));
                            } else {
                                setTimeout(() => savePlayerId(attempts + 1), 1000);
                            }
                        }).catch(() => setTimeout(() => savePlayerId(attempts + 1), 1000));
                    }
                } else {
                    setTimeout(() => savePlayerId(attempts + 1), 1000);
                }
            };

            savePlayerId();

            // ── Capacitor Android Wrapper ────────────────────────────────
            // The native MainActivity injects `window.__onesignal_player_id`
            // and dispatches an 'onesignal-ready' custom event.
            const handleCapacitorOneSignal = (playerId: string) => {
                if (playerId) {
                    setIsCapacitorWrapper(true);
                    axios.post('/user/onesignal-id', {
                        player_id: playerId
                    }).then(() => {
                        console.log('[Capacitor] OneSignal Player ID saved:', playerId);
                    }).catch(err => console.error('[Capacitor] OneSignal Save Error:', err));
                }
            };

            // Listen for native injection event
            const handleOneSignalReady = (e: any) => {
                const playerId = e.detail?.playerId;
                handleCapacitorOneSignal(playerId);
            };
            window.addEventListener('onesignal-ready', handleOneSignalReady);

            // Check if already set (native resolved before React mounted)
            if ((window as any).__onesignal_player_id) {
                handleCapacitorOneSignal((window as any).__onesignal_player_id);
            }

            // Also check for the Capacitor wrapper flag
            if ((window as any).__is_capacitor_wrapper) {
                setIsCapacitorWrapper(true);
            }

            return () => {
                window.removeEventListener('onesignal-ready', handleOneSignalReady);
            };
        }
    }, [auth?.user?.id]);

    const handleTestNotification = async () => {
        setTestingNotification(true);
        try {
            const response = await axios.post('/push-notification/test');
            toast.success(response.data.message || 'Test notification sent!');
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Failed to send test notification.';
            toast.error(errorMsg);
        } finally {
            setTestingNotification(false);
        }
    };

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
            {children}
            <Toaster position="top-center" richColors closeButton duration={3000} visibleToasts={5} />
            
            {bt.isSupported && (
                <>
                    {/* Printer Management Glassmorphism Modal */}
                    {showPrinterModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
                                
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                                            <Bluetooth className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-gray-900 dark:text-white leading-tight">Printer Settings</h3>
                                            <p className="text-[11px] text-gray-500">Capacitor Bluetooth Spooler</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowPrinterModal(false)}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-6 overflow-y-auto space-y-6 text-left">
                                    
                                    {/* Connection Status Banner */}
                                    <div className={`p-4 rounded-xl border flex items-center justify-between ${
                                        bt.isConnected 
                                            ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30' 
                                            : 'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${
                                                bt.isConnected ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                                            }`}>
                                                {bt.isConnected ? <Wifi className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">Status</p>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                                                    {bt.isConnected ? 'Connected to Printer' : 'Disconnected'}
                                                </p>
                                            </div>
                                        </div>
                                        {bt.isConnected && (
                                            <button 
                                                onClick={bt.disconnect}
                                                className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:text-red-400 px-3 py-1.5 rounded-lg transition-all"
                                            >
                                                Disconnect
                                            </button>
                                        )}
                                    </div>

                                    {/* Settings Options */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preferences</h4>
                                        <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Auto-Print Receipts</p>
                                                <p className="text-xs text-gray-500 mt-0.5">Prints thermal receipts immediately on checkouts</p>
                                            </div>
                                            <button 
                                                onClick={() => bt.toggleAutoPrint(!bt.autoPrintEnabled)}
                                                className={`w-11 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${
                                                    bt.autoPrintEnabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                                                }`}
                                            >
                                                <span className={`w-4 h-4 rounded-full bg-white transition-transform absolute ${
                                                    bt.autoPrintEnabled ? 'translate-x-6' : 'translate-x-1'
                                                }`} />
                                            </button>
                                        </div>

                                        <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                                            {/* Printer Preset Selector */}
                                            <div className="space-y-1.5 text-left">
                                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Printer / Paper Size Preset</label>
                                                <select
                                                    value={bt.printerPreset}
                                                    onChange={(e) => bt.updatePrinterPreset(e.target.value as any)}
                                                    className="w-full text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-250 px-2.5 py-1.5 focus:outline-none transition-all"
                                                >
                                                    <option value="28mm">Inventory Sticker (28mm x 20mm)</option>
                                                    <option value="58mm">58mm Receipt Printer (Continuous)</option>
                                                    <option value="80mm">80mm Receipt Printer (Continuous)</option>
                                                    <option value="custom">Custom Size...</option>
                                                </select>
                                            </div>

                                            {/* Custom configuration details, only shown if custom is selected */}
                                            {bt.printerPreset === 'custom' && (
                                                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-gray-200 dark:border-gray-700 text-left animate-in slide-in-from-top-2 duration-200">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Dot Width (px)</label>
                                                        <input
                                                            type="number"
                                                            value={bt.printerWidth}
                                                            onChange={(e) => bt.updatePrinterWidth(Number(e.target.value))}
                                                            className="w-full text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Media Mode</label>
                                                        <select
                                                            value={bt.mediaType}
                                                            onChange={(e) => bt.updateMediaType(e.target.value as 'receipt' | 'label')}
                                                            className="w-full text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none"
                                                        >
                                                            <option value="label">Label / Sticker</option>
                                                            <option value="receipt">Continuous Roll</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Physical Width (mm)</label>
                                                        <input
                                                            type="number"
                                                            value={bt.labelWidth}
                                                            onChange={(e) => bt.updateLabelWidth(Number(e.target.value))}
                                                            className="w-full text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Physical Height (mm)</label>
                                                        <input
                                                            type="number"
                                                            value={bt.labelHeight}
                                                            onChange={(e) => bt.updateLabelHeight(Number(e.target.value))}
                                                            disabled={bt.mediaType === 'receipt'}
                                                            className="w-full text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 focus:outline-none disabled:opacity-50"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Paired Printers List */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Paired Devices</h4>
                                            <button 
                                                onClick={bt.scan} 
                                                disabled={bt.isScanning}
                                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 hover:underline disabled:opacity-50"
                                            >
                                                <RefreshCw className={`w-3 h-3 ${bt.isScanning ? 'animate-spin' : ''}`} />
                                                Scan
                                            </button>
                                        </div>

                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {bt.pairedDevices.length > 0 ? (
                                                bt.pairedDevices.map((device) => {
                                                    const isCurrent = bt.selectedAddress === device.address;
                                                    return (
                                                        <button
                                                            key={device.address}
                                                            onClick={() => !isCurrent && bt.connect(device.address)}
                                                            disabled={bt.isConnecting && !isCurrent}
                                                            className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                                                                isCurrent 
                                                                    ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40 text-blue-950 dark:text-blue-100 font-semibold' 
                                                                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-700 dark:text-gray-300'
                                                            }`}
                                                        >
                                                            <div>
                                                                <p className="text-sm">{device.name || 'Unnamed Printer'}</p>
                                                                <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{device.address}</p>
                                                            </div>
                                                            {isCurrent && (
                                                                <span className="p-1 rounded-full bg-blue-500 text-white">
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-6 bg-gray-50/50 dark:bg-gray-800/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 text-sm italic">
                                                    No paired Bluetooth devices found. Pair a printer in Android settings.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>

                                {/* Footer Actions */}
                                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20 flex gap-3">
                                    <button 
                                        onClick={bt.testPrint}
                                        disabled={!bt.isConnected}
                                        className="flex-1 text-xs font-bold text-center border border-gray-200 dark:border-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Print Test Page
                                    </button>
                                    <button 
                                        onClick={() => setShowPrinterModal(false)}
                                        className="flex-1 text-xs font-bold text-center bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black py-2.5 rounded-xl transition-all"
                                    >
                                        Done
                                    </button>
                                </div>

                            </div>
                        </div>
                    )}
                </>
            )}
        </AppLayoutTemplate>
    );
}
