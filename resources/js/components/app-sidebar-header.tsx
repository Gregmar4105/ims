import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { usePage, router } from '@inertiajs/react';
import { SharedData } from '@/types';
import { Store, ChevronDown } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@inertiajs/react';
import { Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth, current_branch } = usePage<SharedData>().props;
    const branchName = current_branch?.branch_name || auth.user?.branch?.branch_name;

    const [isSyncing, setIsSyncing] = useState(false);
    const [showCheck, setShowCheck] = useState(false);

    const handleSync = async () => {
        if (isSyncing) return;
        
        setIsSyncing(true);
        setShowCheck(false);

        try {
            await axios.post(route('google-sheets.sync-all'));
            toast.success('Google Sheets sync completed!');
            setShowCheck(true);
            setTimeout(() => setShowCheck(false), 3000);
        } catch (error) {
            console.error('Sync failed:', error);
            toast.error('Failed to sync Google Sheets');
        } finally {
            setIsSyncing(false);
        }
    };

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
                                <div className="hidden md:flex items-center gap-2">
                                    <TooltipProvider>
                                        <div className="flex items-center gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button 
                                                        onClick={handleSync}
                                                        disabled={isSyncing}
                                                        className={`flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-all duration-300 ${
                                                            isSyncing ? 'text-blue-500' : showCheck ? 'text-green-500' : 'text-muted-foreground hover:text-blue-600'
                                                        }`}
                                                    >
                                                        {showCheck ? (
                                                            <CheckCircle2 className="h-5 w-5" />
                                                        ) : (
                                                            <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin-slow' : ''}`} />
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>{isSyncing ? 'Syncing to Google Sheets...' : 'Sync to Google Sheets'}</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Link href="/downloads" className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-blue-600">
                                                        <Download className="h-4 w-4" />
                                                    </Link>
                                                </TooltipTrigger>
                                                <TooltipContent>Download App</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TooltipProvider>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border/50 hover:bg-muted transition-colors outline-none">
                                            <Store className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                {branchName}
                                            </span>
                                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                        </button>
                                    </DropdownMenuTrigger>
                                </div>
                            <DropdownMenuContent align="end" className="w-56">
                                {auth.branches.map((branch) => (
                                    <DropdownMenuItem
                                        key={branch.id}
                                        onClick={() => router.post('/branches/switch', { branch_id: branch.id })}
                                        className="cursor-pointer font-medium"
                                    >
                                        {branch.branch_name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="hidden md:flex items-center gap-2">
                            <TooltipProvider>
                                <div className="flex items-center gap-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button 
                                                onClick={handleSync}
                                                disabled={isSyncing}
                                                className={`flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-all duration-300 ${
                                                    isSyncing ? 'text-blue-500' : showCheck ? 'text-green-500' : 'text-muted-foreground hover:text-blue-600'
                                                }`}
                                            >
                                                {showCheck ? (
                                                    <CheckCircle2 className="h-5 w-5" />
                                                ) : (
                                                    <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin-slow' : ''}`} />
                                                )}
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>{isSyncing ? 'Syncing to Google Sheets...' : 'Sync to Google Sheets'}</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link href="/downloads" className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-blue-600">
                                                <Download className="h-4 w-4" />
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>Download App</TooltipContent>
                                    </Tooltip>
                                </div>
                            </TooltipProvider>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border/50">
                                <Store className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                    {branchName}
                                </span>
                            </div>
                        </div>
                    )
                )}
                <NotificationBell />
            </div>
        </header>
    );
}

