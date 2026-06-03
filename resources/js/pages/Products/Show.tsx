import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPinned, Layers, Package, Tag, ScanBarcode, Truck, Edit, Info, ArrowLeft, Printer } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from "@/components/ui/avatar";
import { handleNativePrintFallback } from '@/lib/utils';
import { useBluetoothPrinterContext } from '@/contexts/bluetooth-printer-context';
import { useState } from 'react';
import { PrintSelectionModal } from '@/components/print-selection-modal';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface VariationOption {
    value: string;
    quantity: number;
}

interface Variation {
    name: string;
    options: string | VariationOption[];
}

interface Product {
    id: number;
    name: string;
    brand_id: number;
    category_id: number;
    quantity: number;
    physical_location: string | null;
    description: string | null;
    variations: Variation[] | null;
    image_path: string | null;
    barcode: string | null;
    qr_code: string | null;
    price: number | null;
    code: string | null;
    code_2: string | null;
    sku: string | null;
    reorder_level: number;
    clearance_price: number | null;
    clearance_until: string | null;
    branches?: { 
        id: number;
        branch_name: string; 
        profile_photo_path: string | null;
        pivot?: {
            physical_location: string | null;
            quantity: number;
        }
    }[];
    brand?: { name: string };
    category?: { name: string };
    supplier?: { name: string };
}

interface Props {
    product: Product;
}

const getParsedVariations = (variations: any): Variation[] => {
    if (!variations) return [];
    if (typeof variations === 'string') {
        try {
            const decoded = JSON.parse(variations);
            if (Array.isArray(decoded)) return decoded;
        } catch (e) {
            console.error('Failed to parse variations JSON:', e);
        }
        return [];
    }
    if (Array.isArray(variations)) return variations;
    return [];
};

export default function Show({ product }: Props) {
    const { auth } = usePage<SharedData>().props;
    const bt = useBluetoothPrinterContext();
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const parsedVariations = getParsedVariations(product.variations);
    const isSystemAdmin = auth.roles.includes('System Administrator');
    const isEmployee = auth.roles.includes('Employee') && !isSystemAdmin && !auth.roles.includes('Branch Administrator');
    const isOnClearance = (product: Product) => {
        if (!product.clearance_price || Number(product.clearance_price) <= 0) return false;
        if (!product.clearance_until) return true;
        return new Date(product.clearance_until) > new Date();
    };

    async function handlePrint() {
        // Try Native Share with our unified utility first
        const nativeTriggered = await handleNativePrintFallback('native-print-label', `label_${product.sku || product.id}`);

        if (nativeTriggered) {
            return; // Exit if mobile handled it natively
        }

        // Process SVG to remove hardcoded dimensions so it scales correctly in the label
        let qrSvg = document.querySelector('#hidden-print-codes svg')?.outerHTML || '<!-- QR Error -->';
        qrSvg = qrSvg.replace(/width="\d+"/, '').replace(/height="\d+"/, '');

        const printWidth = bt.labelWidth || 28;
        const printHeight = bt.labelHeight > 0 
            ? bt.labelHeight 
            : (bt.mediaType === 'receipt' 
                ? Math.round(printWidth * 0.7) 
                : 20);

        // Helper to determine dynamic font size based on text length and label scale
        const getDynamicSize = (text: string, base: number, threshold: number, min: number, factor: number = 0.5) => {
            const widthScale = printWidth / 28;
            const scaledBase = base * Math.min(2, widthScale);
            const scaledMin = min * Math.min(2, widthScale);
            const scaledThreshold = threshold * widthScale;

            if (!text) return `${scaledBase}pt`;
            const count = String(text).length;
            if (count > scaledThreshold) {
                return `${Math.max(scaledMin, scaledBase - (count - scaledThreshold) * factor)}pt`;
            }
            return `${scaledBase}pt`;
        };

        // Dynamic font sizes based on active dimensions
        const skuSize = getDynamicSize(product.sku || product.name || '', 6, 12, 3, 0.5);
        const codeSize = getDynamicSize((product.code || '') + (product.code_2 || ''), 7.5, 10, 3.5, 0.6);
        const supplierSize = getDynamicSize(product.supplier?.name || '', 7, 10, 3.5, 0.6);
        const barcodeSize = `${6 * Math.min(2, printWidth / 28) - 1}pt`;

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
                        size: ${printWidth}mm ${printHeight}mm;
                        margin: 0;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        width: ${printWidth}mm !important;
                        height: ${printHeight}mm !important;
                    }
                }
                
                .label-container {
                    width: ${printWidth}mm;
                    height: ${printHeight}mm;
                    margin: 0;
                    margin-left: 1.5mm;
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
                    height: ${printHeight - 7}mm;
                    align-items: center;
                }

                .qr-section {
                    width: ${Math.min(24, Math.max(6, printHeight - 10))}mm;
                    height: ${Math.min(24, Math.max(6, printHeight - 10))}mm;
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
                    font-size: ${7 * Math.min(2, printWidth / 28)}pt;
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
                    font-size: ${skuSize};
                    font-weight: bold;
                    white-space: nowrap;
                    overflow: hidden;
                    width: 100%;
                    line-height: 1;
                }

                .price {
                    font-size: ${10 * Math.min(2, printWidth / 28)}pt;
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
                        <div class="info-line" style="font-size: ${barcodeSize}">${product.barcode || '-'}</div>
                        <div class="info-line" style="font-size: ${codeSize}">
                            ${product.code || ''} ${product.code_2 || ''}
                        </div>
                        <div class="info-line" style="font-size: ${supplierSize}">${product.supplier?.name || '-'}</div>
                    </div>
                </div>
                
                <div class="bottom-section">
                    <div class="product-sku" style="font-size: ${skuSize}">${product.sku || product.name || '-'}</div>
                    <div class="price">
                        ₱${product.price ? Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
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

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Products',
            href: '/products',
        },
        {
            title: product.name,
            href: `/products/${product.id}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Product - ${product.name}`} />

            {/* Desktop Header */}
            <div className="hidden md:block p-4 md:p-8 space-y-6">
                <div className="flex items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => window.history.back()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-left">{product.name}</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-500 justify-start">
                                <span className="font-semibold text-blue-600">{product.brand?.name}</span>
                                <span>•</span>
                                <span>{product.category?.name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {!isEmployee && (
                            <Link href={`/products/${product.id}/edit${window.location.search}`}>
                                <Button className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black">
                                    <Edit className="mr-2 h-4 w-4" /> Edit Product
                                </Button>
                            </Link>
                        )}
                        <Button 
                            onClick={() => setIsPrintModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 rounded-lg"
                        >
                            <Printer className="h-4 w-4" /> Print Label
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="block md:hidden p-4 pb-2">
                <div className="flex items-start justify-between gap-3 w-full">
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white text-left leading-tight tracking-tight flex-1">
                        {product.name}
                    </h1>
                    <div className="flex flex-col items-end gap-1.5 shrink-0 mt-0.5">
                        {!isEmployee && (
                            <Link href={`/products/${product.id}/edit${window.location.search}`}>
                                <Button size="sm" className="text-xs font-semibold flex items-center gap-1.5 h-8 px-2.5 rounded-lg border-0 bg-black text-white dark:bg-white dark:text-black shadow-sm hover:bg-gray-900 dark:hover:bg-gray-100">
                                    <Edit className="h-3.5 w-3.5" />
                                    <span>Edit</span>
                                </Button>
                            </Link>
                        )}
                        <Button 
                            size="sm" 
                            onClick={() => setIsPrintModalOpen(true)}
                            className="text-xs font-semibold flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Print Label</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Desktop View Content */}
            <div className="hidden md:grid grid-cols-3 gap-6 p-4 md:p-8 pt-0">
                {/* Left Column - Image & Quick Status */}
                <div className="space-y-6">
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden border shadow-sm aspect-square flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                        {product.image_path ? (
                            <img
                                src={`/storage/${product.image_path}`}
                                alt={product.name}
                                className="w-full h-full object-contain p-4"
                            />
                        ) : (
                            <Package className="h-32 w-32 text-gray-300" />
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b pb-4">
                            <span className="text-gray-500">Price</span>
                            <div className="text-right">
                                {isOnClearance(product) ? (
                                    <>
                                        <span className="text-2xl font-bold text-yellow-600 block leading-none">
                                            ₱{Number(product.clearance_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-sm text-gray-400 line-through">
                                            ₱{product.price ? Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                                        </span>
                                        <div className="bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 mt-1 rounded uppercase inline-block">
                                            Clearance Sale
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                        ₱{product.price ? Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-center border-b pb-4">
                            <span className="text-gray-500">Stock Status</span>
                            <Badge className={`${product.quantity === 0 ? 'bg-red-500' :
                                product.quantity <= 5 ? 'bg-amber-500' :
                                    'bg-emerald-600'
                                }`}>
                                Qty: {product.quantity}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Right Column - Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border shadow-sm space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Product Codes</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                    <span className="text-xs font-medium text-gray-500 uppercase block mb-1">SKU</span>
                                    <div className="font-mono text-sm font-bold flex items-center gap-2">
                                        <Package className="h-4 w-4 text-gray-400" />
                                        {product.sku || '-'}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                    <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Code</span>
                                    <div className="font-mono text-sm font-bold flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-gray-400" />
                                        {product.code || '-'}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                    <span className="text-xs font-medium text-gray-500 uppercase block mb-1">2Code</span>
                                    <div className="font-mono text-sm font-bold flex items-center gap-2">
                                        <ScanBarcode className="h-4 w-4 text-gray-400" />
                                        {product.code_2 || '-'}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                    <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Barcode</span>
                                    <div className="flex items-center justify-center bg-white p-2 rounded mt-2 mx-auto max-w-[200px]">
                                        {product.barcode ? (
                                            <div className="w-full flex justify-center">
                                                <Barcode value={product.barcode} height={40} fontSize={12} width={1.5} background="transparent" />
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400 font-mono">-</span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                    <span className="text-xs font-medium text-gray-500 uppercase block mb-1">QR Code</span>
                                    <div className="flex items-center justify-center bg-white p-2 rounded mt-2 mx-auto max-w-[120px]">
                                        {product.qr_code ? (
                                            <QRCode value={product.qr_code} size={96} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                                        ) : (
                                            <span className="text-sm text-gray-400 font-mono">-</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-lg font-semibold mb-2">Description</h3>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                {product.description || <span className="italic text-gray-400">No description provided.</span>}
                            </p>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-lg font-semibold mb-2">Details</h3>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
                                {product.supplier && (
                                    <div className="flex flex-col">
                                        <dt className="text-gray-500">Supplier</dt>
                                        <dd className="font-medium flex items-center gap-1.5 mt-1">
                                            <Truck className="h-4 w-4 text-gray-400" />
                                            {product.supplier.name}
                                        </dd>
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <dt className="text-gray-500">Reorder Level</dt>
                                    <dd className="font-medium flex items-center gap-1.5 mt-1">
                                        <Layers className="h-4 w-4 text-gray-400" />
                                        {product.reorder_level}
                                    </dd>
                                </div>

                                <div className="flex flex-col col-span-1 sm:col-span-2 mt-4">
                                    <dt className="text-gray-500 font-semibold mb-3 flex items-center gap-2">
                                        <MapPinned className="h-4 w-4" />
                                        Branch & Physical Locations
                                    </dt>
                                    <dd className="space-y-3">
                                        {product.branches && product.branches.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-3">
                                                {product.branches.map((b) => (
                                                    <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar size="default" className="border-2 border-white dark:border-gray-800 shadow-sm ring-0">
                                                                {b.profile_photo_path ? (
                                                                    <AvatarImage src={`/storage/${b.profile_photo_path}`} alt={b.branch_name} />
                                                                ) : (
                                                                    <AvatarFallback className="text-xs bg-blue-600 text-white font-bold">
                                                                        {b.branch_name.substring(0, 2).toUpperCase()}
                                                                    </AvatarFallback>
                                                                )}
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Branch</span>
                                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{b.branch_name}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-6">
                                                            {b.pivot?.physical_location && (
                                                                <div className="flex flex-col sm:items-end">
                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Physical Location</span>
                                                                    <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-sm">
                                                                        <MapPinned className="h-3.5 w-3.5" />
                                                                        <span>{b.pivot.physical_location}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {isSystemAdmin && (
                                                                <div className="flex flex-col sm:items-end border-l pl-6 dark:border-gray-700">
                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Stock</span>
                                                                    <Badge variant="secondary" className="text-xs font-bold px-2 py-0">
                                                                        {b.pivot?.quantity || 0}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                                                <span className="text-muted-foreground flex items-center justify-center gap-2 font-medium italic text-sm">
                                                    <Layers className="h-4 w-4 text-gray-400" /> Global / All Branches
                                                </span>
                                            </div>
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {parsedVariations.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Variations</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {parsedVariations.map((v, i) => (
                                            <div key={i} className="flex flex-col gap-1.5 p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{v.name}</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {typeof v.options === 'string' ? (
                                                        v.options.split(',').map((opt, optIdx) => (
                                                            <Badge key={optIdx} variant="secondary" className="text-xs px-2 py-0.5">
                                                                {opt.trim()}
                                                            </Badge>
                                                        ))
                                                    ) : Array.isArray(v.options) ? (
                                                        v.options.map((opt, optIdx) => (
                                                            <Badge key={optIdx} variant="secondary" className="text-xs flex items-center gap-1.5 px-2 py-0.5 font-medium">
                                                                <span>{opt.value}</span>
                                                                <span className="inline-flex items-center justify-center px-1.5 py-0.25 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                                                    {opt.quantity}
                                                                </span>
                                                            </Badge>
                                                        ))
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile View Content */}
            <div className="flex md:hidden flex-col gap-5 p-4 pt-0 pb-10">
                {/* Product Image Card */}
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border shadow-sm aspect-square flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    {product.image_path ? (
                        <img
                            src={`/storage/${product.image_path}`}
                            alt={product.name}
                            className="w-full h-full object-contain p-4"
                        />
                    ) : (
                        <Package className="h-24 w-24 text-gray-300" />
                    )}
                </div>

                {/* Price & Stock Status Banner */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border shadow-sm flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Price</span>
                        <div className="mt-1">
                            {isOnClearance(product) ? (
                                <>
                                    <span className="text-xl font-bold text-yellow-600 block leading-none">
                                        ₱{Number(product.clearance_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-xs text-gray-400 line-through">
                                        ₱{product.price ? Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                                    </span>
                                </>
                            ) : (
                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                    ₱{product.price ? Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Stock Status</span>
                        <Badge className={`${product.quantity === 0 ? 'bg-red-500' :
                            product.quantity <= 5 ? 'bg-amber-500' :
                                'bg-emerald-600'
                            } text-xs font-bold px-2.5 py-0.5`}>
                            Qty: {product.quantity}
                        </Badge>
                    </div>
                </div>

                {/* Codes Grid & Barcodes/QR Row */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border shadow-sm space-y-5">
                    {/* Product Codes */}
                    <div className="space-y-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Product Codes</span>
                        
                        {/* SKU - Full Width */}
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">SKU</span>
                            <div className="font-mono text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                <Package className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="truncate">{product.sku || '-'}</span>
                            </div>
                        </div>
                        
                        {/* Code & 2Code - Side-by-Side */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm min-w-0">
                                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Code</span>
                                <div className="font-mono text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                    <Tag className="h-4 w-4 text-gray-400 shrink-0" />
                                    <span className="truncate">{product.code || '-'}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm min-w-0">
                                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">2Code</span>
                                <div className="font-mono text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                    <ScanBarcode className="h-4 w-4 text-gray-400 shrink-0" />
                                    <span className="truncate">{product.code_2 || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Barcode & QR Code Stacked */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center min-h-[140px]">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Barcode</span>
                            <div className="flex items-center justify-center bg-white p-3 rounded-xl w-full max-w-[280px] shadow-sm">
                                {product.barcode ? (
                                    <div className="w-full flex justify-center">
                                        <Barcode value={product.barcode} height={45} fontSize={11} width={1.5} background="transparent" />
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-400 font-mono">-</span>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center min-h-[160px]">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">QR Code</span>
                            <div className="flex items-center justify-center bg-white p-3.5 rounded-xl w-full max-w-[140px] shadow-sm">
                                {product.qr_code ? (
                                    <QRCode value={product.qr_code} size={112} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                                ) : (
                                    <span className="text-sm text-gray-400 font-mono">-</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description Card */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border shadow-sm space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Description</span>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line pt-1">
                        {product.description || <span className="italic text-gray-400">No description provided.</span>}
                    </p>
                </div>

                {/* Details (Supplier, Reorder, Branch Locations, Variations) */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border shadow-sm space-y-5">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Additional Details</span>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {product.supplier && (
                            <div className="flex flex-col">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase">Supplier</span>
                                <span className="font-bold text-gray-955 dark:text-gray-100 flex items-center gap-1.5 mt-1">
                                    <Truck className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                    {product.supplier.name}
                                </span>
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase">Reorder Level</span>
                            <span className="font-bold text-gray-955 dark:text-gray-100 flex items-center gap-1.5 mt-1">
                                <Layers className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                {product.reorder_level}
                            </span>
                        </div>
                    </div>

                    {parsedVariations.length > 0 && (
                        <>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <div className="space-y-3">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase">Variations</span>
                                <div className="grid grid-cols-1 gap-2.5 pt-1">
                                    {parsedVariations.map((v, i) => (
                                        <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl border border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/50 shadow-sm">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{v.name}</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {typeof v.options === 'string' ? (
                                                    v.options.split(',').map((opt, optIdx) => (
                                                        <Badge key={optIdx} variant="secondary" className="text-xs px-2 py-0.5 font-medium rounded-lg">
                                                            {opt.trim()}
                                                        </Badge>
                                                    ))
                                                ) : Array.isArray(v.options) ? (
                                                    v.options.map((opt, optIdx) => (
                                                        <Badge key={optIdx} variant="secondary" className="text-xs flex items-center gap-1.5 px-2 py-0.5 font-medium rounded-lg">
                                                            <span>{opt.value}</span>
                                                            <span className="inline-flex items-center justify-center px-1.5 py-0.25 rounded-md text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                                                {opt.quantity}
                                                            </span>
                                                        </Badge>
                                                    ))
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <Separator className="bg-gray-100 dark:bg-gray-800" />

                    <div className="space-y-3">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase flex items-center gap-1.5">
                            <MapPinned className="h-3.5 w-3.5 text-gray-400" />
                            Branch & Physical Locations
                        </span>
                        <div className="space-y-2.5 pt-1">
                            {product.branches && product.branches.length > 0 ? (
                                product.branches.map((b) => (
                                    <div key={b.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/80 shadow-sm">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Avatar className="h-8 w-8 border-2 border-white dark:border-gray-800 shadow-sm ring-0">
                                                {b.profile_photo_path ? (
                                                    <AvatarImage src={`/storage/${b.profile_photo_path}`} alt={b.branch_name} />
                                                ) : (
                                                    <AvatarFallback className="text-[10px] bg-blue-600 text-white font-bold">
                                                        {b.branch_name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                )}
                                            </Avatar>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Branch</span>
                                                <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{b.branch_name}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 shrink-0">
                                            {b.pivot?.physical_location && (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Location</span>
                                                    <div className="flex items-center gap-1 text-blue-600 font-bold text-xs">
                                                        <MapPinned className="h-3 w-3" />
                                                        <span>{b.pivot.physical_location}</span>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {isSystemAdmin && (
                                                <div className="flex flex-col items-end border-l pl-3 dark:border-gray-700">
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Stock</span>
                                                    <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-4 min-w-[20px] justify-center">
                                                        {b.pivot?.quantity || 0}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-3.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                                    <span className="text-muted-foreground flex items-center justify-center gap-2 font-medium italic text-xs">
                                        <Layers className="h-3.5 w-3.5 text-gray-400" /> Global / All Branches
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden High-Res Codes for Printing */}
            <div id="hidden-print-codes" className="hidden">
                {product.qr_code && <QRCode value={product.qr_code} size={512} />}
                {product.barcode && <Barcode value={product.barcode} width={4} height={150} fontSize={14} />}
            </div>

            {/* Hidden Label Render for html-to-image Native Share fallback */}
            {(() => {
                const printWidth = bt.labelWidth || 28;
                const printHeight = bt.labelHeight > 0 
                    ? bt.labelHeight 
                    : (bt.mediaType === 'receipt' 
                        ? Math.round(printWidth * 0.7) 
                        : 20);

                const getDynamicSize = (text: string, base: number, threshold: number, min: number, factor: number = 0.5) => {
                    const widthScale = printWidth / 28;
                    const scaledBase = base * Math.min(2, widthScale);
                    const scaledMin = min * Math.min(2, widthScale);
                    const scaledThreshold = threshold * widthScale;

                    if (!text) return `${scaledBase}pt`;
                    const count = String(text).length;
                    if (count > scaledThreshold) {
                        return `${Math.max(scaledMin, scaledBase - (count - scaledThreshold) * factor)}pt`;
                    }
                    return `${scaledBase}pt`;
                };

                const skuStr = product.sku || product.name || '';
                const codesStr = (product.code || '') + (product.code_2 || '');
                const supplierStr = product.supplier?.name || '';

                const skuSize = getDynamicSize(skuStr, 6, 12, 3, 0.5);
                const codeSize = getDynamicSize(codesStr, 7.5, 10, 3.5, 0.6);
                const supplierSize = getDynamicSize(supplierStr, 7, 10, 3.5, 0.6);
                const barcodeSize = `${6 * Math.min(2, printWidth / 28) - 1}pt`;
                const priceSize = `${10 * Math.min(2, printWidth / 28)}pt`;

                const qrSize = `${Math.min(24, Math.max(6, printHeight - 10))}mm`;
                const upperHeight = `${printHeight - 7}mm`;

                return (
                    <div style={{ position: 'absolute', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none' }}>
                        <div id="native-print-label" style={{
                            width: `${printWidth}mm`,
                            height: `${printHeight}mm`,
                            marginLeft: '1.5mm',
                            background: 'white',
                            color: 'black',
                            fontFamily: 'Arial, sans-serif',
                            display: 'flex',
                            flexDirection: 'column',
                            boxSizing: 'border-box',
                            padding: '0.5mm 1mm'
                        }}>
                            <div style={{ display: 'flex', width: '100%', height: upperHeight, alignItems: 'center' }}>
                                <div style={{ width: qrSize, height: qrSize, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <QRCode value={product.qr_code || ''} size={150} style={{ width: '100%', height: '100%' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '1mm', overflow: 'hidden' }}>
                                    <div style={{ fontSize: barcodeSize, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.1 }}>{product.barcode || '-'}</div>
                                    <div style={{ fontSize: codeSize, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.1 }}>
                                        {product.code || ''} {product.code_2 || ''}
                                    </div>
                                    <div style={{ fontSize: supplierSize, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.1 }}>{product.supplier?.name || '-'}</div>
                                </div>
                            </div>
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 'auto' }}>
                                <div style={{ fontSize: skuSize, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', width: '100%', lineHeight: 1 }}>{skuStr}</div>
                                <div style={{ fontSize: priceSize, fontWeight: 'normal', lineHeight: 1, marginTop: '0.5mm' }}>
                                    ₱{product.price ? Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <PrintSelectionModal 
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                onPrintSystem={handlePrint}
                elementId="native-print-label"
                title={`Print Product Label - ${product.name}`}
                hideBluetooth={true}
            />
        </AppLayout>
    );
}
