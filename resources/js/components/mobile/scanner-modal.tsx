import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
    QrCode, 
    X, 
    Zap, 
    Trash2, 
    ShoppingCart, 
    ArrowRightLeft, 
    Package,
    Plus,
    Minus,
    Loader2
} from 'lucide-react';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

interface ScannedProduct {
    id: number;
    name: string;
    sku: string;
    price: string | number;
    quantity: number;
    image_url?: string;
}

interface ScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ScannerModal({ isOpen, onClose }: ScannerModalProps) {
    const { remoteApi, serverUrl } = useMobileApi();
    const [scannedItems, setScannedItems] = useState<ScannedProduct[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [torch, setTorch] = useState(false);
    
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScannedCode = useRef<string | null>(null);
    const scanCooldown = useRef<boolean>(false);

    useEffect(() => {
        if (isOpen && !isScanning) {
            startScanner();
        }
        return () => {
            stopScanner();
        };
    }, [isOpen]);

    const startScanner = async () => {
        try {
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;
            
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                () => {} // error callback (silent)
            );
            setIsScanning(true);
        } catch (err) {
            console.error("Failed to start scanner:", err);
            toast.error("Could not start camera. Please check permissions.");
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                setIsScanning(false);
            } catch (err) {
                console.error("Failed to stop scanner:", err);
            }
        }
    };

    const onScanSuccess = async (decodedText: string) => {
        // Prevent immediate repeat scans of the same code
        if (scanCooldown.current && lastScannedCode.current === decodedText) return;
        
        lastScannedCode.current = decodedText;
        scanCooldown.current = true;
        setTimeout(() => { scanCooldown.current = false; }, 2000); // 2s cooldown for same item

        lookupProduct(decodedText);
    };

    const lookupProduct = async (code: string) => {
        setLoading(true);
        try {
            const base = serverUrl.replace(/\/$/, '');
            const response = await remoteApi.get(`${base}/api/mobile/products/search/${code}`);
            
            const products = response.data.products || [];
            if (products.length === 0) {
                toast.error(`No product found for code: ${code}`);
                return;
            }

            const p = products[0]; // Take first match
            
            setScannedItems(prev => {
                const existing = prev.find(item => item.id === p.id);
                if (existing) {
                    return prev.map(item => 
                        item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item
                    );
                }
                return [...prev, { ...p, quantity: 1 }];
            });
            
            toast.success(`Scanned: ${p.name}`);
        } catch (err) {
            console.error("Product lookup failed:", err);
            toast.error("Lookup failed. Check server connection.");
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = (id: number, delta: number) => {
        setScannedItems(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeItem = (id: number) => {
        setScannedItems(prev => prev.filter(item => item.id !== id));
    };

    const handleAction = (type: 'sale' | 'transfer') => {
        if (scannedItems.length === 0) return;
        
        const params = new URLSearchParams();
        scannedItems.forEach((item, index) => {
            params.append(`items[${index}][id]`, item.id.toString());
            params.append(`items[${index}][quantity]`, item.quantity.toString());
        });

        const baseUrl = type === 'sale' ? '/mobile/sales/create' : '/mobile/transfers/create';
        router.visit(`${baseUrl}?${params.toString()}`);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-t-[2.5rem] border-none">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-primary" />
                            <span>Quick Scanner</span>
                        </DialogTitle>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-24">
                    {/* Camera Feed Container */}
                    <div className="relative aspect-square w-full rounded-[2rem] overflow-hidden bg-black border-2 border-border/50">
                        <div id="reader" className="w-full h-full" />
                        
                        {/* Overlay elements */}
                        <div className="absolute inset-0 pointer-events-none border-[3rem] border-black/40 flex items-center justify-center">
                            <div className="w-full h-full border-2 border-primary/50 rounded-2xl relative">
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary -mt-1 -ml-1 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary -mt-1 -mr-1 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary -mb-1 -ml-1 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary -mb-1 -mr-1 rounded-br-lg" />
                            </div>
                        </div>

                        {loading && (
                            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Scanned Items List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60 px-1">
                                Scanned Items ({scannedItems.length})
                            </h3>
                            {scannedItems.length > 0 && (
                                <button onClick={() => setScannedItems([])} className="text-xs text-destructive font-medium px-2 py-1">
                                    Clear All
                                </button>
                            )}
                        </div>

                        {scannedItems.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-30">
                                <div className="p-4 rounded-full bg-muted">
                                    <Package className="w-8 h-8" />
                                </div>
                                <p className="text-sm font-medium">Ready to scan products...</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {scannedItems.map((item) => (
                                    <div key={item.id} className="bg-card border border-border p-4 rounded-3xl flex items-center gap-4 transition-all animate-in fade-in slide-in-from-bottom-2">
                                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm truncate">{item.name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-mono">{item.sku}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center bg-muted rounded-full p-1 h-8">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1"><Minus className="w-3 h-3" /></button>
                                                <span className="w-6 text-center text-xs font-bold leading-none">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1"><Plus className="w-3 h-3" /></button>
                                            </div>
                                            <button onClick={() => removeItem(item.id)} className="p-2 text-destructive"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 pt-0 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent">
                    <div className="grid grid-cols-2 gap-3">
                        <Button 
                            disabled={scannedItems.length === 0} 
                            className="h-14 rounded-2xl font-bold bg-[#34C759] hover:bg-[#34C759]/90 text-white"
                            onClick={() => handleAction('sale')}
                        >
                            <ShoppingCart className="w-5 h-5 mr-2" />
                            New Sale
                        </Button>
                        <Button 
                            disabled={scannedItems.length === 0} 
                            variant="secondary"
                            className="h-14 rounded-2xl font-bold"
                            onClick={() => handleAction('transfer')}
                        >
                            <ArrowRightLeft className="w-5 h-5 mr-2" />
                            Transfer
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
