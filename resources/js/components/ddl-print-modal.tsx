import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
    Terminal, 
    Printer, 
    Check, 
    AlertTriangle, 
    Settings, 
    RefreshCw, 
    Loader2, 
    FileCode, 
    Play, 
    AlertCircle 
} from 'lucide-react';
import axios from 'axios';

interface DdlPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: {
        id: number;
        name: string;
    };
}

export function DdlPrintModal({ isOpen, onClose, product }: DdlPrintModalProps) {
    const [scanning, setScanning] = useState(false);
    const [found, setFound] = useState(false);
    const [exePath, setExePath] = useState('');
    const [searchedPaths, setSearchedPaths] = useState<string[]>([]);
    const [ddlContent, setDdlContent] = useState('');
    const [printing, setPrinting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Scan for Label.exe when the modal opens
    useEffect(() => {
        if (isOpen) {
            runPrinterAppScan();
        } else {
            // Reset state on close
            setStatusMessage(null);
            setPrinting(false);
        }
    }, [isOpen, product.id]);

    const runPrinterAppScan = async () => {
        setScanning(true);
        setStatusMessage(null);
        try {
            const response = await axios.get(`/products/${product.id}/search-printer-app`);
            setFound(response.data.found);
            setExePath(response.data.path || '');
            setSearchedPaths(response.data.searched_paths || []);
            setDdlContent(response.data.ddl_content || '');
        } catch (error) {
            console.error('Failed to scan for printer app:', error);
            setStatusMessage({
                type: 'error',
                text: 'Failed to communicate with local server to scan for printer app.'
            });
        } finally {
            setScanning(false);
        }
    };

    const handlePrintExecute = async () => {
        if (!exePath) {
            setStatusMessage({
                type: 'error',
                text: 'Please enter or select a valid path to Label.exe'
            });
            return;
        }

        setPrinting(true);
        setStatusMessage(null);

        try {
            const response = await axios.post(`/products/${product.id}/print-ddl`, {
                exe_path: exePath,
                ddl_content: ddlContent
            });

            if (response.data.success) {
                setStatusMessage({
                    type: 'success',
                    text: response.data.message || 'Direct printing job launched successfully!'
                });
                // Auto-close modal after a delay on success
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setStatusMessage({
                    type: 'error',
                    text: response.data.message || 'Failed to print document.'
                });
            }
        } catch (error: any) {
            console.error('Printing execution failed:', error);
            const msg = error.response?.data?.message || 'Error occurred while redirecting printing to local app.';
            setStatusMessage({
                type: 'error',
                text: msg
            });
        } finally {
            setPrinting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[94vw] max-w-[550px] p-0 overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 focus:outline-none">
                
                {/* Header with high contrast gradient */}
                <div className="relative px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/20 dark:from-blue-950/20 dark:to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/10 shrink-0">
                            <Terminal className="w-5 h-5" />
                        </div>
                        <div className="text-left min-w-0">
                            <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                Native DDL Print Redirect
                            </DialogTitle>
                            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Instantly open and print using your Windows label printer utility.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin text-left">
                    
                    {/* Scanning & Status Area */}
                    {scanning ? (
                        <div className="p-6 bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 animate-ping opacity-75" />
                                <div className="relative p-3 rounded-full bg-blue-500 text-white shrink-0">
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Scanning local machine...</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[280px]">
                                    Searching for DDL printing utility <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-blue-600">Label.exe</code> in standard system directories.
                                </p>
                            </div>
                        </div>
                    ) : found ? (
                        <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/15 border border-emerald-100/70 dark:border-emerald-900/30 rounded-2xl space-y-2">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-full bg-emerald-500 text-white mt-0.5">
                                    <Check className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-emerald-950 dark:text-emerald-200">Printer App Auto-Detected</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono break-all bg-white dark:bg-gray-900 border px-2 py-1 rounded">
                                        {exePath}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/30 rounded-2xl space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 rounded-full bg-amber-500 text-white mt-0.5 shrink-0">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-amber-950 dark:text-amber-200">Label.exe Not Detected Automatically</p>
                                    <p className="text-xs text-amber-800/80 dark:text-amber-400/80 mt-1 leading-normal">
                                        Searched base paths, standard Program Files directories, and the system PATH. Please specify the absolute location of <code className="font-bold font-mono text-[11px] bg-amber-100/50 dark:bg-amber-900/50 px-1 py-0.5 rounded">Label.exe</code> below:
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-left">
                                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Absolute Executable Path</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="C:\Program Files\LabelApp\Label.exe"
                                        value={exePath}
                                        onChange={(e) => setExePath(e.target.value)}
                                        className="flex-1 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/25 transition-all shadow-sm"
                                    />
                                    <Button 
                                        variant="outline" 
                                        onClick={runPrinterAppScan}
                                        className="h-9 px-3 rounded-xl border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 flex gap-1 items-center shrink-0 text-xs font-bold"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" /> Scan Again
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DDL File Content Preview */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <FileCode className="w-3.5 h-3.5 text-blue-500" />
                            DDL Document File Content Preview
                        </span>
                        <div className="relative rounded-2xl overflow-hidden border border-gray-150 dark:border-gray-800 bg-gray-950 font-mono shadow-inner">
                            <div className="absolute top-2 right-2 text-[9px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-900 uppercase">
                                .ddl format
                            </div>
                            <pre className="text-[11px] leading-relaxed text-gray-300 dark:text-gray-300 p-4 max-h-48 overflow-y-auto scrollbar-thin select-all text-left whitespace-pre-wrap">
                                {ddlContent || 'Generating DDL content...'}
                            </pre>
                        </div>
                    </div>

                    {/* Dynamic Status / Notice Notifications */}
                    {statusMessage && (
                        <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-in slide-in-from-top-2 duration-200 ${
                            statusMessage.type === 'success' 
                                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/15 dark:border-emerald-900/30 dark:text-emerald-300' 
                                : 'bg-red-50/50 border-red-100 text-red-800 dark:bg-red-950/15 dark:border-red-900/30 dark:text-red-300'
                        }`}>
                            {statusMessage.type === 'success' ? (
                                <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            )}
                            <p className="font-semibold leading-relaxed">{statusMessage.text}</p>
                        </div>
                    )}
                </div>

                {/* Footer buttons with smooth bouncy scaling */}
                <div className="px-5 py-3 sm:px-6 sm:py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20 flex justify-between gap-3">
                    <Button 
                        variant="outline"
                        onClick={onClose}
                        className="text-xs font-bold border-gray-200 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 py-2 px-5 rounded-xl transition-all"
                    >
                        Cancel
                    </Button>

                    <Button
                        onClick={handlePrintExecute}
                        disabled={scanning || printing || !exePath}
                        className="text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                        {printing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Opening in Label.exe...
                            </>
                        ) : (
                            <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Launch Direct Print
                            </>
                        )}
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
}
