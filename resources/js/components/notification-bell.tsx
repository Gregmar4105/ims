import { useState, useEffect } from 'react';
import { Bell, Store, MessageSquare, ArrowRightLeft, ShoppingBag } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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

    useEffect(() => {
        fetchNotifications();
        // Poll every 10 seconds
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, []);

    const hasNotifications = data.total > 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell
                        className={cn(
                            "h-5 w-5 text-muted-foreground transition-all duration-500",
                            hasNotifications && "animate-pulse text-primary"
                        )}
                    />
                    {hasNotifications && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground animate-in zoom-in-50 duration-300">
                            {data.total > 99 ? '99+' : data.total}
                        </span>
                    )}
                    <span className="sr-only">Toggle notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {data.total === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No new notifications
                    </div>
                ) : (
                    <>
                        {data.counts.chats > 0 && (
                            <>
                                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                    Unread Messages
                                </DropdownMenuLabel>
                                {data.chats.map((chat) => (
                                    <DropdownMenuItem key={chat.id} asChild>
                                        <Link href="/chats" className="flex cursor-pointer items-start gap-2 p-2">
                                            <MessageSquare className="mt-1 h-4 w-4 shrink-0" />
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium leading-none">
                                                    {chat.sender?.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground line-clamp-1">
                                                    {chat.content || 'Attachment sent'}
                                                </span>
                                            </div>
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                            </>
                        )}

                        {data.counts.sales > 0 && (
                            <>
                                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                    Pending Sales
                                </DropdownMenuLabel>
                                {data.sales.map((sale) => (
                                    <DropdownMenuItem key={sale.id} asChild>
                                        <Link href="/sales-list" className="flex cursor-pointer items-start gap-2 p-2">
                                            <ShoppingBag className="mt-1 h-4 w-4 shrink-0" />
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium leading-none">
                                                    Sale #{sale.id}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Status: {sale.status}
                                                </span>
                                            </div>
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                            </>
                        )}

                        {data.counts.transfers > 0 && (
                            <>
                                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                    Incoming Transfers
                                </DropdownMenuLabel>
                                {data.transfers.map((transfer) => (
                                    <DropdownMenuItem key={transfer.id} asChild>
                                        <Link href="/incoming" className="flex cursor-pointer items-start gap-2 p-2">
                                            <ArrowRightLeft className="mt-1 h-4 w-4 shrink-0" />
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium leading-none">
                                                    From {transfer.source_branch?.branch_name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Status: {transfer.status}
                                                </span>
                                            </div>
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                            </>
                        )}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
