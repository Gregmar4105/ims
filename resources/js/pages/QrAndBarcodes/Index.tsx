import AppLayout from '@/layouts/app-layout';
import { Head, useForm, router } from '@inertiajs/react'; // Added router
import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import {
    Barcode,
    Scan,
    ShoppingCart,
    ArrowRightLeft,
    History,
    Trash2,
    Plus,
    Minus,
    Check,
    X,
    Camera,
    StopCircle,
    Package,
    ArrowRight
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Types
interface Product {
    id: number;
    name: string;
    barcode: string | null;
    qr_code: string | null;
    available_quantity: number;
}

interface Branch {
    id: number;
    branch_name: string;
}

interface Item {
    product_id: number;
    quantity: number;
    product: Product;
}

interface PendingItem {
    id: number;
    status: string;
    created_at: string;
    readied_by: { name: string };
    items: {
        id: number;
        quantity: number;
        product: { name: string };
    }[];
    // Specific to Transfer
    destination_branch?: { branch_name: string };
    // Specific to Sale - none unique here, relies on context
}


export default function QrScannerIndex({
    products,
    branches,
    pendingSales,
    pendingTransfers
}: {
    products: Product[],
    branches: Branch[],
    pendingSales: PendingItem[],
    pendingTransfers: PendingItem[]
}) {
    // Mode State
    const [mode, setMode] = useState<'sale' | 'transfer'>('sale');
    const [showPending, setShowPending] = useState(false);

    // Scanner State
    const [isScanning, setIsScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<number>(0);
    const [zoomCapability, setZoomCapability] = useState<{ min: number; max: number; step: number } | null>(null);
    const [currentZoom, setCurrentZoom] = useState<number>(1);
    const [useNativeScanner, setUseNativeScanner] = useState<boolean>(false);
    const nativeVideoRef = useRef<HTMLVideoElement | null>(null);
    const nativeStreamRef = useRef<MediaStream | null>(null);

    // Cart State
    const [cart, setCart] = useState<Item[]>([]);

    // Transfer State
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');

    // Form Hooks (for submitting)
    const { post: postSale, processing: processingSale } = useForm();
    const { post: postTransfer, processing: processingTransfer } = useForm();

    // --- Audio Helper ---
    const playBeep = () => {
        const audio = new Audio('/sounds/beep.mp3'); // Assuming standard path, or use synth
        // Fallback synth
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    };

    // --- Scanner Logic ---
    const onSuccessfulScan = (decodedText: string) => {
        const now = Date.now();
        if (now - lastScanRef.current < 2000) return;
        lastScanRef.current = now;

        // Freeze the video stream in fallback mode if possible
        if (!useNativeScanner) {
            const video = document.querySelector('#reader video') as HTMLVideoElement;
            if (video) {
                try {
                    video.pause();
                    setTimeout(() => {
                        video.play().catch(() => {});
                    }, 1000);
                } catch (e) {
                    console.warn("Failed to pause fallback video", e);
                }
            }
        }

        playBeep();
        if (navigator.vibrate) navigator.vibrate(200);
        handleCodeScanned(decodedText);
    };

    // Check for BarcodeDetector support on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
            setUseNativeScanner(true);
        } else {
            setUseNativeScanner(false);
        }
    }, []);

    // Consolidate zoom application logic
    const applyZoom = async (zoomVal: number) => {
        setCurrentZoom(zoomVal);
        if (useNativeScanner && nativeStreamRef.current) {
            try {
                const track = nativeStreamRef.current.getVideoTracks()[0];
                await track.applyConstraints({
                    advanced: [{ zoom: zoomVal }] as any
                });
            } catch (e) {
                console.warn("Failed to apply native zoom constraint", e);
            }
        } else if (scannerRef.current) {
            try {
                await (scannerRef.current as any).applyVideoConstraints({
                    advanced: [{ zoom: zoomVal }]
                });
            } catch (e) {
                console.warn("Failed to apply html5-qrcode zoom constraint", e);
            }
        }
    };

    // Native Camera Stream Controller Effect
    useEffect(() => {
        if (isScanning && useNativeScanner) {
            let activeStream: MediaStream | null = null;
            
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            }).then(stream => {
                activeStream = stream;
                nativeStreamRef.current = stream;
                if (nativeVideoRef.current) {
                    nativeVideoRef.current.srcObject = stream;
                }
                
                // Get native capabilities
                try {
                    const track = stream.getVideoTracks()[0];
                    const capabilities = (track as any).getCapabilities();
                    if (capabilities && capabilities.zoom) {
                        setZoomCapability({
                            min: capabilities.zoom.min || 1,
                            max: capabilities.zoom.max || 1,
                            step: capabilities.zoom.step || 0.1
                        });
                        setCurrentZoom(track.getSettings().zoom || 1);
                    }
                } catch (err) {
                    console.warn("Could not retrieve native track capabilities", err);
                }
            }).catch(err => {
                console.error("Failed to start native camera stream", err);
                toast.error("Could not start camera");
                setIsScanning(false);
            });

            return () => {
                if (activeStream) {
                    activeStream.getTracks().forEach(track => track.stop());
                }
                nativeStreamRef.current = null;
                setZoomCapability(null);
            };
        }
    }, [isScanning, useNativeScanner]);

    // Fallback html5-qrcode Scanner Controller Effect
    useEffect(() => {
        let isMounted = true;
        let timer: any = null;

        if (isScanning && !useNativeScanner) {
            // Small delay to ensure the #reader div is mounted
            timer = setTimeout(() => {
                if (!isMounted) return;

                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                html5QrCode.start(
                    { 
                        facingMode: "environment",
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    { fps: 10 },
                    (decodedText) => {
                        onSuccessfulScan(decodedText);
                    },
                    (errorMessage) => { }
                ).then(() => {
                    try {
                        const capabilities = (html5QrCode as any).getRunningTrackCapabilities();
                        if (capabilities && capabilities.zoom) {
                            setZoomCapability({
                                min: capabilities.zoom.min || 1,
                                max: capabilities.zoom.max || 1,
                                step: capabilities.zoom.step || 0.1
                            });
                            setCurrentZoom(capabilities.zoom.min || 1);
                        } else {
                            setZoomCapability(null);
                        }
                    } catch (e) {
                        console.warn("Could not retrieve camera zoom capabilities", e);
                        setZoomCapability(null);
                    }
                }).catch(err => {
                    console.error("Error starting scanner", err);
                    toast.error("Could not start camera");
                    setIsScanning(false);
                });
            }, 100);
        }

        return () => {
            isMounted = false;
            if (timer) {
                clearTimeout(timer);
            }
            if (scannerRef.current) {
                const currentScanner = scannerRef.current;
                if (currentScanner.isScanning) {
                    currentScanner.stop().then(() => {
                        currentScanner.clear();
                    }).catch(err => console.error("Error stopping scanner in cleanup", err));
                } else {
                    try {
                        currentScanner.clear();
                    } catch (e) {
                        console.error("Error clearing scanner in cleanup", e);
                    }
                }
                scannerRef.current = null;
            }
        };
    }, [isScanning, useNativeScanner]);

    // Tracking & Auto-Zoom Loop
    useEffect(() => {
        if (!isScanning) {
            setZoomCapability(null);
            return;
        }

        let active = true;
        let animationFrameId: number;
        let detector: any = null;

        if ('BarcodeDetector' in window) {
            try {
                // @ts-ignore
                detector = new window.BarcodeDetector({ 
                    formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e'] 
                });
            } catch (e) {
                console.warn("BarcodeDetector is in window but failed to instantiate", e);
            }
        }

        // Keep track of the current viewfinder box parameters (for interpolation / lerp)
        let boxX = 0;
        let boxY = 0;
        let boxW = 0;
        let boxH = 0;
        let boxOpacity = 0.4;
        let isFirstFrame = true;

        // Decoupled Detection State
        let lastDetectTime = 0;
        let isDetecting = false;
        let lastDetectedBox: { x: number; y: number; width: number; height: number; format?: string } | null = null;
        let isCodeDetected = false;
        let isFrozen = false;

        const checkFrame = async () => {
            if (!active) return;

            const video = (useNativeScanner ? nativeVideoRef.current : document.querySelector('#reader video')) as HTMLVideoElement;
            const canvas = document.getElementById('tracking-canvas') as HTMLCanvasElement;

            if (video && video.readyState >= 2 && canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const rect = video.getBoundingClientRect();
                    if (canvas.width !== rect.width || canvas.height !== rect.height) {
                        canvas.width = rect.width;
                        canvas.height = rect.height;
                    }

                    const vWidth = video.videoWidth;
                    const vHeight = video.videoHeight;
                    const elWidth = rect.width;
                    const elHeight = rect.height;

                    const scale = Math.max(elWidth / vWidth, elHeight / vHeight);
                    const renderedWidth = vWidth * scale;
                    const renderedHeight = vHeight * scale;
                    const offsetX = (elWidth - renderedWidth) / 2;
                    const offsetY = (elHeight - renderedHeight) / 2;

                    // Throttled detection: Only run BarcodeDetector.detect() once every 60ms (native) or 120ms (fallback) to save CPU
                    const nowTime = Date.now();
                    const detectionInterval = useNativeScanner ? 60 : 120;
                    if (detector && !isDetecting && !isFrozen && nowTime - lastDetectTime > detectionInterval) {
                        isDetecting = true;
                        lastDetectTime = nowTime;
                        
                        detector.detect(video).then((barcodes: any[]) => {
                            if (!active) return;
                            if (barcodes && barcodes.length > 0 && !isFrozen) {
                                const barcode = barcodes[0];
                                const box = barcode.boundingBox;

                                // Freeze frame UX logic: Pause video to freeze the camera stream
                                isFrozen = true;
                                try {
                                    video.pause();
                                } catch (e) {
                                    console.warn("Failed to pause video stream", e);
                                }

                                lastDetectedBox = {
                                    x: box.x * scale + offsetX,
                                    y: box.y * scale + offsetY,
                                    width: box.width * scale,
                                    height: box.height * scale,
                                    format: barcode.format
                                };
                                isCodeDetected = true;

                                // Auto-zoom logic
                                const ratio = box.width / vWidth;
                                if (ratio < 0.45) {
                                    try {
                                        const capabilities = useNativeScanner 
                                            ? (nativeStreamRef.current?.getVideoTracks()[0] as any)?.getCapabilities() 
                                            : (scannerRef.current as any)?.getRunningTrackCapabilities();
                                            
                                        if (capabilities && capabilities.zoom) {
                                            const minZ = capabilities.zoom.min || 1;
                                            const maxZ = capabilities.zoom.max || 4;
                                            const currentZ = useNativeScanner
                                                ? (nativeStreamRef.current?.getVideoTracks()[0] as any)?.getSettings()?.zoom || 1
                                                : (scannerRef.current as any)?.getRunningTrackSettings()?.zoom || 1;
                                                
                                            const targetZ = Math.min(maxZ, Math.max(minZ, currentZ * (0.50 / ratio)));

                                            if (Math.abs(targetZ - currentZ) > 0.2) {
                                                applyZoom(targetZ);
                                            }
                                        }
                                    } catch (zoomErr) {
                                        console.warn("Auto-zoom application failed", zoomErr);
                                    }
                                }

                                if (barcode.rawValue) {
                                    onSuccessfulScan(barcode.rawValue);
                                }

                                // Unfreeze camera frame and resume scanning after 1000ms
                                setTimeout(() => {
                                    if (!active) return;
                                    try {
                                        video.play().catch(playErr => console.warn("Failed to play video stream after freeze", playErr));
                                    } catch (e) {
                                        console.warn("Failed to resume video stream", e);
                                    }
                                    isFrozen = false;
                                    lastDetectedBox = null;
                                    isCodeDetected = false;
                                }, 1000);
                            } else if (!isFrozen) {
                                lastDetectedBox = null;
                                isCodeDetected = false;
                            }
                        }).catch((err: any) => {
                            console.error("BarcodeDetector scan error", err);
                        }).finally(() => {
                            isDetecting = false;
                        });
                    }

                    // Default Search Viewfinder Coordinates
                    const defaultSize = Math.min(canvas.width, canvas.height) * 0.65;
                    const defaultX = (canvas.width - defaultSize) / 2;
                    const defaultY = (canvas.height - defaultSize) / 2;
                    const defaultW = defaultSize;
                    const defaultH = defaultSize;

                    // Set target variables based on detection results
                    let targetX_final = defaultX;
                    let targetY_final = defaultY;
                    let targetW_final = defaultW;
                    let targetH_final = defaultH;
                    let targetOpacity = 0.35;

                    if (isCodeDetected && lastDetectedBox) {
                        targetX_final = lastDetectedBox.x;
                        targetY_final = lastDetectedBox.y;
                        targetW_final = lastDetectedBox.width;
                        targetH_final = lastDetectedBox.height;
                        targetOpacity = 1.0;
                    }

                    // Lerp box values for ultra-smooth UI tracking
                    if (isFirstFrame) {
                        boxX = targetX_final;
                        boxY = targetY_final;
                        boxW = targetW_final;
                        boxH = targetH_final;
                        boxOpacity = targetOpacity;
                        isFirstFrame = false;
                    } else {
                        const lerpAmt = 0.22;
                        boxX += (targetX_final - boxX) * lerpAmt;
                        boxY += (targetY_final - boxY) * lerpAmt;
                        boxW += (targetW_final - boxW) * lerpAmt;
                        boxH += (targetH_final - boxH) * lerpAmt;
                        boxOpacity += (targetOpacity - boxOpacity) * 0.15;
                    }

                    // Clear canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Draw outer dim overlay
                    ctx.save();
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                    ctx.beginPath();
                    ctx.rect(0, 0, canvas.width, canvas.height);
                    ctx.moveTo(boxX, boxY);
                    ctx.lineTo(boxX, boxY + boxH);
                    ctx.lineTo(boxX + boxW, boxY + boxH);
                    ctx.lineTo(boxX + boxW, boxY);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();

                    // Draw the custom visual tracking border (rounded rectangle in solid white, exactly like Google Lens)
                    ctx.save();
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 3.5;
                    ctx.globalAlpha = boxOpacity;

                    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                    ctx.shadowBlur = 6;

                    ctx.beginPath();
                    const borderRadius = Math.min(16, boxW / 4, boxH / 4);
                    if (ctx.roundRect) {
                        ctx.roundRect(boxX, boxY, boxW, boxH, borderRadius);
                    } else {
                        ctx.rect(boxX, boxY, boxW, boxH);
                    }
                    ctx.stroke();
                    ctx.restore();

                    // If code is detected, draw Google Lens label pill above the box (white tag with black text, no green dot)
                    if (isCodeDetected && lastDetectedBox) {
                        ctx.save();
                        ctx.globalAlpha = boxOpacity;
                        ctx.fillStyle = '#FFFFFF';
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textBaseline = 'middle';
                        ctx.textAlign = 'center';
                        
                        const formatName = lastDetectedBox.format || 'qr_code';
                        const label = formatName === 'qr_code' ? 'QR Code' : 'Barcode';
                        
                        const textWidth = ctx.measureText(label).width;
                        const pillW = textWidth + 14;
                        const pillH = 18;
                        const pillX = boxX + (boxW - pillW) / 2;
                        const pillY = boxY - pillH - 6;

                        // Draw white pill background
                        ctx.beginPath();
                        if (ctx.roundRect) {
                            ctx.roundRect(pillX, pillY, pillW, pillH, 5);
                        } else {
                            ctx.rect(pillX, pillY, pillW, pillH);
                        }
                        ctx.fill();

                        // Draw black text inside pill
                        ctx.fillStyle = '#000000';
                        ctx.fillText(label, pillX + pillW / 2, pillY + pillH / 2);
                        ctx.restore();
                    }

                    // Search line animation when idling
                    if (!isCodeDetected) {
                        ctx.save();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                        ctx.lineWidth = 1.5;
                        
                        const time = Date.now() / 1000;
                        const lineY = boxY + (boxH * (0.5 + 0.45 * Math.sin(time * 2)));
                        
                        ctx.beginPath();
                        ctx.moveTo(boxX + 10, lineY);
                        ctx.lineTo(boxX + boxW - 10, lineY);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }

            if (active) {
                animationFrameId = requestAnimationFrame(checkFrame);
            }
        };

        const timer = setTimeout(() => {
            checkFrame();
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isScanning, useNativeScanner]);

    const startScanner = () => setIsScanning(true);

    const stopScanner = () => {
        setIsScanning(false);
    };

    const toggleScanner = () => {
        if (isScanning) stopScanner();
        else startScanner();
    };


    // --- Product Logic ---
    const normalizeCode = (code: string | null) => {
        if (!code) return '';
        return code.replace(/[-\s]/g, '').toUpperCase();
    };

    const findProduct = (code: string) => {
        const normalizedInput = normalizeCode(code);

        // Try exact match first
        const simpleMatch = products.find(p => {
            return normalizeCode(p.barcode) === normalizedInput || normalizeCode(p.qr_code) === normalizedInput;
        });
        if (simpleMatch) return simpleMatch;

        // Try JSON parse
        try {
            const json = JSON.parse(code);
            if (json.id) return products.find(p => p.id === Number(json.id));
        } catch (e) { }

        return undefined;
    };

    const handleCodeScanned = (code: string) => {
        const product = findProduct(code);
        if (product) {
            addToCart(product);
            toast.success(`Found: ${product.name}`);
        } else {
            toast.error("Product not found in inventory");
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim()) return;
        handleCodeScanned(manualCode);
        setManualCode('');
    };


    // --- Cart Logic ---
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.id);
            if (existing) {
                if (existing.quantity >= product.available_quantity) {
                    toast.error(`Stock limit reached (${product.available_quantity})`);
                    return prev;
                }
                return prev.map(item =>
                    item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { product_id: product.id, quantity: 1, product }];
        });
    };

    const updateQuantity = (productId: number, newQty: number) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        if (newQty > product.available_quantity) return toast.error(`Stock limit reached`);
        if (newQty < 1) return;

        setCart(prev => prev.map(item =>
            item.product_id === productId ? { ...item, quantity: newQty } : item
        ));
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(i => i.product_id !== productId));
    };

    const clearCart = () => setCart([]);

    // --- Submission Logic ---
    const handleReadySale = () => {
        router.post('/sales', {
            items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
            notes: 'Created via Mobile Scanner'
        }, {
            onSuccess: () => {
                toast.success("Sale Readied!");
                clearCart();
                setShowPending(true);
            }
        });
    };

    const handleReadyTransfer = () => {
        if (!selectedBranchId) return toast.error("Select a destination branch");

        router.post('/transfers', {
            destination_branch_id: selectedBranchId,
            items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
            notes: 'Created via Mobile Scanner'
        }, {
            onSuccess: () => {
                toast.success("Transfer Readied!");
                clearCart();
                setShowPending(true);
            }
        });
    };

    // Pending Actions
    const handleCancelSale = (id: number) => {
        if (confirm("Cancel this sale?")) {
            router.post(`/sales/${id}/cancel`, {}, { onSuccess: () => toast.success("Sale Cancelled") });
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Scanner', href: '/qr-and-barcode-scanner' }]}>
            <Head title="Mobile Scanner" />

            <div className="flex flex-col h-[calc(100vh-4rem)] max-w-md mx-auto w-full bg-background relative">

                {/* --- Top Tabs (Sale / Transfer) --- */}
                <div className="px-4 py-3 bg-background border-b border-sidebar-border/40 z-10">
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-secondary/50 border border-border/20 rounded-xl backdrop-blur-md">
                        <button
                            onClick={() => {
                                if (mode === 'sale') return;
                                if (cart.length > 0) {
                                    if (confirm("Switching to Sale Mode will clear your cart. Continue?")) {
                                        clearCart();
                                        setMode('sale');
                                    }
                                } else {
                                    setMode('sale');
                                }
                            }}
                            className={`py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 ${mode === 'sale' ? 'bg-background text-primary shadow-sm font-extrabold ring-1 ring-border/10' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Sale
                        </button>
                        <button
                            onClick={() => {
                                if (mode === 'transfer') return;
                                if (cart.length > 0) {
                                    if (confirm("Switching to Transfer Mode will clear your cart. Continue?")) {
                                        clearCart();
                                        setMode('transfer');
                                    }
                                } else {
                                    setMode('transfer');
                                }
                            }}
                            className={`py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 ${mode === 'transfer' ? 'bg-background text-orange-500 shadow-sm font-extrabold ring-1 ring-border/10' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            Transfer
                        </button>
                    </div>
                </div>

                {/* --- Content Area --- */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-4 pb-28">

                        {/* Session Header / Toggle Bar */}
                        <div className="flex items-center justify-between mb-3 bg-secondary/20 p-2.5 rounded-xl border border-border/10">
                            <h2 className="text-sm font-bold flex items-center gap-2.5 text-foreground">
                                <div className={`p-1.5 rounded-lg ${mode === 'sale' ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-500'}`}>
                                    {mode === 'sale' ? <ShoppingCart className="w-4 h-4 stroke-[2.2]" /> : <ArrowRightLeft className="w-4 h-4 stroke-[2.2]" />}
                                </div>
                                {showPending 
                                    ? (mode === 'sale' ? 'Pending Sales' : 'Pending Transfers')
                                    : (mode === 'sale' ? 'New Sale Session' : 'New Transfer Session')
                                }
                            </h2>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPending(!showPending)}
                                className="h-8 rounded-lg text-xs font-semibold px-3 gap-1.5 transition-all active:scale-95 border-border/30 hover:bg-secondary"
                            >
                                {showPending ? (
                                    <>
                                        <Camera className="w-3.5 h-3.5 text-primary" />
                                        Scanner
                                    </>
                                ) : (
                                    <>
                                        <History className="w-3.5 h-3.5 text-muted-foreground" />
                                        Pending ({mode === 'sale' ? pendingSales.length : pendingTransfers.length})
                                    </>
                                )}
                            </Button>
                        </div>

                        {!showPending ? (
                            <>
                                {/* Transfer Destination Selector */}
                                {mode === 'transfer' && (
                                    <Card className="border-orange-500/20 bg-orange-500/5 mb-4 shadow-sm rounded-xl">
                                        <CardContent className="p-4">
                                            <Label className="mb-2 block text-xs font-semibold tracking-wide uppercase text-orange-600/90">Destination Branch</Label>
                                            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                                                <SelectTrigger className="bg-background border-orange-500/20 rounded-xl h-11 shadow-sm">
                                                    <SelectValue placeholder="Select Destination Branch" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {branches.map(b => (
                                                        <SelectItem key={b.id} value={String(b.id)} className="rounded-lg text-sm">{b.branch_name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Scanner View */}
                                <Card className="overflow-hidden border border-border/30 rounded-2xl shadow-xl bg-zinc-950 relative">
                                    <div className="bg-zinc-950 relative min-h-[300px] flex items-center justify-center overflow-hidden">
                                        {!isScanning ? (
                                            <button
                                                onClick={startScanner}
                                                className="group flex flex-col items-center gap-4 transition-all duration-300"
                                            >
                                                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500 relative">
                                                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-75"></div>
                                                    <Camera className="w-9 h-9 text-primary relative z-10" />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-[17px] font-bold text-white tracking-tight block group-hover:text-primary transition-colors">Tap to Scan</span>
                                                    <span className="text-xs text-zinc-400 font-medium">Camera is currently inactive</span>
                                                </div>
                                            </button>
                                        ) : (
                                            <>
                                                {useNativeScanner ? (
                                                    <video
                                                        id="native-video"
                                                        ref={nativeVideoRef}
                                                        autoPlay
                                                        playsInline
                                                        muted
                                                        className="w-full h-[300px] object-cover z-0"
                                                    />
                                                ) : (
                                                    <div id="reader" className="w-full h-full [&>video]:object-cover [&>video]:h-[300px] z-0"></div>
                                                )}
                                                
                                                {/* Canvas overlay for Google Lens tracking */}
                                                <canvas
                                                    id="tracking-canvas"
                                                    className="absolute inset-0 pointer-events-none z-20 w-full h-full"
                                                />

                                                {/* Manual Zoom Presets Overlay */}
                                                {zoomCapability && zoomCapability.max > zoomCapability.min && (
                                                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-md px-3.5 py-2 rounded-full flex items-center gap-3.5 border border-white/10 z-30 shadow-2xl transition-all duration-300">
                                                        {[1, 2, 4].map((zoomVal) => {
                                                            if (zoomVal >= zoomCapability.min && zoomVal <= zoomCapability.max) {
                                                                const isActive = Math.abs(currentZoom - zoomVal) < 0.2;
                                                                return (
                                                                    <button
                                                                        key={zoomVal}
                                                                        type="button"
                                                                        onClick={() => applyZoom(zoomVal)}
                                                                        className={`text-[11px] font-extrabold w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all active:scale-90 duration-200 ${
                                                                            isActive
                                                                                ? 'bg-primary text-primary-foreground scale-110 shadow-[0_0_12px_rgba(var(--primary),0.5)] font-black'
                                                                                : 'text-zinc-300 hover:text-white hover:bg-white/10 font-bold border border-white/5'
                                                                        }`}
                                                                    >
                                                                        {zoomVal}x
                                                                    </button>
                                                                );
                                                            }
                                                            return null;
                                                        })}
                                                    </div>
                                                )}

                                                <Button
                                                    size="icon"
                                                    className="absolute bottom-4 right-4 rounded-full h-11 w-11 shadow-2xl z-50 bg-destructive hover:bg-destructive/90 text-destructive-foreground border border-border/20 transition-all active:scale-95 duration-200"
                                                    onClick={stopScanner}
                                                >
                                                    <StopCircle className="w-5 h-5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </Card>

                                {/* Manual Barcode Input Capsule */}
                                <div className="mt-3">
                                    <form onSubmit={handleManualSubmit} className="relative flex items-center bg-secondary/35 border border-border/40 rounded-2xl p-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-300">
                                        <div className="flex items-center pl-3 flex-1">
                                            <Barcode className="w-5 h-5 text-muted-foreground/60 mr-2.5 shrink-0" />
                                            <input
                                                type="text"
                                                className="w-full bg-transparent border-none text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 text-foreground"
                                                placeholder="Enter barcode manually..."
                                                value={manualCode}
                                                onChange={e => setManualCode(e.target.value)}
                                            />
                                        </div>
                                        <Button 
                                            type="submit" 
                                            size="sm"
                                            className="h-9 px-4 rounded-xl shadow-md bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs tracking-wider uppercase transition-all duration-200 active:scale-95 flex items-center gap-1.5 shrink-0"
                                        >
                                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                            Add
                                        </Button>
                                    </form>
                                </div>

                                {/* Cart Items */}
                                <div className="space-y-3 mt-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Items ({cart.length})</h3>
                                        {cart.length > 0 && (
                                            <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:bg-destructive/5 h-8 text-xs font-semibold px-2.5 rounded-lg transition-colors">
                                                Clear Cart
                                            </Button>
                                        )}
                                    </div>

                                    {cart.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border/40 bg-secondary/10 rounded-2xl flex flex-col items-center justify-center gap-2">
                                            <Package className="w-8 h-8 text-muted-foreground/40 stroke-[1.5]" />
                                            <span className="font-semibold text-muted-foreground/75 text-xs">Scan items to add them here</span>
                                        </div>
                                    ) : (
                                        cart.map(item => (
                                            <div key={item.product_id} className="flex items-center gap-3.5 p-3.5 border border-border/20 rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow">
                                                <div className="h-11 w-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                                    <Package className="w-5 h-5 stroke-[2]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm text-foreground truncate pr-1">{item.product.name}</div>
                                                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                        <span className="font-medium bg-secondary px-1.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">
                                                            {item.product.barcode || 'NO BARCODE'}
                                                        </span>
                                                        <span className="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
                                                        <span>Stock: <strong className="text-foreground">{item.product.available_quantity}</strong></span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-lg border border-border/10 shrink-0">
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-6 w-6 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-all" 
                                                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                    >
                                                        <Minus className="w-3 h-3 stroke-[2.5]" />
                                                    </Button>
                                                    <span className="w-6 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-6 w-6 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-all" 
                                                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                                    >
                                                        <Plus className="w-3 h-3 stroke-[2.5]" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                {mode === 'sale' ? (
                                    pendingSales.length === 0 ? <EmptyState msg="No pending sales found" /> :
                                        pendingSales.map(sale => (
                                            <PendingCard key={sale.id} item={sale} type="sale" onCancel={() => handleCancelSale(sale.id)} />
                                        ))
                                ) : (
                                    pendingTransfers.length === 0 ? <EmptyState msg="No pending transfers found" /> :
                                        pendingTransfers.map(transfer => (
                                            <PendingCard key={transfer.id} item={transfer} type="transfer" />
                                        ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Bottom Action Bar (Only for Scan Tab) --- */}
                {!showPending && cart.length > 0 && (
                    <div className="absolute bottom-2 inset-x-4 p-3 rounded-2xl border bg-background/95 backdrop-blur-md shadow-2xl z-20 flex items-center justify-between gap-3 animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
                        <div className="flex flex-col pl-1 shrink-0">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Items</span>
                            <span className="text-sm font-bold text-foreground">{cart.reduce((sum, item) => sum + item.quantity, 0)} Items</span>
                        </div>
                        <Button
                            className="flex-1 gap-2 text-xs font-semibold h-10 rounded-xl shadow-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
                            onClick={mode === 'sale' ? handleReadySale : handleReadyTransfer}
                            disabled={mode === 'sale' ? processingSale : processingTransfer}
                        >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                            {mode === 'sale' ? 'Ready Sale' : 'Ready Transfer'}
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

// Subcomponents


function EmptyState({ msg }: { msg: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/60 bg-secondary/10 border border-dashed border-border/40 rounded-2xl gap-3">
            <div className="p-3 bg-secondary/50 text-muted-foreground/45 rounded-2xl">
                <History className="w-8 h-8 stroke-[1.5]" />
            </div>
            <p className="text-xs font-semibold">{msg}</p>
        </div>
    );
}

function PendingCard({ item, type, onCancel }: { item: PendingItem, type: 'sale' | 'transfer', onCancel?: () => void }) {
    return (
        <Card className="overflow-hidden border border-border/20 shadow-sm hover:shadow-md transition-shadow rounded-xl bg-card">
            <CardHeader className="p-4 pb-3 bg-secondary/10 border-b border-border/5">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                            #{item.id}
                        </span>
                        <CardDescription className="text-[11px] font-medium">
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(item.created_at).toLocaleDateString()}
                        </CardDescription>
                    </div>
                    <Badge className={type === 'sale' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold" : "bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px] font-bold"} variant="outline">
                        Readied
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-3">
                {type === 'transfer' && item.destination_branch && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 bg-secondary/30 p-2.5 rounded-xl border border-border/10">
                        <span className="font-semibold">Destination:</span>
                        <span className="font-bold text-foreground">{item.destination_branch.branch_name}</span>
                    </div>
                )}

                <div className="space-y-2">
                    {item.items.slice(0, 3).map((line, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                            <span className="truncate max-w-[220px] text-muted-foreground font-medium">{line.product.name}</span>
                            <span className="font-bold font-mono text-foreground bg-secondary px-1.5 py-0.5 rounded text-[10px]">x{line.quantity}</span>
                        </div>
                    ))}
                    {item.items.length > 3 && (
                        <p className="text-[10px] font-bold text-muted-foreground pt-1.5 border-t border-border/5 text-center">
                            + {item.items.length - 3} more items
                        </p>
                    )}
                </div>
            </CardContent>
            {onCancel && (
                <CardFooter className="p-2 border-t border-border/10 bg-secondary/10">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-[11px] font-bold transition-all rounded-lg" 
                        onClick={onCancel}
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Cancel Sale
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
