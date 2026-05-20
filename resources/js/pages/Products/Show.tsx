import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPinned, Layers, Package, Tag, ScanBarcode, Truck, Edit, Info, ArrowLeft } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from "@/components/ui/avatar";
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

export default function Show({ product }: Props) {
    const { auth } = usePage<SharedData>().props;
    const isSystemAdmin = auth.roles.includes('System Administrator');
    const isEmployee = auth.roles.includes('Employee') && !isSystemAdmin && !auth.roles.includes('Branch Administrator');
    const isOnClearance = (product: Product) => {
        if (!product.clearance_price || Number(product.clearance_price) <= 0) return false;
        if (!product.clearance_until) return true;
        return new Date(product.clearance_until) > new Date();
    };

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
                        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
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

                    {!isEmployee && (
                        <div className="flex gap-2">
                            <Link href={`/products/${product.id}/edit`}>
                                <Button>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Product
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Header */}
            <div className="block md:hidden p-4 pb-2">
                <div className="flex items-start justify-between gap-3 w-full">
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white text-left leading-tight tracking-tight flex-1">
                        {product.name}
                    </h1>
                    {!isEmployee && (
                        <Link href={`/products/${product.id}/edit`} className="shrink-0 mt-0.5">
                            <Button variant="outline" size="sm" className="text-xs font-semibold flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                                <Edit className="h-3.5 w-3.5" />
                                <span>Edit</span>
                            </Button>
                        </Link>
                    )}
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

                        {product.variations && product.variations.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Variations</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {product.variations.map((v, i) => (
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

                    {product.variations && product.variations.length > 0 && (
                        <>
                            <Separator className="bg-gray-100 dark:bg-gray-800" />
                            <div className="space-y-3">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase">Variations</span>
                                <div className="grid grid-cols-1 gap-2.5 pt-1">
                                    {product.variations.map((v, i) => (
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
        </AppLayout>
    );
}
