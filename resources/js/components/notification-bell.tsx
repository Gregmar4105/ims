import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Bell, MessageSquare, ArrowRightLeft, ShoppingBag } from 'lucide-react';

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
    type: 'chat' | 'sale' | 'transfer';
    title: string;
    description: string;
    time: string; // ISO string
    timestamp: number; // For sorting
    read: boolean;
    link: string;
    icon: any; // Lucide icon component or string url for avatar
    isAvatar?: boolean;
};

export function NotificationBell() {
    const [data, setData] = useState<NotificationData>({
        total: 0,
        counts: { chats: 0, sales: 0, transfers: 0 },
        chats: [],
        sales: [],
        transfers: [],
    });

    const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');
    const [isMarkingAll, setIsMarkingAll] = useState(false);

    const fetchNotifications = async () => {
        try {
            const response = await axios.get('/notifications');
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const markAsRead = (id: string | number, type: string) => {
        // Optimistic update
        // Remove from data immediately
        setData(prev => {
            const newChats = type === 'chat' ? prev.chats.filter(c => `chat-${c.id}` !== id) : prev.chats;
            const newSales = type === 'sale' ? prev.sales.filter(s => `sale-${s.id}` !== id) : prev.sales;
            const newTransfers = type === 'transfer' ? prev.transfers.filter(t => `transfer-${t.id}` !== id) : prev.transfers;

            const newTotal = newChats.length + newSales.length + newTransfers.length;

            return {
                ...prev,
                total: newTotal,
                chats: newChats,
                sales: newSales,
                transfers: newTransfers,
                counts: {
                    chats: newChats.length,
                    sales: newSales.length,
                    transfers: newTransfers.length
                }
            };
        });

        // Extract raw ID if needed (e.g. "chat-123" -> "123")
        const rawId = String(id).split('-')[1];

        // Use fetch with keepalive to ensure request survives navigation
        // Grab CSRF token from meta tag
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

        // We don't await this because we might navigate away immediately.
        // The optimistic update handles the UI.
    };

    const markAllAsRead = async () => {
        if (data.total === 0) return;
        setIsMarkingAll(true);
        try {
            // Optimistic clear
            setData({
                total: 0,
                counts: { chats: 0, sales: 0, transfers: 0 },
                chats: [],
                sales: [],
                transfers: [],
            });
            await axios.post('/notifications/mark-all-read');
            fetchNotifications();
        } catch (error) {
            console.error("Failed to mark all as read", error);
        } finally {
            setIsMarkingAll(false);
        }
    };

    // @ts-ignore
    const { notification_sound } = usePage().props;
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio(notification_sound as string);
        } else if (audioRef.current.src !== notification_sound) {
            audioRef.current.src = notification_sound as string;
        }
    }, [notification_sound]);

    // Audio Loop Logic
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        let timeoutId: NodeJS.Timeout;

        const playAudio = () => {
            audio.play().catch(e => console.error("Audio play failed", e));
        };

        const handleEnded = () => {
            // Wait 3 seconds before playing again
            timeoutId = setTimeout(() => {
                // Check Ref data total to ensure we still have notifications in current state? 
                // We rely on the fact that if data.total becomes 0, the effect cleanup runs/re-runs with new prop?
                // Actually, if we use hasNotifications as dependency, this effect only re-runs when it toggles 0 <-> >0
                // So inside this closure, we need to be careful?
                // The loop should continue as long as the effect is active.
                playAudio();
            }, 3000);
        };

        audio.addEventListener('ended', handleEnded);

        if (data.total > 0) {
            if (audio.paused) {
                playAudio();
            }
        } else {
            audio.pause();
            audio.currentTime = 0;
        }

        return () => {
            audio.removeEventListener('ended', handleEnded);
            try { clearTimeout(timeoutId!); } catch (e) { }
            // Only pause if we are truly stopping (handled by dependency change to false?)
            // If data.total changes from 1 to 2, we don't want to stop.
            // But we can't easily distinguish why we are cleaning up without refs.
            // Simplified: If total > 0, we want it playing.

            // To be safe and avoid "stuck" audio, we pause on cleanup.
            // To avoid "restart" on count change, we only depend on `hasNotifications`.
            audio.pause();
            audio.currentTime = 0;
        };
    }, [data.total > 0]); // Only re-run when "has notifications" status changes

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); // 10s poll
        return () => clearInterval(interval);
    }, []);



    // Unified and Sorted Feed
    const allNotifications = useMemo(() => {
        const items: NotificationItem[] = [];

        // Process Chats
        data.chats.forEach((chat) => {
            items.push({
                id: `chat-${chat.id}`,
                type: 'chat',
                title: chat.sender?.name || 'Unknown',
                description: chat.content || 'Sent an attachment',
                time: chat.created_at,
                timestamp: new Date(chat.created_at).getTime(),
                read: false,
                link: `/chats?branch_id=${chat.sender?.branch?.id || ''}`, // Direct to specific branch chat via query param
                icon: chat.sender?.profile_photo_url, // Pass URL directly here
                isAvatar: true
            });
        });

        // Process Sales
        data.sales.forEach((sale) => {
            items.push({
                id: `sale-${sale.id}`,
                type: 'sale',
                title: `New Sale #${sale.id}`,
                description: `Status: ${sale.status} - waiting for approval`,
                time: sale.created_at,
                timestamp: new Date(sale.created_at).getTime(),
                read: false,
                link: '/new-sales', // Redirect to new sales page
                icon: ShoppingBag,
                isAvatar: false
            });
        });

        // Process Transfers
        data.transfers.forEach((transfer) => {
            const isIncoming = transfer.status === 'outgoing';
            const title = isIncoming ? 'Incoming Transfer' : 'Transfer Request';
            const description = isIncoming
                ? `From ${transfer.source_branch?.branch_name}`
                : `To ${transfer.destination_branch?.branch_name} - Needs Approval`;

            // Redirect logic:
            // Incoming -> /incoming
            // Outgoing (Readied) -> /outgoing
            const link = isIncoming ? '/incoming' : '/outgoing';

            items.push({
                id: `transfer-${transfer.id}`,
                type: 'transfer',
                title: title,
                description: description,
                time: transfer.created_at,
                timestamp: new Date(transfer.created_at).getTime(),
                read: false,
                link: link,
                icon: ArrowRightLeft,
                isAvatar: false
            });
        });

        // Sort by newest first
        return items.sort((a, b) => b.timestamp - a.timestamp);
    }, [data]);

    const todayNotifications = useMemo(() => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        return allNotifications.filter(n => n.timestamp >= startOfToday.getTime());
    }, [allNotifications]);

    const groupedNotifications = useMemo(() => {
        const groups: { [key: string]: NotificationItem[] } = {};

        allNotifications.forEach(item => {
            const date = new Date(item.timestamp);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            let key = date.toLocaleDateString();

            if (date.toDateString() === today.toDateString()) {
                key = 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                key = 'Yesterday';
            } else {
                key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
        });

        // Sort keys to put Today first, then Yesterday, then others descending
        // Actually since items are sorted, we can just iterate the items order to build keys, but let's be robust
        // Simple approach: The object keys iteration order is not guaranteed. We should return an array of groups.

        // Re-approach: Unique keys from sorted items
        const sortedKeys = Array.from(new Set(allNotifications.map(item => {
            const date = new Date(item.timestamp);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (date.toDateString() === today.toDateString()) {
                return 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                return 'Yesterday';
            } else {
                return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }
        })));

        return sortedKeys.map(key => ({
            title: key,
            items: allNotifications.filter(item => {
                const date = new Date(item.timestamp);
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                let itemKey = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                if (date.toDateString() === today.toDateString()) itemKey = 'Today';
                else if (date.toDateString() === yesterday.toDateString()) itemKey = 'Yesterday';

                return itemKey === key;
            })
        }));

    }, [allNotifications]);

    // Track previous notification IDs to trigger toasts only for NEW ones
    const [prevNotificationIds, setPrevNotificationIds] = useState<Set<string | number>>(new Set());
    const isFirstLoad = useRef(true);

    useEffect(() => {
        // Skip on initial load to avoid spamming toasts for existing unread items
        if (isFirstLoad.current) {
            if (allNotifications.length > 0) {
                const ids = new Set(allNotifications.map(n => n.id));
                setPrevNotificationIds(ids);
                isFirstLoad.current = false;
            } else if (data.total === 0) {
                // If loaded with 0, mark as loaded.
                isFirstLoad.current = false;
            }
            return;
        }

        const newItems = allNotifications.filter(item => !prevNotificationIds.has(item.id));

        if (newItems.length > 0) {
            // Update seen set
            setPrevNotificationIds(prev => {
                const next = new Set(prev);
                newItems.forEach(i => next.add(i.id));
                return next;
            });

            // Trigger toasts
            newItems.forEach(item => {
                toast.custom((t) => (
                    <Link
                        href={item.link}
                        onClick={() => {
                            toast.dismiss(t);
                            handleNotificationClick();
                        }}
                        className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-lg transition-all hover:bg-accent/50 max-w-sm pointer-events-auto"
                    >
                        <div className="shrink-0">
                            {item.type === 'chat' ? (
                                <Avatar className="h-10 w-10 border border-border/50">
                                    <AvatarImage src={item.icon || undefined} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                        {String(item.title).charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                            ) : (
                                <div className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center border border-border/50",
                                    item.type === 'sale' ? "bg-orange-500/10 text-orange-600" : "bg-blue-500/10 text-blue-600"
                                )}>
                                    {item.isAvatar ? null : <item.icon className="h-5 w-5" />}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="font-medium leading-none text-foreground">{item.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.description}
                            </p>
                        </div>
                    </Link>
                ), {
                    duration: 4000,
                    position: 'top-center'
                });
            });
        }
    }, [allNotifications]);

    const handleNotificationClick = (id?: string | number, type?: string) => {
        // Stop audio immediately
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        if (id && type) {
            markAsRead(id, type);
        }
    };

    const hasNotifications = data.total > 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group">
                    <Bell
                        className={cn(
                            "h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:text-foreground",
                            hasNotifications && "animate-bell-ring text-foreground"
                        )}
                    />
                    {hasNotifications && (
                        <>
                            <span className="absolute -top-1 -right-1 h-4 w-4 min-w-[1rem] rounded-full bg-destructive animate-ping opacity-75"></span>
                            <Badge
                                variant="destructive"
                                className="absolute -top-1 -right-1 h-4 w-4 min-w-[1rem] flex items-center justify-center p-0 text-[10px] rounded-full ring-2 ring-background pointer-events-none z-10"
                            >
                                {data.total > 99 ? '99+' : data.total}
                            </Badge>
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[360px] p-0 overflow-hidden rounded-xl shadow-xl border-border/50">
                <div className="p-4 border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-10 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Notifications</h2>
                        {data.total > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                disabled={isMarkingAll}
                                className="h-6 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            >
                                {isMarkingAll ? 'Marking...' : 'Read all'}
                                <Check className="ml-1 h-3 w-3" />
                            </Button>
                        )}
                    </div>

                    <div className="flex p-1 bg-muted/30 rounded-lg">
                        <button
                            onClick={() => setActiveTab('today')}
                            className={cn(
                                "flex-1 text-sm font-medium py-1.5 rounded-md transition-all",
                                activeTab === 'today'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={cn(
                                "flex-1 text-sm font-medium py-1.5 rounded-md transition-all",
                                activeTab === 'all'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            All
                        </button>
                    </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden scrollbar-thin">
                    {(activeTab === 'today' ? todayNotifications : allNotifications).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                            <Bell className="h-8 w-8 opacity-20" />
                            <p>No notifications {activeTab === 'today' ? 'today' : ''}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col pb-2">
                            {activeTab === 'today' ? (
                                // Today View - Flat List
                                todayNotifications.map((item) => (
                                    <NotificationItemRenderer key={item.id} item={item} onClick={() => handleNotificationClick(item.id, item.type)} />
                                ))
                            ) : (
                                // All View - Grouped by Date
                                groupedNotifications.map((group) => (
                                    <div key={group.title} className="flex flex-col">
                                        <div className="sticky top-0 z-0 bg-background/95 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border/30 shadow-sm">
                                            {group.title}
                                        </div>
                                        {group.items.map((item) => (
                                            <NotificationItemRenderer key={item.id} item={item} onClick={() => handleNotificationClick(item.id, item.type)} />
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function NotificationItemRenderer({ item, onClick }: { item: NotificationItem, onClick: () => void }) {
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

    return (
        <DropdownMenuItem asChild className="focus:bg-muted/50 p-0 rounded-none cursor-pointer">
            <Link
                href={item.link}
                className="flex gap-3 p-3 transition-colors hover:bg-muted/40 relative group border-b border-border/20 last:border-0"
                onClick={onClick}
            >
                <div className="shrink-0 mt-1">
                    {item.type === 'chat' ? (
                        <Avatar className="h-10 w-10 border border-border/50">
                            <AvatarImage src={item.icon || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {String(item.title).charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    ) : (
                        <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center border border-border/50",
                            item.type === 'sale' ? "bg-orange-500/10 text-orange-600" : "bg-blue-500/10 text-blue-600"
                        )}>
                            {item.isAvatar ? null : <item.icon className="h-5 w-5" />}
                        </div>
                    )}
                    <div className="absolute bottom-3 right-[calc(100%-2.75rem)] h-5 w-5 rounded-full bg-background flex items-center justify-center ring-2 ring-background">
                        {item.type === 'chat' && <MessageSquare className="h-3 w-3 text-primary fill-primary/20" />}
                        {item.type === 'sale' && <ShoppingBag className="h-3 w-3 text-orange-600 fill-orange-600/20" />}
                        {item.type === 'transfer' && <ArrowRightLeft className="h-3 w-3 text-blue-600" />}
                    </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex justify-between items-start w-full">
                        <span className="font-semibold text-sm leading-tight text-foreground line-clamp-2">
                            {item.title}
                        </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground line-clamp-2 leading-snug">
                        {item.description}
                    </p>
                    <span className={cn(
                        "text-xs font-medium mt-1",
                        item.type === 'sale' ? "text-orange-600/80" : "text-primary/70"
                    )}>
                        {getRelativeTime(item.time)}
                    </span>
                </div>

                {!item.read && (
                    <div className="shrink-0 mt-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-background"></div>
                    </div>
                )}
            </Link>
        </DropdownMenuItem>
    );
}
