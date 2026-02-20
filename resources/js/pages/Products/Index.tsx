import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { Search, PackageOpen, Plus, MapPin, Layers, X, Printer, Sparkles, Trash2, Tag, ScanBarcode, Truck, Package, Info, ArrowRight, Filter } from 'lucide-react';
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

    function handlePrint() {
        if (!viewCodeProduct) return;

        const printWindow = window.open('', '', 'width=600,height=600');
        if (printWindow) {
            // We'll generate the QR/Barcode SVGs/Canvas URIs dynamically if needed, 
            // but for this layout, we might need to rely on the library rendering them into the print window 
            // or cloning nodes. Simplest is to re-render them or grab distinct values.

            // Since we can't easily transfer the React component state to the new window exactly as is 
            // without re-rendering, we will build a raw HTML string with the data.
            // Note: For Barcode/QR, we might normally need to generate base64, but let's try 
            // simple text/css layout first or assume we can invoke a script.
            // actually, easiest way to print React components is to have a hidden print ref, 
            // but here we are writing raw HTML.

            // For QR/Barcode in raw HTML without React in the new window, we can use an img tag 
            // if we convert the current view's SVGs to data URLs, OR we use a library that runs in the popup.
            // A quick dirty way: Grab the SVG outerHTML from the current DOM if it exists.

            // USE THE HIDDEN HIGH-RES SOURCE
            const qrSvg = document.querySelector('#hidden-print-codes svg')?.outerHTML || '<!-- QR Error -->';
            // Barcode libraries often output SVG or Canvas. React-barcode usually SVG.
            // Let's assume we can grab it. If not, we might fallback to text for now or improve later.
            // The user's previous code rendered them in a dialog. We can grab them from there.
            const barcodeSvg = document.querySelectorAll('#hidden-print-codes svg')[1]?.outerHTML || '<!-- Barcode Error -->';


            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print Label</title>
                        <style>
                            @page {
                                size: 28mm 20mm;
                                margin: 0;
                            }
                            body {
                                margin: 0;
                                padding: 0;
                                font-family: 'Arial', sans-serif;
                                width: 28mm;
                                height: 20mm;
                                overflow: hidden;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                background: white;
                            }
                            .label-container {
                                width: 27mm; /* Safety margin */
                                height: 19mm;
                                border: 1px solid black; /* Optional: remove if pre-printed labels */
                                display: flex;
                                flex-direction: column;
                                box-sizing: border-box;
                                padding: 0.5mm;
                                position: relative;
                            }
                            
                            /* Main Upper Section */
                            .upper-section {
                                display: flex;
                                height: 13mm;
                                border-bottom: 0.5px solid black;
                            }
                            
                            /* QR Left */
                            .qr-section {
                                width: 12mm; /* Increased from 10mm */
                                border-right: 0.5px solid black;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                padding: 0.2mm; /* Reduced padding */
                            }
                            .qr-section svg {
                                width: 100% !important;
                                height: auto !important;
                            }

                            /* Right Info Stack */
                            .info-right {
                                flex: 1;
                                display: flex;
                                flex-direction: column;
                                overflow: hidden; /* Ensure no spill */
                            }
                            
                            /* Barcode Row */
                            .barcode-row {
                                flex: 1;
                                border-bottom: 0.5px solid black;
                                padding: 0.2mm;
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                                overflow: hidden;
                            }
                            .barcode-row svg {
                                width: 100% !important;
                                height: 100% !important;
                                max-height: 10mm;
                            }
                            .field-label {
                                font-size: 3px;
                                text-transform: uppercase;
                                margin-bottom: 0px;
                                line-height: 1;
                            }
                            .field-value {
                                font-size: 5px;
                                font-weight: bold;
                                white-space: nowrap;
                                overflow: hidden;
                                line-height: 1.1;
                            }
                            
                            /* Codes Split Row */
                            .codes-row {
                                flex: 1;
                                display: flex;
                            }
                            .code-box {
                                flex: 1;
                                padding: 0.5mm;
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                            }
                            .code-box:first-child {
                                border-right: 0.5px solid black;
                            }

                            /* Bottom Section */
                            .bottom-section {
                                flex: 1;
                                display: flex;
                                flex-direction: column;
                            }
                            
                            /* Supplier | SKU Row */
                            .meta-row {
                                display: flex;
                                height: 3mm; /* Fixed height for this row */
                                border-bottom: 0.5px solid black;
                                align-items: center;
                            }
                            .supplier-box {
                                flex: 1;
                                border-right: 0.5px solid black;
                                padding: 0 1mm;
                                font-size: 3.5px;
                                font-weight: bold;
                                overflow: hidden;
                                white-space: nowrap;
                                line-height: 3mm;
                            }
                            .sku-box {
                                flex: 1;
                                padding: 0 1mm;
                                font-size: 3.5px;
                                display: flex;
                                align-items: center;
                                overflow: hidden;
                                white-space: nowrap;
                            }

                            /* Price Row */
                            .price-row {
                                flex: 1;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: 800;
                                font-size: 7px;
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
                                    <div class="barcode-row">
                                        <div class="field-label">Barcode</div>
                                        <div class="field-value">${viewCodeProduct.barcode || '-'}</div>
                                    </div>
                                    <div class="codes-row">
                                        <div class="code-box">
                                            <div class="field-label">Code</div>
                                            <div class="field-value">${viewCodeProduct.code || '-'}</div>
                                        </div>
                                        <div class="code-box">
                                            <div class="field-label">2Code</div>
                                            <div class="field-value">${viewCodeProduct.code_2 || '-'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="bottom-section">
                                <div class="meta-row">
                                    <div class="supplier-box">${viewCodeProduct.supplier?.name || 'NO SUPPLIER'}</div>
                                    <div class="sku-box">
                                        <span style="font-size: 2.5px; margin-right: 1px; color:#555;">SKU</span> 
                                        <b>${viewCodeProduct.sku || '-'}</b>
                                    </div>
                                </div>
                                <div class="price-row">
                                    PHP ${viewCodeProduct.price ? Number(viewCodeProduct.price).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                                </div>
                            </div>
                        </div>
                        <script>
                            window.onload = function() {
                                window.print();
                                window.onafterprint = function() {
                                    window.close();
                                }
                            }
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
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
                            {!isEmployee && (
                                <Link href="/products/create">
                                    <Button size="sm" className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black">
                                        <Plus className="mr-2 h-4 w-4" /> Add Product
                                    </Button>
                                </Link>
                            )}
                        </div>

                        {/* Mobile Main Controls */}
                        <div className="flex items-center gap-2 md:hidden">
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
