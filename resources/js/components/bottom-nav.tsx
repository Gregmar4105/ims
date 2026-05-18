import { Link, usePage } from '@inertiajs/react';
import { Home, MessageCircle, QrCode, Package, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const { url, component } = usePage() as any;
    const { auth } = usePage().props as any;

    const roles = auth?.roles || [];
    let homeHref = '/';
    if (roles.includes('System Administrator') || roles.includes('Branch Administrator')) {
        homeHref = '/branch-dashboard';
    } else if (roles.includes('Employee')) {
        homeHref = '/employee-dashboard';
    }
    
    const isHomeActive = url === '/system-dashboard' || url === '/branch-dashboard' || url === '/employee-dashboard';
    const isChatActive = url.startsWith('/chats') || url.startsWith('/branch-chats');
    const isQrActive = url.startsWith('/qr-and-barcode-scanner');
    const isProductsActive = url.startsWith('/products') || url.startsWith('/categories') || url.startsWith('/brands') || url.startsWith('/reorders');
    const isMoreActive = url.startsWith('/settings') || url === '#';

    const navItems = [
        { icon: Home, label: 'Home', href: homeHref, active: isHomeActive },
        { icon: MessageCircle, label: 'Chats', href: '/chats', active: isChatActive },
        { icon: QrCode, label: 'QR', href: '/qr-and-barcode-scanner', isCenter: true, active: isQrActive },
        { icon: Package, label: 'Products', href: '/products', active: isProductsActive },
        { icon: MoreHorizontal, label: 'More', href: '#', active: isMoreActive },
    ];

    // Hide bottom nav on detail chat components or print/receipt views if applicable
    const lowerComp = component?.toLowerCase() || '';
    const isChatShow = lowerComp.includes('show') || lowerComp.includes('chat');
    
    // Hide bottom nav in printing routes as well
    const isPrintPage = url.includes('/print') || url.includes('/printList');
    if (isPrintPage) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none">
            <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-sidebar-border/50 pb-[env(safe-area-inset-bottom,0px)] pointer-events-auto shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
                <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2 relative">
                    {navItems.map((item, index) => {
                        const Icon = item.icon;
                        if (item.isCenter) {
                            return (
                                <div key={index} className="relative flex flex-col items-center justify-center w-16">
                                    <Link
                                        href={item.href}
                                        className="absolute -top-10 flex flex-col items-center justify-center group pointer-events-auto"
                                    >
                                        <div className={cn(
                                            "p-3.5 rounded-[20px] ring-[6px] ring-background transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-active:shadow-inner",
                                            item.active
                                                ? "bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(var(--primary),0.4)]"
                                                : "bg-primary/90 text-primary-foreground shadow-[0_6px_16px_rgba(0,0,0,0.15)]"
                                        )}>
                                            <Icon className="size-6 stroke-[2.5]" />
                                        </div>
                                        <span className="text-[10px] font-semibold mt-1 text-primary tracking-tight">
                                            {item.label}
                                        </span>
                                    </Link>
                                </div>
                            );
                        }
                        return (
                            <Link
                                key={index}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1.5 w-16 py-1 transition-all duration-200 rounded-xl pointer-events-auto",
                                    item.active 
                                        ? "text-primary" 
                                        : "text-muted-foreground/80 hover:text-foreground active:scale-90"
                                )}
                            >
                                <Icon className={cn("size-5.5 transition-transform duration-300", item.active ? "scale-110" : "")} />
                                <span className={cn(
                                    "text-[10px] font-medium tracking-tight transition-colors",
                                    item.active ? "font-bold" : ""
                                )}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}

