import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { Search, PackageOpen, Plus, MapPin, Layers, X, Printer, Sparkles, Trash2, Tag, ScanBarcode, Truck, Package, Info, ArrowRight, Filter, FileText, Camera, StopCircle, Scan, Power, PowerOff, Upload } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from "@/components/ui/button";
import { handleNativePrintFallback } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from '@/components/SearchableSelect';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import QRCode from "react-qr-code";
import Barcode from "react-barcode";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Products',
        href: '/products',
    },
];

interface Product {
    id: number;
    name: string;
    brand_id: number;
    category_id: number;
    quantity: number;
    physical_location: string | null;
    description: string | null;
    variations: { name: string; options: string }[] | null;
    image_path: string | null;
    barcode: string | null;
    qr_code: string | null;
    price: number | null;
    clearance_price: number | null;
    clearance_until: string | null;
    code: string | null;
    code_2: string | null;
    sku: string | null;
    status: string;
    active_until_zero_days: number | null;
    out_of_stock_since: string | null;
    branch?: { branch_name: string };
    brand?: { name: string };
    category?: { name: string };
    supplier?: { name: string };
}

interface Props {
    products: any;
    filters: {
        search?: string;
        branch?: string;
        brand?: string;
        category?: string;
        stock?: string;
        status?: string;
    };
    options: {
        branches: string[];
        brands: string[];
        categories: string[];
    };
    isSystemAdmin: boolean;
}

export default function Index({ products, filters, options, isSystemAdmin }: Props) {
    const { auth } = usePage<SharedData>().props;
    const isEmployee = auth.roles.includes('Employee') && !auth.roles.includes('System Administrator') && !auth.roles.includes('Branch Administrator');

    const productList = products?.data || [];
    const links = products?.links || [];

    const [search, setSearch] = useState<string>(filters?.search || "");
    const [branch, setBranch] = useState<string>(filters?.branch || "all");
    const [brand, setBrand] = useState<string>(filters?.brand || "all");
    const [category, setCategory] = useState<string>(filters?.category || "all");
    const [stock, setStock] = useState<string>(filters?.stock || "all");
    const [statusFilter, setStatusFilter] = useState<string>(filters?.status || "all");
    const [clearance, setClearance] = useState<string>(filters?.clearance || "all");
    const [showFilters, setShowFilters] = useState(false);

    // Intelligent Category Grouping
    const categoryGroups = useMemo(() => {
        const groups: Record<string, string[]> = {};
        options.categories.forEach(cat => {
            const firstWord = cat.split(' ')[0];
            if (!groups[firstWord]) groups[firstWord] = [];
            groups[firstWord].push(cat);
        });
        return groups;
    }, [options.categories]);

    const baseCategories = useMemo(() => Object.keys(categoryGroups).sort(), [categoryGroups]);


    const [baseCategory, setBaseCategory] = useState<string>(() => {
        if (filters?.category && filters.category !== 'all') {
            return filters.category.split(' ')[0];
        }
        return "all";
    });

    const [subCategory, setSubCategory] = useState<string>(filters?.category || "all");

    useEffect(() => {
        if (filters?.category && filters.category !== 'all') {
            const firstWord = filters.category.split(' ')[0];
            setBaseCategory(firstWord);
            setSubCategory(filters.category);
        } else {
            setBaseCategory("all");
            setSubCategory("all");
        }
    }, [filters?.category]);

    const subCategories = useMemo(() => {
        if (baseCategory === 'all') return [];
        return categoryGroups[baseCategory] || [];
    }, [baseCategory, categoryGroups]);


    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<number>(0);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isClearanceMode, setIsClearanceMode] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);
    const [clearancePrice, setClearancePrice] = useState("");
    const [durationDays, setDurationDays] = useState("30");
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [statusToggleProduct, setStatusToggleProduct] = useState<Product | null>(null);

    const toggleSelection = (productId: number) => {
        setSelectedProductIds(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId) 
                : [...prev, productId]
        );
    };

    const handleBulkDelete = () => {
        router.post("/products/bulk-destroy", {
            ids: selectedProductIds
        }, {
            onSuccess: () => {
                setIsSelectionMode(false);
                setSelectedProductIds([]);
                setIsConfirmModalOpen(false);
                toast.success('Selected products deleted successfully.');
            },
            onError: () => {
                toast.error('Failed to delete selected products.');
            }
        });
    };

    const playBeep = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {
            console.error("Audio beep failed", e);
        }
    };

    useEffect(() => {
        if (isScanning) {
            const timer = setTimeout(() => {
                const html5QrCode = new Html5Qrcode("search-scanner-reader");
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
                        
                        setSearch(decodedText);
                        updateParams({ search: decodedText });
                        setIsScanning(false);
                        toast.success(`Scanned: ${decodedText}`);
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
            };
        }
    }, [isScanning]);

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

    const debounceTimer = useRef<number | null>(null);

    useEffect(() => {
        setSearch(filters?.search || "");
        setBranch(filters?.branch || "all");
        setBrand(filters?.brand || "all");
        setCategory(filters?.category || "all");
        setStock(filters?.stock || "all");
        setStatusFilter(filters?.status || "all");
        setClearance(filters?.clearance || "all");
    }, [filters]);

    function updateParams(newParams: any) {
        const currentUrl = new URL(window.location.href);
        const params = new URLSearchParams(currentUrl.search);

        Object.keys(newParams).forEach(key => {
            // Keep 'all' only for branch to override session defaults; 
            // for others, 'all' means the parameter can be removed for a cleaner URL.
            if (newParams[key] && (newParams[key] !== 'all' || key === 'branch')) {
                params.set(key, newParams[key]);
            } else {
                params.delete(key);
            }
        });

        router.get(
            "/products",
            Object.fromEntries(params.entries()),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ["products", "filters", "options"],
            }
        );
    }

    function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setSearch(value);

        if (debounceTimer.current) {
            window.clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = window.setTimeout(() => {
            updateParams({ search: value });
        }, 500);
    }

    const clearFilters = () => {
        setSearch("");
        setBranch("all");
        setBrand("all");
        setCategory("all");
        setBaseCategory("all");
        setSubCategory("all");
        setStock("all");
        setStatusFilter("all");
        setClearance("all");
        router.get("/products");
    };


    const hasActiveFilters = search || branch !== 'all' || brand !== 'all' || category !== 'all' || stock !== 'all' || statusFilter !== 'all';

    const handleBulkClearance = () => {
        if (!clearancePrice || !durationDays) {
            toast.error("Please fill in all fields.");
            return;
        }

        router.post(route('products.bulk-clearance'), {
            ids: selectedProductIds,
            clearance_price: clearancePrice,
            duration_days: durationDays,
        }, {
            onSuccess: () => {
                toast.success("Clearance sale set successfully!");
                setIsClearanceModalOpen(false);
                setIsClearanceMode(false);
                setSelectedProductIds([]);
                setClearancePrice("");
            },
            onError: (err) => {
                console.error(err);
                toast.error("Failed to set clearance sale.");
            }
        });
    };

    const handleToggleStatus = (product: Product) => {
        setStatusToggleProduct(product);
        setIsStatusModalOpen(true);
    };

    const executeToggleStatus = () => {
        if (!statusToggleProduct) return;
        
        router.post(`/products/${statusToggleProduct.id}/toggle-status`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Product ${statusToggleProduct.status === 'active' ? 'deactivated' : 'activated'}.`);
                setIsStatusModalOpen(false);
                setStatusToggleProduct(null);
            },
            onError: () => {
                toast.error('Failed to update status.');
            }
        });
    };

    const [viewCodeProduct, setViewCodeProduct] = useState<Product | null>(null);

    async function handlePrint() {
        if (!viewCodeProduct) return;

        // Try Native Share with our unified utility first
        const nativeTriggerेड = await handleNativePrintFallback('native-print-label', `label_${viewCodeProduct.sku || viewCodeProduct.id}`);

        if (nativeTriggerेड) {
            return; // Exit if mobile handled it natively
        }

        // Process SVG to remove hardcoded dimensions so it scales correctly in the label
        let qrSvg = document.querySelector('#hidden-print-codes svg')?.outerHTML || '<!-- QR Error -->';
        qrSvg = qrSvg.replace(/width="\d+"/, '').replace(/height="\d+"/, '');

        // Helper to determine dynamic font size based on text length
        const getDynamicSize = (text: string, base: number, threshold: number, min: number, factor: number = 0.5) => {
            if (!text) return `${base}pt`;
            const count = String(text).length;
            if (count > threshold) {
                // Ultra-aggressive reduction to force 1-line fit
                return `${Math.max(min, base - (count - threshold) * factor)}pt`;
            }
            return `${base}pt`;
        };

        // Ultra-aggressive thresholds for 28x20mm landscape
        // Given ~16mm space for info-stack
        const skuSize = getDynamicSize(viewCodeProduct.sku || viewCodeProduct.name || '', 9, 12, 4, 0.5);
        const codeSize = getDynamicSize((viewCodeProduct.code || '') + (viewCodeProduct.code_2 || ''), 7.5, 10, 3.5, 0.6);
        const supplierSize = getDynamicSize(viewCodeProduct.supplier?.name || '', 7, 10, 3.5, 0.6);

        // Barcode is strictly 13 characters maximum, we can assign a solid fixed readable size.
        const barcodeSize = '6.5pt';

        // CSS-based main window print hack
        // Mobile webviews block window.print() if called in an iframe.
        // So we append the label to the main body, add a print-only visible class, and print the main window.

        const containerId = 'temp-qr-print-container-' + Date.now();
        const container = document.createElement('div');
        container.id = containerId;
        container.className = 'print-only-label';

        container.innerHTML = `
            <style>
                @media print {
                    #app {
                        display: none !important;
                    }
                    .print-only-label {
                        display: block !important;
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: white !important;
                        z-index: 99999;
                    }
                    @page {
                        size: 28mm 20mm;
                        margin: 0;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        width: 28mm !important;
                        height: 20mm !important;
                    }
                }
                
                .label-container {
                    width: 28mm;
                    height: 20mm;
                    margin: 0;
                    padding: 0.5mm 1mm;
                    font-family: 'Arial', sans-serif;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    background: white;
                    color: black;
                    box-sizing: border-box;
                }
                
                .upper-section {
                    display: flex;
                    width: 100%;
                    height: 13mm;
                    align-items: center;
                }

                .qr-section {
                    width: 10mm;
                    height: 10mm;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .qr-section svg {
                    width: 100% !important;
                    height: 100% !important;
                }

                .info-stack {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    padding-left: 1mm;
                    overflow: hidden;
                }
                
                .info-line {
                    font-size: 7pt;
                    white-space: nowrap;
                    overflow: hidden;
                    line-height: 1.1;
                    width: 100%;
                }

                .bottom-section {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    margin-top: auto;
                    border-top: 0.1mm solid transparent;
                }
                
                .product-sku {
                    font-size: 9pt;
                    font-weight: bold;
                    white-space: nowrap;
                    overflow: hidden;
                    width: 100%;
                    line-height: 1;
                }

                .price {
                    font-size: 10pt;
                    font-weight: normal;
                    line-height: 1;
                    margin-top: 0.5mm;
                }
            </style>
            <div class="label-container">
                <div class="upper-section">
                    <div class="qr-section">
                        ${qrSvg}
                    </div>
                    <div class="info-stack">
                        <div class="info-line" style="font-size: ${barcodeSize}">${viewCodeProduct.barcode || '-'}</div>
                        <div class="info-line" style="font-size: ${codeSize}">
                            ${viewCodeProduct.code || ''} ${viewCodeProduct.code_2 || ''}
                        </div>
                        <div class="info-line" style="font-size: ${supplierSize}">${viewCodeProduct.supplier?.name || '-'}</div>
                    </div>
                </div>
                
                <div class="bottom-section">
                    <div class="product-sku" style="font-size: ${skuSize}">${viewCodeProduct.sku || viewCodeProduct.name || '-'}</div>
                    <div class="price">
                        ${viewCodeProduct.price ? Number(viewCodeProduct.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                    </div>
                </div>
            </div>
        `;

        // Hide container in normal view (it's only meant for printing)
        container.style.display = 'none';

        document.body.appendChild(container);

        // Required delay to ensure DOM and generic styles load
        setTimeout(() => {
            window.print();

            // Cleanup after print dialog opens/closes
            setTimeout(() => {
                if (document.body.contains(container)) {
                    document.body.removeChild(container);
                }
            }, 3000);
        }, 500);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Products" />

            <div className="flex flex-col gap-4">
                {/* Mobile Header (Sticky-ish feel) */}
                <div className="sticky top-0 z-30 bg-gray-50/95 dark:bg-black/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 py-3 md:static md:bg-transparent md:border-0 md:p-0">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <PackageOpen className="h-8 w-8 md:h-12 md:w-12 text-black dark:text-white" />
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-black dark:text-white">
                                        Product List
                                    </h2>
                                    <p className="hidden md:block text-sm text-muted-foreground">
                                        Manage your inventory.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={`/products/print${window.location.search}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button variant="outline" size="sm" className="hidden md:flex">
                                        <FileText className="mr-2 h-4 w-4" /> Print List
                                    </Button>
                                </a>

                                {!isEmployee && (
                                    <Link href="/drag-and-drop-product-upload">
                                        <Button variant="outline" size="sm" className="hidden md:flex border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                                            <Upload className="mr-2 h-4 w-4" />
                                            Multiple Uploads
                                        </Button>
                                    </Link>
                                )}

                                {!isEmployee && (
                                    <Button 
                                        variant="outline"
                                        size="sm" 
                                        className={`hidden md:flex border-yellow-500 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700 transition-all ${isClearanceMode ? 'bg-yellow-500 text-black hover:bg-yellow-600 border-yellow-600' : ''} ${selectedProductIds.length > 0 && isClearanceMode ? 'animate-pulse ring-2 ring-yellow-400 ring-offset-2' : ''}`}
                                        onClick={() => {
                                            if (isClearanceMode) {
                                                if (selectedProductIds.length > 0) {
                                                    setIsClearanceModalOpen(true);
                                                } else {
                                                    setIsClearanceMode(false);
                                                }
                                            } else {
                                                setIsClearanceMode(true);
                                                setIsSelectionMode(false);
                                                setSelectedProductIds([]);
                                            }
                                        }}
                                    >
                                        <Tag className="mr-2 h-4 w-4" />
                                        {isClearanceMode ? (selectedProductIds.length > 0 ? `Set Price (${selectedProductIds.length})` : 'Cancel') : 'Clearance Sale'}
                                    </Button>
                                )}

                                {!isEmployee && (
                                    <Button 
                                        variant={isSelectionMode ? (selectedProductIds.length > 0 ? "destructive" : "outline") : "outline"}
                                        size="sm" 
                                        className={`hidden md:flex ${!isSelectionMode ? 'border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700' : ''}`}
                                        onClick={() => {
                                            if (!isSelectionMode) {
                                                setIsSelectionMode(true);
                                                setIsClearanceMode(false);
                                                setSelectedProductIds([]);
                                            } else if (selectedProductIds.length > 0) {
                                                setIsConfirmModalOpen(true);
                                            } else {
                                                setIsSelectionMode(false);
                                                setSelectedProductIds([]);
                                            }
                                        }}
                                    >
                                        <Trash2 className={`h-4 w-4 ${!isSelectionMode ? 'mr-2' : (selectedProductIds.length > 0 ? 'mr-2' : 'mr-2')}`} />
                                        {!isSelectionMode ? "Delete Items" : (selectedProductIds.length > 0 ? "Confirm Deletion" : "Cancel Selection")}
                                    </Button>
                                )}

                                {!isEmployee && (
                                    <Link href="/products/create">
                                        <Button size="sm" className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black">
                                            <Plus className="mr-2 h-4 w-4" /> Add Product
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Mobile Main Controls */}
                        <div className="flex items-center gap-2 md:hidden">
                            <a
                                href={`/products/print${window.location.search}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                                    <FileText className="h-4 w-4" />
                                </Button>
                            </a>
                            {!isEmployee && (
                                <Button 
                                    variant={isSelectionMode ? (selectedProductIds.length > 0 ? "destructive" : "outline") : "outline"}
                                    size="icon" 
                                    className={`h-10 w-10 shrink-0 ${isSelectionMode && selectedProductIds.length > 0 ? 'animate-pulse ring-2 ring-red-500 ring-offset-2' : ''} ${!isSelectionMode ? 'border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700' : ''}`}
                                    onClick={() => {
                                        if (!isSelectionMode) {
                                            setIsSelectionMode(true);
                                        } else if (selectedProductIds.length > 0) {
                                            setIsConfirmModalOpen(true);
                                        } else {
                                            setIsSelectionMode(false);
                                            setSelectedProductIds([]);
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={handleSearchChange}
                                    className="pl-9 pr-10 h-10 bg-white dark:bg-gray-800"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-10 w-10 text-gray-400 hover:text-black dark:hover:text-white"
                                    onClick={() => setIsScanning(true)}
                                >
                                    <Scan className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button
                                variant={showFilters || hasActiveFilters ? "default" : "outline"}
                                size="icon"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`h-10 w-10 shrink-0 ${hasActiveFilters ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-100" : ""}`}
                            >
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Filters Section (Collapsible on Mobile, Visible on Desktop) */}
                <div className={`mx-4 md:mx-0 bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm transition-all duration-300 ease-in-out ${showFilters ? 'block' : 'hidden md:block'}`}>
                    <div className="flex flex-col md:flex-row gap-3 flex-wrap">
                        {/* Desktop Search (Hidden on Mobile) */}
                        <div className="hidden md:block flex-1 relative min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <Input
                                type="text"
                                placeholder="Search products, codes, or SKU..."
                                value={search}
                                onChange={handleSearchChange}
                                className="pl-10 pr-10"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-10 w-10 text-gray-400 hover:text-black dark:hover:text-white"
                                onClick={() => setIsScanning(true)}
                            >
                                <Scan className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Filter Group - wrapped for mobile Layout */}
                        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
                            {isSystemAdmin && (
                                <SearchableSelect 
                                    options={options.branches} 
                                    value={branch} 
                                    onValueChange={(val) => { setBranch(val); updateParams({ branch: val }); }} 
                                    placeholder="Branch" 
                                    allLabel="All Branches"
                                />
                            )}

                            <SearchableSelect 
                                options={options.brands} 
                                value={brand} 
                                onValueChange={(val) => { setBrand(val); updateParams({ brand: val }); }} 
                                placeholder="Brand" 
                                allLabel="All Brands"
                            />

                            <SearchableSelect 
                                options={baseCategories} 
                                value={baseCategory} 
                                onValueChange={(val) => { 
                                    setBaseCategory(val); 
                                    if (val === 'all') {
                                        updateParams({ category: 'all' });
                                    } else {
                                        const subs = categoryGroups[val];
                                        if (subs.length === 1) {
                                            updateParams({ category: subs[0] });
                                        } else {
                                            // Don't update params yet, wait for sub-category if there are multiple
                                        }
                                    }
                                }} 
                                placeholder="Category" 
                                allLabel="All Categories"
                            />

                            {baseCategory !== 'all' && subCategories.length > 1 && (
                                <SearchableSelect 
                                    options={subCategories} 
                                    value={subCategory} 
                                    onValueChange={(val) => { setSubCategory(val); updateParams({ category: val }); }} 
                                    placeholder="Sub-Category" 
                                    allLabel="All Sub-Categories"
                                    getLabel={(opt) => opt === 'all' ? 'All' : opt.replace(new RegExp(`^${baseCategory}\\s*`), '') || opt}
                                />
                            )}



                            <Select value={stock} onValueChange={(val) => { setStock(val); updateParams({ stock: val }); }}>
                                <SelectTrigger className="w-full md:w-[140px] h-9 text-xs md:text-sm">
                                    <SelectValue placeholder="Stock" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stock</SelectItem>
                                    <SelectItem value="in_stock">In Stock</SelectItem>
                                    <SelectItem value="low_stock">Low Stock</SelectItem>
                                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); updateParams({ status: val }); }}>
                                <SelectTrigger className="w-full md:w-[140px] h-9 text-xs md:text-sm">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={clearance} onValueChange={(val) => { 
                                setClearance(val); 
                                if (val === 'all') {
                                    // Disregard the rest of the filters except for branch when clicking All Products
                                    setSearch("");
                                    setBrand("all");
                                    setCategory("all");
                                    setBaseCategory("all");
                                    setSubCategory("all");
                                    setStock("all");
                                    setStatusFilter("all");
                                    updateParams({ 
                                        clearance: 'all',
                                        search: '',
                                        brand: 'all',
                                        category: 'all',
                                        stock: 'all',
                                        status: 'all'
                                    });
                                } else {
                                    updateParams({ clearance: val });
                                }
                            }}>
                                <SelectTrigger className="w-full md:w-[140px] h-9 text-xs md:text-sm">
                                    <SelectValue placeholder="Clearance Sale" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Products</SelectItem>
                                    <SelectItem value="on_clearance">On Clearance</SelectItem>
                                    <SelectItem value="no_clearance">Not on Clearance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} title="Clear Filters" className="h-9 px-2 text-red-500 hover:text-red-700 hover:bg-red-50">
                                <X className="h-4 w-4 mr-1" /> <span className="md:hidden">Clear</span>
                            </Button>
                        )}
                    </div>
                </div>

            <div className="p-4 flex-1 overflow-y-auto min-h-0">
                {productList.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                        <PackageOpen className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">No products found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Get started by adding a new product.
                        </p>
                        <Link href="/products/create">
                            <Button variant="link" className="mt-2">
                                Add Product
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {productList.map((product: Product) => {
                            const isSelected = selectedProductIds.includes(product.id);
                            return (
                                <div 
                                    key={product.id} 
                                    onClick={() => (isSelectionMode || isClearanceMode) && toggleSelection(product.id)}
                                    className={`group relative flex w-full flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg dark:bg-transparent ${
                                        (isSelectionMode || isClearanceMode) ? 'cursor-pointer' : ''
                                    } ${
                                        isSelectionMode && isSelected 
                                            ? 'border-red-500 ring-2 ring-red-500 bg-red-50/30 dark:bg-red-900/10 shadow-red-100 dark:shadow-none' 
                                            : isClearanceMode && isSelected
                                                ? 'border-yellow-500 ring-2 ring-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10 shadow-yellow-100 dark:shadow-none'
                                                : product.status === 'inactive'
                                                    ? 'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50 opacity-60'
                                                    : 'border-black/10 bg-white dark:border-sidebar-border'
                                    }`}
                                >
                                    {/* Image Section */}
                                    <div className="relative aspect-square overflow-hidden bg-neutral-50 dark:bg-white/5">
                                        {(isSelectionMode || isClearanceMode) ? (
                                            <div className="block h-full w-full">
                                                {product.image_path ? (
                                                    <img
                                                        className={`absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 ${isSelected ? 'scale-90' : 'group-hover:scale-110'}`}
                                                        src={`/storage/${product.image_path}`}
                                                        alt={product.name}
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center">
                                                        <PackageOpen className="h-20 w-20 text-gray-300" />
                                                    </div>
                                                )}
                                                {isSelected && (
                                                    <div className={`absolute inset-0 ${isSelectionMode ? 'bg-red-500/10' : 'bg-yellow-500/10'} flex items-center justify-center backdrop-blur-[1px]`}>
                                                        <div className={`${isSelectionMode ? 'bg-red-600' : 'bg-yellow-500'} text-white rounded-full p-3 shadow-xl animate-in zoom-in duration-200`}>
                                                            {isSelectionMode ? <Trash2 className="h-6 w-6" /> : <Tag className="h-6 w-6 text-black" />}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <Link href={`/products/${product.id}`} className="block h-full w-full">
                                                {product.image_path ? (
                                                    <img
                                                        className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                                                        src={`/storage/${product.image_path}`}
                                                        alt={product.name}
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center">
                                                        <PackageOpen className="h-20 w-20 text-gray-300" />
                                                    </div>
                                                )}
                                            </Link>
                                        )}

                                    {/* Vibrant Quantity Badge */}
                                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                        <Badge className={`shadow-sm border-0 font-bold ${product.quantity === 0 ? 'bg-red-600 hover:bg-red-700 text-white' :
                                            product.quantity <= 5 ? 'bg-amber-500 hover:bg-amber-600 text-white' :
                                                'bg-emerald-500 hover:bg-emerald-600 text-white'
                                            }`}>
                                            Qty: {product.quantity}
                                        </Badge>
                                        {product.status === 'inactive' && (
                                            <Badge className="shadow-sm border-0 font-bold bg-gray-500 hover:bg-gray-600 text-white text-[10px]">
                                                Inactive
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Hover Overlay for Quick Actions */}
                                    {!isSelectionMode && !isClearanceMode && (
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 pointer-events-none">
                                            <div className="pointer-events-auto flex flex-col gap-2">
                                                <Button variant="secondary" size="sm" onClick={(e) => { e.preventDefault(); setViewCodeProduct(product); }} className="w-32 shadow-lg backdrop-blur-md bg-white/90 hover:bg-white">
                                                    <ScanBarcode className="w-4 h-4 mr-2" /> View Codes
                                                </Button>
                                                {!isEmployee && (
                                                    <Link href={`/products/${product.id}/edit`}>
                                                        <Button variant="default" size="sm" className="w-32 shadow-lg bg-blue-600 hover:bg-blue-700 text-white">
                                                            Edit Product
                                                        </Button>
                                                    </Link>
                                                )}
                                                {!isEmployee && (
                                                    <Button 
                                                        variant={product.status === 'active' ? 'destructive' : 'default'} 
                                                        size="sm" 
                                                        onClick={(e) => { e.preventDefault(); handleToggleStatus(product); }}
                                                        className={`w-32 shadow-lg ${product.status === 'inactive' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                                                    >
                                                        {product.status === 'active' ? <PowerOff className="w-4 h-4 mr-2" /> : <Power className="w-4 h-4 mr-2" />}
                                                        {product.status === 'active' ? 'Deactivate' : 'Activate'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Content Section */}
                                <div className="flex flex-1 flex-col justify-between gap-3 p-3">
                                    {/* Header & Price */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-start gap-2">
                                            {isSelectionMode || isClearanceMode ? (
                                                <div className="flex-1">
                                                    {product.clearance_price && (
                                                        <div className="bg-yellow-400 text-black text-[9px] font-bold px-1.5 py-0.5 self-start uppercase mb-1 inline-block">
                                                            Clearance Sale
                                                        </div>
                                                    )}
                                                    <h3 className={`font-bold line-clamp-1 text-base transition-colors ${isSelected ? (isSelectionMode ? 'text-red-600' : 'text-yellow-600') : 'text-gray-900 dark:text-white'}`} title={product.name}>
                                                        {product.name}
                                                    </h3>
                                                </div>
                                            ) : (
                                                <Link href={`/products/${product.id}`} className="hover:underline flex-1">
                                                    {product.clearance_price && (
                                                        <div className="bg-yellow-400 text-black text-[9px] font-bold px-1.5 py-0.5 self-start uppercase mb-1 inline-block">
                                                            Clearance Sale
                                                        </div>
                                                    )}
                                                    <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 text-base group-hover:text-blue-600 transition-colors" title={product.name}>
                                                        {product.name}
                                                    </h3>
                                                </Link>
                                            )}
                                            <div className="flex flex-col items-end">
                                                {product.clearance_price ? (
                                                    <>
                                                        <span className="text-base font-extrabold text-yellow-600 whitespace-nowrap">
                                                            ₱{Number(product.clearance_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 line-through">
                                                            ₱{product.price ? Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-base font-extrabold text-black dark:text-white whitespace-nowrap">
                                                        ₱{product.price ? Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Brand Pop */}
                                        <div className="flex items-center gap-2 mb-2">
                                            {product.brand && (
                                                <Badge variant="outline" className="rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600">
                                                    {product.brand.name}
                                                </Badge>
                                            )}
                                            {product.category && (
                                                <span className="text-[10px] text-gray-500">{product.category.name}</span>
                                            )}
                                        </div>

                                        {/* Codes Grid (Expanded Font & Added 2Code) */}
                                        <div className="grid grid-cols-3 gap-2 text-[10px] bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800">
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 uppercase text-[9px]">SKU</span>
                                                <span className="font-mono font-bold text-xs truncate" title={product.sku || ''}>{product.sku || '-'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 uppercase text-[9px]">Code</span>
                                                <span className="font-mono font-bold text-xs truncate" title={product.code || ''}>{product.code || '-'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-400 uppercase text-[9px]">2Code</span>
                                                <span className="font-mono font-bold text-xs truncate" title={product.code_2 || ''}>{product.code_2 || '-'}</span>
                                            </div>
                                        </div>

                                        {/* Description - Below Codes */}
                                        {product.description ? (
                                            <p className="line-clamp-2 text-xs text-gray-700 dark:text-gray-300 mt-2">
                                                {product.description}
                                            </p>
                                        ) : (
                                            <p className="line-clamp-2 text-xs text-gray-400 mt-2">No description.</p>
                                        )}
                                    </div>

                                    {/* Footer: Variations & Details CTA */}
                                    <div className="flex items-end justify-between pt-1 border-t border-gray-100 dark:border-gray-800 mt-1 min-h-[30px]">
                                        {/* Variations on Left */}
                                        <div className="flex flex-col gap-1 flex-1 min-w-0 mr-2">
                                            {product.variations && product.variations.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {product.variations.slice(0, 2).map((v, i) => (
                                                        <span key={i} className="text-[10px] inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap overflow-hidden max-w-full">
                                                            <span className="font-bold mr-1">{v.name}:</span> <span className="truncate">{v.options}</span>
                                                        </span>
                                                    ))}
                                                    {product.variations.length > 2 && (
                                                        <span className="text-[9px] text-gray-400">+{product.variations.length - 2}</span>
                                                    )}
                                                </div>
                                            )}
                                            {!product.variations?.length && product.branch && (
                                                <span className="text-[10px] text-orange-600 dark:text-orange-400 truncate flex items-center gap-1 font-medium">
                                                    <Layers className="h-3 w-3" />
                                                    {product.branch.branch_name}
                                                </span>
                                            )}
                                        </div>

                                        {isSelectionMode || isClearanceMode ? (
                                            <div className={`shrink-0 flex items-center gap-1 text-xs font-bold whitespace-nowrap ${isSelectionMode ? 'text-red-600' : 'text-yellow-600'}`}>
                                                {isSelected ? 'Selected' : 'Select'}
                                            </div>
                                        ) : (
                                            <Link href={`/products/${product.id}`} className="shrink-0">
                                                <button className="group/btn flex items-center gap-1 text-xs font-bold text-gray-900 transition-colors hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400 whitespace-nowrap">
                                                    View Details
                                                    <ArrowRight className="h-3 w-3 -translate-x-1 transition-transform group-hover/btn:translate-x-0" />
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-8 flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        Showing <strong>{productList.length}</strong> of <strong>{products.total}</strong> results
                    </p>
                    <Pagination links={links} />
                </div>
            </div>
        </div>

        <Dialog open={!!viewCodeProduct} onOpenChange={(open) => !open && setViewCodeProduct(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Product Codes: {viewCodeProduct?.name}</DialogTitle>
                    </DialogHeader>
                    <div id="printable-codes" className="flex flex-col items-center space-y-6 py-4">
                        {viewCodeProduct?.qr_code ? (
                            <div className="flex flex-col items-center code-section">
                                <Label className="mb-2 label">QR Code</Label>
                                <div className="p-2 bg-white border rounded-lg">
                                    <QRCode value={viewCodeProduct.qr_code} size={150} />
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">No QR Code generated.</p>
                        )}

                        {viewCodeProduct?.barcode ? (
                            <div className="flex flex-col items-center w-full code-section">
                                <Label className="mb-2 label">Barcode</Label>
                                <div className="p-2 bg-white border rounded-lg w-full flex justify-center overflow-hidden">
                                    <Barcode value={viewCodeProduct.barcode} width={1.5} height={50} fontSize={14} />
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">No Barcode generated.</p>
                        )}
                    </div>

                    {/* Hidden High-Res Codes for Printing */}
                    <div id="hidden-print-codes" className="hidden">
                        {viewCodeProduct?.qr_code && (
                            <QRCode value={viewCodeProduct.qr_code} size={512} />
                        )}
                        {viewCodeProduct?.barcode && (
                            <Barcode value={viewCodeProduct.barcode} width={4} height={150} fontSize={14} />
                        )}
                    </div>

                    {/* Hidden Label Render for html-to-image Native Share fallback */}
                    {(() => {
                        if (!viewCodeProduct) return null;

                        const getDynamicSize = (text: string, base: number, threshold: number, min: number, factor: number = 0.5) => {
                            if (!text) return `${base}pt`;
                            const count = String(text).length;
                            if (count > threshold) {
                                return `${Math.max(min, base - (count - threshold) * factor)}pt`;
                            }
                            return `${base}pt`;
                        };

                        const skuStr = viewCodeProduct.sku || viewCodeProduct.name || '';
                        const codesStr = (viewCodeProduct.code || '') + (viewCodeProduct.code_2 || '');
                        const supplierStr = viewCodeProduct.supplier?.name || '';
                        const barcodeStr = viewCodeProduct.barcode || '';

                        const skuSize = getDynamicSize(skuStr, 9, 12, 4, 0.5);
                        const codeSize = getDynamicSize(codesStr, 7.5, 10, 3.5, 0.6);
                        const supplierSize = getDynamicSize(supplierStr, 7, 10, 3.5, 0.6);
                        const barcodeSize = '6.5pt';

                        return (
                            <div style={{ position: 'absolute', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none' }}>
                                <div id="native-print-label" style={{
                                    width: '28mm',
                                    height: '20mm',
                                    background: 'white',
                                    color: 'black',
                                    fontFamily: 'Arial, sans-serif',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxSizing: 'border-box',
                                    padding: '0.5mm 1mm'
                                }}>
                                    <div style={{ display: 'flex', width: '100%', height: '13mm', alignItems: 'center' }}>
                                        <div style={{ width: '10mm', height: '10mm', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <QRCode value={viewCodeProduct.qr_code || ''} size={150} style={{ width: '100%', height: '100%' }} />
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '1mm', overflow: 'hidden' }}>
                                            <div style={{ fontSize: barcodeSize, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.1 }}>{viewCodeProduct.barcode || '-'}</div>
                                            <div style={{ fontSize: codeSize, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.1 }}>
                                                {viewCodeProduct.code || ''} {viewCodeProduct.code_2 || ''}
                                            </div>
                                            <div style={{ fontSize: supplierSize, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.1 }}>{viewCodeProduct.supplier?.name || '-'}</div>
                                        </div>
                                    </div>
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 'auto' }}>
                                        <div style={{ fontSize: skuSize, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', width: '100%', lineHeight: 1 }}>{skuStr}</div>
                                        <div style={{ fontSize: '10pt', fontWeight: 'normal', lineHeight: 1, marginTop: '0.5mm' }}>
                                            {viewCodeProduct.price ? Number(viewCodeProduct.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}


                    <DialogFooter className="sm:justify-between">
                        <Button type="button" variant="outline" onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4" /> Print
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setViewCodeProduct(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Clearance Modal */}
            <Dialog open={isClearanceModalOpen} onOpenChange={setIsClearanceModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Clearance Sale</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-800">
                            <p className="text-sm text-yellow-800 dark:text-yellow-400 font-medium mb-2">
                                Selected Products ({selectedProductIds.length}):
                            </p>
                            <div className="max-h-[150px] overflow-y-auto space-y-2">
                                {productList.filter(p => selectedProductIds.includes(p.id)).map(p => (
                                    <div key={p.id} className="text-xs flex justify-between items-center bg-white dark:bg-black/20 p-2 rounded">
                                        <span className="truncate flex-1 mr-2">{p.name}</span>
                                        <span className="font-bold">₱{p.price ? Number(p.price).toLocaleString() : '0.00'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>New Clearance Price (₱)</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={clearancePrice}
                                onChange={(e) => setClearancePrice(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Duration (Days)</Label>
                            <Input
                                type="number"
                                placeholder="30"
                                value={durationDays}
                                onChange={(e) => setDurationDays(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsClearanceModalOpen(false)}>Cancel</Button>
                        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={handleBulkClearance}>Set Clearance Price</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 font-bold">
                            <Trash2 className="h-5 w-5" /> Confirm Deletion
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 flex flex-col items-center text-center">
                        <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                            <Trash2 className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Are you absolutely sure?</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            You are about to delete <strong>{selectedProductIds.length}</strong> selected products.
                        </p>
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                IMPORTANT: This action cannot be undone. All product data, images, and stock records will be permanently removed.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 sm:justify-center">
                        <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDelete} className="flex-1">
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className={`flex items-center gap-2 font-bold ${statusToggleProduct?.status === 'active' ? 'text-red-600' : 'text-emerald-600'}`}>
                            {statusToggleProduct?.status === 'active' ? <PowerOff className="h-5 w-5" /> : <Power className="h-5 w-5" />}
                            Confirm {statusToggleProduct?.status === 'active' ? 'Deactivation' : 'Activation'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 flex flex-col items-center text-center">
                        <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${statusToggleProduct?.status === 'active' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                            {statusToggleProduct?.status === 'active' ? <PowerOff className={`h-8 w-8 text-red-600`} /> : <Power className={`h-8 w-8 text-emerald-600`} />}
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Are you sure?</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            You are about to {statusToggleProduct?.status === 'active' ? 'deactivate' : 'activate'} <strong>{statusToggleProduct?.name}</strong>.
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {statusToggleProduct?.status === 'active' 
                                ? "Deactivated products won't be visible in the public catalog but will remain in your inventory records." 
                                : "Activated products will be visible in the catalog and available for transactions."}
                        </p>
                    </div>
                    <DialogFooter className="flex gap-2 sm:justify-center">
                        <Button variant="outline" onClick={() => setIsStatusModalOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button 
                            variant={statusToggleProduct?.status === 'active' ? 'destructive' : 'default'} 
                            onClick={executeToggleStatus} 
                            className={`flex-1 ${statusToggleProduct?.status === 'inactive' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                        >
                            Confirm {statusToggleProduct?.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isScanning} onOpenChange={(open) => !open && stopScanner()}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none bg-black">
                    <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm text-white border-none">
                        <DialogTitle className="text-white">Scan Barcode / QR Code</DialogTitle>
                    </DialogHeader>
                    
                    <div className="relative min-h-[400px] flex items-center justify-center bg-black">
                        <div id="search-scanner-reader" className="w-full h-full [&>video]:object-cover [&>video]:h-[400px]"></div>
                        
                        {/* Scan Line Animation */}
                        <div className="absolute inset-x-0 mx-auto w-[80%] h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite] top-0 pointer-events-none z-10"></div>
                        <div className="absolute inset-0 border-[60px] border-black/50 pointer-events-none z-0"></div>
                        
                        <style>{`
                            @keyframes scan {
                                0%, 100% { top: 20%; opacity: 0; }
                                10% { opacity: 1; }
                                50% { top: 80%; }
                                90% { opacity: 1; }
                            }
                        `}</style>

                        <Button
                            size="icon"
                            variant="destructive"
                            className="absolute bottom-6 rounded-full h-14 w-14 shadow-xl z-50 border-2 border-white/20"
                            onClick={stopScanner}
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
