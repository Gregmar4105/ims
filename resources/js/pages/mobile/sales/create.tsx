import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Plus, Minus, ShoppingCart, Trash2, Search, Package, Loader2 } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Product {
    id: number;
    name: string;
    price: number;
    image_url?: string;
    available_quantity?: number;
}

interface CartItem extends Product {
    quantity: number;
}

export default function MobileSaleCreate() {
    const { remoteApi, serverUrl } = useMobileApi();
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (serverUrl) fetchProducts();
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
                        ? { ...item, quantity: item.quantity + 1 } 
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleSubmit = async () => {
        if (cart.length === 0 || submitting) return;

        setSubmitting(true);
        try {
            await remoteApi.post(`${serverUrl}/api/mobile/sales`, {
                items: cart.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    price: item.price
                }))
            });
            alert('Sale created successfully!');
            router.visit('/mobile/sales');
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to create sale');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MobileLayout title="Create Sale">
            <div className="flex flex-col h-full gap-6">
                {/* ── Product Search ───────────────────────────────────── */}
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input 
                            type="text"
                            placeholder="Find products..."
                            className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </form>

                {/* ── Product List ─────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto min-h-[200px]">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {products.length === 0 ? (
                                <p className="text-center text-muted-foreground py-10">No products found.</p>
                            ) : (
                                products.map(p => (
                                    <div key={p.id} className="flex items-center gap-3 bg-card border border-border p-3 rounded-xl hover:bg-muted/30 transition-colors">
                                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <Package className="h-6 w-6 text-primary opacity-40" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate">{p.name}</p>
                                            <p className="text-xs text-primary font-bold mt-0.5">${p.price}</p>
                                        </div>
                                        <button 
                                            onClick={() => addToCart(p)}
                                            className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* ── Cart Section ───────────────────────────────────────── */}
                {cart.length > 0 && (
                    <div className="bg-card border-t border-border -mx-4 px-4 py-4 pt-6 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-2 mb-4">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                            <h3 className="font-bold text-sm uppercase tracking-wider">Your Cart ({cart.length})</h3>
                        </div>

                        <div className="max-h-[30vh] overflow-y-auto space-y-4 mb-6">
                            {cart.map(item => (
                                <div key={item.id} className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">${item.price} each</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-muted rounded-full px-2 py-1">
                                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-primary"><Minus className="h-3 w-3" /></button>
                                            <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-primary"><Plus className="h-3 w-3" /></button>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between mb-4 border-t border-border pt-4">
                            <span className="text-lg font-bold">Total</span>
                            <span className="text-2xl font-black text-primary">${cartTotal.toFixed(2)}</span>
                        </div>

                        <button 
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Complete Sale'}
                        </button>
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
