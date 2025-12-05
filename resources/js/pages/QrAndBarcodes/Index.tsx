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
    const [activeTab, setActiveTab] = useState<'scan' | 'pending'>('scan');

    // Scanner State
    const [isScanning, setIsScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<number>(0);

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
    // --- Scanner Logic ---
    // Moved initialization to useEffect to wait for DOM Rendering
    // --- Scanner Logic ---
    // Moved initialization to useEffect to wait for DOM Rendering
    useEffect(() => {
        if (isScanning) {
            // Small delay to ensure the #reader div is mounted
            const timer = setTimeout(() => {
                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        const now = Date.now();
                        if (now - lastScanRef.current < 1500) return;
                        lastScanRef.current = now;
                        playBeep();
                        if (navigator.vibrate) navigator.vibrate(200);
                        handleCodeScanned(decodedText);
                    },
                    (errorMessage) => { }
                ).catch(err => {
                    console.error("Error starting scanner", err);
                    toast.error("Could not start camera");
                    setIsScanning(false);
                });
            }, 100);

            return () => {
                clearTimeout(timer);
                // Only clean up on unmount or if we are still marked as scanning but effect is re-running
                // The explicit stopScanner function handles the main cleanup.
            };
        }
    }, [isScanning]);

    const startScanner = () => setIsScanning(true);

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (e) {
                console.error("Error stopping scanner", e);
            }
            scannerRef.current = null;
        }
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
                setActiveTab('pending');
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
                setActiveTab('pending');
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

                {/* --- Top Tabs (Scan / Pending) --- */}
                <div className="p-4 bg-background border-b z-10">
                    <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                        <button
                            onClick={() => setActiveTab('scan')}
                            className={`py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'scan' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                        >
                            Scanner
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'pending' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                        >
                            Pending ({mode === 'sale' ? pendingSales.length : pendingTransfers.length})
                        </button>
                    </div>
                </div>

                {/* --- Content Area --- */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-4 pb-24">

                        {activeTab === 'scan' && (
                            <>
                                {/* Mode Switcher */}
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold flex items-center gap-2">
                                        {mode === 'sale' ? <ShoppingCart className="w-5 h-5 text-primary" /> : <ArrowRightLeft className="w-5 h-5 text-orange-500" />}
                                        {mode === 'sale' ? 'New Sale' : 'New Transfer'}
                                    </h2>

                                    <DropdownModeSelector mode={mode} setMode={setMode} clearCart={clearCart} />
                                </div>

                                {/* Transfer Destination Selector */}
                                {mode === 'transfer' && (
                                    <Card className="border-orange-200 bg-orange-50/50 mb-4">
                                        <CardContent className="p-4">
                                            <Label className="mb-2 block">Destination Branch</Label>
                                            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue placeholder="Select Destination" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {branches.map(b => (
                                                        <SelectItem key={b.id} value={String(b.id)}>{b.branch_name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Scanner View */}
                                <Card className="overflow-hidden border-2 border-primary/20 shadow-lg relative">
                                    <div className="bg-zinc-950 relative min-h-[300px] flex items-center justify-center">
                                        {!isScanning ? (
                                            <button
                                                onClick={startScanner}
                                                className="group flex flex-col items-center gap-4 transition-all"
                                            >
                                                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                                                    <Camera className="w-10 h-10 text-primary" />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-lg font-semibold text-white block">Tap to Scan</span>
                                                    <span className="text-xs text-white/50">Camera is currently off</span>
                                                </div>
                                            </button>
                                        ) : (
                                            <>
                                                <div id="reader" className="w-full h-full [&>video]:object-cover [&>video]:h-[300px]"></div>
                                                {/* Scan Line Animation */}
                                                <div className="absolute inset-x-0 mx-auto w-[80%] h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite] top-0 pointer-events-none z-10"></div>
                                                <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none z-0"></div>
                                            </>
                                        )}

                                        <style>{`
                                            @keyframes scan {
                                                0%, 100% { top: 10%; opacity: 0; }
                                                10% { opacity: 1; }
                                                50% { top: 90%; }
                                                90% { opacity: 1; }
                                            }
                                        `}</style>

                                        {isScanning && (
                                            <Button
                                                size="icon"
                                                className="absolute bottom-6 right-6 rounded-full h-14 w-14 shadow-xl z-50 bg-red-600 hover:bg-red-700 text-white border-2 border-white/20"
                                                onClick={stopScanner}
                                            >
                                                <StopCircle className="w-6 h-6" />
                                            </Button>
                                        )}
                                    </div>
                                    <CardContent className="p-4 bg-muted/30">
                                        <form onSubmit={handleManualSubmit} className="flex gap-2 relative">
                                            <Input
                                                className="pl-10 h-12 bg-background shadow-sm"
                                                placeholder="Or enter barcode manually..."
                                                value={manualCode}
                                                onChange={e => setManualCode(e.target.value)}
                                            />
                                            <Barcode className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                                            <Button type="submit" size="icon" className="h-12 w-12 shrink-0 shadow-sm"><Scan className="w-5 h-5" /></Button>
                                        </form>
                                    </CardContent>
                                </Card>

                                {/* Cart Items */}
                                <div className="space-y-3 mt-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-muted-foreground">Items ({cart.length})</h3>
                                        {cart.length > 0 && (
                                            <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive h-8 text-xs">Clear</Button>
                                        )}
                                    </div>

                                    {cart.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                            Scan items to add them here
                                        </div>
                                    ) : (
                                        cart.map(item => (
                                            <div key={item.product_id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                                                <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center text-primary">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{item.product.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Stock: {item.product.available_quantity}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, item.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                                                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, item.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'pending' && (
                            <div className="space-y-4">
                                <h3 className="font-semibold px-1">
                                    {mode === 'sale' ? 'Pending Sales' : 'Pending Transfers'}
                                </h3>

                                {mode === 'sale' ? (
                                    pendingSales.length === 0 ? <EmptyState msg="No pending sales" /> :
                                        pendingSales.map(sale => (
                                            <PendingCard key={sale.id} item={sale} type="sale" onCancel={() => handleCancelSale(sale.id)} />
                                        ))
                                ) : (
                                    pendingTransfers.length === 0 ? <EmptyState msg="No pending transfers" /> :
                                        pendingTransfers.map(transfer => (
                                            <PendingCard key={transfer.id} item={transfer} type="transfer" />
                                        ))
                                )}
                            </div>
                        )}
                    </div>
                </div>



                {/* --- Bottom Action Bar (Only for Scan Tab) --- */}
                {activeTab === 'scan' && cart.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <Button
                            className="w-full gap-2 text-lg h-12"
                            size="lg"
                            onClick={mode === 'sale' ? handleReadySale : handleReadyTransfer}
                            disabled={mode === 'sale' ? processingSale : processingTransfer}
                        >
                            <Check className="w-5 h-5" />
                            {mode === 'sale' ? 'Ready Sale' : 'Ready Transfer'}
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

// Subcomponents

function DropdownModeSelector({ mode, setMode, clearCart }: { mode: 'sale' | 'transfer', setMode: any, clearCart: any }) {
    return (
        <Select value={mode} onValueChange={(v) => {
            if (confirm("Switching modes will clear your cart. Continue?")) {
                clearCart();
                setMode(v);
            }
        }}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="sale">Sale Mode</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
        </Select>
    );
}

function EmptyState({ msg }: { msg: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
            <History className="w-12 h-12 mb-2" />
            <p>{msg}</p>
        </div>
    );
}

function PendingCard({ item, type, onCancel }: { item: PendingItem, type: 'sale' | 'transfer', onCancel?: () => void }) {
    return (
        <Card>
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-sm font-medium">#{item.id}</CardTitle>
                        <CardDescription className="text-xs">
                            {new Date(item.created_at).toLocaleString()}
                        </CardDescription>
                    </div>
                    <Badge variant="secondary" className={type === 'sale' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                        Readied
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                {type === 'transfer' && item.destination_branch && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 bg-muted p-2 rounded">
                        <span>To:</span>
                        <span className="font-semibold text-foreground">{item.destination_branch.branch_name}</span>
                    </div>
                )}

                <div className="space-y-1">
                    {item.items.slice(0, 3).map((line, i) => (
                        <div key={i} className="flex justify-between text-sm">
                            <span className="truncate max-w-[200px]">{line.product.name}</span>
                            <span className="font-mono text-xs">x{line.quantity}</span>
                        </div>
                    ))}
                    {item.items.length > 3 && (
                        <p className="text-xs text-muted-foreground pt-1">+ {item.items.length - 3} more items</p>
                    )}
                </div>
            </CardContent>
            {onCancel && (
                <CardFooter className="p-2 border-t bg-muted/5">
                    <Button variant="ghost" size="sm" className="w-full text-destructive h-8 text-xs hover:bg-destructive/10" onClick={onCancel}>
                        Cancel
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
