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
    DropdownMenuTrigger,
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
import { Label } from '@/components/ui/label';

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
                <DialogContent className="sm:max-w-md overflow-hidden">
                    <DialogHeader className="flex flex-col items-center text-center">
                        <DialogTitle className="text-xl font-bold tracking-tight">
                            {isSyncing ? 'Synchronizing Data' : 'Cloud Sync Complete'}
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            {isSyncing 
                                ? 'Updating your Google Sheets with the latest inventory changes.' 
                                : 'Your inventory is fully reconciled with the cloud backup.'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex flex-col items-center justify-center py-6 gap-8">
                        {/* Centered Code-style Animation */}
                        <div className="p-6 bg-white dark:bg-black/10 border rounded-2xl shadow-sm relative group">
                            <div className="relative h-24 w-24">
                                <Cloud className={`h-full w-full transition-all duration-500 ${isSyncing ? 'text-blue-500 scale-110 pulse' : 'text-green-500'}`} />
                                <div className="absolute inset-0 flex items-center justify-center pt-2">
                                    {isSyncing ? (
                                        <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
                                    ) : (
                                        <CloudCheck className="h-12 w-12 text-green-600" />
                                    )}
                                </div>
                            </div>
                            {isSyncing && (
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg uppercase tracking-tighter">
                                    Live Sync
                                </div>
                            )}
                        </div>

                        {/* URL Section - Product Codes Style */}
                        <div className="w-full space-y-3">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest text-center block">
                                Google Sheets Spreadsheet URL
                            </Label>
                            <div className="flex flex-col gap-2">
                                <div className="p-3 bg-green-50/50 rounded-lg border-2 border-[#0F9D58]/30 text-center">
                                    <span className="text-[11px] text-[#0F9D58] font-mono break-all line-clamp-2 leading-relaxed font-bold">
                                        {SHEET_URL}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <Button 
                                        variant="outline" 
                                        className={`h-12 gap-2 font-bold transition-all border-2 ${hasCopied ? 'border-green-500 text-green-600 bg-green-50' : 'hover:border-blue-500 hover:text-blue-600'}`}
                                        onClick={handleCopyLink}
                                    >
                                        {hasCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                                        {hasCopied ? 'Copied' : 'Copy Link'}
                                    </Button>
                                    <Button 
                                        asChild
                                        className="h-12 gap-2 font-bold bg-[#0F9D58] hover:bg-[#0B8043] text-white border-2 border-transparent shadow-lg shadow-green-500/20"
                                    >
                                        <a href={SHEET_URL} target="_blank" rel="noopener noreferrer">
                                            {/* Google Sheets Logo SVG - 25% Bigger */}
                                            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M14 2H6C4.89 2 4 2.9 4 4V20C4 21.1 4.89 22 6 22H18C19.11 22 20 21.1 20 20V8L14 2Z" fill="#0F9D58"/>
                                                <path d="M14 8V2L20 8H14Z" fill="#81C784"/>
                                                <path d="M16 12H8V14H16V12ZM16 16H8V18H16V16ZM12 8H8V10H12V8Z" fill="white"/>
                                            </svg>
                                            Visit Google Sheets
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </header>
    );
}

