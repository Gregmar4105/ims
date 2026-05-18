import { usePage } from '@inertiajs/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { ChevronLeft, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoleGradient } from '@/lib/role-utils';
import { NotificationBell } from './notification-bell';


export function AppMobileHeader() {
    const { auth } = usePage().props as any;
    const getInitials = useInitials();
    const user = auth?.user;
    const roles = auth?.roles || [];

    const { url } = usePage();
    const isSubPage = url !== '/system-dashboard' && url !== '/branch-dashboard' && url !== '/employee-dashboard';

    // Placeholder search text depending on page
    const getPlaceholderText = () => {
        if (url.startsWith('/chats')) return 'Search branches...';
        if (url.startsWith('/products')) return 'Search products...';
        if (url.startsWith('/sales')) return 'Search sales...';
        return 'Search in app';
    };

    return (
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 bg-background fixed top-0 left-0 right-0 z-40 h-16 border-b border-sidebar-border/50">


            {isSubPage && (
                <button 
                    onClick={() => window.history.back()}
                    className="p-2 -ml-2 text-muted-foreground hover:text-foreground shrink-0 rounded-full hover:bg-secondary/50 transition-colors"
                >
                    <ChevronLeft className="size-6" />
                </button>
            )}

            <div className="flex flex-1 items-center rounded-full bg-secondary/50 px-4 shadow-sm h-11 border border-border/20 transition-all">
                <Search className="size-4 text-muted-foreground mr-2 shrink-0" />
                <input 
                    type="text" 
                    placeholder={getPlaceholderText()}
                    className="flex-1 w-full bg-transparent border-none text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                    disabled
                />
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <div className="relative text-muted-foreground hover:text-foreground">
                    <NotificationBell />
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
