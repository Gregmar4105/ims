import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Plus, Package, ScanBarcode } from 'lucide-react';

export default function MobileProducts() {
    const { remoteApi, serverUrl } = useMobileApi();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (serverUrl) fetchProducts();
    }, [serverUrl]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await remoteApi.get(`${serverUrl}/api/mobile/products`);
            // Assuming pagination format: res.data.data
            setProducts(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearch(query);
        // Note: You can wire this up to hit /api/mobile/products/search/{query} later
    };

    return (
        <MobileLayout 
            title="Products" 
            onSearch={handleSearch}
            fab={{
                icon: <ScanBarcode className="w-6 h-6" />,
                label: "Scan"
            }}
        >
            <div className="pb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-2">
                    {search ? `Search results for "${search}"` : 'All Inventory'}
                </p>

                {loading ? (
                    <div className="space-y-4 px-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-12 h-12 bg-muted rounded-full shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {products.length === 0 ? (
                            <div className="py-10 text-center text-muted-foreground">
                                <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>No products found.</p>
                            </div>
                        ) : (
                            products.map((item) => (
                                <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-xl transition-colors active:bg-muted">
                                    <div className="relative shrink-0">
                                        {item.image_path || item.image_url ? (
                                            <img src={(item.image_url || item.image_path).startsWith('http') ? (item.image_url || item.image_path) : `${serverUrl}/${item.image_url || item.image_path}`} alt={item.name} className="w-12 h-12 rounded-full object-cover border border-border" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                                <Package className="w-5 h-5" />
                                            </div>
                                        )}
                                        {item.quantity <= (item.reorder_level || 0) && (
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-[15px] truncate pr-2">{item.name}</p>
                                            <p className="text-[13px] font-bold text-primary shrink-0">${item.price}</p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-[13px] text-muted-foreground truncate">{item.brand?.name ?? item.brand}</p>
                                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                                            <p className="text-[13px] text-muted-foreground truncate font-mono text-xs">{item.sku}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
