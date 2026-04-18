import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Plus, Minus, ArrowRightLeft, Trash2, Search, Package, MapPin, Loader2 } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Product {
    id: number;
    name: string;
    available_quantity?: number;
    quantity?: number;
}

interface CartItem extends Product {
    requested_quantity: number;
}

interface Branch {
    id: number;
    branch_name: string;
    location: string;
}

export default function MobileTransferCreate() {
    const { remoteApi, serverUrl, authUser } = useMobileApi();
    const [products, setProducts] = useState<Product[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [destinationBranchId, setDestinationBranchId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (serverUrl) {
            fetchProducts();
            fetchBranches();
        }
    }, [serverUrl]);

    const fetchProducts = async (query = '') => {
        setLoading(true);
        try {
            const url = query 
                ? `${serverUrl}/api/mobile/products/search/${query}`
                : `${serverUrl}/api/mobile/products`;
            const res = await remoteApi.get(url);
            setProducts(res.data.data || res.data);
        } catch (err) {
            console.error('Fetch products failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await remoteApi.get(`${serverUrl}/api/mobile/branches`);
            // Filter out current branch
            const filtered = (res.data.data || res.data).filter((b: Branch) => b.id !== authUser?.branch_id);
            setBranches(filtered);
        } catch (err) {
            console.error('Fetch branches failed:', err);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchProducts(search);
    };

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => 
                    item.id === product.id 
                        ? { ...item, requested_quantity: item.requested_quantity + 1 } 
                        : item
                );
            }
            return [...prev, { ...product, requested_quantity: 1 }];
        });
    };

    const updateQuantity = (id: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.requested_quantity + delta);
                return { ...item, requested_quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const handleSubmit = async () => {
        if (!destinationBranchId) return alert('Please select a destination branch.');
        if (cart.length === 0 || submitting) return;

        setSubmitting(true);
        try {
            await remoteApi.post(`${serverUrl}/api/mobile/transfers`, {
                destination_branch_id: destinationBranchId,
                items: cart.map(item => ({
                    product_id: item.id,
                    quantity: item.requested_quantity
                }))
            });
            alert('Transfer initiated successfully!');
            router.visit('/mobile/transfers');
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to create transfer');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MobileLayout title="New Transfer">
            <div className="flex flex-col h-full gap-6">
                {/* ── Destination Branch ───────────────────────────────── */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">To Branch</label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                        <select 
                            className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                            value={destinationBranchId}
                            onChange={(e) => setDestinationBranchId(e.target.value)}
                        >
                            <option value="">Select Target Branch...</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.branch_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Product Search ───────────────────────────────────── */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">Add Items</label>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input 
                                type="text"
                                placeholder="Find products to transfer..."
                                className="w-full bg-card border border-border rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </form>
                </div>

                {/* ── Product List ─────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto min-h-[150px]">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {products.length === 0 ? (
                                <p className="text-center text-muted-foreground py-10 text-xs">No products in inventory.</p>
                            ) : (
                                products.map(p => (
                                    <div key={p.id} className="flex items-center gap-3 bg-card border border-border px-4 py-2.5 rounded-2xl hover:bg-muted/30 transition-colors">
                                        <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                                            <Package className="h-5 w-5 text-orange-600 dark:text-orange-400 opacity-60" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-[13px] truncate">{p.name}</p>
                                            <p className="text-[10px] text-muted-foreground">Stock: {p.quantity ?? p.available_quantity ?? 0}</p>
                                        </div>
                                        <button 
                                            onClick={() => addToCart(p)}
                                            className="h-7 w-7 rounded-full bg-orange-500 text-white flex items-center justify-center active:scale-90 transition-transform"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* ── Transfer Sheet ─────────────────────────────────────── */}
                {cart.length > 0 && (
                    <div className="bg-card border-t border-border -mx-4 px-4 py-4 pt-6 rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <ArrowRightLeft className="h-5 w-5 text-orange-500" />
                                <h3 className="font-bold text-sm uppercase tracking-wider">Transfer List ({cart.length})</h3>
                            </div>
                        </div>

                        <div className="max-h-[25vh] overflow-y-auto space-y-3 mb-6">
                            {cart.map(item => (
                                <div key={item.id} className="flex items-center gap-3 bg-muted/40 p-3 rounded-2xl">
                                    <div className="flex-1 min-w-0 px-1">
                                        <p className="text-[13px] font-medium truncate">{item.name}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-background border border-border rounded-full px-2 py-0.5">
                                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-orange-500 transition-colors"><Minus className="h-3 w-3" /></button>
                                            <span className="w-8 text-center text-xs font-black">{item.requested_quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-orange-500 transition-colors"><Plus className="h-3 w-3" /></button>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="text-destructive/50 hover:text-destructive p-1 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={handleSubmit}
                            disabled={submitting || !destinationBranchId}
                            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-30 shadow-xl shadow-orange-500/20 uppercase tracking-widest text-xs"
                        >
                            {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                <>
                                    <ArrowRightLeft className="w-4 h-4" />
                                    Initiate Transfer
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
