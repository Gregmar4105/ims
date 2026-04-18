import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Bell, MessageSquare, ArrowRightLeft, ShoppingBag, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Notification {
    id: number;
    type: 'chat' | 'sale' | 'transfer';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    link: string;
}

export default function MobileNotificationsIndex() {
    const { remoteApi, serverUrl } = useMobileApi();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (serverUrl) fetchNotifications();
    }, [serverUrl]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await remoteApi.get(`${serverUrl}/api/mobile/notifications`);
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error('Fetch notifications failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'chat': return <MessageSquare className="w-5 h-5 text-blue-500" />;
            case 'sale': return <ShoppingBag className="w-5 h-5 text-green-500" />;
            case 'transfer': return <ArrowRightLeft className="w-5 h-5 text-orange-500" />;
            default: return <Bell className="w-5 h-5 text-muted-foreground" />;
        }
    };

    return (
        <MobileLayout title="Activity">
            <div className="space-y-4 pb-10">
                <div className="flex items-center justify-between px-2 mb-2">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Recent Alerts</h2>
                    {!loading && notifications.length > 0 && (
                        <button className="text-[10px] font-bold text-primary active:opacity-50 transition-opacity">Mark all read</button>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
                ) : (
                    <div className="space-y-3">
                        {notifications.length === 0 ? (
                            <div className="text-center py-20 opacity-30 grayscale">
                                <Bell className="w-12 h-12 mx-auto mb-4" />
                                <p className="text-sm font-medium">All caught up!</p>
                            </div>
                        ) : (
                            notifications.map((n, i) => (
                                <button
                                    key={`${n.type}-${n.id}-${i}`}
                                    onClick={() => router.visit(n.link)}
                                    className={`w-full flex items-start gap-4 p-4 rounded-3xl transition-all active:scale-[0.98] text-left border ${
                                        n.is_read 
                                            ? 'bg-card/50 border-border/50 opacity-60' 
                                            : 'bg-card border-primary/10 shadow-sm shadow-primary/5'
                                    }`}
                                >
                                    <div className={`mt-1 p-2 rounded-2xl ${n.is_read ? 'bg-muted' : 'bg-primary/10'}`}>
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className={`text-sm font-bold truncate ${n.is_read ? '' : 'text-primary'}`}>{n.title}</p>
                                            <span className="text-[9px] font-bold opacity-40 whitespace-nowrap ml-2">
                                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {n.message}
                                        </p>
                                        {!n.is_read && (
                                            <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary" />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
