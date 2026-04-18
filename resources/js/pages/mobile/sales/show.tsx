import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { ArrowLeft, Clock, CheckCircle, XCircle, Package, User, Hash, FileText } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Sale {
    id: number;
    status: string;
    branch?: string;
    readied_by?: string;
    approved_by?: string;
    notes?: string;
    created_at: string;
    items?: {
        id: number;
        product_name: string;
        product_code: string;
        quantity: number;
        price: number;
        subtotal: number;
    }[];
    total?: number;
}

export default function MobileSaleShow({ saleId }: { saleId: string }) {
    const { remoteApi, serverUrl } = useMobileApi();
    const [sale, setSale] = useState<Sale | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (serverUrl) fetchSale();
    }, [serverUrl, saleId]);

    const fetchSale = async () => {
        setLoading(true);
        try {
            const res = await remoteApi.get(`${serverUrl}/api/mobile/sales/${saleId}`);
            setSale(res.data);
        } catch (err) {
            console.error('Fetch sale failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { icon: <Clock className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Pending Approval' };
            case 'completed': return { icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-100', label: 'Completed' };
            case 'cancelled': return { icon: <XCircle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-100', label: 'Cancelled' };
            default: return { icon: <Hash className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-100', label: status };
        }
    };

    if (loading) return (
        <MobileLayout title={`Sale #${saleId}`}>
            <div className="flex justify-center py-20"><Clock className="animate-spin h-8 w-8 text-muted-foreground" /></div>
        </MobileLayout>
    );

    if (!sale) return (
        <MobileLayout title="Not Found">
            <div className="text-center py-20">Sale not found.</div>
        </MobileLayout>
    );

    const status = getStatusInfo(sale.status);

    return (
        <MobileLayout title={`Sale #${sale.id}`}>
            <div className="space-y-6 pb-10">
                {/* ── Header Card ────────────────────────────────────────── */}
                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${status.bg} ${status.color}`}>
                            {status.icon}
                            {status.label}
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <InfoItem label="Branch" value={sale.branch || 'N/A'} icon={<Package className="w-3 h-3" />} />
                        <InfoItem label="Created By" value={sale.readied_by || 'N/A'} icon={<User className="w-3 h-3" />} />
                    </div>

                    {sale.notes && (
                        <div className="bg-muted px-4 py-3 rounded-xl">
                            <p className="text-[10px] font-bold uppercase opacity-40 mb-1">Internal Notes</p>
                            <p className="text-xs leading-relaxed italic">"{sale.notes}"</p>
                        </div>
                    )}
                </div>

                {/* ── Items List ─────────────────────────────────────────── */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 mb-3">Order Items</h3>
                    <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/50">
                        {sale.items?.map((item) => (
                            <div key={item.id} className="p-4 flex justify-between items-start gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm truncate">{item.product_name}</p>
                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.product_code}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Qty: <span className="font-bold text-foreground">{item.quantity}</span> × ${item.price}
                                    </p>
                                </div>
                                <p className="font-black text-sm">${item.subtotal.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Summary ────────────────────────────────────────────── */}
                <div className="bg-primary text-primary-foreground rounded-2xl p-5 flex justify-between items-center shadow-lg shadow-primary/20">
                    <span className="font-bold text-lg opacity-80 uppercase tracking-widest text-sm">Total Amount</span>
                    <span className="text-3xl font-black">${sale.total?.toFixed(2)}</span>
                </div>
            </div>
        </MobileLayout>
    );
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase opacity-40 flex items-center gap-1">{icon} {label}</p>
            <p className="text-sm font-semibold truncate">{value}</p>
        </div>
    );
}
