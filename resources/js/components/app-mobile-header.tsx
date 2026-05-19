import { router, usePage } from '@inertiajs/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { 
    ChevronLeft, Search, Scan,
    LayoutDashboard, MapPlus, Brush, Users, UserPen, TriangleAlert, 
    MessagesSquare, ListChecks, BellRing, RotateCcw, ArrowLeftRight, 
    ArrowRightFromLine, ArrowLeftToLine, FileImage, PackageOpen, 
    ShoppingBasket, Tag, ScanBarcode, IdCardLanyard, ScanQrCode, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoleGradient } from '@/lib/role-utils';
import { NotificationBell } from './notification-bell';
import { useEffect, useRef, useState } from 'react';

interface SearchSuggestion {
    title: string;
    url: string;
    description: string;
    icon: any; // Lucide icon
    roles?: string[]; // optional role filter
}

const allSuggestions: SearchSuggestion[] = [
    // System Admin pages
    { title: "System Dashboard", url: "/system-dashboard", description: "View overall platform stats and status", icon: LayoutDashboard, roles: ['System Administrator'] },
    { title: "Branch List", url: "/branches", description: "Manage platform branches and stores", icon: MapPlus, roles: ['System Administrator'] },
    { title: "Personalization", url: "/personalization", description: "Customize application branding and theme", icon: Brush, roles: ['System Administrator'] },
    { title: "Users", url: "/users", description: "Manage system and branch users", icon: Users, roles: ['System Administrator'] },
    { title: "Roles", url: "/roles", description: "Manage user roles and permissions mapping", icon: UserPen, roles: ['System Administrator'] },
    { title: "Permissions", url: "/permissions", description: "Manage system permission definitions", icon: TriangleAlert, roles: ['System Administrator'] },

    // Branch Admin pages
    { title: "Branch Dashboard", url: "/branch-dashboard", description: "View branch analytics, sales, and products", icon: LayoutDashboard, roles: ['Branch Administrator', 'System Administrator', 'Branch Manager', 'Branch'] },
    { title: "Chats", url: "/chats", description: "Chat with employees and other branches", icon: MessagesSquare, roles: ['Branch Administrator', 'System Administrator', 'Branch Manager', 'Branch'] },
    { title: "Sales History", url: "/sales-list", description: "View and filter previous sales records", icon: ListChecks, roles: ['Branch Administrator', 'System Administrator', 'Branch Manager', 'Branch'] },
    { title: "New Sales", url: "/new-sales", description: "Create and process a new sale", icon: BellRing, roles: ['Branch Administrator', 'System Administrator', 'Branch Manager', 'Branch'] },
    { title: "Return Items", url: "/return-items", description: "Manage customer sales returns", icon: RotateCcw, roles: ['Branch Administrator', 'System Administrator', 'Branch Manager', 'Branch'] },
    { title: "Transfer History", url: "/transfer-list", description: "View record of stock transfers between branches", icon: ListChecks, roles: ['Branch Administrator', 'System Administrator', 'Branch Manager', 'Branch'] },
    { title: "Outgoing Transfers", url: "/outgoing", description: "Manage and create outgoing stock transfers", icon: ArrowRightFromLine, roles: ['Branch Administrator', 'System Administrator', 'Branch Manager', 'Branch'] },
    { title: "Incoming Transfers", url: "/incoming", description: "Receive incoming stock from other branches", icon: ArrowLeftToLine, roles: ['Branch Administrator', 'System Administrator', 'Branch Manager', 'Branch'] },
    { title: "Import Transfer", url: "/import-transfer", description: "Import stock transfer files", icon: FileImage, roles: ['Branch Administrator', 'System Administrator', 'Branch Manager', 'Branch'] },

    // Employee pages
    { title: "Employee Dashboard", url: "/employee-dashboard", description: "View employee dashboard and tasks", icon: IdCardLanyard, roles: ['Employee'] },
    { title: "Branch Chats", url: "/branch-chats", description: "Chat with branch administrators and staff", icon: MessagesSquare, roles: ['Employee'] },
    { title: "QR & Barcode Scanner", url: "/qr-and-barcode-scanner", description: "Scan product barcodes and QR codes", icon: ScanQrCode, roles: ['Employee'] },

    // Common pages
    { title: "Product List", url: "/products", description: "Browse, view, and search products catalog", icon: PackageOpen },
    { title: "Reorders", url: "/reorders", description: "View products that are low in stock", icon: ShoppingBasket },
    { title: "Product Categories", url: "/categories", description: "Manage product categories", icon: Tag },
    { title: "Product Brands", url: "/brands", description: "Manage product brands", icon: Tag },
    { title: "Product Suppliers", url: "/product-suppliers", description: "Manage product suppliers information", icon: Users },
    { title: "QR & Barcodes", url: "/qr-barcodes", description: "Generate QR codes and barcodes for products", icon: ScanBarcode },
    { title: "Photo Uploads", url: "/temporary-photo-product-upload", description: "Upload temporary photos for product catalog", icon: FileImage },
    { title: "Profile Settings", url: "/settings/profile", description: "Update your profile and account settings", icon: Settings },
];

export function AppMobileHeader() {
    const { auth } = usePage().props as any;
    const getInitials = useInitials();
    const user = auth?.user;
    const roles = auth?.roles || [];

    const { url } = usePage();

    // Hide mobile header on chat routes and notifications view to avoid duplicate/redundant headers on mobile
    if (url.includes('chat') || url.includes('notifications-view')) {
        return null;
    }

    const [localSearch, setLocalSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<number | null>(null);

    // Sync search from URL parameters on page changes (e.g. scanning or navigation)
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        setLocalSearch(searchParams.get('search') || '');
    }, [url]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
    const isHomePage = url === '/system-dashboard' || url === '/branch-dashboard' || url === '/employee-dashboard' || url === '/';

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && filteredSuggestions.length > 0) {
            const firstSuggestion = filteredSuggestions[0];
            setIsDropdownOpen(false);
            setLocalSearch('');
            router.get(firstSuggestion.url);
        }
    };

    // Filter suggestions based on roles and current user input
    const filteredSuggestions = allSuggestions.filter(item => {
        // First filter by roles
        if (item.roles) {
            const hasRole = item.roles.some(role => roles.includes(role));
            if (!hasRole) return false;
        }

        // Then filter by text query if typed
        if (!localSearch) return false;
        const query = localSearch.toLowerCase();
        return (
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query)
        );
    });

    // Placeholder search text depending on page
    const getPlaceholderText = () => {
        if (url.startsWith('/chats')) return 'Search branches...';
        if (isProductsPage) return 'Search products...';
        if (url.startsWith('/sales')) return 'Search sales...';
        if (isHomePage) return 'Search pages...';
        return 'Search in app';
    };

    return (
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 bg-background fixed top-0 left-0 right-0 z-40 pt-[env(safe-area-inset-top,0px)] h-[calc(4rem+env(safe-area-inset-top,0px))] border-b border-sidebar-border/50">

            <div 
                ref={containerRef}
                className="relative flex flex-1 items-center rounded-full bg-secondary/50 px-4 shadow-sm h-11 border border-border/20 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
            >
                <Search className="size-4 text-muted-foreground mr-2 shrink-0" />
                <input 
                    type="text" 
                    placeholder={getPlaceholderText()}
                    className={cn(
                        "flex-1 w-full bg-transparent border-none text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0",
                        isProductsPage ? "pr-8" : ""
                    )}
                    value={isProductsPage || isHomePage ? localSearch : ''}
                    onChange={
                        isProductsPage 
                            ? handleSearchChange 
                            : (isHomePage 
                                ? (e) => { setLocalSearch(e.target.value); setIsDropdownOpen(true); } 
                                : undefined)
                    }
                    onFocus={() => { if (isHomePage) setIsDropdownOpen(true); }}
                    onKeyDown={isHomePage ? handleKeyDown : undefined}
                    disabled={!isProductsPage && !isHomePage}
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

                {/* Dropdown Suggestions */}
                {isHomePage && isDropdownOpen && localSearch.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 max-h-[320px] overflow-y-auto rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl z-50 animate-in fade-in-50 slide-in-from-top-2 duration-200 divide-y divide-border/40 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
                        {filteredSuggestions.length > 0 ? (
                            <div className="p-1.5 flex flex-col gap-0.5">
                                {filteredSuggestions.map((item, index) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setIsDropdownOpen(false);
                                                setLocalSearch('');
                                                router.get(item.url);
                                            }}
                                            className="flex items-center gap-3 w-full text-left px-3.5 py-3 rounded-xl hover:bg-accent/80 active:bg-accent hover:text-accent-foreground transition-all duration-200 group"
                                        >
                                            <div className="flex items-center justify-center p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-300 shadow-sm">
                                                <Icon className="size-4.5 stroke-[2.2]" />
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-sm font-semibold text-foreground tracking-tight group-hover:translate-x-0.5 transition-transform duration-200">
                                                    {item.title}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground group-hover:text-muted-foreground/80 truncate pr-2">
                                                    {item.description}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground gap-1.5">
                                <Search className="size-6 text-muted-foreground/40 stroke-[1.5] mb-0.5 animate-pulse" />
                                <span className="text-xs font-semibold">No matching pages found</span>
                                <span className="text-[10px] text-muted-foreground/75">Try a different search query</span>
                            </div>
                        )}
                    </div>
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


