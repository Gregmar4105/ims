import AppLayout from '@/layouts/app-layout';
import { Head, router, Link } from '@inertiajs/react';
import { Search, PackageOpen, Layers, X, ShoppingCart, Trash2, Plus, Minus, Send, Tag, HelpCircle, Package, ArrowLeft, Loader2, Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Pagination from '@/components/Pagination';
import { SearchableSelect } from '@/components/SearchableSelect';
import { toast } from 'sonner';

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
    brand?: { name: string };
    category?: { name: string };
    supplier?: { name: string };
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

            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                
                {/* Header Banner */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-900/60 dark:to-indigo-900/60 p-6 rounded-2xl text-white shadow-lg border border-violet-500/10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-6 h-6 animate-pulse text-violet-200" />
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Request Orders</h1>
                        </div>
                        <p className="text-violet-100 text-sm max-w-2xl">
                            Request items from <span className="font-bold underline decoration-violet-300">LM2 Main Bodega</span> for your branch. Review Bodega stock, choose quantities, and submit for instant approval.
                        </p>
                    </div>
                    {requestingBranch && (
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-sm shrink-0">
                            <span className="opacity-80 block text-[10px] uppercase font-bold tracking-wider">Requesting Branch</span>
                            <span className="font-semibold text-violet-200">{requestingBranch.branch_name}</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* Left Column: Product List & Filters (Span 2) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Filters Container */}
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-3 items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    type="text"
                                    placeholder="Search products by name, code, SKU..."
                                    value={search}
                                    onChange={handleSearchChange}
                                    className="pl-10 h-11 bg-zinc-50/50 dark:bg-zinc-950/50 focus-visible:ring-violet-500/35"
                                />
                                {search && (
                                    <button 
                                        onClick={() => { setSearch(''); updateParams({ search: '' }); }}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2 w-full md:w-auto overflow-x-auto shrink-0">
                                <SearchableSelect
                                    options={options.brands}
                                    value={brand}
                                    onValueChange={(val) => { setBrand(val); updateParams({ brand: val }); }}
                                    placeholder="Brand"
                                    allLabel="All Brands"
                                    className="h-11 min-w-[130px]"
                                />

                                <SearchableSelect
                                    options={options.categories}
                                    value={category}
                                    onValueChange={(val) => { setCategory(val); updateParams({ category: val }); }}
                                    placeholder="Category"
                                    allLabel="All Categories"
                                    className="h-11 min-w-[130px]"
                                />

                                {hasActiveFilters && (
                                    <Button 
                                        variant="outline" 
                                        onClick={clearFilters}
                                        className="h-11 px-3.5 border-dashed shrink-0"
                                    >
                                        <X className="w-4 h-4 mr-1.5" />
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Product Grid */}
                        {productList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-2xl bg-muted/20">
                                <PackageOpen className="w-16 h-16 text-muted-foreground opacity-40 mb-4" />
                                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">No products found</h3>
                                <p className="text-muted-foreground text-sm text-center max-w-sm mt-1">
                                    No products are currently matching your filters in LM2 Main Bodega. Try adjusting your search query.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {productList.map((product) => {
                                        const isOutOfStock = product.quantity <= 0;
                                        const inCart = cart.find(item => item.product.id === product.id);

                                        return (
                                            <Card 
                                                key={product.id} 
                                                className={`overflow-hidden border shadow-sm transition-all duration-300 hover:shadow-md hover:border-violet-300 flex flex-col justify-between ${
                                                    isOutOfStock ? 'opacity-65 bg-zinc-50/50 dark:bg-zinc-950/20' : ''
                                                } ${inCart ? 'ring-2 ring-violet-500/25 border-violet-400 bg-violet-50/5 dark:bg-violet-950/5' : ''}`}
                                            >
                                                <CardHeader className="p-4 pb-2 border-b bg-muted/15 flex-row gap-3 items-start justify-between space-y-0">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 truncate" title={product.name}>
                                                            {product.name}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                                                            <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">
                                                                SKU: {product.sku || 'N/A'}
                                                            </span>
                                                            {product.brand && (
                                                                <span className="truncate">
                                                                    • {product.brand.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {product.image_path ? (
                                                        <img 
                                                            src={`/storage/${product.image_path}`} 
                                                            alt={product.name} 
                                                            className="w-12 h-12 object-cover rounded-lg border shadow-inner shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-500 shrink-0 border border-violet-200/30">
                                                            <Package className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </CardHeader>
                                                
                                                <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                                                    
                                                    {/* Stock details */}
                                                    <div className="flex justify-between items-center text-xs pt-1.5">
                                                        <span className="text-muted-foreground flex items-center gap-1">
                                                            <Package className="w-3.5 h-3.5" /> Bodega Stock:
                                                        </span>
                                                        {isOutOfStock ? (
                                                            <Badge variant="destructive" className="px-2 py-0">Out of Stock</Badge>
                                                        ) : (
                                                            <span className="font-bold text-gray-800 dark:text-gray-200">
                                                                {product.quantity} items available
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Price / Location */}
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-muted-foreground">Unit Price:</span>
                                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                            ₱{product.price ? Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Action button */}
                                                    <div className="pt-2 border-t border-dashed mt-auto">
                                                        <Button
                                                            onClick={() => addToRequest(product)}
                                                            disabled={isOutOfStock}
                                                            className={`w-full gap-2 transition-all h-9 ${
                                                                inCart 
                                                                    ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-200' 
                                                                    : 'bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700'
                                                            }`}
                                                        >
                                                            <ShoppingCart className="w-4 h-4" />
                                                            {inCart ? `Request Added (${inCart.quantity})` : 'Request This Item'}
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                <div className="mt-6 flex justify-center">
                                    <Pagination links={products.links} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Sticky Cart Panel (Span 1) */}
                    <div className="lg:col-span-1 sticky top-6">
                        <Card className="border shadow-lg overflow-hidden bg-white dark:bg-zinc-900 border-violet-500/10">
                            <CardHeader className="bg-violet-500/5 dark:bg-violet-950/15 border-b p-4 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5 text-violet-500" />
                                    <CardTitle className="text-lg font-bold">Request List</CardTitle>
                                </div>
                                <Badge className="bg-violet-600 text-white">{cart.length} unique items</Badge>
                            </CardHeader>
                            
                            <CardContent className="p-4 space-y-4">
                                
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <ShoppingCart className="w-12 h-12 text-zinc-300 dark:text-zinc-700 stroke-[1.2] mb-3" />
                                        <p className="text-sm font-medium text-zinc-500">Your request list is empty.</p>
                                        <p className="text-xs text-zinc-400 mt-1 max-w-[200px]">
                                            Click "Request This Item" on the catalog to select products.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Cart Items List */}
                                        <div className="max-h-[320px] overflow-y-auto divide-y border rounded-lg bg-zinc-50/50 dark:bg-zinc-950/30">
                                            {cart.map(item => (
                                                <div key={item.product.id} className="p-3 hover:bg-zinc-100/50 dark:hover:bg-zinc-950/50 transition-colors flex items-center justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate" title={item.product.name}>
                                                            {item.product.name}
                                                        </h4>
                                                        <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">
                                                            Max: {item.product.quantity} available
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {/* Quantity selectors */}
                                                        <div className="flex items-center gap-1 border rounded-full bg-white dark:bg-zinc-900 p-0.5">
                                                            <Button 
                                                                size="icon" 
                                                                variant="ghost" 
                                                                className="h-6 w-6 rounded-full"
                                                                onClick={() => updateQuantity(item.product.id, -1)}
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </Button>
                                                            <span className="w-6 text-center text-xs font-bold font-mono">
                                                                {item.quantity}
                                                            </span>
                                                            <Button 
                                                                size="icon" 
                                                                variant="ghost" 
                                                                className="h-6 w-6 rounded-full"
                                                                onClick={() => updateQuantity(item.product.id, 1)}
                                                                disabled={item.quantity >= item.product.quantity}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                        
                                                        {/* Delete button */}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                            onClick={() => removeFromCart(item.product.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Notes input */}
                                        <div className="space-y-1.5 pt-2">
                                            <Label htmlFor="request-notes" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                Request Notes (Optional)
                                            </Label>
                                            <Textarea
                                                id="request-notes"
                                                placeholder="Provide reason for request, preferred delivery details, variations needed, etc."
                                                value={notes}
                                                onChange={e => setNotes(e.target.value)}
                                                className="resize-none text-xs min-h-[70px] focus-visible:ring-violet-500"
                                            />
                                        </div>

                                        {/* Confirmation button */}
                                        <div className="pt-2 border-t mt-4 space-y-2">
                                            <Button
                                                onClick={handleConfirmRequest}
                                                disabled={isSubmitting}
                                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold gap-2 shadow-lg h-11 text-sm shadow-violet-200 dark:shadow-none"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                                {isSubmitting ? 'Submitting Request...' : 'Confirm Request'}
                                            </Button>
                                            <p className="text-[10px] text-muted-foreground text-center">
                                                By submitting, a notification will be pushed to the LM2 Main Bodega branch administrator.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                </div>

            </div>
        </AppLayout>
    );
}
