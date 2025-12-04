import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { Store } from 'lucide-react';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage<SharedData>().props;
    const branchName = auth.user?.branch?.branch_name;

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            {branchName && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border/50">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                        {branchName}
                    </span>
                </div>
            )}
        </header>
    );
}
