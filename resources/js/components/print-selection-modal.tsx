import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bluetooth, Printer, RefreshCw, Check, AlertTriangle, Settings, Smartphone, Wifi, X, Loader2 } from 'lucide-react';
import { useBluetoothPrinterContext } from '@/contexts/bluetooth-printer-context';

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
    const bt = useBluetoothPrinterContext();

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
            <DialogContent className="w-[94vw] max-w-[480px] p-0 overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 focus:outline-none">
                
                {/* Header Section */}
                <div className="relative px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shrink-0">
                            <Printer className="w-5 h-5" />
                        </div>
                        <div className="text-left min-w-0">
                            <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight whitespace-normal break-words pr-6">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-normal break-words">
                                Choose how you want to print this document
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 text-left max-h-[60vh] sm:max-h-[70vh] overflow-y-auto scrollbar-thin">
                    
                    {/* Option 1: Bluetooth Thermal Printer */}
                    <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Bluetooth className="w-3.5 h-3.5 text-blue-500" />
                                Bluetooth Thermal (58mm/80mm)
                            </h4>
                            {bt.isSupported && (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
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
                            <div className="p-4 bg-red-50/50 border border-red-100 dark:bg-red-950/10 dark:border-red-900/30 rounded-2xl space-y-3">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-red-950 dark:text-red-200">Bluetooth is Turned Off</p>
                                        <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5">
                                            Turn on Bluetooth to scan and connect to your thermal receipt printer.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Button 
                                        onClick={bt.requestBluetoothEnable}
                                        className="w-full whitespace-normal h-auto py-2.5 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10"
                                    >
                                        Turn On Natively
                                    </Button>
                                    <Button 
                                        onClick={bt.openBluetoothSettings}
                                        variant="outline"
                                        className="w-full whitespace-normal h-auto py-2.5 px-3 text-xs font-bold border-gray-200 hover:bg-gray-50 text-gray-700 dark:text-gray-200 rounded-xl flex items-center justify-center gap-1.5"
                                    >
                                        <Settings className="w-3.5 h-3.5 shrink-0" />
                                        Open Settings
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Bluetooth Info / Action Card */}
                                {bt.isConnected ? (
                                    <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl space-y-3">
                                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 bg-transparent border-0 p-0">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="p-2 bg-emerald-500 text-white rounded-xl animate-pulse shrink-0">
                                                    <Printer className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider leading-none mb-1">Active Printer</p>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                                                        {bt.pairedDevices.find(d => d.address === bt.selectedAddress)?.name || 'Thermal Printer'}
                                                    </p>
                                                    <p className="text-[10px] font-mono text-gray-400 mt-1 leading-none truncate">{bt.selectedAddress}</p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                onClick={bt.disconnect}
                                                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 h-auto rounded-lg xs:self-center self-end border-0"
                                            >
                                                Disconnect
                                            </Button>
                                        </div>

                                         {/* Printer Preset Selector */}
                                         <div className="space-y-1.5 text-left">
                                             <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Printer / Paper Size Preset</label>
                                             <select
                                                 value={bt.printerPreset}
                                                 onChange={(e) => bt.updatePrinterPreset(e.target.value as any)}
                                                 className="w-full text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 focus:outline-none transition-all"
                                             >
                                                 <option value="28mm">Inventory Sticker (28mm x 20mm)</option>
                                                 <option value="58mm">58mm Receipt Printer (Continuous)</option>
                                                 <option value="80mm">80mm Receipt Printer (Continuous)</option>
                                                 <option value="custom">Custom Size...</option>
                                             </select>
                                         </div>

                                         {/* Custom configuration details, only shown if custom is selected */}
                                         {bt.printerPreset === 'custom' && (
                                             <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-emerald-100/30 dark:border-emerald-950/30 text-left animate-in slide-in-from-top-2 duration-200">
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
                                        
                                        <Button
                                            onClick={handleBluetoothPrint}
                                            className="w-full py-3.5 text-sm font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 border border-emerald-500 transition-all hover:scale-[1.01] active:scale-[0.99]"
                                        >
                                            <Bluetooth className="w-4 h-4" />
                                            Print Document Now
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800 rounded-2xl space-y-4">
                                        
                                        {/* Paired Devices List header */}
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-gray-500">Connect a Printer</p>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={bt.scan} 
                                                    disabled={bt.isScanning}
                                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline disabled:opacity-50 border-0 bg-transparent"
                                                >
                                                    <RefreshCw className={`w-3 h-3 ${bt.isScanning ? 'animate-spin' : ''}`} />
                                                    {bt.isScanning ? 'Scanning...' : 'Scan'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Paired Devices scroll box */}
                                        <div className="space-y-2 max-h-36 sm:max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                                            {bt.pairedDevices.length > 0 ? (
                                                bt.pairedDevices.map((device) => {
                                                    const isThisDeviceConnecting = bt.isConnecting && bt.connectingAddress === device.address;
                                                    return (
                                                        <button
                                                            key={device.address}
                                                            onClick={() => bt.connect(device.address)}
                                                            disabled={isThisDeviceConnecting}
                                                            className="w-full text-left p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center justify-between transition-all hover:border-gray-200 disabled:opacity-60"
                                                        >
                                                            <div className="min-w-0 pr-2">
                                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[140px] xs:max-w-[200px] sm:max-w-[260px]">{device.name || 'Unnamed Printer'}</p>
                                                                <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{device.address}</p>
                                                            </div>
                                                            {isThisDeviceConnecting ? (
                                                                <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded-lg shrink-0">Connect</span>
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
                                            className="w-full whitespace-normal h-auto py-2.5 px-3 text-xs font-bold border-dashed border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl flex items-center justify-center gap-1.5"
                                        >
                                            <Settings className="w-3.5 h-3.5 shrink-0" />
                                            <span className="text-center">Pair New Device (Android Settings)</span>
                                        </Button>

                                    </div>
                                )}
                            </div>
                        )}

                        {/* Auto-Print Receipts Toggle */}
                        {bt.isSupported && bt.isBluetoothEnabled && (
                            <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mt-2">
                                <div className="space-y-0.5 text-left pr-2">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">Auto-Print Receipts</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Prints receipts immediately on transaction checkout</p>
                                </div>
                                <button 
                                    onClick={() => bt.toggleAutoPrint(!bt.autoPrintEnabled)}
                                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center shrink-0 border-0 ${
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
                        <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Wifi className="w-3.5 h-3.5 text-gray-500" />
                            System / Wi-Fi Spooler
                        </h4>
                        
                        <div className="p-4 bg-gray-50/50 dark:bg-gray-800/10 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-0.5 text-left min-w-0">
                                <p className="text-sm font-bold text-gray-950 dark:text-white">Print via System</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Standard document layout for standard desktop, Wi-Fi or PDF printer spoolers.
                                </p>
                            </div>
                            
                            <Button
                                onClick={() => {
                                    onPrintSystem();
                                    onClose();
                                }}
                                variant="outline"
                                className="sm:shrink-0 whitespace-normal h-auto text-xs font-bold hover:bg-gray-50 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-2.5 sm:py-3.5 px-4 sm:px-5 rounded-xl transition-all"
                            >
                                <Printer className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                                Open System Print
                            </Button>
                        </div>
                    </div>

                </div>

                {/* Footer Section */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20 flex justify-end">
                    <Button 
                        onClick={onClose}
                        className="text-xs font-bold bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black py-2 px-5 sm:py-2.5 sm:px-6 rounded-xl transition-all"
                    >
                        Close
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
}
