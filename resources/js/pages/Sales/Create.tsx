import AppLayout from '@/layouts/app-layout';
import { Head, useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Plus, Trash2, Scan, ShoppingCart, Check, X, AlertCircle, Loader2, Barcode, Camera, TicketPercent, Wallet, Upload, CircleDollarSign, Clock, Coins, MessageSquare } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { usePermission } from '@/hooks/usePermission';
import { Html5Qrcode } from 'html5-qrcode';
import { useDebounce } from '@/hooks/use-debounce';
import axios from 'axios';

interface Product {
    id: number;
    name: string;
    code: string | null;
    barcode: string | null;
    qr_code: string | null;
    price: number | null;
    available_quantity: number;
    image_path: string | null;
    variations?: any[] | null;
}

interface SaleItem {
    product_id: number;
    quantity: number;
    price: number; // The current selling price (can be discounted)
    product: Product;
    custom_code: string | null;
    note?: string | null;
    custom_note?: string | null;
    selected_variations?: Record<string, string>;
}

interface ServiceFee {
    id: number;
    name: string;
    amount: string | number;
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
        price: number;
        custom_code?: string | null;
        note?: string | null;
        product: {
            name: string;
        };
    }[];
    service_fees?: ServiceFee[];
    customer_name?: string | null;
    downpayment?: string | number | null;
    reservation_buy_date?: string | null;
}

const generateDefaultHomeCredited = (items: any[]) => {
    if (!items || items.length === 0) return '';
    const names = items.map(item => item.product.name);
    const hasBike = names.some(name => name.toLowerCase().includes('bike'));
    if (hasBike && names.length > 1) {
        return 'Bikes and Accessories';
    }
    return names.join(', ');
};

export default function Create({ products, pendingSales }: { products: Product[], pendingSales: PendingSale[] }) {
    const { can } = usePermission();
    
    const getSaleTotal = (sale: PendingSale) => {
        const itemsTotal = sale.items.reduce((sum, item) => sum + Math.ceil(item.quantity * Number(item.price)), 0);
        const serviceFeeTotal = sale.service_fees?.reduce((sum, fee) => sum + Number(fee.amount), 0) || 0;
        return Math.ceil(itemsTotal + serviceFeeTotal);
    };

    const [scannedCode, setScannedCode] = useState('');
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [pendingSalesList, setPendingSalesList] = useState<PendingSale[]>(pendingSales);

    const debouncedSearch = useDebounce(scannedCode, 300);
    const scannerInputRef = useRef<HTMLInputElement>(null);
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<number>(0);

    const { data, setData, post, processing, reset, errors } = useForm({
        items: [] as { product_id: number; quantity: number; price: number; original_price: number; custom_code: string | null; note: string | null }[],
        notes: '',
        add_service_fee: false,
        service_fee_name: '',
        service_fee_amount: '',
        service_fee_payment_method: 'cash',
        service_fee_cash_received: '',
        service_fee_split_ewallet_amount: '',
        custom_date: '',
    });

    const [discountModalOpen, setDiscountModalOpen] = useState(false);
    const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<SaleItem | null>(null);
    const [newPrice, setNewPrice] = useState<string>('');

    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [selectedItemForNote, setSelectedItemForNote] = useState<SaleItem | null>(null);
    const [itemNoteText, setItemNoteText] = useState<string>('');

    // Focus scanner input on load and after actions
    useEffect(() => {
        if (!showScanner && document.activeElement?.tagName !== 'INPUT') {
            scannerInputRef.current?.focus();
        }
    }, [cart.length, showScanner]);

    // Synchronize pendingSales prop and setup 2-second polling
    useEffect(() => {
        setPendingSalesList(pendingSales);
    }, [pendingSales]);

    useEffect(() => {
        const fetchPendingSales = async () => {
            try {
                const response = await axios.get('/api/sales/pending');
                setPendingSalesList(response.data);
            } catch (error) {
                console.error("Error polling pending sales:", error);
            }
        };

        const interval = setInterval(fetchPendingSales, 2000);
        return () => clearInterval(interval);
    }, []);

    // Initialize/Cleanup Scanner
    useEffect(() => {
        let isMounted = true;
        let timer: any = null;

        if (showScanner) {
            setScannerError(null);

            // Small delay to ensure DOM is ready
            timer = setTimeout(() => {
                if (!isMounted) return;

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
        }

        return () => {
            isMounted = false;
            if (timer) {
                clearTimeout(timer);
            }
            if (html5QrCodeRef.current) {
                const currentScanner = html5QrCodeRef.current;
                if (currentScanner.isScanning) {
                    currentScanner.stop().then(() => {
                        currentScanner.clear();
                    }).catch(err => console.error("Failed to stop scanner cleanup", err));
                } else {
                    try {
                        currentScanner.clear();
                    } catch (e) {
                        console.error("Failed to clear scanner cleanup", e);
                    }
                }
                html5QrCodeRef.current = null;
            }
        };
    }, [showScanner]);

    // Handle debounced search
    useEffect(() => {
        let active = true;
        const fetchResults = async () => {
            if (debouncedSearch.trim().length < 1) {
                if (active) setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const response = await axios.get('/api/sales/search-products', {
                    params: { search: debouncedSearch }
                });
                if (active) {
                    // If scannedCode is empty, ignore the search results
                    if (!scannerInputRef.current?.value.trim()) {
                        setSearchResults([]);
                    } else {
                        setSearchResults(response.data);
                    }
                }
            } catch (error) {
                console.error("Error searching products:", error);
            } finally {
                if (active) setIsSearching(false);
            }
        };

        fetchResults();

        return () => {
            active = false;
        };
    }, [debouncedSearch]);
 
    // Recalculate split e-wallet amount for optional service fee when amount or cash received changes
    useEffect(() => {
        if (data.service_fee_payment_method === 'split_bill') {
            const cashVal = parseFloat(data.service_fee_cash_received) || 0;
            const totalAmt = parseFloat(data.service_fee_amount) || 0;
            const ewalletVal = Math.max(0, totalAmt - cashVal);
            const expectedEwallet = ewalletVal.toFixed(2);
            if (data.service_fee_split_ewallet_amount !== expectedEwallet) {
                setData('service_fee_split_ewallet_amount', expectedEwallet);
            }
        } else {
            if (data.service_fee_cash_received !== '' || data.service_fee_split_ewallet_amount !== '') {
                setData(d => ({
                    ...d,
                    service_fee_cash_received: '',
                    service_fee_split_ewallet_amount: ''
                }));
            }
        }
    }, [data.service_fee_amount, data.service_fee_payment_method, data.service_fee_cash_received, data.service_fee_split_ewallet_amount]);

    const normalizeCode = (code: string | null) => {
        if (!code) return '';
        return code.replace(/[-\s]/g, '').toUpperCase();
    };

    const findProduct = (code: string) => {
        if (!code.trim()) return undefined;

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
        if (!normalizedInput) return undefined;

        // Fallback to standard barcode/QR code match with normalization
        return products.find(p => {
            const normalizedBarcode = p.barcode ? normalizeCode(p.barcode) : '';
            const normalizedQr = p.qr_code ? normalizeCode(p.qr_code) : '';

            return (normalizedBarcode && normalizedBarcode === normalizedInput) || 
                   (normalizedQr && normalizedQr === normalizedInput);
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

    const getParsedVariations = (variations: any): any[] => {
        if (!variations) return [];
        if (typeof variations === 'string') {
            try {
                const decoded = JSON.parse(variations);
                if (Array.isArray(decoded)) return decoded;
            } catch (e) {}
            return [];
        }
        if (Array.isArray(variations)) return variations;
        return [];
    };

    const getOptionsArray = (options: any): string[] => {
        if (typeof options === 'string') {
            return options.split(',').map(o => o.trim());
        }
        if (Array.isArray(options)) {
            return options.map(opt => typeof opt === 'object' ? opt.value : String(opt));
        }
        return [];
    };

    const getCombinedNote = (variations: Record<string, string> | undefined, customNote: string | null | undefined) => {
        const varParts = variations 
            ? Object.entries(variations)
                .filter(([_, value]) => value !== '')
                .map(([name, value]) => `${name}: ${value}`) 
            : [];
        const varString = varParts.join(', ');
        if (varString && customNote) {
            return `${varString} | ${customNote}`;
        }
        return varString || customNote || null;
    };

    const updateSelectedVariation = (productId: number, variationName: string, value: string) => {
        setCart(prev => prev.map(item => {
            if (item.product_id === productId) {
                const nextVars = {
                    ...(item.selected_variations || {}),
                    [variationName]: value
                };
                return {
                    ...item,
                    selected_variations: nextVars,
                    note: getCombinedNote(nextVars, item.custom_note)
                };
            }
            return item;
        }));
    };

    const addToCart = (product: Product) => {
        if (product.available_quantity <= 0) {
            toast.error(`Cannot add. ${product.name} is out of stock.`);
            return;
        }
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
            return [...prev, { product_id: product.id, quantity: 1, price: Number(product.price) || 0, product: product, custom_code: product.code, note: null, custom_note: null, selected_variations: {} }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.product_id !== productId));
    };

    const updateQuantity = (productId: number, newQuantity: number) => {
        const cartItem = cart.find(item => item.product_id === productId);
        const product = cartItem?.product || products.find(p => p.id === productId);
        if (!product) return;

        if (newQuantity > product.available_quantity) {
            toast.error(`Only ${product.available_quantity} available`);
            return;
        }

        if (newQuantity < 0) return;

        setCart(prev => prev.map(item =>
            item.product_id === productId
                ? { ...item, quantity: newQuantity }
                : item
        ));
    };

    const updateCustomCode = (productId: number, newCode: string) => {
        setCart(prev => prev.map(item =>
            item.product_id === productId
                ? { ...item, custom_code: newCode }
                : item
        ));
    };

    const handleOpenDiscountModal = (item: SaleItem) => {
        setSelectedItemForDiscount(item);
        setNewPrice(item.price.toString());
        setDiscountModalOpen(true);
    };

    const handleApplyDiscount = () => {
        if (!selectedItemForDiscount) return;
        const price = parseFloat(newPrice);
        if (isNaN(price) || price < 0) {
            toast.error('Please enter a valid price');
            return;
        }

        setCart(prev => prev.map(item =>
            item.product_id === selectedItemForDiscount.product_id
                ? { ...item, price: price }
                : item
        ));
        setDiscountModalOpen(false);
        setSelectedItemForDiscount(null);
        toast.success('Price updated for this item');
    };

    const handleOpenNoteModal = (item: SaleItem) => {
        setSelectedItemForNote(item);
        setItemNoteText(item.custom_note || '');
        setNoteModalOpen(true);
    };

    const handleSaveNote = () => {
        if (!selectedItemForNote) return;
        setCart(prev => prev.map(item =>
            item.product_id === selectedItemForNote.product_id
                ? { 
                    ...item, 
                    custom_note: itemNoteText.trim() || null,
                    note: getCombinedNote(item.selected_variations, itemNoteText.trim() || null)
                  }
                : item
        ));
        setNoteModalOpen(false);
        setSelectedItemForNote(null);
        toast.success('Note updated for this item');
    };
    const handleReadySale = () => {
        if (cart.length === 0) return;

        if (cart.some(item => item.quantity < 1)) {
            toast.error('Please ensure all items have a quantity of at least 1');
            return;
        }

        data.items = cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            original_price: Number(item.product.price) || 0,
            custom_code: item.custom_code || null,
            note: item.note || null
        }));

        post('/sales', {
            onSuccess: () => {
                setCart([]);
                reset();
                toast.success('Sale readied successfully');
            },
        });
    };

    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [selectedSaleForApproval, setSelectedSaleForApproval] = useState<PendingSale | null>(null);
    const approveForm = useForm({
        payment_method: 'cash' as 'cash' | 'e-wallet' | 'home_credit' | 'reservation' | 'split_bill',
        ewallet_provider: 'GCash',
        proof_of_payment: null as File | null,
        cash_received: '',
        change_amount: 0,
        split_ewallet_amount: '',
        home_credited_name: '',
        downpayment: '',
        customer_name: '',
        reservation_buy_date: '',
        is_completing_reservation: false,
        reservation_final_method: 'cash' as 'cash' | 'e-wallet',
        reservation_cash_received: '',
        reservation_change_amount: 0,
        reservation_ewallet_provider: 'GCash',
        reservation_proof_of_payment: null as File | null,
    });

    useEffect(() => {
        if (selectedSaleForApproval) {
            const defaultName = generateDefaultHomeCredited(selectedSaleForApproval.items);
            const isReserved = selectedSaleForApproval.status === 'reserved';
            approveForm.setData({
                payment_method: isReserved ? 'reservation' : 'cash',
                ewallet_provider: 'GCash',
                proof_of_payment: null,
                cash_received: '',
                change_amount: 0,
                split_ewallet_amount: '',
                home_credited_name: defaultName,
                downpayment: isReserved ? String(selectedSaleForApproval.downpayment || '') : '',
                customer_name: isReserved ? (selectedSaleForApproval.customer_name || '') : '',
                reservation_buy_date: isReserved ? (selectedSaleForApproval.reservation_buy_date || '') : '',
                is_completing_reservation: isReserved,
                reservation_final_method: 'cash',
                reservation_cash_received: '',
                reservation_change_amount: 0,
                reservation_ewallet_provider: 'GCash',
                reservation_proof_of_payment: null,
            });
        }
    }, [selectedSaleForApproval]);

    const [useWebcam, setUseWebcam] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!approveModalOpen) {
            stopWebcam();
        }
    }, [approveModalOpen]);

    useEffect(() => {
        const file = approveForm.data.is_completing_reservation
            ? approveForm.data.reservation_proof_of_payment
            : approveForm.data.proof_of_payment;
        if (file) {
            const url = URL.createObjectURL(file);
            setProofPreview(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setProofPreview(null);
        }
    }, [approveForm.data.proof_of_payment, approveForm.data.reservation_proof_of_payment, approveForm.data.is_completing_reservation]);

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setWebcamStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setUseWebcam(true);
        } catch (err) {
            console.error('Error accessing camera:', err);
            toast.error('Could not access camera. Please upload a file instead.');
        }
    };

    const stopWebcam = () => {
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            setWebcamStream(null);
        }
        setUseWebcam(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], 'captured_proof.jpg', { type: 'image/jpeg' });
                        if (approveForm.data.is_completing_reservation) {
                            approveForm.setData('reservation_proof_of_payment', file);
                        } else {
                            approveForm.setData('proof_of_payment', file);
                        }
                        stopWebcam();
                    }
                }, 'image/jpeg', 0.85);
            }
        }
    };

    const handleCashReceivedChange = (value: string) => {
        approveForm.setData(data => {
            const cash = parseFloat(value) || 0;
            const total = selectedSaleForApproval ? getSaleTotal(selectedSaleForApproval) : 0;
            const change = Math.max(0, cash - total);
            return {
                ...data,
                cash_received: value,
                change_amount: change,
            };
        });
    };

    const handleSplitCashReceivedChange = (value: string) => {
        approveForm.setData(data => {
            const cash = parseFloat(value) || 0;
            const total = selectedSaleForApproval ? getSaleTotal(selectedSaleForApproval) : 0;
            const ewallet = Math.max(0, total - cash);
            return {
                ...data,
                cash_received: value,
                split_ewallet_amount: ewallet.toFixed(2),
            };
        });
    };

    const handleReservationCashReceivedChange = (value: string) => {
        approveForm.setData(data => {
            const cash = parseFloat(value) || 0;
            const total = selectedSaleForApproval ? getSaleTotal(selectedSaleForApproval) : 0;
            const remaining = selectedSaleForApproval ? (total - Number(selectedSaleForApproval.downpayment || 0)) : 0;
            const change = Math.max(0, cash - remaining);
            return {
                ...data,
                reservation_cash_received: value,
                reservation_change_amount: change,
            };
        });
    };

    const handleApproveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSaleForApproval) return;

        const total = getSaleTotal(selectedSaleForApproval);

        if (approveForm.data.is_completing_reservation) {
            const remaining = total - Number(selectedSaleForApproval.downpayment || 0);
            if (approveForm.data.reservation_final_method === 'cash') {
                const cash = parseFloat(approveForm.data.reservation_cash_received) || 0;
                if (cash < remaining) {
                    toast.error(`Cash received must be at least ₱${remaining.toFixed(2)}`);
                    return;
                }
            } else if (approveForm.data.reservation_final_method === 'e-wallet') {
                if (!approveForm.data.reservation_proof_of_payment) {
                    toast.error('Proof of payment is required for E-wallet transactions');
                    return;
                }
            }
        } else {
            if (approveForm.data.payment_method === 'cash') {
                const cash = parseFloat(approveForm.data.cash_received) || 0;
                if (cash < total) {
                    toast.error(`Cash received must be at least ₱${total.toFixed(2)}`);
                    return;
                }
            } else if (approveForm.data.payment_method === 'e-wallet') {
                if (!approveForm.data.proof_of_payment) {
                    toast.error('Proof of payment is required for E-wallet transactions');
                    return;
                }
            } else if (approveForm.data.payment_method === 'split_bill') {
                const cash = parseFloat(approveForm.data.cash_received) || 0;
                if (cash <= 0) {
                    toast.error('Cash portion must be greater than ₱0.00');
                    return;
                }
                if (cash >= total) {
                    toast.error(`Cash portion must be less than the total sale amount of ₱${total.toFixed(2)}`);
                    return;
                }
                if (!approveForm.data.proof_of_payment) {
                    toast.error('Proof of payment is required for the E-wallet portion');
                    return;
                }
            } else if (approveForm.data.payment_method === 'home_credit') {
                if (!approveForm.data.home_credited_name || !approveForm.data.home_credited_name.trim()) {
                    toast.error('Home Credited Name is required');
                    return;
                }
            } else if (approveForm.data.payment_method === 'reservation') {
                if (!approveForm.data.customer_name || !approveForm.data.customer_name.trim()) {
                    toast.error('Customer Name is required');
                    return;
                }
                const dp = parseFloat(approveForm.data.downpayment) || 0;
                if (dp <= 0) {
                    toast.error('Downpayment amount is required and must be greater than 0');
                    return;
                }
                if (dp > total) {
                    toast.error('Downpayment amount cannot exceed the total sale amount');
                    return;
                }
            }
        }

        approveForm.post(`/sales/${selectedSaleForApproval.id}/approve`, {
            onSuccess: () => {
                toast.success('Sale approved successfully');
                setApproveModalOpen(false);
                setSelectedSaleForApproval(null);
                approveForm.reset();
            },
            onError: (err) => {
                const errMsg = Object.values(err)[0] || 'Failed to approve sale';
                toast.error(errMsg as string);
            }
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
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setScannedCode(val);
                                            if (val.trim()) {
                                                const product = findProduct(val);
                                                if (product) {
                                                    addToCart(product);
                                                    setScannedCode('');
                                                    setSearchResults([]);
                                                }
                                            }
                                        }}
                                        placeholder="Scan barcode or QR code here..."
                                        className="pl-9 h-12 text-lg"
                                        autoFocus
                                        disabled={isProcessing}
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}

                                    {/* Search Results Dropdown */}
                                    {searchResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 bg-popover border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                                            <div className="max-h-[300px] overflow-y-auto">
                                                {searchResults.map((product) => (
                                                    <div
                                                        key={product.id}
                                                        className={`flex items-center justify-between p-3 border-b last:border-0 transition-colors ${product.available_quantity <= 0
                                                                ? 'bg-destructive/5 text-destructive cursor-not-allowed'
                                                                : 'hover:bg-accent cursor-pointer'
                                                            }`}
                                                        onClick={() => {
                                                            if (product.available_quantity <= 0) {
                                                                toast.error(`Cannot add. ${product.name} is out of stock.`);
                                                                return;
                                                            }
                                                            addToCart(product);
                                                            setScannedCode('');
                                                            setSearchResults([]);
                                                            scannerInputRef.current?.focus();
                                                        }}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className={`font-semibold text-sm ${product.available_quantity <= 0 ? 'text-destructive' : ''}`}>{product.name}</span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[10px] h-4 px-1 font-normal ${product.available_quantity <= 0
                                                                            ? 'border-destructive/30 text-destructive bg-destructive/10'
                                                                            : ''
                                                                        }`}
                                                                >
                                                                    {product.barcode || product.qr_code || 'No Code'}
                                                                </Badge>
                                                                <span className={`text-[10px] ${product.available_quantity <= 0 ? 'text-destructive/80 font-medium' : 'text-muted-foreground'}`}>
                                                                    Stock: {product.available_quantity} {product.available_quantity <= 0 ? '(Out of Stock)' : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`font-bold ${product.available_quantity <= 0 ? 'text-destructive' : 'text-primary'}`}>₱{Number(product.price).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="bg-muted/30 p-2 text-center border-t">
                                                <p className="text-[10px] text-muted-foreground">
                                                    Showing {searchResults.length} results. Click to add to cart.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    onClick={() => setShowScanner(!showScanner)}
                                    className="gap-2 py-1"
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
                                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <ShoppingCart className="w-5 h-5" />
                                            Current Sale Items
                                        </div>
                                        {can('system.admin') && (
                                            <div className="flex items-center gap-2 bg-muted/40 px-2 py-1 rounded-md border">
                                                <Label htmlFor="custom-date" className="text-xs font-medium text-muted-foreground whitespace-nowrap cursor-pointer">
                                                    Backdate:
                                                </Label>
                                                <Input
                                                    id="custom-date"
                                                    type="date"
                                                    value={data.custom_date || ''}
                                                    onChange={(e) => setData('custom_date', e.target.value)}
                                                    max={new Date().toLocaleDateString('en-CA')}
                                                    className="w-36 h-7 text-xs px-2 py-0 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <Badge variant="secondary" className="w-fit">{cart.length} items</Badge>
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
                                                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary overflow-hidden border">
                                                        {item.product.image_path ? (
                                                            <img
                                                                src={`/storage/${item.product.image_path}`}
                                                                alt={item.product.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <Package className="w-5 h-5" />
                                                        )}
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
                                                        {item.note && (
                                                            <div className="text-[11px] text-green-700 dark:text-green-400 italic mt-1 font-medium bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded w-fit flex items-center gap-1">
                                                                <MessageSquare className="w-3 h-3" />
                                                                <span>Note: {item.note}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        {/* Editable Product Code */}
                                                        <div className="flex flex-col items-start gap-1.5 mr-2">
                                                            <div className="flex flex-col items-start">
                                                                <span className="text-[10px] text-muted-foreground mb-0.5">Code</span>
                                                                <Input
                                                                    type="text"
                                                                    value={item.custom_code || ''}
                                                                    onChange={(e) => updateCustomCode(item.product_id, e.target.value)}
                                                                    className="w-24 h-8 text-center text-xs font-mono px-1.5"
                                                                    placeholder="Code"
                                                                />
                                                            </div>
                                                            {getParsedVariations(item.product.variations).map((v, vIdx) => {
                                                                const options = getOptionsArray(v.options);
                                                                const currentValue = item.selected_variations?.[v.name] || '';
                                                                return (
                                                                    <div key={vIdx} className="flex flex-col items-start w-24">
                                                                        <span className="text-[9px] text-muted-foreground mb-0.5 truncate max-w-full font-medium" title={v.name}>{v.name}</span>
                                                                        <select
                                                                            value={currentValue}
                                                                            onChange={(e) => updateSelectedVariation(item.product_id, v.name, e.target.value)}
                                                                            className="w-24 h-8 text-[11px] rounded-md border border-input bg-background px-1.5 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                                                                        >
                                                                            <option value="">Select</option>
                                                                            {options.map((opt, oIdx) => (
                                                                                <option key={oIdx} value={opt}>{opt}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="flex flex-col items-end mr-4">
                                                            <span className="text-sm font-bold">₱{Math.ceil(item.price * item.quantity).toFixed(2)}</span>
                                                            <div className="flex flex-col items-end">
                                                                {item.price !== Number(item.product.price) && (
                                                                    <span className="text-[10px] text-muted-foreground line-through">₱{Number(item.product.price).toFixed(2)}</span>
                                                                )}
                                                                <span className="text-[10px] text-primary font-medium">₱{item.price.toFixed(2)} ea</span>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/10"
                                                            onClick={() => handleOpenDiscountModal(item)}
                                                            title="Apply Discount"
                                                        >
                                                            <TicketPercent className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className={`h-8 w-8 ${item.note ? 'text-green-600 border-green-300 bg-green-50/50 hover:bg-green-100 dark:text-green-400 dark:border-green-800/30 dark:bg-green-950/20' : 'text-primary border-primary/20 hover:bg-primary/10'}`}
                                                            onClick={() => handleOpenNoteModal(item)}
                                                            title={item.note ? "Edit Note" : "Add Note"}
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                            disabled={item.quantity <= 1}
                                                        >
                                                            -
                                                        </Button>
                                                        <Input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={item.quantity || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '' || /^\d+$/.test(val)) {
                                                                    updateQuantity(item.product_id, val === '' ? 0 : parseInt(val));
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                if (item.quantity < 1) {
                                                                    updateQuantity(item.product_id, 1);
                                                                }
                                                            }}
                                                            className="w-16 h-8 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1"
                                                            min="1"
                                                            max={item.product.available_quantity}
                                                        />
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

                                        {/* Optional Service Fee Section */}
                                        <div className="mt-6 pt-6 border-t space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <CircleDollarSign className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                                                    <span className="font-semibold text-sm">Add Service Fee (Optional)</span>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    id="toggle-service-fee"
                                                    checked={data.add_service_fee}
                                                    onChange={(e) => setData('add_service_fee', e.target.checked)}
                                                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                                />
                                            </div>

                                            {data.add_service_fee && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="service-fee-name">Service Name / Description</Label>
                                                        <Input
                                                            id="service-fee-name"
                                                            placeholder="e.g. Bike Tune Up, Wheel Alignment"
                                                            value={data.service_fee_name}
                                                            onChange={(e) => setData('service_fee_name', e.target.value)}
                                                        />
                                                        {errors.service_fee_name && (
                                                            <p className="text-xs text-destructive">{errors.service_fee_name}</p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="service-fee-amount">Amount (₱)</Label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">₱</span>
                                                            <Input
                                                                id="service-fee-amount"
                                                                type="number"
                                                                step="0.01"
                                                                min="0.01"
                                                                placeholder="0.00"
                                                                className="pl-7"
                                                                value={data.service_fee_amount}
                                                                onChange={(e) => setData('service_fee_amount', e.target.value)}
                                                            />
                                                        </div>
                                                        {errors.service_fee_amount && (
                                                            <p className="text-xs text-destructive">{errors.service_fee_amount}</p>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1.5 sm:col-span-2">
                                                        <Label>Payment Method</Label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setData('service_fee_payment_method', 'cash')}
                                                                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-md border text-xs font-semibold transition-all ${data.service_fee_payment_method === 'cash'
                                                                    ? 'border-primary bg-primary/5 text-primary'
                                                                    : 'border-input hover:bg-accent bg-background'
                                                                }`}
                                                            >
                                                                <CircleDollarSign className="w-3.5 h-3.5" />
                                                                Cash
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setData('service_fee_payment_method', 'e-wallet')}
                                                                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-md border text-xs font-semibold transition-all ${data.service_fee_payment_method === 'e-wallet'
                                                                    ? 'border-primary bg-primary/5 text-primary'
                                                                    : 'border-input hover:bg-accent bg-background'
                                                                }`}
                                                            >
                                                                <Wallet className="w-3.5 h-3.5" />
                                                                E-Wallet
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setData('service_fee_payment_method', 'split_bill')}
                                                                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-md border text-xs font-semibold transition-all ${data.service_fee_payment_method === 'split_bill'
                                                                    ? 'border-primary bg-primary/5 text-primary'
                                                                    : 'border-input hover:bg-accent bg-background'
                                                                }`}
                                                            >
                                                                <Coins className="w-3.5 h-3.5" />
                                                                Split Bill
                                                            </button>
                                                        </div>
                                                        {errors.service_fee_payment_method && (
                                                            <p className="text-xs text-destructive">{errors.service_fee_payment_method}</p>
                                                        )}
                                                    </div>

                                                    {data.service_fee_payment_method === 'split_bill' && (
                                                        <div className="grid grid-cols-2 gap-4 sm:col-span-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="service-fee-cash-received">Cash Portion</Label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">₱</span>
                                                                    <Input
                                                                        id="service-fee-cash-received"
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        placeholder="0.00"
                                                                        className="pl-7"
                                                                        value={data.service_fee_cash_received}
                                                                        onChange={(e) => setData('service_fee_cash_received', e.target.value)}
                                                                    />
                                                                </div>
                                                                {errors.service_fee_cash_received && (
                                                                    <p className="text-xs text-destructive">{errors.service_fee_cash_received}</p>
                                                                )}
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="service-fee-split-ewallet">E-Wallet Portion</Label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">₱</span>
                                                                    <Input
                                                                        id="service-fee-split-ewallet"
                                                                        type="text"
                                                                        className="pl-7 bg-muted"
                                                                        value={data.service_fee_split_ewallet_amount}
                                                                        disabled
                                                                        readOnly
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="border-t bg-muted/10 p-6">
                                <div className="w-full flex justify-between items-center">
                                    <div className="text-sm text-muted-foreground">
                                        Total Items: <span className="font-medium text-foreground">{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>
                                        <div className="text-xl font-bold text-primary mt-1">
                                            Total: ₱{Math.ceil(
                                                cart.reduce((acc, item) => acc + Math.ceil(item.quantity * item.price), 0) +
                                                (data.add_service_fee && data.service_fee_amount ? Number(data.service_fee_amount) : 0)
                                            ).toFixed(2)}
                                        </div>
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
                                {pendingSalesList.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">No pending sales.</p>
                                ) : (
                                    pendingSalesList.map((sale) => (
                                        <div
                                            key={sale.id}
                                            className={`p-4 border rounded-lg space-y-3 transition-colors ${sale.status === 'reserved'
                                                    ? 'bg-blue-50/40 border-blue-200 dark:bg-blue-955/10 dark:border-blue-800/30'
                                                    : 'bg-card'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-xs font-mono text-muted-foreground">#{sale.id}</span>
                                                    <p className="text-sm font-medium">Readied by {sale.readied_by.name}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleString()}</p>
                                                    <p className="text-xs font-semibold text-primary mt-1">Total: ₱{getSaleTotal(sale).toFixed(2)}</p>
                                                </div>
                                                {sale.status === 'reserved' ? (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-955/20 dark:text-blue-300 dark:border-blue-800">
                                                        Reserved
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                                        Readied
                                                    </Badge>
                                                )}
                                            </div>

                                            {sale.status === 'reserved' && (
                                                <div className="text-xs space-y-1 bg-blue-50/50 dark:bg-blue-955/20 p-2.5 rounded border border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300">
                                                    <p className="font-semibold">Customer: <span className="font-normal text-foreground dark:text-gray-200">{sale.customer_name}</span></p>
                                                    <p className="font-semibold">Downpayment: <span className="font-normal text-foreground dark:text-gray-200">₱{Number(sale.downpayment || 0).toFixed(2)}</span></p>
                                                    {sale.reservation_buy_date && (
                                                        <p className="font-semibold">Buy Date: <span className="font-normal text-foreground dark:text-gray-200">{sale.reservation_buy_date}</span></p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                {sale.items.map((item) => (
                                                    <div key={item.id} className="flex flex-col border-b last:border-0 pb-1 mb-1">
                                                        <div className="flex justify-between text-sm">
                                                            <span>{item.product.name}</span>
                                                            <span className="font-medium">x{item.quantity}</span>
                                                        </div>
                                                        {item.custom_code && (
                                                            <span className="text-[10px] text-muted-foreground font-mono">Code: {item.custom_code}</span>
                                                        )}
                                                        {item.note && (
                                                            <span className="text-[10px] text-green-700 dark:text-green-400 italic mt-0.5 flex items-center gap-0.5">
                                                                <MessageSquare className="w-2.5 h-2.5" />
                                                                <span>Note: {item.note}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {sale.service_fees && sale.service_fees.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-dashed border-muted text-xs space-y-1 text-muted-foreground">
                                                    <p className="font-semibold text-foreground">Service Fees:</p>
                                                    {sale.service_fees.map((fee) => (
                                                        <div key={fee.id} className="flex justify-between">
                                                            <span>{fee.name}</span>
                                                            <span className="font-medium text-foreground">₱{Number(fee.amount).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {(can('branch.admin') || can('system.admin')) && (
                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        className={`flex-1 h-8 text-xs ${sale.status === 'reserved'
                                                                ? 'bg-blue-600 hover:bg-blue-700'
                                                                : 'bg-green-600 hover:bg-green-700'
                                                            }`}
                                                        onClick={() => {
                                                            setSelectedSaleForApproval(sale);
                                                            setApproveModalOpen(true);
                                                        }}
                                                    >
                                                        {sale.status === 'reserved' ? 'Complete' : 'Approve'}
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

                {/* Discount Modal */}
                <Dialog open={discountModalOpen} onOpenChange={setDiscountModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Apply Discount</DialogTitle>
                            <DialogDescription>
                                Set a custom price for {selectedItemForDiscount?.product.name} for this sale.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4 py-4">
                            <div className="flex flex-col gap-2">
                                <Label>Original Base Price</Label>
                                <div className="text-lg font-semibold text-muted-foreground">
                                    ₱{Number(selectedItemForDiscount?.product.price || 0).toFixed(2)}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="new-price">New Price (per item)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                                    <Input
                                        id="new-price"
                                        type="number"
                                        step="0.01"
                                        className="pl-7"
                                        value={newPrice}
                                        onChange={(e) => setNewPrice(e.target.value)}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleApplyDiscount();
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDiscountModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleApplyDiscount}>Apply New Price</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Note Modal */}
                <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-primary" />
                                Add Note to Item
                            </DialogTitle>
                            <DialogDescription>
                                Add a note for {selectedItemForNote?.product.name} (e.g. custom requests or specific configurations).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4 py-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="item-note">Note</Label>
                                <Textarea
                                    id="item-note"
                                    placeholder="Type note here..."
                                    value={itemNoteText}
                                    onChange={(e) => setItemNoteText(e.target.value)}
                                    rows={3}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setNoteModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveNote}>Save Note</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {/* Approve Sale Modal */}
                <Dialog open={approveModalOpen} onOpenChange={(open) => {
                    setApproveModalOpen(open);
                    if (!open) {
                        setSelectedSaleForApproval(null);
                        approveForm.reset();
                    }
                }}>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Check className="w-5 h-5 text-green-600" />
                                {approveForm.data.is_completing_reservation ? 'Complete Reservation' : `Approve Sale #${selectedSaleForApproval?.id}`}
                            </DialogTitle>
                            <DialogDescription>
                                {approveForm.data.is_completing_reservation
                                    ? 'Record the remaining payment details to finalize this reservation.'
                                    : 'Select a payment method and record transaction details.'}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedSaleForApproval && (
                            <form onSubmit={handleApproveSubmit} className="space-y-4 py-2">
                                {approveForm.data.is_completing_reservation ? (
                                    /* Completion of Reservation Form */
                                    <div className="space-y-4">
                                        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-lg p-4 space-y-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Customer Name:</span>
                                                <span className="font-semibold text-foreground">{selectedSaleForApproval.customer_name}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm border-t border-dashed border-blue-200 dark:border-blue-800/30 pt-2">
                                                <span className="text-muted-foreground">Total Sale Amount:</span>
                                                <span className="font-bold">₱{getSaleTotal(selectedSaleForApproval).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground text-emerald-700 dark:text-emerald-400">Downpayment Paid:</span>
                                                <span className="font-bold text-emerald-700 dark:text-emerald-400">₱{Number(selectedSaleForApproval.downpayment || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-lg border-t border-blue-200 dark:border-blue-800/30 pt-2 font-bold">
                                                <span className="text-primary">Remaining Balance:</span>
                                                <span className="text-primary">₱{(getSaleTotal(selectedSaleForApproval) - Number(selectedSaleForApproval.downpayment || 0)).toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Remaining Payment Method</Label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => approveForm.setData('reservation_final_method', 'cash')}
                                                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${approveForm.data.reservation_final_method === 'cash'
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-muted hover:bg-accent'
                                                        }`}
                                                >
                                                    <CircleDollarSign className="w-4 h-4" />
                                                    Cash
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => approveForm.setData('reservation_final_method', 'e-wallet')}
                                                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${approveForm.data.reservation_final_method === 'e-wallet'
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-muted hover:bg-accent'
                                                        }`}
                                                >
                                                    <Wallet className="w-4 h-4" />
                                                    E-Wallet
                                                </button>
                                            </div>
                                        </div>

                                        {approveForm.data.reservation_final_method === 'cash' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="space-y-2">
                                                    <Label htmlFor="reservation-cash-received">Cash Received</Label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                                                        <Input
                                                            id="reservation-cash-received"
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            className="pl-7"
                                                            value={approveForm.data.reservation_cash_received}
                                                            onChange={(e) => handleReservationCashReceivedChange(e.target.value)}
                                                            placeholder="Enter amount given"
                                                            required
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-955/10 border border-emerald-200 dark:border-emerald-800/30 rounded-lg text-emerald-800 dark:text-emerald-300 font-semibold">
                                                    <span className="text-sm">Change to Give:</span>
                                                    <span className="text-xl font-bold font-mono">
                                                        ₱{approveForm.data.reservation_change_amount.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {approveForm.data.reservation_final_method === 'e-wallet' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="space-y-2">
                                                    <Label htmlFor="reservation-ewallet-provider">E-Wallet Provider</Label>
                                                    <select
                                                        id="reservation-ewallet-provider"
                                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                        value={approveForm.data.reservation_ewallet_provider}
                                                        onChange={(e) => approveForm.setData('reservation_ewallet_provider', e.target.value)}
                                                    >
                                                        <option value="GCash">GCash</option>
                                                        <option value="Maya">Maya</option>
                                                        <option value="GrabPay">GrabPay</option>
                                                        <option value="ShopeePay">ShopeePay</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-3">
                                                    <Label>Proof of Payment</Label>
                                                    {useWebcam ? (
                                                        <div className="border rounded-lg overflow-hidden bg-black relative flex flex-col items-center">
                                                            <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover" />
                                                            <div className="flex gap-2 p-2 w-full bg-muted/90 backdrop-blur justify-center">
                                                                <Button type="button" size="sm" onClick={capturePhoto} className="gap-1 bg-green-600 hover:bg-green-700">
                                                                    <Camera className="w-3.5 h-3.5" /> Capture
                                                                </Button>
                                                                <Button type="button" size="sm" variant="outline" onClick={stopWebcam}>
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : proofPreview ? (
                                                        <div className="relative border rounded-lg overflow-hidden bg-accent group">
                                                            <img src={proofPreview} alt="Proof preview" className="w-full h-48 object-contain" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => approveForm.setData('reservation_proof_of_payment', null)}
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="h-24 flex flex-col gap-2 border-dashed border-2 hover:border-primary"
                                                                onClick={startWebcam}
                                                            >
                                                                <Camera className="w-6 h-6 text-muted-foreground" />
                                                                <span className="text-xs">Take Photo</span>
                                                            </Button>
                                                            <div className="relative">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                    onChange={(e) => {
                                                                        if (e.target.files && e.target.files[0]) {
                                                                            approveForm.setData('reservation_proof_of_payment', e.target.files[0]);
                                                                        }
                                                                    }}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    className="w-full h-24 flex flex-col gap-2 border-dashed border-2 hover:border-primary"
                                                                >
                                                                    <Upload className="w-6 h-6 text-muted-foreground" />
                                                                    <span className="text-xs">Upload File</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <DialogFooter className="pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setApproveModalOpen(false);
                                                    setSelectedSaleForApproval(null);
                                                    approveForm.reset();
                                                }}
                                                disabled={approveForm.processing}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={
                                                    approveForm.processing ||
                                                    (approveForm.data.reservation_final_method === 'cash' &&
                                                        (parseFloat(approveForm.data.reservation_cash_received) || 0) < (getSaleTotal(selectedSaleForApproval) - Number(selectedSaleForApproval.downpayment || 0))
                                                    ) ||
                                                    (approveForm.data.reservation_final_method === 'e-wallet' && !approveForm.data.reservation_proof_of_payment)
                                                }
                                                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                {approveForm.processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                                Complete Reservation
                                            </Button>
                                        </DialogFooter>
                                    </div>
                                ) : (
                                    /* Standard Approve Sale Form */
                                    <div className="space-y-4">
                                        {/* Total Amount display */}
                                        <div className="bg-primary/5 border rounded-lg p-4 flex justify-between items-center">
                                            <span className="font-semibold text-sm text-muted-foreground">Total Sale Amount:</span>
                                            <span className="text-2xl font-bold text-primary">
                                                ₱{getSaleTotal(selectedSaleForApproval).toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Payment Method Select */}
                                        <div className="space-y-2">
                                            <Label>Payment Method</Label>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => approveForm.setData('payment_method', 'cash')}
                                                    className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border-2 text-[10px] font-bold transition-all ${approveForm.data.payment_method === 'cash'
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-muted hover:bg-accent'
                                                        }`}
                                                >
                                                    <CircleDollarSign className="w-3.5 h-3.5" />
                                                    Cash
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => approveForm.setData('payment_method', 'e-wallet')}
                                                    className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border-2 text-[10px] font-bold transition-all ${approveForm.data.payment_method === 'e-wallet'
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-muted hover:bg-accent'
                                                        }`}
                                                >
                                                    <Wallet className="w-3.5 h-3.5" />
                                                    E-Wallet
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => approveForm.setData('payment_method', 'split_bill')}
                                                    className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border-2 text-[10px] font-bold transition-all ${approveForm.data.payment_method === 'split_bill'
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-muted hover:bg-accent'
                                                        }`}
                                                >
                                                    <Coins className="w-3.5 h-3.5" />
                                                    Split Bill
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => approveForm.setData('payment_method', 'home_credit')}
                                                    className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border-2 text-[10px] font-bold transition-all ${approveForm.data.payment_method === 'home_credit'
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-muted hover:bg-accent'
                                                        }`}
                                                >
                                                    <TicketPercent className="w-3.5 h-3.5" />
                                                    Home Credit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => approveForm.setData('payment_method', 'reservation')}
                                                    className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border-2 text-[10px] font-bold transition-all ${approveForm.data.payment_method === 'reservation'
                                                            ? 'border-primary bg-primary/5 text-primary'
                                                            : 'border-muted hover:bg-accent'
                                                        }`}
                                                >
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Reservation
                                                </button>
                                            </div>
                                        </div>

                                        {/* Conditional Render based on Payment Method */}
                                        {approveForm.data.payment_method === 'cash' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="space-y-2">
                                                    <Label htmlFor="cash-received">Cash Received</Label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                                                        <Input
                                                            id="cash-received"
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            className="pl-7"
                                                            value={approveForm.data.cash_received}
                                                            onChange={(e) => handleCashReceivedChange(e.target.value)}
                                                            placeholder="Enter amount given"
                                                            required
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg text-emerald-800 dark:text-emerald-300 font-semibold">
                                                    <span className="text-sm">Change to Give:</span>
                                                    <span className="text-xl font-bold font-mono">
                                                        ₱{approveForm.data.change_amount.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {approveForm.data.payment_method === 'e-wallet' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="space-y-2">
                                                    <Label htmlFor="ewallet-provider">E-Wallet Provider</Label>
                                                    <select
                                                        id="ewallet-provider"
                                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                        value={approveForm.data.ewallet_provider}
                                                        onChange={(e) => approveForm.setData('ewallet_provider', e.target.value)}
                                                    >
                                                        <option value="GCash">GCash</option>
                                                        <option value="Maya">Maya</option>
                                                        <option value="GrabPay">GrabPay</option>
                                                        <option value="ShopeePay">ShopeePay</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-3">
                                                    <Label>Proof of Payment</Label>
                                                    {useWebcam ? (
                                                        <div className="border rounded-lg overflow-hidden bg-black relative flex flex-col items-center">
                                                            <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover" />
                                                            <div className="flex gap-2 p-2 w-full bg-muted/90 backdrop-blur justify-center">
                                                                <Button type="button" size="sm" onClick={capturePhoto} className="gap-1 bg-green-600 hover:bg-green-700">
                                                                    <Camera className="w-3.5 h-3.5" /> Capture
                                                                </Button>
                                                                <Button type="button" size="sm" variant="outline" onClick={stopWebcam}>
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : proofPreview ? (
                                                        <div className="relative border rounded-lg overflow-hidden bg-accent group">
                                                            <img src={proofPreview} alt="Proof preview" className="w-full h-48 object-contain" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => approveForm.setData('proof_of_payment', null)}
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="h-24 flex flex-col gap-2 border-dashed border-2 hover:border-primary"
                                                                onClick={startWebcam}
                                                            >
                                                                <Camera className="w-6 h-6 text-muted-foreground" />
                                                                <span className="text-xs">Take Photo</span>
                                                            </Button>
                                                            <div className="relative">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                    onChange={(e) => {
                                                                        if (e.target.files && e.target.files[0]) {
                                                                            approveForm.setData('proof_of_payment', e.target.files[0]);
                                                                        }
                                                                    }}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    className="w-full h-24 flex flex-col gap-2 border-dashed border-2 hover:border-primary"
                                                                >
                                                                    <Upload className="w-6 h-6 text-muted-foreground" />
                                                                    <span className="text-xs">Upload File</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {approveForm.data.payment_method === 'split_bill' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="split-cash-received">Cash Portion</Label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                                                            <Input
                                                                id="split-cash-received"
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                className="pl-7"
                                                                value={approveForm.data.cash_received}
                                                                onChange={(e) => handleSplitCashReceivedChange(e.target.value)}
                                                                placeholder="Enter cash paid"
                                                                required
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="split-ewallet-amount">E-Wallet Portion</Label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                                                            <Input
                                                                id="split-ewallet-amount"
                                                                type="text"
                                                                className="pl-7 bg-muted"
                                                                value={approveForm.data.split_ewallet_amount}
                                                                disabled
                                                                readOnly
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="split-ewallet-provider">E-Wallet Provider</Label>
                                                    <select
                                                        id="split-ewallet-provider"
                                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                        value={approveForm.data.ewallet_provider}
                                                        onChange={(e) => approveForm.setData('ewallet_provider', e.target.value)}
                                                    >
                                                        <option value="GCash">GCash</option>
                                                        <option value="Maya">Maya</option>
                                                        <option value="GrabPay">GrabPay</option>
                                                        <option value="ShopeePay">ShopeePay</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-3">
                                                    <Label>Proof of Payment (E-Wallet Portion)</Label>
                                                    {useWebcam ? (
                                                        <div className="border rounded-lg overflow-hidden bg-black relative flex flex-col items-center">
                                                            <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover" />
                                                            <div className="flex gap-2 p-2 w-full bg-muted/90 backdrop-blur justify-center">
                                                                <Button type="button" size="sm" onClick={capturePhoto} className="gap-1 bg-green-600 hover:bg-green-700">
                                                                    <Camera className="w-3.5 h-3.5" /> Capture
                                                                </Button>
                                                                <Button type="button" size="sm" variant="outline" onClick={stopWebcam}>
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : proofPreview ? (
                                                        <div className="relative border rounded-lg overflow-hidden bg-accent group">
                                                            <img src={proofPreview} alt="Proof preview" className="w-full h-48 object-contain" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => approveForm.setData('proof_of_payment', null)}
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="h-24 flex flex-col gap-2 border-dashed border-2 hover:border-primary"
                                                                onClick={startWebcam}
                                                            >
                                                                <Camera className="w-6 h-6 text-muted-foreground" />
                                                                <span className="text-xs">Take Photo</span>
                                                            </Button>
                                                            <div className="relative">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                    onChange={(e) => {
                                                                        if (e.target.files && e.target.files[0]) {
                                                                            approveForm.setData('proof_of_payment', e.target.files[0]);
                                                                        }
                                                                    }}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    className="w-full h-24 flex flex-col gap-2 border-dashed border-2 hover:border-primary"
                                                                >
                                                                    <Upload className="w-6 h-6 text-muted-foreground" />
                                                                    <span className="text-xs">Upload File</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {approveForm.data.payment_method === 'home_credit' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="space-y-2">
                                                    <Label htmlFor="home-credited-name">Home Credited Name</Label>
                                                    <Input
                                                        id="home-credited-name"
                                                        type="text"
                                                        value={approveForm.data.home_credited_name}
                                                        onChange={(e) => approveForm.setData('home_credited_name', e.target.value)}
                                                        placeholder="e.g. Bikes and Accessories"
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="downpayment">Downpayment (Optional)</Label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                                                        <Input
                                                            id="downpayment"
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            className="pl-7"
                                                            value={approveForm.data.downpayment}
                                                            onChange={(e) => approveForm.setData('downpayment', e.target.value)}
                                                            placeholder="Enter downpayment amount (if any)"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {approveForm.data.payment_method === 'reservation' && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="space-y-2">
                                                    <Label htmlFor="customer_name">Customer Name</Label>
                                                    <Input
                                                        id="customer_name"
                                                        type="text"
                                                        value={approveForm.data.customer_name}
                                                        onChange={(e) => approveForm.setData('customer_name', e.target.value)}
                                                        placeholder="Enter customer name"
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="downpayment">Downpayment Amount</Label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                                                        <Input
                                                            id="downpayment"
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            className="pl-7"
                                                            value={approveForm.data.downpayment}
                                                            onChange={(e) => approveForm.setData('downpayment', e.target.value)}
                                                            placeholder="Enter cash downpayment amount"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="reservation_buy_date">Target Buy Date (Optional)</Label>
                                                    <Input
                                                        id="reservation_buy_date"
                                                        type="date"
                                                        value={approveForm.data.reservation_buy_date}
                                                        onChange={(e) => approveForm.setData('reservation_buy_date', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <DialogFooter className="pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setApproveModalOpen(false);
                                                    setSelectedSaleForApproval(null);
                                                    approveForm.reset();
                                                }}
                                                disabled={approveForm.processing}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={
                                                    approveForm.processing ||
                                                    (approveForm.data.payment_method === 'cash' &&
                                                        (parseFloat(approveForm.data.cash_received) || 0) < getSaleTotal(selectedSaleForApproval)
                                                    ) ||
                                                    (approveForm.data.payment_method === 'e-wallet' && !approveForm.data.proof_of_payment) ||
                                                    (approveForm.data.payment_method === 'split_bill' && (
                                                        (parseFloat(approveForm.data.cash_received) || 0) <= 0 ||
                                                        (parseFloat(approveForm.data.cash_received) || 0) >= getSaleTotal(selectedSaleForApproval) ||
                                                        !approveForm.data.proof_of_payment
                                                    )) ||
                                                    (approveForm.data.payment_method === 'home_credit' && !approveForm.data.home_credited_name.trim()) ||
                                                    (approveForm.data.payment_method === 'reservation' && (!approveForm.data.customer_name.trim() || (parseFloat(approveForm.data.downpayment) || 0) <= 0))
                                                }
                                                className="gap-2"
                                            >
                                                {approveForm.processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                                Approve Sale
                                            </Button>
                                        </DialogFooter>
                                    </div>
                                )}
                            </form>
                        )}
                    </DialogContent>
                </Dialog>

            </div>
        </AppLayout>
    );
}
