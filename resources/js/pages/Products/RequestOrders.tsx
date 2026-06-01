import AppLayout from '@/layouts/app-layout';
import { Head, router, Link } from '@inertiajs/react';
import { Search, PackageOpen, X, ShoppingCart, Trash2, Plus, Minus, Send, Tag, Bike, Clock, HelpCircle, Package, ArrowLeft, Loader2, Info, CheckCircle } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Pagination from '@/components/Pagination';
import { SearchableSelect } from '@/components/SearchableSelect';
import { toast } from 'sonner';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";

interface Product {
    id: number;
    name: string;
    brand_id: number;
    category_id: number;
    quantity: number; // LM2 Main Bodega quantity
    physical_location: string | null;
    image_path: string | null;
    barcode: string | null;
    qr_code: string | null;
    price: number | null;
    code: string | null;
    code_2: string | null;
    sku: string | null;
    brand?: { name: string } | null;
    category?: { name: string } | null;
    supplier?: { name: string } | null;
}

interface Props {
    products: {
        data: Product[];
        links: any[];
        next_page_url: string | null;
        prev_page_url: string | null;
    };
    filters: {
        search?: string;
        brand?: string;
        category?: string;
    };
    options: {
        brands: string[];
        categories: string[];
    };
    requestingBranch: {
        id: number;
        branch_name: string;
    } | null;
    isSystemAdmin: boolean;
}

export default function RequestOrders({ products, filters, options, requestingBranch, isSystemAdmin }: Props) {
    const productList = products?.data || [];
    
    // Filters State
    const [search, setSearch] = useState<string>(filters?.search || "");
    const [brand, setBrand] = useState<string>(filters?.brand || "all");
    const [category, setCategory] = useState<string>(filters?.category || "all");
    const debounceTimer = useRef<number | null>(null);

    // Selected Items (Cart) State
    const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Synchronize filters when query parameters change
    useEffect(() => {
        setSearch(filters?.search || "");
        setBrand(filters?.brand || "all");
        setCategory(filters?.category || "all");
    }, [filters]);

    function updateParams(newParams: any) {
        const currentUrl = new URL(window.location.href);
        const params = new URLSearchParams(currentUrl.search);

        if (!newParams.page) {
            params.delete('page');
        }

        Object.keys(newParams).forEach(key => {
            if (newParams[key] && newParams[key] !== 'all') {
                params.set(key, newParams[key]);
            } else {
                params.delete(key);
            }
        });

        router.get(
            "/request-orders",
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
        setBrand("all");
        setCategory("all");
        router.get("/request-orders");
    };

    // Cart Management
    const addToRequest = (product: Product) => {
        if (product.quantity <= 0) {
            toast.error(`"${product.name}" is currently out of stock in LM2 Main Bodega.`);
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.quantity) {
                    toast.warning(`Cannot request more than the available stock (${product.quantity}) in LM2 Main Bodega.`);
                    return prev;
                }
                toast.success(`Incremented quantity for "${product.name}".`);
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            toast.success(`Added "${product.name}" to request list.`);
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: number, amount: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.product.id === productId) {
                    const newQty = item.quantity + amount;
                    if (newQty <= 0) return null;
                    if (newQty > item.product.quantity) {
                        toast.warning(`Cannot exceed available stock of ${item.product.quantity}.`);
                        return item;
                    }
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(Boolean) as Array<{ product: Product; quantity: number }>;
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
        toast.info("Removed item from request list.");
    };

    const handleConfirmRequest = () => {
        if (cart.length === 0) {
            toast.error("Please add at least one item to request.");
            return;
        }

        setIsSubmitting(true);
        router.post("/request-orders", {
            items: cart.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity
            })),
            notes: notes
        }, {
            onSuccess: () => {
                setCart([]);
                setNotes('');
                setIsSubmitting(false);
                setIsSheetOpen(false);
                toast.success("Request Order submitted successfully!");
            },
            onError: (err) => {
                setIsSubmitting(false);
                const firstErr = Object.values(err)[0];
                toast.error(firstErr || "Failed to submit Request Order.");
            }
        });
    };

    const hasActiveFilters = search || brand !== 'all' || category !== 'all';

    return (
        <AppLayout breadcrumbs={[{ title: 'Request Orders', href: '/request-orders' }]}>
            <Head title="Request Orders" />

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 w-full max-w-none">
                    
                    {/* Header Banner - Matches System style */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 border p-6 rounded-xl shadow-sm">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2 flex-wrap">
                                Request Orders Catalog
                                {requestingBranch && (
                                    <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-violet-900/30 dark:text-violet-300">
                                        For: {requestingBranch.branch_name}
                                    </span>
                                )}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Select products from <span className="font-semibold text-foreground text-zinc-800 dark:text-zinc-200">LM2 Main Bodega</span> and compile your request order.
                            </p>
                        </div>

                        <Button 
                            onClick={() => setIsSheetOpen(true)} 
                            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-700 dark:hover:bg-violet-600 shadow-sm transition-all"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            View Basket
                            {cart.length > 0 && (
                                <span className="ml-1 bg-violet-850 dark:bg-violet-900/60 text-white rounded-full px-2 py-0.5 text-xs font-bold font-mono">
                                    {cart.length}
                                </span>
                            )}
                        </Button>
                    </div>

                    <div className="w-full space-y-6">
                        
                        {/* Filters Container - Matching /reorders page search & filters */}
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border shadow-sm flex flex-col">
                            <div className="p-4 border-b flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
                                <div className="relative w-full md:max-w-xs">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search Bodega products..."
                                        value={search}
                                        onChange={handleSearchChange}
                                        className="pl-9"
                                    />
                                    {search && (
                                        <button 
                                            onClick={() => { setSearch(''); updateParams({ search: '' }); }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center w-full md:w-auto">
                                    <SearchableSelect
                                        options={options.brands}
                                        value={brand}
                                        onValueChange={(val) => { setBrand(val); updateParams({ brand: val }); }}
                                        placeholder="Brand"
                                        allLabel="All Brands"
                                    />

                                    <SearchableSelect
                                        options={options.categories}
                                        value={category}
                                        onValueChange={(val) => { setCategory(val); updateParams({ category: val }); }}
                                        placeholder="Category"
                                        allLabel="All Categories"
                                    />

                                    {hasActiveFilters && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearFilters}
                                            className="h-9 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 col-span-2 md:col-span-1"
                                        >
                                            <X className="h-4 w-4 mr-1 inline" /> Clear
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Table List View - Full Width matching /reorders exactly */}
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/50 dark:bg-zinc-900/50">
                                            <TableHead className="w-[80px]">Image</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Category/Brand</TableHead>
                                            <TableHead className="text-right">Bodega Stock</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right pr-6">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {productList.length > 0 ? (
                                            productList.map((product) => {
                                                const isOutOfStock = product.quantity <= 0;
                                                const inCart = cart.find(item => item.product.id === product.id);

                                                return (
                                                    <TableRow 
                                                        key={product.id} 
                                                        className={`hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors ${
                                                            inCart ? 'bg-violet-500/[0.04] dark:bg-violet-500/[0.02]' : ''
                                                        }`}
                                                    >
                                                        <TableCell>
                                                            {product.image_path ? (
                                                                <div className="h-12 w-12 rounded-lg border bg-white overflow-hidden flex items-center justify-center p-1">
                                                                    <img
                                                                        src={`/storage/${product.image_path}`}
                                                                        alt={product.name}
                                                                        className="h-full w-full object-contain"
                                                                        loading="lazy"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="h-12 w-12 rounded-lg border bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                                                    <Bike className="h-6 w-6" />
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-semibold text-gray-900 dark:text-white">{product.name}</div>
                                                            <div className="text-xs text-muted-foreground mt-1 space-x-2">
                                                                {product.code && <span>Code: {product.code}</span>}
                                                                {product.sku && <span>SKU: {product.sku}</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">{product.category?.name || 'Uncategorized'}</div>
                                                            <div className="text-xs text-muted-foreground mt-1">{product.brand?.name || 'No Brand'}</div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {isOutOfStock ? (
                                                                <Badge variant="destructive" className="px-2 py-0.5 text-[11px] font-semibold">
                                                                    Out of Stock
                                                                </Badge>
                                                            ) : (
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                                                                    product.quantity <= 5 
                                                                        ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10 dark:bg-amber-400/10 dark:text-amber-400'
                                                                        : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-400/10 dark:text-emerald-400'
                                                                }`}>
                                                                    {product.quantity} units
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400 font-mono">
                                                            ₱{product.price ? Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                                        </TableCell>
                                                        <TableCell className="text-right pr-6">
                                                            {inCart ? (
                                                                <div className="flex items-center justify-end gap-1.5 inline-flex">
                                                                    <div className="flex items-center gap-1 border rounded-full bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 p-0.5">
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="ghost" 
                                                                            className="h-7 w-7 rounded-full text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40"
                                                                            onClick={() => updateQuantity(product.id, -1)}
                                                                        >
                                                                            <Minus className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                        <span className="w-6 text-center text-xs font-bold font-mono text-violet-900 dark:text-violet-100">
                                                                            {inCart.quantity}
                                                                        </span>
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="ghost" 
                                                                            className="h-7 w-7 rounded-full text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40"
                                                                            onClick={() => updateQuantity(product.id, 1)}
                                                                            disabled={inCart.quantity >= product.quantity}
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                                                                        onClick={() => removeFromCart(product.id)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => addToRequest(product)}
                                                                    disabled={isOutOfStock}
                                                                    className="gap-1.5 h-8 text-xs bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700"
                                                                >
                                                                    <ShoppingCart className="w-3.5 h-3.5" />
                                                                    Request Item
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                    {search ? 'No matching products found.' : 'No products loaded from LM2 Main Bodega.'}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Pagination */}
                        {productList.length > 0 && (
                            <div className="flex justify-center mt-4">
                                <Pagination links={products.links} />
                            </div>
                        )}
                    </div>

                </div>

                <SheetContent side="right" className="flex flex-col h-full p-0 gap-0 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 w-full sm:max-w-md">
                    <SheetHeader className="bg-violet-500/5 dark:bg-violet-950/15 border-b p-5 flex flex-col gap-1.5 shrink-0 text-left">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-violet-500" />
                                <SheetTitle className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Request Basket</SheetTitle>
                            </div>
                            <Badge className="bg-violet-600 hover:bg-violet-700 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">
                                {cart.length} items
                            </Badge>
                        </div>
                        <SheetDescription className="text-xs text-muted-foreground">
                            Specify quantities and optional notes below to confirm your request from LM2 Main Bodega.
                        </SheetDescription>
                    </SheetHeader>

                    {/* Basket Contents */}
                    <div className="flex-1 overflow-y-auto p-5">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <ShoppingCart className="w-12 h-12 text-zinc-300 dark:text-zinc-700 stroke-[1.2] mb-4 animate-pulse" />
                                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Your basket is empty</h3>
                                <p className="text-xs text-zinc-400 mt-2 max-w-[200px]">
                                    Click "Request Item" on any product in the catalog to build your list.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="divide-y border rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20 overflow-hidden border-zinc-200 dark:border-zinc-800">
                                    {cart.map(item => (
                                        <div key={item.product.id} className="p-3.5 hover:bg-zinc-100/30 dark:hover:bg-zinc-950/30 transition-colors flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate" title={item.product.name}>
                                                    {item.product.name}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {item.product.sku && (
                                                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                                                            {item.product.sku}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Max: {item.product.quantity} units
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Quantity selector */}
                                                <div className="flex items-center gap-1 border rounded-full bg-white dark:bg-zinc-900 p-0.5 shadow-sm border-zinc-200 dark:border-zinc-800 font-mono">
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-6 w-6 rounded-full text-zinc-650 dark:text-zinc-450"
                                                        onClick={() => updateQuantity(item.product.id, -1)}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <span className="w-5 text-center text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                        {item.quantity}
                                                    </span>
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-6 w-6 rounded-full text-zinc-650 dark:text-zinc-450"
                                                        onClick={() => updateQuantity(item.product.id, 1)}
                                                        disabled={item.quantity >= item.product.quantity}
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                
                                                {/* Remove button */}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                    onClick={() => removeFromCart(item.product.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Drawer Footer - Sticky */}
                    {cart.length > 0 && (
                        <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 shrink-0 space-y-4">
                            {/* Notes input */}
                            <div className="space-y-1.5">
                                <Label htmlFor="drawer-request-notes" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                    Request Notes
                                </Label>
                                <Textarea
                                    id="drawer-request-notes"
                                    placeholder="Provide reasons, specifications, variations needed, etc."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="resize-none text-xs min-h-[80px] border-zinc-200 dark:border-zinc-800 focus-visible:ring-violet-500 focus-visible:ring-offset-0 bg-white dark:bg-zinc-900"
                                />
                            </div>

                            {/* Action Button */}
                            <div className="space-y-2">
                                <Button
                                    onClick={handleConfirmRequest}
                                    disabled={isSubmitting}
                                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold gap-2 shadow-lg h-11 text-sm shadow-violet-200 dark:shadow-none border-0"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    {isSubmitting ? 'Submitting Request...' : 'Confirm Request'}
                                </Button>
                                <p className="text-[10px] text-muted-foreground text-center">
                                    Order will appear on the LM2 Main Bodega Outgoing page immediately.
                                </p>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Floating Action Button (FAB) Checkout */}
            {cart.length > 0 && (
                <div className="fixed bottom-6 right-6 z-40 animate-fade-in print:hidden">
                    <Button
                        onClick={() => setIsSheetOpen(true)}
                        className="rounded-full shadow-xl shadow-violet-500/20 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 px-6 py-6 h-auto font-bold flex items-center gap-2.5 group transition-all duration-300 hover:scale-105"
                    >
                        <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>Confirm Request ({cart.length})</span>
                    </Button>
                </div>
            )}
        </AppLayout>
    );
}
