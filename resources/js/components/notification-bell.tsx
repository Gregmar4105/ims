import { useState, useEffect, useMemo, useRef } from 'react';
import { Bell, MessageSquare, ArrowRightLeft, ShoppingBag } from 'lucide-react';
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

    const fetchNotifications = async () => {
        try {
            const response = await axios.get('/notifications');
            setData(response.data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
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
                if (data.total > 0) {
                    playAudio();
                }
            }, 3000);
        };

        audio.addEventListener('ended', handleEnded);

        if (data.total > 0) {
            // Check if already playing to avoid overlap/speed-up effect
            if (audio.paused) {
                playAudio();
            }
        } else {
            // Stop if no notifications
            audio.pause();
            audio.currentTime = 0;
            if (timeoutId) clearTimeout(timeoutId);
        }

        return () => {
            audio.removeEventListener('ended', handleEnded);
            if (timeoutId) clearTimeout(timeoutId);
            // Don't pause on unmount to allow sound to finish? No, better to stop.
            audio.pause();
            audio.currentTime = 0;
        };
    }, [data.total]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); // 10s poll
        return () => clearInterval(interval);
    }, []);

    // Helper to format relative time
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
                read: false, // Chats in this list are unread by definition from backend
                link: '/chats',
                icon: chat.sender?.avatar || chat.sender?.name?.charAt(0) || '?',
                isAvatar: true // Placeholder: assuming we might have avatar logic later, but strictly logic here
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
                link: '/sales-list',
                icon: ShoppingBag,
                isAvatar: false
            });
        });

        // Process Transfers (Both Incoming and Readied)
        data.transfers.forEach((transfer) => {
            const isIncoming = transfer.status === 'outgoing';
            const title = isIncoming ? 'Incoming Transfer' : 'Transfer Request';
            const description = isIncoming
                ? `From ${transfer.source_branch?.branch_name}`
                : `To ${transfer.destination_branch?.branch_name} - Needs Approval`;
            const link = isIncoming ? '/incoming' : '/outgoing'; // Assuming /outgoing is the route for readied transfers

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
                <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                    <h2 className="text-xl font-bold tracking-tight">Notifications</h2>
                    <div className="flex gap-1">
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">All</span>
                    </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden scrollbar-thin">
                    {allNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                            <Bell className="h-8 w-8 opacity-20" />
                            <p>No notifications</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {allNotifications.map((item) => (
                                <DropdownMenuItem key={item.id} asChild className="focus:bg-muted/50 p-0 rounded-none cursor-pointer">
                                    <Link href={item.link} className="flex gap-3 p-3 transition-colors hover:bg-muted/40 relative group border-b border-border/20 last:border-0">

                                        {/* Icon / Avatar Section */}
                                        <div className="shrink-0 mt-1">
                                            {item.type === 'chat' ? (
                                                <Avatar className="h-10 w-10 border border-border/50">
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

                                        {/* Content Section */}
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

                                        {/* Unread Indicator */}
                                        {!item.read && (
                                            <div className="shrink-0 mt-3">
                                                <div className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-background"></div>
                                            </div>
                                        )}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
