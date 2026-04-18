import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Clock, CheckCircle, Package, User, Hash, ArrowRightLeft, MapPin, Loader2 } from 'lucide-react';

interface TransferItem {
    id: number;
    product_name: string;
    product_code: string;
    quantity: number;
}

interface Transfer {
    id: number;
    status: string;
    from_branch: string;
    to_branch: string;
    initiated_by: string;
    notes?: string;
    created_at: string;
    items?: TransferItem[];
}

export default function MobileTransferShow({ transferId }: { transferId: string }) {
    const { remoteApi, serverUrl, authUser } = useMobileApi();
    const [transfer, setTransfer] = useState<Transfer | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        if (serverUrl) fetchTransfer();
    }, [serverUrl, transferId]);

    const fetchTransfer = async () => {
        setLoading(true);
        try {
            const res = await remoteApi.get(`${serverUrl}/api/mobile/transfers/${transferId}`);
            setTransfer(res.data);
        } catch (err) {
            console.error('Fetch transfer failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (confirming) return;
        setConfirming(true);
        try {
            await remoteApi.post(`${serverUrl}/api/mobile/transfers/${transferId}/confirm`);
            alert('Transfer confirmed successfully!');
            fetchTransfer();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to confirm transfer');
        } finally {
            setConfirming(false);
        }
    };

    const getStatusInfo = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'received' || s === 'completed') return { icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-100', label: 'Received' };
        if (s === 'readied' || s === 'pending') return { icon: <Clock className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Processing' };
        if (s === 'outgoing' || s === 'in_transit') return { icon: <ArrowRightLeft className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-100', label: 'In Transit' };
        return { icon: <Hash className="w-5 h-5" />, color: 'text-muted-foreground', bg: 'bg-muted', label: status };
    };

    if (loading) return (
        <MobileLayout title={`Transfer #${transferId}`}>
            <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
        </MobileLayout>
    );

    if (!transfer) return (
        <MobileLayout title="Not Found">
            <div className="text-center py-20">Transfer not found.</div>
        </MobileLayout>
    );

    const status = getStatusInfo(transfer.status);
    const isReceiver = transfer.to_branch === authUser?.branch?.branch_name || true; // Simplified for MVP

    return (
        <MobileLayout title={`Transfer #${transfer.id}`}>
            <div className="space-y-6 pb-24">
                {/* ── Status Banner ──────────────────────────────────────── */}
                <div className={`${status.bg} ${status.color} px-6 py-4 rounded-3xl flex items-center justify-between border border-current/10`}>
                    <div className="flex items-center gap-3">
                        {status.icon}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</p>
                            <p className="font-bold text-sm tracking-tight">{status.label}</p>
                        </div>
                    </div>
                    <p className="text-[10px] font-bold opacity-60">ID: {transfer.id}</p>
                </div>

                {/* ── Route Card ─────────────────────────────────────────── */}
                <div className="bg-card border border-border rounded-[2rem] p-6 space-y-6 shadow-sm">
                    <div className="flex items-center gap-4 relative">
                        <div className="flex flex-col items-center gap-1 z-10">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                                <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="w-0.5 h-10 bg-muted-foreground/20 border-dotted border-l-2" />
                            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center border-2 border-background shadow-lg shadow-orange-500/20">
                                <MapPin className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        
                        <div className="flex flex-col justify-between py-1 h-32 flex-1">
                            <div>
                                <p className="text-[10px] font-bold uppercase opacity-40">From</p>
                                <p className="font-bold text-[15px]">{transfer.from_branch}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase opacity-40">To</p>
                                <p className="font-bold text-[15px]">{transfer.to_branch}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase opacity-40">Initiated By</p>
                            <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs font-semibold">{transfer.initiated_by}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase opacity-40">Date</p>
                            <span className="text-xs font-semibold">{new Date(transfer.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {transfer.notes && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-200/20">
                            <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 opacity-60 mb-1">Carrier Notes</p>
                            <p className="text-xs leading-relaxed italic text-amber-900 dark:text-amber-100">"{transfer.notes}"</p>
                        </div>
                    )}
                </div>

                {/* ── Items List ─────────────────────────────────────────── */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-4">Transfer Inventory</h3>
                    <div className="bg-card border border-border rounded-[2rem] overflow-hidden divide-y divide-border/50 shadow-sm">
                        {transfer.items?.map((item) => (
                            <div key={item.id} className="p-4 flex justify-between items-center group active:bg-muted/30 transition-colors">
                                <div className="min-w-0">
                                    <p className="font-bold text-sm tracking-tight truncate">{item.product_name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.product_code}</p>
                                </div>
                                <div className="bg-muted px-4 py-1.5 rounded-xl border border-border">
                                    <span className="text-sm font-black">{item.quantity}</span>
                                    <span className="text-[10px] font-bold uppercase opacity-40 ml-1">pcs</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Actions ────────────────────────────────────────────── */}
                {(transfer.status === 'outgoing' || transfer.status === 'in_transit') && (
                    <div className="fixed bottom-0 left-0 w-full p-6 bg-background/80 backdrop-blur-md border-t border-border z-50">
                        <button 
                            onClick={handleConfirm}
                            disabled={confirming}
                            className="w-full bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-xl shadow-green-600/20 uppercase tracking-widest text-xs"
                        >
                            {confirming ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Confirm Receipt
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
