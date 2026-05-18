import { router, usePage } from '@inertiajs/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { ChevronLeft, Search, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoleGradient } from '@/lib/role-utils';
import { NotificationBell } from './notification-bell';
import { useEffect, useRef, useState } from 'react';

export function AppMobileHeader() {
    const { auth } = usePage().props as any;
    const getInitials = useInitials();
    const user = auth?.user;
    const roles = auth?.roles || [];

    const { url } = usePage();

    // Hide mobile header on chat routes to avoid duplicate/redundant headers on mobile
    if (url.includes('chat')) {
        return null;
    }

    const [localSearch, setLocalSearch] = useState('');
    const debounceTimer = useRef<number | null>(null);

    // Sync search from URL parameters on page changes (e.g. scanning or navigation)
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        setLocalSearch(searchParams.get('search') || '');
    }, [url]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocalSearch(value);

        if (debounceTimer.current) {
            window.clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = window.setTimeout(() => {
            const currentUrl = new URL(window.location.href);
            const params = new URLSearchParams(currentUrl.search);

            // Reset page to 1
            params.delete('page');

            if (value) {
                params.set('search', value);
            } else {
                params.delete('search');
            }

            router.get(
                "/products",
                Object.fromEntries(params.entries()),
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ["products", "filters", "options"],
                }
            );
        }, 500);
    };

    const isProductsPage = url.startsWith('/products');

    // Placeholder search text depending on page
    const getPlaceholderText = () => {
        if (url.startsWith('/chats')) return 'Search branches...';
        if (isProductsPage) return 'Search products...';
        if (url.startsWith('/sales')) return 'Search sales...';
        return 'Search in app';
    };

    return (
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 bg-background fixed top-0 left-0 right-0 z-40 h-16 border-b border-sidebar-border/50">

            <div className="relative flex flex-1 items-center rounded-full bg-secondary/50 px-4 shadow-sm h-11 border border-border/20 transition-all">
                <Search className="size-4 text-muted-foreground mr-2 shrink-0" />
                <input 
                    type="text" 
                    placeholder={getPlaceholderText()}
                    className={cn(
                        "flex-1 w-full bg-transparent border-none text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0",
                        isProductsPage ? "pr-8" : ""
                    )}
                    value={isProductsPage ? localSearch : ''}
                    onChange={isProductsPage ? handleSearchChange : undefined}
                    disabled={!isProductsPage}
                />
                {isProductsPage && (
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('trigger-product-scan'))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground shrink-0 rounded-full hover:bg-secondary/80 transition-colors"
                        title="Scan Barcode / QR Code"
                    >
                        <Scan className="size-4" />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <div className="relative text-muted-foreground hover:text-foreground">
                    <NotificationBell className="h-9 w-9" iconClassName="size-5" />
                </div>

                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className={cn("rounded-full p-[2.5px] cursor-pointer shrink-0 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95", getRoleGradient(roles))}>
                                <Avatar className="h-8 w-8 overflow-hidden rounded-full border-[1.5px] border-background bg-background shadow-inner">
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
        </header>
    );
}

