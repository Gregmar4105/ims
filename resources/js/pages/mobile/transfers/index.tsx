import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Plus, ArrowRightLeft, PackageCheck, Truck } from 'lucide-react';
import { router } from '@inertiajs/react';

export default function MobileTransfers() {
    const { remoteApi, serverUrl } = useMobileApi();
    const [transfers, setTransfers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (serverUrl) fetchTransfers();
    }, [serverUrl]);

    const fetchTransfers = async () => {
        setLoading(true);
        try {
            const res = await remoteApi.get(`${serverUrl}/api/mobile/transfers`);
            setTransfers(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Truck className="w-5 h-5 text-yellow-600" />;
            case 'received': return <PackageCheck className="w-5 h-5 text-green-600" />;
            default: return <ArrowRightLeft className="w-5 h-5 text-blue-600" />;
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800';
            case 'received': return 'bg-green-100 border-green-200 dark:bg-green-900/30 dark:border-green-800';
            default: return 'bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800';
        }
    };

    return (
        <MobileLayout 
            title="Transfers" 
            onSearch={(q) => console.log('Search transfers', q)}
            fab={{
                icon: <Plus className="w-6 h-6" />,
                label: "Create",
                onClick: () => router.visit('/mobile/transfers/create')
            }}
        >
            <div className="pb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-2">Recent Transfers</p>

                {loading ? (
                    <div className="space-y-4 px-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-12 h-12 bg-muted rounded-full shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 bg-muted rounded w-2/3" />
                                    <div className="h-3 bg-muted rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {transfers.length === 0 ? (
                            <div className="py-10 text-center text-muted-foreground">
                                <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>No transfers recorded.</p>
                            </div>
                        ) : (
                            transfers.map((item) => (
                                <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-xl transition-colors active:bg-muted">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${getStatusBg(item.status)}`}>
                                        {getStatusIcon(item.status)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-[15px] truncate pr-2">{item.reference_no ?? `TR-${item.id}`}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <p className="text-[13px] text-muted-foreground truncate flex-1">
                                                {item.from_branch?.branch_name} &rarr; {item.to_branch?.branch_name}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                                                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </p>
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
