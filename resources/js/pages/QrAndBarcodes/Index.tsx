import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'; 


import { Camera, Copy, RefreshCw, StopCircle, Zap, ZapOff, ExternalLink, CheckCircle, Barcode } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'QR & Barcode Scanner',
        href: '/qr-and-barcode-scanner',
    },
];

export default function Index() {
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasFlash, setHasFlash] = useState(false);
    const [isFlashOn, setIsFlashOn] = useState(false);
    
    // Using 'any' for preview; use Html5Qrcode type in real app
    const scannerRef = useRef<any | null>(null);

    // [PREVIEW ONLY] Load library from CDN
    useEffect(() => {
        if (!document.getElementById('html5-qrcode-script')) {
            const script = document.createElement('script');
            script.id = 'html5-qrcode-script';
            script.src = "https://unpkg.com/html5-qrcode";
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    // 🔊 Sound Effect Helper
    const playScanSound = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    };

    const startScanning = async () => {
        setError(null);
        setScanResult(null);

        // [NOTE] In your project use: import { Html5Qrcode } from 'html5-qrcode'
        const Html5Qrcode = (window as any).Html5Qrcode;

        if (!Html5Qrcode) {
            setError("Scanner loading... please wait.");
            return;
        }

        try {
            // Default config supports both QR and standard Barcodes
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            const config = { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0 
            };
            
            await html5QrCode.start(
                { facingMode: "environment" }, 
                config, 
                (decodedText: string) => {
                    // ✅ SUCCESS CALLBACK
                    playScanSound(); // Beep
                    if (navigator.vibrate) navigator.vibrate(200); // Vibrate phone
                    
                    setScanResult(decodedText);
                    stopScanning(); 
                },
                (errorMessage: string) => {
                    // Ignore frame errors
                }
            );

            setIsScanning(true);

            // Check for flash
            try {
                const settings = html5QrCode.getRunningTrackCameraCapabilities();
                if (settings && settings.torchFeature().isSupported()) {
                    setHasFlash(true);
                }
            } catch (e) {
                // Flash not supported
            }

        } catch (err) {
            setError("Camera access failed. Please grant permission.");
            setIsScanning(false);
        }
    };

    const stopScanning = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                setIsScanning(false);
                setIsFlashOn(false);
            } catch (err) {
                console.error("Failed to stop scanner", err);
            }
        }
    };

    const toggleFlash = async () => {
        if (scannerRef.current && hasFlash) {
            try {
                await scannerRef.current.applyVideoConstraints({
                    advanced: [{ torch: !isFlashOn }]
                });
                setIsFlashOn(!isFlashOn);
            } catch (err) {
                console.error("Flash toggle failed", err);
            }
        }
    };

    const copyResult = () => {
        if (scanResult) {
            // Fallback for iframe/mobile clipboard restrictions
            const textArea = document.createElement("textarea");
            textArea.value = scanResult;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert("Result copied to clipboard!");
            } catch (err) {
                console.error('Copy failed', err);
            }
            document.body.removeChild(textArea);
        }
    };

    useEffect(() => {
        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="QR and Barcode Scanner" />
            
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative">
                    <PlaceholderPattern className="absolute inset-0 opacity-10 pointer-events-none" />
                    
                    <div className="relative p-4 md:p-6 flex flex-col gap-6">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Barcode className="w-5 h-5 text-indigo-600" />
                                Scanner
                            </h2>
                            {isScanning && (
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    <span className="text-xs font-bold text-red-500 tracking-wider">LIVE</span>
                                </div>
                            )}
                        </div>

                        {/* Camera Area */}
                        <div className={`relative w-full aspect-square bg-gray-900 rounded-2xl overflow-hidden shadow-inner ring-1 ring-gray-900/5 transition-all duration-300 ${scanResult ? 'ring-4 ring-green-500/20' : ''}`}>
                            <div id="reader" className="w-full h-full object-cover" />
                            
                            {!isScanning && !scanResult && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 text-center bg-gray-900/5">
                                    <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4 shadow-lg">
                                        <Camera className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">
                                        Scan QR codes or Barcodes
                                    </p>
                                </div>
                            )}

                            {/* Flash Button */}
                            {isScanning && hasFlash && (
                                <button 
                                    onClick={toggleFlash}
                                    className="absolute top-4 right-4 p-3 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all active:scale-95 z-10"
                                >
                                    {isFlashOn ? <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400" /> : <ZapOff className="w-5 h-5" />}
                                </button>
                            )}

                            {/* Success Overlay Checkmark */}
                            {scanResult && !isScanning && (
                                <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center animate-in fade-in duration-300 backdrop-blur-[2px]">
                                    <div className="bg-white p-4 rounded-full shadow-2xl scale-110">
                                        <CheckCircle className="w-12 h-12 text-green-600" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 text-center font-medium">
                                {error}
                            </div>
                        )}

                        {/* ✅ RESULT DISPLAY AREA - This shows the scanned data */}
                        {scanResult && !isScanning && (
                            <div className="animate-in slide-in-from-bottom-8 duration-500 ease-out">
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 shadow-sm mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <Barcode className="w-5 h-5 text-green-700" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <label className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 block">
                                                Scanned Content
                                            </label>
                                            <p className="text-gray-900 font-bold text-lg break-all leading-tight">
                                                {scanResult}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={copyResult}
                                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white border-2 border-gray-100 text-gray-700 font-semibold hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Copy Text
                                    </button>
                                    <button 
                                        onClick={() => window.open(scanResult, '_blank')}
                                        disabled={!scanResult.startsWith('http')}
                                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open Link
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Bottom Action Button */}
                        <div className="pt-2">
                            {!isScanning ? (
                                <button 
                                    onClick={startScanning}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gray-900 text-white font-bold text-base shadow-xl shadow-gray-200 hover:bg-gray-800 active:scale-[0.98] transition-all"
                                >
                                    {scanResult ? <RefreshCw className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                                    {scanResult ? 'Scan Another Code' : 'Start Camera'}
                                </button>
                            ) : (
                                <button 
                                    onClick={stopScanning}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-red-500 text-white font-bold text-base shadow-xl shadow-red-200 hover:bg-red-600 active:scale-[0.98] transition-all"
                                >
                                    <StopCircle className="w-5 h-5" />
                                    Stop Scanning
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </AppLayout>
    );
}