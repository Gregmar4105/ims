import AppLayout from '@/layouts/app-layout';
import { Head, useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Plus, Trash2, Scan, ShoppingCart, Check, X, AlertCircle, Loader2, Barcode, Camera } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

import { usePermission } from '@/hooks/usePermission';
import { Html5Qrcode } from 'html5-qrcode';

interface Product {
    id: number;
    name: string;
    barcode: string | null;
    qr_code: string | null;
    available_quantity: number;
}

interface SaleItem {
    product_id: number;
    quantity: number;
    product: Product;
}

interface PendingSale {
    id: number;
    status: string;
    created_at: string;
    readied_by: {
        name: string;
    };
    items: {
        id: number;
        quantity: number;
        product: {
            name: string;
        };
    }[];
}

export default function Create({ products, pendingSales }: { products: Product[], pendingSales: PendingSale[] }) {
    const { can } = usePermission();
    const [scannedCode, setScannedCode] = useState('');
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const scannerInputRef = useRef<HTMLInputElement>(null);
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<number>(0);

    const { data, setData, post, processing, reset, errors } = useForm({
        items: [] as { product_id: number; quantity: number }[],
        notes: '',
    });

    // Focus scanner input on load and after actions
    useEffect(() => {
        if (!showScanner) {
            scannerInputRef.current?.focus();
        }
    }, [cart, showScanner]);

    // Initialize/Cleanup Scanner
    useEffect(() => {
        if (showScanner) {
            setScannerError(null);

            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                const html5QrCode = new Html5Qrcode("reader");
                html5QrCodeRef.current = html5QrCode;

                const config = { fps: 10, qrbox: { width: 250, height: 250 } };

                html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    onScanSuccess,
                    onScanFailure
                ).catch((err) => {
                    console.error("Error starting scanner", err);
                    setScannerError("Failed to start camera. Please ensure permissions are granted.");
                });
            }, 100);

            return () => clearTimeout(timer);
        } else {
            if (html5QrCodeRef.current) {
                if (html5QrCodeRef.current.isScanning) {
                    html5QrCodeRef.current.stop().then(() => {
                        html5QrCodeRef.current?.clear();
                        html5QrCodeRef.current = null;
                    }).catch(err => console.error("Failed to stop scanner", err));
                } else {
                    html5QrCodeRef.current.clear();
                    html5QrCodeRef.current = null;
                }
            }
        }

        return () => {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                html5QrCodeRef.current.stop().catch(err => console.error("Failed to stop scanner cleanup", err));
            }
        };
    }, [showScanner]);

    const normalizeCode = (code: string | null) => {
        if (!code) return '';
        return code.replace(/[-\s]/g, '').toUpperCase();
    };

    const findProduct = (code: string) => {
        // Try parsing as JSON first (e.g. {"id":2,...})
        try {
            const json = JSON.parse(code);
            if (json.id) {
                const product = products.find(p => p.id === Number(json.id));
                if (product) return product;
            }
        } catch (e) {
            // Not valid JSON, ignore
        }

        const normalizedInput = normalizeCode(code);

        // Fallback to standard barcode/QR code match with normalization
        return products.find(p => {
            const normalizedBarcode = normalizeCode(p.barcode);
            const normalizedQr = normalizeCode(p.qr_code);

            return normalizedBarcode === normalizedInput || normalizedQr === normalizedInput;
        });
    };

    const onScanSuccess = (decodedText: string, decodedResult: any) => {
        // Prevent rapid duplicate scans (2 second delay)
        const now = Date.now();
        if (now - lastScanRef.current < 2000) {
            return;
        }
        lastScanRef.current = now;

        setScannedCode(decodedText);

        // Process the scan
        const product = findProduct(decodedText);

        if (product) {
            addToCart(product);
        } else {
            toast.error('Product not found in branch inventory');
        }
    };

    const onScanFailure = (error: any) => {
        // handle scan failure, usually better to ignore and keep scanning.
    };

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scannedCode.trim()) return;

        setIsProcessing(true);
        try {
            // Check local products first
            const product = findProduct(scannedCode);

            if (product) {
                addToCart(product);
            } else {
                toast.error('Product not found in branch inventory');
            }
        } catch (error) {
            toast.error('Error scanning product');
        } finally {
            setIsProcessing(false);
            setScannedCode('');
            // Keep focus
            scannerInputRef.current?.focus();
        }
    };

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.id);
            if (existing) {
                if (existing.quantity >= product.available_quantity) {
                    toast.error(`Cannot add more. Only ${product.available_quantity} available.`);
                    return prev;
                }
                toast.success('Quantity updated');
                return prev.map(item =>
                    item.product_id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            toast.success('Item added to list');
            return [...prev, { product_id: product.id, quantity: 1, product: product }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.product_id !== productId));
    };

    const updateQuantity = (productId: number, newQuantity: number) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        if (newQuantity > product.available_quantity) {
            toast.error(`Only ${product.available_quantity} available`);
            return;
        }

        if (newQuantity < 1) return;

        setCart(prev => prev.map(item =>
            item.product_id === productId
                ? { ...item, quantity: newQuantity }
                : item
        ));
    };

    const handleReadySale = () => {
        if (cart.length === 0) return;

        data.items = cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        }));

        post('/sales', {
            onSuccess: () => {
                setCart([]);
                toast.success('Sale readied successfully');
            },
        });
    };

    const handleApprove = (saleId: number) => {
        router.post(`/sales/${saleId}/approve`, {}, {
            onSuccess: () => toast.success('Sale approved and inventory updated'),
        });
    };

    const handleCancel = (saleId: number) => {
        if (confirm('Are you sure you want to cancel this sale?')) {
            router.post(`/sales/${saleId}/cancel`, {}, {
                onSuccess: () => toast.success('Sale cancelled'),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'New Sale', href: '/new-sales' }]}>
            <Head title="New Sale" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">

                {/* Scanner Section */}
                <Card className="border-primary/20 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Scan className="w-6 h-6 text-primary" />
                            Scan Product
                        </CardTitle>
                        <CardDescription>
                            Scan a barcode or QR code to add items to the sale list.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            <form onSubmit={handleScan} className="flex gap-4">
                                <div className="relative flex-1">
                                    <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        ref={scannerInputRef}
                                        value={scannedCode}
                                        onChange={(e) => setScannedCode(e.target.value)}
                                        placeholder="Scan barcode or QR code here..."
                                        className="pl-9 h-12 text-lg"
                                        autoFocus
                                        disabled={isProcessing}
                                    />
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    onClick={() => setShowScanner(!showScanner)}
                                    className="gap-2"
                                >
                                    <Camera className="w-4 h-4" />
                                    {showScanner ? 'Close Camera' : 'Use Camera'}
                                </Button>
                            </form>

                            {showScanner && (
                                <div className="border rounded-lg overflow-hidden bg-black p-4 relative">
                                    {scannerError ? (
                                        <div className="text-destructive text-center p-8 bg-destructive/10 rounded">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                            <p>{scannerError}</p>
                                            <Button variant="outline" size="sm" onClick={() => setShowScanner(false)} className="mt-4">
                                                Close Camera
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div id="reader" className="w-full max-w-md mx-auto min-h-[300px]"></div>
                                            <p className="text-center text-sm text-muted-foreground mt-2">
                                                Point your camera at a barcode or QR code
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Current Sale List */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5" />
                                        Current Sale Items
                                    </div>
                                    <Badge variant="secondary">{cart.length} items</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                                        <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                                        <p>No items added yet.</p>
                                        <p className="text-sm">Scan a product to start.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {cart.map((item) => (
                                            <div key={item.product_id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                        <Package className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium">{item.product.name}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            {item.product.barcode && (
                                                                <span className="flex items-center gap-1"><Barcode className="w-3 h-3" /> {item.product.barcode}</span>
                                                            )}
                                                            <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                                                                Stock: {item.product.available_quantity}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                            disabled={item.quantity <= 1}
                                                        >
                                                            -
                                                        </Button>
                                                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                                            disabled={item.quantity >= item.product.available_quantity}
                                                        >
                                                            +
                                                        </Button>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => removeFromCart(item.product_id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="border-t bg-muted/10 p-6">
                                <div className="w-full flex justify-between items-center">
                                    <div className="text-sm text-muted-foreground">
                                        Total Items: <span className="font-medium text-foreground">{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>
                                    </div>
                                    <Button
                                        size="lg"
                                        onClick={handleReadySale}
                                        disabled={cart.length === 0 || processing}
                                        className="gap-2"
                                    >
                                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Ready Sale
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Pending Approvals */}
                    <div className="space-y-6">
                        <Card className="h-full border-l-4 border-l-yellow-500/50">
                            <CardHeader>
                                <CardTitle className="text-lg">Pending Approval</CardTitle>
                                <CardDescription>Sales waiting for admin approval</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {pendingSales.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">No pending sales.</p>
                                ) : (
                                    pendingSales.map((sale) => (
                                        <div key={sale.id} className="p-4 border rounded-lg bg-card space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-xs font-mono text-muted-foreground">#{sale.id}</span>
                                                    <p className="text-sm font-medium">Readied by {sale.readied_by.name}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleString()}</p>
                                                </div>
                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                                    Readied
                                                </Badge>
                                            </div>

                                            <div className="space-y-1">
                                                {sale.items.map((item) => (
                                                    <div key={item.id} className="flex justify-between text-sm">
                                                        <span>{item.product.name}</span>
                                                        <span className="font-medium">x{item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {(can('branch.admin') || can('system.admin')) && (
                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                                                        onClick={() => handleApprove(sale.id)}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/20"
                                                        onClick={() => handleCancel(sale.id)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>




            </div>
        </AppLayout>
    );
}
