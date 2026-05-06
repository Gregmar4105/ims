import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { usePage, router } from '@inertiajs/react';
import { SharedData } from '@/types';
import { Store, ChevronDown } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth, current_branch } = usePage<SharedData>().props;
    const branchName = current_branch?.branch_name || auth.user?.branch?.branch_name;

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4 print:hidden">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex items-center gap-2">
                {branchName && (
                    auth.branches && auth.branches.length > 0 ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border/50 hover:bg-muted transition-colors outline-none">
                                    <Store className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                        {branchName}
                                    </span>
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                {auth.branches.map((branch) => (
                                    <DropdownMenuItem
                                        key={branch.id}
                                        onClick={() => router.get('/branch-dashboard', { branch_id: branch.id })}
                                        className="cursor-pointer font-medium"
                                    >
                                        {branch.branch_name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border/50">
                            <Store className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                {branchName}
                            </span>
                        </div>
                    )
                )}
                <NotificationBell />
            </div>
        </header>
    );
}

