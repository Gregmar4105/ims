import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bluetooth, Printer, RefreshCw, Check, AlertTriangle, Settings, Smartphone, Wifi, X, Loader2 } from 'lucide-react';
import { useBluetoothPrinter } from '@/hooks/useBluetoothPrinter';

interface PrintSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPrintSystem: () => void;
    elementId: string; // The ID of the element to print via Bluetooth
    title?: string;
}

export function PrintSelectionModal({
    isOpen,
    onClose,
    onPrintSystem,
    elementId,
    title = "Select Print Method"
}: PrintSelectionModalProps) {
    const bt = useBluetoothPrinter();

    // Scan for devices whenever the modal opens and Bluetooth is supported
    useEffect(() => {
        if (isOpen && bt.isSupported) {
            const enabled = bt.checkBluetoothEnabled();
            if (!enabled) {
                bt.requestBluetoothEnable();
            } else {
                bt.scan();
            }
        }
    }, [isOpen, bt.isSupported]);

    const handleBluetoothPrint = async () => {
        const ok = await bt.printElement(elementId);
        if (ok) {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg p-0 overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header Section */}
                <div className="relative px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                            <Printer className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Choose how you want to print this document
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6 text-left max-h-[70vh] overflow-y-auto scrollbar-thin">
                    
                    {/* Option 1: Bluetooth Thermal Printer */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Bluetooth className="w-3.5 h-3.5 text-blue-500" />
                                Bluetooth Thermal (58mm/80mm)
                            </h4>
                            {bt.isSupported && (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    !bt.isBluetoothEnabled
                                        ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                                        : bt.isConnected
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                                }`}>
                                    {!bt.isBluetoothEnabled ? 'Off' : bt.isConnected ? 'Connected' : 'Disconnected'}
                                </span>
                            )}
                        </div>

                        {!bt.isSupported ? (
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-start gap-3">
                                <Smartphone className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">System Printer Fallback</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Bluetooth printing is only available natively through the LM2 Android App wrapper.
                                    </p>
                                </div>
                            </div>
                        ) : !bt.isBluetoothEnabled ? (
                            <div className="p-4.5 bg-red-50/50 border border-red-100 dark:bg-red-950/10 dark:border-red-900/30 rounded-2xl space-y-3.5">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-red-950 dark:text-red-200">Bluetooth is Turned Off</p>
                                        <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5">
                                            Turn on Bluetooth to scan and connect to your thermal receipt printer.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3.5">
                                    <Button 
                                        onClick={bt.requestBluetoothEnable}
                                        className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10"
                                    >
                                        Turn On Natively
                                    </Button>
                                    <Button 
                                        onClick={bt.openBluetoothSettings}
                                        variant="outline"
                                        className="w-full text-xs font-bold border-gray-200 hover:bg-gray-50 text-gray-700 dark:text-gray-200 rounded-xl py-2.5 flex items-center justify-center gap-1.5"
                                    >
                                        <Settings className="w-3.5 h-3.5" />
                                        Open Settings
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Bluetooth Info / Action Card */}
                                {bt.isConnected ? (
                                    <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-500 text-white rounded-xl animate-pulse">
                                                    <Printer className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider leading-none mb-1">Active Printer</p>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                                                        {bt.pairedDevices.find(d => d.address === bt.selectedAddress)?.name || 'Thermal Printer'}
                                                    </p>
                                                    <p className="text-[10px] font-mono text-gray-400 mt-1 leading-none">{bt.selectedAddress}</p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                onClick={bt.disconnect}
                                                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 h-auto rounded-lg"
                                            >
                                                Disconnect
                                            </Button>
                                        </div>
                                        
                                        <Button
                                            onClick={handleBluetoothPrint}
                                            className="w-full py-5 text-sm font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 border border-emerald-500 transition-all hover:scale-[1.01] active:scale-[0.99]"
                                        >
                                            <Bluetooth className="w-4 h-4" />
                                            Print Document Now
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="p-4.5 bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-850 rounded-2xl space-y-4">
                                        
                                        {/* Paired Devices List header */}
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-gray-500">Connect a Printer</p>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={bt.scan} 
                                                    disabled={bt.isScanning}
                                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline disabled:opacity-50"
                                                >
                                                    <RefreshCw className={`w-3 h-3 ${bt.isScanning ? 'animate-spin' : ''}`} />
                                                    {bt.isScanning ? 'Scanning...' : 'Scan'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Paired Devices scroll box */}
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                                            {bt.pairedDevices.length > 0 ? (
                                                bt.pairedDevices.map((device) => {
                                                    const isConnecting = bt.isConnecting && bt.selectedAddress === device.address;
                                                    return (
                                                        <button
                                                            key={device.address}
                                                            onClick={() => bt.connect(device.address)}
                                                            disabled={bt.isConnecting}
                                                            className="w-full text-left p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center justify-between transition-all hover:border-gray-200"
                                                        >
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{device.name || 'Unnamed Printer'}</p>
                                                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{device.address}</p>
                                                            </div>
                                                            {isConnecting ? (
                                                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded-lg">Connect</span>
                                                            )}
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-5 text-gray-400 text-xs italic bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-gray-800">
                                                    No paired Bluetooth devices found.
                                                </div>
                                            )}
                                        </div>

                                        {/* Go Pair Natively Helper */}
                                        <Button
                                            onClick={bt.openBluetoothSettings}
                                            variant="outline"
                                            className="w-full text-xs font-bold border-dashed border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 py-4.5 rounded-xl flex items-center justify-center gap-1.5"
                                        >
                                            <Settings className="w-3.5 h-3.5" />
                                            Pair New Device (Open Android Bluetooth Settings)
                                        </Button>

                                    </div>
                                )}
                            </div>
                        )}

                        {/* Auto-Print Receipts Toggle */}
                        {bt.isSupported && bt.isBluetoothEnabled && (
                            <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-105 dark:border-gray-800 shadow-sm mt-2">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">Auto-Print Receipts</p>
                                    <p className="text-[10px] text-gray-550 dark:text-gray-400 mt-0.5">Prints receipts immediately on transaction checkout</p>
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
                        )}
                    </div>

                    <Separator className="bg-gray-100 dark:bg-gray-800" />

                    {/* Option 2: System / Wi-Fi Printer */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Wifi className="w-3.5 h-3.5 text-gray-500" />
                            System / Wi-Fi Spooler
                        </h4>
                        
                        <div className="p-4 bg-gray-50/50 dark:bg-gray-800/10 border border-gray-100 dark:border-gray-850 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-gray-950 dark:text-white">Print via System</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Standard document layout for standard desktop, Wi-Fi or PDF printer spoolers.
                                </p>
                            </div>
                            
                            <Button
                                onClick={() => {
                                    onPrintSystem();
                                    onClose();
                                }}
                                variant="outline"
                                className="sm:shrink-0 text-xs font-bold hover:bg-gray-50 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-5 px-5 rounded-xl transition-all"
                            >
                                <Printer className="w-3.5 h-3.5 mr-1.5" />
                                Open System Print
                            </Button>
                        </div>
                    </div>

                </div>

                {/* Footer Section */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20 flex justify-end">
                    <Button 
                        onClick={onClose}
                        className="text-xs font-bold bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black py-2.5 px-6 rounded-xl transition-all"
                    >
                        Close
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
}
