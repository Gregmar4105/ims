import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
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
} from '@/components/ui/dropdown-menu';
import { usePage, router, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
    Download, Cloud, RefreshCw, CloudCheck, 
    ExternalLink, Copy, Check 
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1joMus-vAb-acTV8Jo6UiB1plPsoFfpA6MXQs5SwsvkE/edit?usp=sharing";

const CloudSync = ({ className, isSyncing }: { className?: string, isSyncing?: boolean }) => (
    <div className={`relative ${className} flex items-center justify-center`}>
        <Cloud className="h-full w-full" />
        <div className="absolute inset-0 flex items-center justify-center pt-1">
            <RefreshCw className={`h-[45%] w-[45%] ${isSyncing ? 'animate-spin-slow' : ''}`} />
        </div>
    </div>
);

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth, current_branch } = usePage<SharedData>().props;
    const branchName = current_branch?.branch_name || auth.user?.branch?.branch_name;

    const [isSyncing, setIsSyncing] = useState(false);
    const [showCheck, setShowCheck] = useState(false);
    const [isSystemSyncing, setIsSystemSyncing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);

    // Listen for global Inertia events to show "Live" sync status
    useEffect(() => {
        const startListener = () => setIsSystemSyncing(true);
        const finishListener = () => {
            setIsSystemSyncing(false);
            // Show check briefly after any system action
            setShowCheck(true);
            setTimeout(() => setShowCheck(false), 2000);
        };

        const unregisterStart = router.on('start', startListener);
        const unregisterFinish = router.on('finish', finishListener);

        return () => {
            unregisterStart();
            unregisterFinish();
        };
    }, []);

    const activeSyncing = isSyncing || isSystemSyncing;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(SHEET_URL);
        setHasCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setHasCopied(false), 2000);
    };

    const handleSync = () => {
        if (isSyncing) return;
        
        setIsSyncing(true);
        setShowCheck(false);
        setIsModalOpen(true);

        router.post('/google-sheets/sync-all', {}, {
            onSuccess: () => {
                toast.success('Google Sheets sync completed!');
                setShowCheck(true);
                setTimeout(() => setShowCheck(false), 3000);
            },
            onError: (errors) => {
                console.error('Sync failed:', errors);
                toast.error('Failed to sync Google Sheets');
            },
            onFinish: () => {
                setIsSyncing(false);
            },
            preserveScroll: true,
            preserveState: true,
        });
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
                                                        disabled={activeSyncing}
                                                        className={`flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-all duration-300 ${
                                                            activeSyncing ? 'text-blue-500' : showCheck ? 'text-green-500' : 'text-muted-foreground hover:text-blue-600'
                                                        }`}
                                                    >
                                                        {showCheck && !activeSyncing ? (
                                                            <CloudCheck className="h-5 w-5" />
                                                        ) : (
                                                            <CloudSync className="h-5 w-5" isSyncing={activeSyncing} />
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>{activeSyncing ? 'Syncing to Google Sheets...' : 'Sync to Google Sheets'}</TooltipContent>
                                            </Tooltip>
                                            <div className={`text-[10px] font-bold text-blue-500 transition-all duration-500 overflow-hidden whitespace-nowrap ${activeSyncing ? 'max-w-[100px] opacity-100 animate-pulse px-1' : 'max-w-0 opacity-0'}`}>
                                                SYNCING...
                                            </div>
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
                                                disabled={activeSyncing}
                                                className={`flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-all duration-300 ${
                                                    activeSyncing ? 'text-blue-500' : showCheck ? 'text-green-500' : 'text-muted-foreground hover:text-blue-600'
                                                }`}
                                            >
                                                {showCheck && !activeSyncing ? (
                                                    <CloudCheck className="h-5 w-5" />
                                                ) : (
                                                    <CloudSync className="h-5 w-5" isSyncing={activeSyncing} />
                                                )}
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent>{activeSyncing ? 'Syncing to Google Sheets...' : 'Sync to Google Sheets'}</TooltipContent>
                                    </Tooltip>
                                    <div className={`text-[10px] font-bold text-blue-500 transition-all duration-500 overflow-hidden whitespace-nowrap ${activeSyncing ? 'max-w-[100px] opacity-100 animate-pulse px-1' : 'max-w-0 opacity-0'}`}>
                                        SYNCING...
                                    </div>
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

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {isSyncing ? 'Syncing to Google Sheets' : 'Google Sheets Sync'}
                        </DialogTitle>
                        <DialogDescription>
                            {isSyncing 
                                ? 'Please wait while we reconcile your inventory with the cloud backup.' 
                                : 'Your inventory is currently being backed up in real-time.'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex flex-col items-center justify-center py-8 gap-6">
                        <div className="relative h-24 w-24">
                            <Cloud className={`h-full w-full ${isSyncing ? 'text-blue-500 animate-pulse' : 'text-green-500'}`} />
                            <div className="absolute inset-0 flex items-center justify-center pt-2">
                                {isSyncing ? (
                                    <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
                                ) : (
                                    <Check className="h-10 w-10 text-white bg-green-500 rounded-full p-1" />
                                )}
                            </div>
                        </div>

                        <div className="w-full space-y-4">
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border/50">
                                <div className="flex-1 truncate text-xs text-muted-foreground font-mono">
                                    {SHEET_URL}
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCopyLink}>
                                    {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-between gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Close
                        </Button>
                        <Button 
                            asChild
                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        >
                            <a href={SHEET_URL} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                Open Spreadsheet
                            </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </header>
    );
}

