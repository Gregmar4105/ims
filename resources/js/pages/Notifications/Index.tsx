import { useState, useEffect, useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, Bell, ArrowRightLeft, ShoppingBag } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { SharedData } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { getRoleGradient } from '@/lib/role-utils';

interface NotificationCounts {
    chats: number;
    sales: number;
    transfers: number;
}

interface NotificationData {
    total: number;
    counts: NotificationCounts;
    chats: any[];
    sales: any[];
    transfers: any[];
}

type NotificationItem = {
    id: string | number;
    type: 'sale' | 'transfer';
    title: string;
    description: string;
    time: string; // ISO string
    timestamp: number; // For sorting
    read: boolean;
    link: string;
    icon: any;
};

export default function NotificationsIndex() {
    const { auth } = usePage<SharedData>().props;
    const userBranchId = auth.user.branch_id;
    const roles = auth?.roles || [];
    const user = auth?.user;
    const getInitials = useInitials();

    const [data, setData] = useState<NotificationData>({
        total: 0,
        counts: { chats: 0, sales: 0, transfers: 0 },
        chats: [],
        sales: [],
        transfers: [],
    });

    const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');
    const [isMarkingAll, setIsMarkingAll] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const response = await axios.get('/notifications');
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); // 10s polling
        return () => clearInterval(interval);
    }, []);

    const allNotifications = useMemo(() => {
        // Process Sales
        const sales = (data.sales || []).map((item: any) => {
            const date = new Date(item.created_at);
            return {
                id: `sale-${item.id}`,
                type: 'sale' as const,
                title: `New Sale Ready`,
                description: `Sale #${item.id} is ready for processing`,
                time: item.created_at,
                timestamp: date.getTime(),
                read: item.is_read,
                link: `/sales-list?highlight=${item.id}`,
                icon: ShoppingBag,
            };
        });

        // Process Transfers
        const transfers = (data.transfers || []).map((item: any) => {
            const date = new Date(item.created_at);
            const isIncoming = item.destination_branch_id === userBranchId;
            const title = isIncoming ? 'Incoming Transfer' : 'Transfer Readied';
            const desc = isIncoming
                ? `From ${item.source_branch?.branch_name || 'Unknown'}`
                : `To ${item.destination_branch?.branch_name || 'Unknown'}`;

            return {
                id: `transfer-${item.id}`,
                type: 'transfer' as const,
                title: title,
                description: desc,
                time: item.created_at,
                timestamp: date.getTime(),
                read: item.is_read,
                link: isIncoming ? '/incoming' : '/outgoing',
                icon: ArrowRightLeft,
            };
        });

        // Combine and sort
        return [...sales, ...transfers].sort((a, b) => b.timestamp - a.timestamp);
    }, [data, userBranchId]);

    const todayNotifications = useMemo(() => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        return allNotifications.filter(n => n.timestamp >= startOfToday.getTime());
    }, [allNotifications]);

    const displayedNotifications = activeTab === 'today' ? todayNotifications : allNotifications;

    const unreadCount = useMemo(() => {
        return (data.counts.sales || 0) + (data.counts.transfers || 0);
    }, [data.counts]);

    const markAsRead = (id: string | number, type: string) => {
        // Optimistic update
        setData(prev => {
            const rawId = String(id).split('-')[1];
            const updateRead = (list: any[]) => list.map(item => String(item.id) === rawId ? { ...item, is_read: true } : item);
            const newSales = type === 'sale' ? updateRead(prev.sales) : prev.sales;
            const newTransfers = type === 'transfer' ? updateRead(prev.transfers) : prev.transfers;

            return {
                ...prev,
                sales: newSales,
                transfers: newTransfers,
                counts: {
                    ...prev.counts,
                    sales: newSales.filter(s => !s.is_read).length,
                    transfers: newTransfers.filter(t => !t.is_read).length,
                }
            };
        });

        const rawId = String(id).split('-')[1];
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;

        fetch('/notifications/mark-read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken || ''
            },
            body: JSON.stringify({ type, id: rawId }),
            keepalive: true
        }).catch(err => console.error("Failed to mark as read", err));
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;
        setIsMarkingAll(true);
        try {
            setData(prev => {
                const markAllRead = (list: any[]) => list.map(item => ({ ...item, is_read: true }));
                return {
                    ...prev,
                    counts: { ...prev.counts, sales: 0, transfers: 0 },
                    sales: markAllRead(prev.sales),
                    transfers: markAllRead(prev.transfers),
                };
            });
            await axios.post('/notifications/mark-all-read');
            fetchNotifications();
        } catch (error) {
            console.error("Failed to mark all as read", error);
        } finally {
            setIsMarkingAll(false);
        }
    };

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const breadcrumbs = [
        { title: 'Notifications', href: '/notifications-view' }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notifications" />
            <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-background/95">
                {/* Premium Mobile Header Bar */}
                <div className="pt-[env(safe-area-inset-top,0px)] h-[calc(4rem+env(safe-area-inset-top,0px))] px-4 flex items-center justify-between border-b border-border/40 bg-card/60 backdrop-blur-md sticky top-0 z-10">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 truncate">
                        Notifications
                        {unreadCount > 0 && (
                            <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full font-extrabold animate-pulse shrink-0">
                                {unreadCount}
                            </span>
                        )}
                    </h1>

                    <div className="flex items-center gap-3 shrink-0">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                disabled={isMarkingAll}
                                className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 h-9 rounded-full px-3 shrink-0"
                            >
                                {isMarkingAll ? 'Marking...' : 'Read all'}
                                <Check className="ml-1 h-3.5 w-3.5" />
                            </Button>
                        )}

                        {user && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className={cn("rounded-full p-[2px] cursor-pointer shrink-0 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95", getRoleGradient(roles))}>
                                        <Avatar className="h-9 w-9 overflow-hidden rounded-full border-[1.5px] border-background bg-background shadow-inner">
                                            <AvatarImage src={user.profile_photo_url || user.avatar} alt={user.name} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 rounded-xl shadow-lg border border-border/50" align="end" side="bottom" sideOffset={8}>
                                    <UserMenuContent user={user} />
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Styled Segment Tab Control */}
                <div className="p-3 bg-card/30 border-b border-border/20">
                    <div className="flex p-1 bg-muted/40 rounded-xl max-w-sm mx-auto">
                        <button
                            onClick={() => setActiveTab('today')}
                            className={cn(
                                "flex-1 text-sm font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2",
                                activeTab === 'today'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                            )}
                        >
                            Today
                            <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-full text-primary font-bold">
                                {todayNotifications.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={cn(
                                "flex-1 text-sm font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2",
                                activeTab === 'all'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                            )}
                        >
                            All
                            <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-full text-primary font-bold">
                                {allNotifications.length}
                            </span>
                        </button>
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 p-4 max-w-md mx-auto w-full">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                            <p className="text-sm text-muted-foreground">Loading notifications...</p>
                        </div>
                    ) : displayedNotifications.length === 0 ? (
                        /* Premium Empty State */
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <div className="h-16 w-16 rounded-full bg-accent/40 flex items-center justify-center mb-4 relative shadow-inner">
                                <Bell className="h-7 w-7 text-muted-foreground/60" />
                                <div className="absolute top-0 right-0 h-3.5 w-3.5 bg-background rounded-full flex items-center justify-center">
                                    <div className="h-2 w-2 bg-muted-foreground/40 rounded-full" />
                                </div>
                            </div>
                            <h3 className="text-base font-bold text-foreground mb-1">All caught up!</h3>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                No {activeTab === 'today' ? 'today\'s' : ''} inventory or transfer alerts to show right now.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {displayedNotifications.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.link}
                                        onClick={() => markAsRead(item.id, item.type)}
                                        className={cn(
                                            "flex items-start gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer shadow-sm relative group",
                                            item.read
                                                ? "bg-card/70 border-border/30 text-muted-foreground hover:bg-card hover:border-border/60"
                                                : "bg-primary/5 border-primary/10 hover:bg-primary/10 hover:border-primary/20 text-foreground"
                                        )}
                                    >
                                        {/* Colored Left-Side Badge Icon */}
                                        <div className="shrink-0">
                                            <div className={cn(
                                                "h-11 w-11 rounded-xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105 duration-200",
                                                item.type === 'sale' 
                                                    ? "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-500" 
                                                    : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-500"
                                            )}>
                                                <Icon className="h-5 w-5 stroke-[2.2]" />
                                            </div>
                                        </div>

                                        {/* Content Area */}
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <span className={cn(
                                                    "font-bold text-sm leading-tight text-foreground transition-colors",
                                                    item.read ? "font-semibold" : "font-black"
                                                )}>
                                                    {item.title}
                                                </span>
                                                <span className="text-[10px] font-semibold text-muted-foreground shrink-0 whitespace-nowrap pt-0.5">
                                                    {getRelativeTime(item.time)}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "text-xs leading-relaxed",
                                                item.read ? "text-muted-foreground/80" : "text-muted-foreground"
                                            )}>
                                                {item.description}
                                            </p>
                                        </div>

                                        {/* Unread Highlight Dot */}
                                        {!item.read && (
                                            <div className="shrink-0 flex items-center h-full pt-4">
                                                <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-sm shadow-blue-500/40 animate-pulse" />
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
