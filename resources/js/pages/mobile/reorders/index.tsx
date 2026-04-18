import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { RefreshCw, Package, AlertTriangle, MapPin, Loader2 } from 'lucide-react';

interface Reorder {
    id: number;
    name: string;
    code: string;
    quantity: number;
    reorder_level: number;
    brand?: string;
    category?: string;
    branch?: string;
}

export default function MobileReordersIndex() {
    const { remoteApi, serverUrl } = useMobileApi();
    const [reorders, setReorders] = useState<Reorder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (serverUrl) fetchReorders();
    }, [serverUrl]);

    const fetchReorders = async () => {
        setLoading(true);
        try {
            const res = await remoteApi.get(`${serverUrl}/api/mobile/reorders`);
            setReorders(res.data.data || []);
        } catch (err) {
            console.error('Fetch reorders failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileLayout title="Restock Alerts">
            <div className="space-y-6 pb-10">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Low Stock Items</h2>
                    <button onClick={fetchReorders} className="p-2 active:rotate-180 transition-transform duration-500">
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
                ) : (
                    <div className="space-y-4">
                        {reorders.length === 0 ? (
                            <div className="text-center py-20 bg-muted/20 rounded-[2rem] border border-dashed border-border">
                                <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="text-sm font-medium text-muted-foreground">Inventory is healthy!</p>
                            </div>
                        ) : (
                            reorders.map((item, i) => (
                                <div key={i} className="bg-card border border-border rounded-3xl p-5 shadow-sm relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <AlertTriangle className="w-12 h-12 text-red-500" />
                                    </div>

                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 border border-red-100 dark:border-red-900/30">
                                            <Package className="w-6 h-6 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-[15px] tracking-tight truncate leading-tight mb-0.5">{item.name}</p>
                                            <p className="text-[10px] font-mono text-muted-foreground opacity-60">{item.code}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 mb-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Current Stock</p>
                                            <p className="text-xl font-black text-red-600">{item.quantity}</p>
                                        </div>
                                        <div className="h-8 w-px bg-border" />
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Min level</p>
                                            <p className="text-xl font-black opacity-30">{item.reorder_level}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
                                        {item.branch && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-lg text-[10px] font-bold uppercase">
                                                <MapPin className="w-3 h-3 text-primary" />
                                                {item.branch}
                                            </div>
                                        )}
                                        {item.category && (
                                            <div className="px-2.5 py-1 bg-muted rounded-lg text-[10px] font-bold uppercase opacity-60">
                                                {item.category}
                                            </div>
                                        )}
                                        {item.brand && (
                                            <div className="px-2.5 py-1 bg-muted rounded-lg text-[10px] font-bold uppercase opacity-60">
                                                {item.brand}
                                            </div>
                                        )}
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
