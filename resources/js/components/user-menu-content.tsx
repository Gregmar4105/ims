import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { dashboard, logout } from '@/routes';
import { edit } from '@/routes/profile';
import { type User } from '@/types';
// 1. ADD: usePage hook to detect current location
import { Link, router, usePage } from '@inertiajs/react'; 
// 2. ADD: LayoutDashboard icon (optional, for visual clarity)
import { LogOut, Settings, LayoutDashboard, LogIn } from 'lucide-react'; 

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    
    // 3. ADD: Get the current URL
    const { url } = usePage();
    
    // 4. ADD: Define the condition (Are we on the Welcome/Landing page?)
    const isLandingPage = url === '/';

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />

            {/* 5. IMPLEMENTATION: Only show this block if isLandingPage is true */}
            {isLandingPage && (
                <>
                    <DropdownMenuItem asChild>
                        <Link
                            className="block w-full"
                            href={dashboard()} // Using your existing route helper
                            as="button"
                            onClick={cleanup}
                        >
                            {/* Using LayoutDashboard icon for better semantics */}
                            <LogIn className="mr-2 h-4 w-4" /> 
                            Dashboard
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                </>
            )}

            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full"
                        href={edit()}
                        as="button"
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}