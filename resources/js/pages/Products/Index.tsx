import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Search, PackageOpen, Plus, MapPin, Layers, X, Printer, Sparkles, Trash2 } from 'lucide-react';
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
    branch_id: number;
    quantity: number;
    physical_location: string | null;
    description: string | null;
    variations: { name: string; options: string }[] | null;
    image_path: string | null;
    barcode: string | null;
    qr_code: string | null;
    branch?: {
        branch_name: string;
    };
}

interface Props {
    products: any;
    filters: {
        search?: string;
        branch?: string;
        brand?: string;
        category?: string;
        stock?: string;
    };
    options: {
        branches: string[];
        brands: string[];
        categories: string[];
    };
    isSystemAdmin: boolean;
}

export default function Index({ products, filters, options, isSystemAdmin }: Props) {
    const productList = products?.data || [];
    const links = products?.links || [];

    const [search, setSearch] = useState<string>(filters?.search || "");
    const [branch, setBranch] = useState<string>(filters?.branch || "all");
    const [brand, setBrand] = useState<string>(filters?.brand || "all");
    const [category, setCategory] = useState<string>(filters?.category || "all");
    const [stock, setStock] = useState<string>(filters?.stock || "all");

    const debounceTimer = useRef<number | null>(null);

    useEffect(() => {
        setSearch(filters?.search || "");
        setBranch(filters?.branch || "all");
        setBrand(filters?.brand || "all");
        setCategory(filters?.category || "all");
        setStock(filters?.stock || "all");
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
        router.get("/products");
    };

    const hasActiveFilters = search || branch !== 'all' || brand !== 'all' || category !== 'all' || stock !== 'all';

    const [viewCodeProduct, setViewCodeProduct] = useState<Product | null>(null);

    function handlePrint() {
        if (!viewCodeProduct) return;

        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            const content = document.getElementById('printable-codes');
            if (content) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Print Codes - ${viewCodeProduct.name}</title>
                            <style>
                                body {
                                    font-family: sans-serif;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    justify-content: center;
                                    padding: 40px;
                                }
                                .container {
                                    text-align: center;
                                    width: 100%;
                                    max-width: 600px;
                                }
                                h2 { margin-bottom: 5px; font-size: 24px; }
                                p { margin-top: 0; color: #666; font-size: 16px; margin-bottom: 30px; }
                                .code-section {
                                    margin-bottom: 40px;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                }
                                .label {
                                    font-weight: bold;
                                    margin-bottom: 10px;
                                    font-size: 18px;
                                }
                                svg, canvas, img {
                                    max-width: 100%;
                                    height: auto;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h2>${viewCodeProduct.name}</h2>
                                <p>${viewCodeProduct.branch?.branch_name || ''}</p>
                                ${content.innerHTML}
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
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Products" />

            <div className="mx-4 mt-4 flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <PackageOpen className="size-14 mr-3" />
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Product List
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Manage your inventory and products.
                            </p>
                        </div>
                    </div>
                    <Link href="/products/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                    </Link>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 flex-wrap">
                        <div className="flex-1 relative min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <Input
                                type="text"
                                placeholder="Search products..."
                                value={search}
                                onChange={handleSearchChange}
                                className="pl-10"
                            />
                        </div>

                        {isSystemAdmin && (
                            <Select value={branch} onValueChange={(val) => { setBranch(val); updateParams({ branch: val }); }}>
                                <SelectTrigger className="w-[160px]">
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
                            <SelectTrigger className="w-[160px]">
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
                            <SelectTrigger className="w-[160px]">
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
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Stock Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stock</SelectItem>
                                <SelectItem value="in_stock">In Stock</SelectItem>
                                <SelectItem value="low_stock">Low Stock (≤5)</SelectItem>
                                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear Filters">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 h-[calc(100vh-280px)] overflow-y-auto">
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
                            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col text-sm">
                                <div className="aspect-square relative bg-white flex items-center justify-center overflow-hidden group p-2 border-b">
                                    {product.image_path ? (
                                        <img
                                            src={`/storage/${product.image_path}`}
                                            alt={product.name}
                                            className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <PackageOpen className="h-12 w-12 text-gray-300" />
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <Badge className={`backdrop-blur-sm text-[10px] px-1.5 py-0.5 ${product.quantity === 0 ? 'bg-red-500/90 hover:bg-red-600/90' : 'bg-black/70 hover:bg-black/80'}`}>
                                            Qty: {product.quantity}
                                        </Badge>
                                    </div>
                                    {/* Overlay Action Button */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                                        <Button variant="secondary" size="sm" onClick={() => setViewCodeProduct(product)}>
                                            View Codes
                                        </Button>
                                        <Link href={`/products/${product.id}/edit`}>
                                            <Button variant="secondary" size="sm">
                                                Edit Product
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                                <CardHeader className="p-3 pb-1">
                                    <CardTitle className="text-base font-bold line-clamp-1" title={product.name}>
                                        {product.name}
                                    </CardTitle>
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        <span className="truncate">{product.physical_location || 'No location'}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 pt-1 flex-grow space-y-2">
                                    {product.description && (
                                        <p className="text-xs text-gray-500 line-clamp-2" title={product.description}>
                                            {product.description}
                                        </p>
                                    )}

                                    {product.variations && product.variations.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {product.variations.slice(0, 2).map((v, i) => (
                                                <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                                    {v.name}: {v.options}
                                                </Badge>
                                            ))}
                                            {product.variations.length > 2 && (
                                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                                    +{product.variations.length - 2}
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="p-3 pt-0 border-t bg-gray-50/50 mt-auto">
                                    <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                                        <span className="flex items-center">
                                            <Layers className="h-3 w-3 mr-1" />
                                            {product.branch?.branch_name}
                                        </span>
                                    </div>
                                </CardFooter>
                            </Card>
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
