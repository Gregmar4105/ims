import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { Search, PackageOpen, Plus, MapPin, Layers, X, Printer, Sparkles, Trash2, Tag, ScanBarcode, Truck, Package, Info, ArrowRight, Filter, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from "@/components/ui/button";
import Pagination from '@/components/Pagination';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { toBlob } from 'html-to-image';

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
    code: string | null;
    code_2: string | null;
    sku: string | null;
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
        code?: string;
        code_2?: string;
        sku?: string;
    };
    options: {
        branches: string[];
        brands: string[];
        categories: string[];
        codes: string[];
        code2s: string[];
        skus: string[];
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
    const [code, setCode] = useState<string>(filters?.code || "all");
    const [code2, setCode2] = useState<string>(filters?.code_2 || "all");
    const [sku, setSku] = useState<string>(filters?.sku || "all");
    const [showFilters, setShowFilters] = useState(false);

    const debounceTimer = useRef<number | null>(null);

    useEffect(() => {
        setSearch(filters?.search || "");
        setBranch(filters?.branch || "all");
        setBrand(filters?.brand || "all");
        setCategory(filters?.category || "all");
        setStock(filters?.stock || "all");
        setCode(filters?.code || "all");
        setCode2(filters?.code_2 || "all");
        setSku(filters?.sku || "all");
    }, [filters]);

    function updateParams(newParams: any) {
        const currentUrl = new URL(window.location.href);
        const params = new URLSearchParams(currentUrl.search);

        Object.keys(newParams).forEach(key => {
            if (newParams[key] && newParams[key] !== 'all') {
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
        setStock("all");
        setCode("all");
        setCode2("all");
        setSku("all");
        router.get("/products");
    };

    const hasActiveFilters = search || branch !== 'all' || brand !== 'all' || category !== 'all' || stock !== 'all' || code !== 'all' || code2 !== 'all' || sku !== 'all';

    const [viewCodeProduct, setViewCodeProduct] = useState<Product | null>(null);

    async function handlePrint() {
        if (!viewCodeProduct) return;

        // Try Native Share with html-to-image first
        const labelNode = document.getElementById('native-print-label');
        if (labelNode) {
            try {
                const blob = await toBlob(labelNode, { pixelRatio: 3 });
                if (blob) {
                    const file = new File([blob], 'label.png', { type: blob.type });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: 'QR Label ' + viewCodeProduct.name,
                        });
                        return; // Successfully triggered native share/print popup
                    }
                }
            } catch (error) {
                console.error('Error generating image for native share fallback to window.print', error);
            }
        }

        const qrSvg = document.querySelector('#hidden-print-codes svg')?.outerHTML || '<!-- QR Error -->';
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
            doc.open();
            doc.write(`
                <html>
                    <head>
                        <title>Print Label</title>
                        <style>
                            @page {
                                size: 38mm 25mm;
                                margin: 0;
                            }
                            body {
                                margin: 0;
                                padding: 0mm 1mm;
                                font-family: 'Arial', sans-serif;
                                width: 38mm;
                                height: 25mm;
                                overflow: hidden;
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                                background: white;
                                color: black;
                            }
                            .label-container {
                                width: 100%;
                                height: 100%;
                                display: flex;
                                flex-direction: column;
                                box-sizing: border-box;
                            }
                            
                            /* Main Upper Section */
                            .upper-section {
                                display: flex;
                                height: 16mm;
                                width: 100%;
                                align-items: center;
                                padding-top: 1mm;
                            }
                            
                            /* QR Left */
                            .qr-section {
                                width: 15mm;
                                height: 15mm;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                flex-shrink: 0;
                            }
                            .qr-section svg {
                                width: 100% !important;
                                height: 100% !important;
                            }

                            /* Right Info Stack */
                            .info-right {
                                flex: 1;
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                                padding-left: 2mm;
                                overflow: hidden;
                            }
                            
                            .info-line {
                                font-size: 8px; /* Target text size */
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                line-height: 1.2;
                                font-family: 'Arial', sans-serif;
                            }

                            /* Bottom Section */
                            .bottom-section {
                                flex: 1;
                                display: flex;
                                flex-direction: column;
                                justify-content: flex-start;
                                align-items: center;
                                text-align: center;
                                overflow: hidden;
                                padding-top: 1mm;
                            }
                            
                            .product-name {
                                font-size: 8px;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                width: 100%;
                                line-height: 1.2;
                                font-family: 'Arial', sans-serif;
                            }

                            .price {
                                font-size: 10px;
                                white-space: nowrap;
                                line-height: 1.2;
                                font-family: 'Arial', sans-serif;
                            }

                        </style>
                    </head>
                    <body>
                        <div class="label-container">
                            <div class="upper-section">
                                <div class="qr-section">
                                    ${qrSvg}
                                </div>
                                <div class="info-right">
                                    <div class="info-line">${viewCodeProduct.barcode || viewCodeProduct.code || '-'}</div>
                                    <div class="info-line">${viewCodeProduct.supplier?.name || viewCodeProduct.brand?.name || '-'}</div>
                                    <div class="info-line">${viewCodeProduct.category?.name || '-'}</div>
                                </div>
                            </div>
                            
                            <div class="bottom-section">
                                <div class="product-name">${viewCodeProduct.sku || viewCodeProduct.name || '-'}</div>
                                <div class="price">
                                    ${viewCodeProduct.price ? Number(viewCodeProduct.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                </div>
                            </div>
                        </div>
                    </body>
                </html>
                `);
            doc.close();

            setTimeout(() => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error('Print failed', e);
                }
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 5000);
            }, 500);
        }
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
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={handleSearchChange}
                                    className="pl-9 h-10 bg-white dark:bg-gray-800"
                                />
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
                                placeholder="Search products..."
                                value={search}
                                onChange={handleSearchChange}
                                className="pl-10"
                            />
                        </div>

                        {/* Filter Group - wrapped for mobile Layout */}
                        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
                            {isSystemAdmin && (
                                <Select value={branch} onValueChange={(val) => { setBranch(val); updateParams({ branch: val }); }}>
                                    <SelectTrigger className="w-full md:w-[140px] h-9 text-xs md:text-sm">
                                        <SelectValue placeholder="Branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Branches</SelectItem>
                                        {options.branches.map((b) => (
                                            <SelectItem key={b} value={b}>{b}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Select value={brand} onValueChange={(val) => { setBrand(val); updateParams({ brand: val }); }}>
                                <SelectTrigger className="w-full md:w-[140px] h-9 text-xs md:text-sm">
                                    <SelectValue placeholder="Brand" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Brands</SelectItem>
                                    {options.brands.map((b) => (
                                        <SelectItem key={b} value={b}>{b}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={category} onValueChange={(val) => { setCategory(val); updateParams({ category: val }); }}>
                                <SelectTrigger className="w-full md:w-[140px] h-9 text-xs md:text-sm">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {options.categories.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={stock} onValueChange={(val) => { setStock(val); updateParams({ stock: val }); }}>
                                <SelectTrigger className="w-full md:w-[140px] h-9 text-xs md:text-sm">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="in_stock">In Stock</SelectItem>
                                    <SelectItem value="low_stock">Low Stock</SelectItem>
                                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Advanced Filters (Codes etc) - Toggleable within filters? Or just stacked */}
                            <Select value={code} onValueChange={(val) => { setCode(val); updateParams({ code: val }); }}>
                                <SelectTrigger className="w-full md:w-[120px] h-9 text-xs md:text-sm bg-gray-50/50">
                                    <SelectValue placeholder="Code" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Codes</SelectItem>
                                    {options.codes?.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={code2} onValueChange={(val) => { setCode2(val); updateParams({ code_2: val }); }}>
                                <SelectTrigger className="w-full md:w-[120px] h-9 text-xs md:text-sm bg-gray-50/50">
                                    <SelectValue placeholder="2Code" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All 2Codes</SelectItem>
                                    {options.code2s?.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={sku} onValueChange={(val) => { setSku(val); updateParams({ sku: val }); }}>
                                <SelectTrigger className="w-full md:w-[120px] h-9 text-xs md:text-sm bg-gray-50/50">
                                    <SelectValue placeholder="SKU" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All SKUs</SelectItem>
                                    {options.skus?.map((c) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
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
                        {productList.map((product: Product) => (
                            <div key={product.id} className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-black/10 bg-white transition-all hover:shadow-lg dark:border-sidebar-border dark:bg-transparent">
                                {/* Image Section */}
                                <div className="relative aspect-square overflow-hidden bg-neutral-50 dark:bg-white/5">
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

                                    {/* Vibrant Quantity Badge */}
                                    <div className="absolute top-2 right-2">
                                        <Badge className={`shadow-sm border-0 font-bold ${product.quantity === 0 ? 'bg-red-600 hover:bg-red-700 text-white' :
                                            product.quantity <= 5 ? 'bg-amber-500 hover:bg-amber-600 text-white' :
                                                'bg-emerald-500 hover:bg-emerald-600 text-white'
                                            }`}>
                                            Qty: {product.quantity}
                                        </Badge>
                                    </div>

                                    {/* Hover Overlay for Quick Actions */}
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
                                        </div>
                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="flex flex-1 flex-col justify-between gap-3 p-3">
                                    {/* Header & Price */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-start gap-2">
                                            <Link href={`/products/${product.id}`} className="hover:underline flex-1">
                                                <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 text-base group-hover:text-blue-600 transition-colors" title={product.name}>
                                                    {product.name}
                                                </h3>
                                            </Link>
                                            <span className="text-base font-extrabold text-black dark:text-white whitespace-nowrap">
                                                ₱{product.price ? Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                                            </span>
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

                                        <Link href={`/products/${product.id}`} className="shrink-0">
                                            <button className="group/btn flex items-center gap-1 text-xs font-bold text-gray-900 transition-colors hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400 whitespace-nowrap">
                                                View Details
                                                <ArrowRight className="h-3 w-3 -translate-x-1 transition-transform group-hover/btn:translate-x-0" />
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        Showing <strong>{productList.length}</strong> of <strong>{products.total}</strong> results
                    </p>
                    <Pagination links={links} />
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
                    {viewCodeProduct && (
                        <div style={{ position: 'absolute', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none' }}>
                            <div id="native-print-label" style={{
                                width: '38mm',
                                height: '25mm',
                                background: 'white',
                                color: 'black',
                                fontFamily: 'Arial, sans-serif',
                                display: 'flex',
                                flexDirection: 'column',
                                boxSizing: 'border-box',
                                padding: '0mm 1mm'
                            }}>
                                <div style={{ display: 'flex', height: '16mm', width: '100%', alignItems: 'center', paddingTop: '1mm' }}>
                                    <div style={{ width: '15mm', height: '15mm', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <QRCode value={viewCodeProduct.qr_code || ''} size={150} style={{ width: '100%', height: '100%' }} />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '2mm', overflow: 'hidden' }}>
                                        <div style={{ fontSize: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{viewCodeProduct.barcode || viewCodeProduct.code || '-'}</div>
                                        <div style={{ fontSize: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{viewCodeProduct.supplier?.name || viewCodeProduct.brand?.name || '-'}</div>
                                        <div style={{ fontSize: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{viewCodeProduct.category?.name || '-'}</div>
                                    </div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', textAlign: 'center', overflow: 'hidden', paddingTop: '1mm' }}>
                                    <div style={{ fontSize: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', lineHeight: 1.2 }}>{viewCodeProduct.sku || viewCodeProduct.name || '-'}</div>
                                    <div style={{ fontSize: '10px', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                                        ₱{viewCodeProduct.price ? Number(viewCodeProduct.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
        </AppLayout>
    );
}
