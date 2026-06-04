import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle, XCircle, Clock, User, ArrowRight, Barcode, QrCode, Store, Search, DollarSign, Briefcase, Printer, Settings2, Image, Wallet, Percent, ClipboardList, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Pagination from '@/components/Pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';


interface SaleItem {
    id: number;
    product: {
        name: string;
        barcode: string;
        qr_code: string;
        code: string | null;
    };
    custom_code: string | null;
    quantity: number;
    price: number;
    original_price: number | null;
}

interface Sale {
    id: number;
    branch_id: number;
    status: 'readied' | 'completed' | 'cancelled';
    notes: string | null;
    created_at: string;
    updated_at: string;
    branch: {
        branch_name: string;
    };
    readied_by: {
        name: string;
    };
    approved_by: {
        name: string;
    } | null;
    items: SaleItem[];
    payment_method?: string | null;
    ewallet_provider?: string | null;
    proof_of_payment_path?: string | null;
    cash_received?: number | null;
    change_amount?: number | null;
}

interface PaginatedData<T> {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Creator {
    id: number;
    name: string;
}

interface Expense {
    id: number;
    branch_id: number;
    name: string;
    amount: number;
    created_by: number;
    created_at: string;
    updated_at: string;
    creator?: Creator;
}

interface ServiceFee {
    id: number;
    branch_id: number;
    name: string;
    amount: number;
    created_by: number;
    created_at: string;
    updated_at: string;
    creator?: Creator;
}

interface Stats {
    today_sales: number;
    today_cash_sales: number;
    today_ewallet_sales: number;
    today_expenses: number;
    today_service_fees: number;
    cash_on_hand: number;
}

const breadcrumbs = [
    {
        title: 'Sales List',
        href: '/sales-list',
    },
];

export default function Index({ 
    sales, 
    stats, 
    filters,
    todaySales = [],
    todayExpenses = [],
    todayServiceFees = []
}: { 
    sales: PaginatedData<Sale>, 
    stats: Stats, 
    filters: { search?: string, date_from?: string, date_to?: string, status_filter?: string },
    todaySales?: Sale[],
    todayExpenses?: Expense[],
    todayServiceFees?: ServiceFee[]
}) {
    const { auth } = usePage<SharedData>().props;
    const userId = auth.user.id;

    const [search, setSearch] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [statusFilter, setStatusFilter] = useState(filters.status_filter || 'all');
    const [activeProofSale, setActiveProofSale] = useState<Sale | null>(null);
    const [showDelegation, setShowDelegation] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            // Only search is debounced
            if (search !== (filters.search || '')) {
                performSearch();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const performSearch = () => {
        router.get('/sales-list', {
            search,
            date_from: dateFrom,
            date_to: dateTo,
            status_filter: statusFilter
        }, { preserveState: true, replace: true, preserveScroll: true });
    };

    // Filter change handler
    useEffect(() => {
        if (dateFrom !== (filters.date_from || '') || dateTo !== (filters.date_to || '') || statusFilter !== (filters.status_filter || 'all')) {
            performSearch();
        }
    }, [dateFrom, dateTo, statusFilter]);

    const buildPrintUrl = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (statusFilter && statusFilter !== 'all') params.append('status_filter', statusFilter);

        return `/sales-list/print?${params.toString()}`;
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }).format(new Date(dateString));
    };

    const formatTimeOnly = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        }).format(new Date(dateString));
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Completed
                    </Badge>
                );
            case 'cancelled':
                return (
                    <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800">
                        <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancelled
                    </Badge>
                );
            default:
                return (
                    <Badge variant="secondary">
                        <Clock className="w-3.5 h-3.5 mr-1.5" /> {status}
                    </Badge>
                );
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales List" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Sales History</h1>
                        <p className="text-muted-foreground mt-1">View all completed and cancelled sales.</p>
                    </div>
                    <a href={buildPrintUrl()} target="_blank" rel="noopener noreferrer">
                        <Button className="flex gap-2">
                            <Printer className="w-4 h-4" /> Print List
                        </Button>
                    </a>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                            <CardTitle className="text-sm font-semibold text-muted-foreground">Today's Total Sales</CardTitle>
                            <Store className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-950 dark:text-gray-50">₱{stats.today_sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Cash: ₱{stats.today_cash_sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="text-gray-300 dark:text-zinc-700">|</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">E-Wallet: ₱{stats.today_ewallet_sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                            <CardTitle className="text-sm font-semibold text-muted-foreground">Today's Total Expenses</CardTitle>
                            <Wallet className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-650 dark:text-red-400">₱{stats.today_expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground mt-1.5">Logged operational payouts</p>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                            <CardTitle className="text-sm font-semibold text-muted-foreground">Today's Total Service Fees</CardTitle>
                            <Percent className="h-4 w-4 text-teal-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">₱{stats.today_service_fees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground mt-1.5">Logged service & extra charges</p>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-sm border-l-4 border-l-emerald-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                            <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Cash on Hand</CardTitle>
                            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </CardHeader>
                        <CardContent className="pb-3">
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">₱{stats.cash_on_hand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <Button 
                                variant={showDelegation ? "default" : "outline"} 
                                size="sm" 
                                onClick={() => setShowDelegation(!showDelegation)}
                                className={`mt-2 w-full flex items-center justify-center gap-1 text-xs transition-all font-bold ${
                                    showDelegation 
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent" 
                                        : "text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
                                }`}
                            >
                                <ClipboardList className="w-3.5 h-3.5" />
                                {showDelegation ? 'Hide Delegation' : 'Show Delegation'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {showDelegation ? (
                    <div className="space-y-6 animate-in fade-in-50 duration-200">
                        {/* Delegation Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                            <div>
                                <h2 className="text-xl font-bold text-emerald-955 dark:text-emerald-50 flex items-center gap-2">
                                    <ClipboardList className="w-5.5 h-5.5 text-emerald-600 dark:text-emerald-400" />
                                    Daily Sales & Cash Delegation
                                </h2>
                                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                                    Itemized breakdown of today's completed cash sales, e-wallet transactions, service fees, and logged expenses.
                                </p>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setShowDelegation(false)}
                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/20 flex items-center gap-1.5 font-medium"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Return to Sales History
                            </Button>
                        </div>

                        {/* Four Columns Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            
                            {/* Column 1: Cash Sales */}
                            <Card className="border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col bg-white dark:bg-zinc-950 min-h-[300px]">
                                <CardHeader className="pb-3 border-b border-emerald-100/50 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-950/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Cash Sales</CardTitle>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 font-bold text-[11px]">
                                            ₱{stats.today_cash_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-y-auto max-h-[350px]">
                                    {todaySales.filter(s => s.payment_method === 'cash').length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground px-4 text-center">
                                            <DollarSign className="w-8 h-8 mb-2 text-emerald-350 dark:text-emerald-855 opacity-40" />
                                            <p className="text-xs font-semibold">No cash sales today</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-emerald-100/50 dark:divide-emerald-900/10">
                                            {todaySales.filter(s => s.payment_method === 'cash').map((sale) => {
                                                const saleTotal = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                                return (
                                                    <div key={sale.id} className="p-3 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/5 transition-colors">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-350">#{sale.id}</span>
                                                                    <span className="text-[9px] text-muted-foreground truncate">({sale.branch?.branch_name})</span>
                                                                </div>
                                                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                                                    {sale.items.map(i => `${i.product?.name} (x${i.quantity})`).join(', ')}
                                                                </p>
                                                                <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatTimeOnly(sale.updated_at)}
                                                                </span>
                                                            </div>
                                                            <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 shrink-0">
                                                                ₱{saleTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Column 2: E-Wallet Sales */}
                            <Card className="border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col bg-white dark:bg-zinc-950 min-h-[300px]">
                                <CardHeader className="pb-3 border-b border-emerald-100/50 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-950/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-100">E-Wallet Sales</CardTitle>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 font-bold text-[11px]">
                                            ₱{stats.today_ewallet_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-y-auto max-h-[350px]">
                                    {todaySales.filter(s => s.payment_method === 'e-wallet').length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground px-4 text-center">
                                            <Wallet className="w-8 h-8 mb-2 text-emerald-355 dark:text-emerald-855 opacity-40" />
                                            <p className="text-xs font-semibold">No e-wallet sales today</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-emerald-100/50 dark:divide-emerald-900/10">
                                            {todaySales.filter(s => s.payment_method === 'e-wallet').map((sale) => {
                                                const saleTotal = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                                return (
                                                    <div key={sale.id} className="p-3 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/5 transition-colors">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-350">#{sale.id}</span>
                                                                    <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-none leading-none capitalize">
                                                                        {sale.ewallet_provider}
                                                                    </Badge>
                                                                    {sale.proof_of_payment_path && (
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => setActiveProofSale(sale)}
                                                                            className="text-[9px] text-primary hover:underline font-semibold flex items-center gap-0.5 bg-transparent border-none cursor-pointer p-0"
                                                                        >
                                                                            <Image className="w-2.5 h-2.5" /> Proof
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                                                    {sale.items.map(i => `${i.product?.name} (x${i.quantity})`).join(', ')}
                                                                </p>
                                                                <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatTimeOnly(sale.updated_at)}
                                                                </span>
                                                            </div>
                                                            <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 shrink-0">
                                                                ₱{saleTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Column 3: Expenses */}
                            <Card className="border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col bg-white dark:bg-zinc-950 min-h-[300px]">
                                <CardHeader className="pb-3 border-b border-emerald-100/50 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-950/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Expenses</CardTitle>
                                        <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200 font-bold text-[11px]">
                                            ₱{stats.today_expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-y-auto max-h-[350px]">
                                    {todayExpenses.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground px-4 text-center">
                                            <XCircle className="w-8 h-8 mb-2 text-red-300 dark:text-red-805 opacity-40" />
                                            <p className="text-xs font-semibold">No expenses today</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-emerald-100/50 dark:divide-emerald-900/10">
                                            {todayExpenses.map((expense) => (
                                                <div key={expense.id} className="p-3 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/5 transition-colors">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">{expense.name}</p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                                                    <User className="w-3 h-3" />
                                                                    {expense.creator?.name || 'Unknown'}
                                                                </span>
                                                            </div>
                                                            <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                                                                <Clock className="w-3 h-3" />
                                                                {formatTimeOnly(expense.created_at)}
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-xs text-red-650 dark:text-red-400 shrink-0">
                                                            ₱{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Column 4: Service Fees */}
                            <Card className="border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col bg-white dark:bg-zinc-950 min-h-[300px]">
                                <CardHeader className="pb-3 border-b border-emerald-100/50 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-950/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Service Fees</CardTitle>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 font-bold text-[11px]">
                                            ₱{stats.today_service_fees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-y-auto max-h-[350px]">
                                    {todayServiceFees.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground px-4 text-center">
                                            <Briefcase className="w-8 h-8 mb-2 text-emerald-355 dark:text-emerald-855 opacity-40" />
                                            <p className="text-xs font-semibold">No service fees today</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-emerald-100/50 dark:divide-emerald-900/10">
                                            {todayServiceFees.map((fee) => (
                                                <div key={fee.id} className="p-3 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/5 transition-colors">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">{fee.name}</p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                                                    <User className="w-3 h-3" />
                                                                    {fee.creator?.name || 'Unknown'}
                                                                </span>
                                                            </div>
                                                            <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                                                                <Clock className="w-3 h-3" />
                                                                {formatTimeOnly(fee.created_at)}
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 shrink-0">
                                                            ₱{Number(fee.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                        </div>

                        {/* Summary Panel */}
                        <div className="bg-emerald-50/30 dark:bg-emerald-950/5 border border-emerald-150 dark:border-emerald-900/30 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 mt-6">
                            <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 w-full md:w-auto">
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-350/80">Cash Sales (A)</span>
                                    <div className="text-xl font-bold text-emerald-955 dark:text-emerald-50 mt-1">₱{stats.today_cash_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-350/80">Service Fees (B)</span>
                                    <div className="text-xl font-bold text-emerald-955 dark:text-emerald-50 mt-1">₱{stats.today_service_fees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-red-650/80 dark:text-red-450/80">Expenses (C)</span>
                                    <div className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">₱{stats.today_expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div className="border-t sm:border-t-0 sm:border-l border-emerald-200/50 dark:border-emerald-800/30 pt-4 sm:pt-0 sm:pl-8">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600/80 dark:text-blue-400/80">E-Wallet Sales (Digital)</span>
                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">₱{stats.today_ewallet_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 px-6 py-4 rounded-xl shadow-sm text-center md:text-right w-full md:w-auto min-w-[240px]">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Net Cash on Hand (A + B - C)</span>
                                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                    ₱{stats.cash_on_hand.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Search Bar & Filters */}
                        <div className="flex flex-col md:flex-row items-end md:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                            <div className="relative flex-1 w-full min-w-[300px]">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search by ID, Branch..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md border">
                                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">From:</span>
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-sm outline-none w-[110px]"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md border">
                                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">To:</span>
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-sm outline-none w-[110px]"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                    />
                                </div>

                                {(dateFrom || dateTo || statusFilter !== 'all') && (
                                    <Button variant="ghost" size="icon" onClick={() => {
                                        setDateFrom('');
                                        setDateTo('');
                                        setStatusFilter('all');
                                    }}>
                                        <XCircle className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {sales.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/30">
                                <Store className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                                <h3 className="text-lg font-medium">No sales found</h3>
                                <p className="text-muted-foreground">Try adjusting your search or filters.</p>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {sales.data.map((sale) => (
                                    <Card key={sale.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-200">
                                        <CardHeader className="bg-muted/30 pb-4 border-b">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        {getStatusBadge(sale.status)}
                                                        <span className="text-sm text-muted-foreground font-mono">
                                                            #{sale.id}
                                                        </span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {sale.branch?.branch_name}
                                                        </Badge>
                                                        {sale.payment_method && (
                                                            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary capitalize font-normal text-xs">
                                                                {sale.payment_method === 'e-wallet' ? `E-Wallet (${sale.ewallet_provider})` : 'Cash'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1.5">
                                                            <Clock className="w-4 h-4" />
                                                            {formatDate(sale.updated_at)}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <User className="w-4 h-4" />
                                                            Readied by: {sale.readied_by?.name}
                                                        </span>
                                                        {sale.approved_by && (
                                                            <span className="flex items-center gap-1.5">
                                                                <CheckCircle className="w-4 h-4" />
                                                                Approved by: {sale.approved_by.name}
                                                            </span>
                                                        )}
                                                        {sale.payment_method === 'cash' && (
                                                            <span className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/30 px-2 py-0.5 rounded">
                                                                Cash Received: ₱{Number(sale.cash_received).toFixed(2)} | Change: ₱{Number(sale.change_amount).toFixed(2)}
                                                            </span>
                                                        )}
                                                        {sale.payment_method === 'e-wallet' && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30 px-2 py-0.5 rounded">
                                                                    E-Wallet: {sale.ewallet_provider}
                                                                </span>
                                                                {sale.proof_of_payment_path && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => setActiveProofSale(sale)}
                                                                        className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 bg-transparent border-none cursor-pointer p-0"
                                                                    >
                                                                        <Image className="w-3.5 h-3.5" /> View Proof
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center mt-4 sm:mt-0">
                                                    <a href={`/sales/${sale.id}/print`} target="_blank" rel="noopener noreferrer">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex items-center gap-2"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" /> Print
                                                        </Button>
                                                    </a>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader className="bg-muted/10">
                                                        <TableRow>
                                                            <TableHead className="w-[40%] pl-6">Product</TableHead>
                                                            <TableHead>Identifiers</TableHead>
                                                            <TableHead className="text-right">Price</TableHead>
                                                            <TableHead className="text-right pr-6">Quantity</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {sale.items.map((item) => (
                                                            <TableRow key={item.id} className="hover:bg-muted/5">
                                                                <TableCell className="font-medium pl-6">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                                            <Package className="w-4 h-4" />
                                                                        </div>
                                                                        {item.product?.name}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                                                        {item.custom_code ? (
                                                                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                                                <span className="text-[10px] text-muted-foreground">Code:</span>
                                                                                <span className="font-mono">{item.custom_code}</span>
                                                                            </div>
                                                                        ) : item.product?.code ? (
                                                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                                <span className="text-[10px] text-muted-foreground">Code:</span>
                                                                                <span className="font-mono">{item.product.code}</span>
                                                                            </div>
                                                                        ) : null}
                                                                        {item.product?.barcode && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Barcode className="w-3.5 h-3.5" />
                                                                                <span className="font-mono">{item.product.barcode}</span>
                                                                            </div>
                                                                        )}
                                                                        {item.product?.qr_code && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <QrCode className="w-3.5 h-3.5" />
                                                                                <span className="font-mono">{item.product.qr_code}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="font-bold">₱{Number(item.price * item.quantity).toFixed(2)}</span>
                                                                        <div className="flex flex-col items-end text-[10px]">
                                                                            {item.original_price && Number(item.original_price) !== Number(item.price) && (
                                                                                <span className="text-muted-foreground line-through">₱{Number(item.original_price).toFixed(2)}</span>
                                                                            )}
                                                                            <span className="text-muted-foreground">₱{Number(item.price).toFixed(2)} ea</span>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right font-semibold pr-6">
                                                                    {item.quantity}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {sales.data.length > 0 && sales.last_page > 1 && (
                            <Pagination links={sales.links} />
                        )}
                    </>
                )}

                <Dialog open={!!activeProofSale} onOpenChange={(open) => !open && setActiveProofSale(null)}>
                    <DialogContent className="max-w-md sm:max-w-lg p-6 rounded-2xl border border-primary/10 shadow-2xl bg-white dark:bg-zinc-950">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <Image className="w-5 h-5 text-primary" />
                                Proof of Payment
                            </DialogTitle>
                            {activeProofSale && (
                                <DialogDescription className="text-sm text-muted-foreground mt-1">
                                    Sale <span className="font-mono font-semibold text-foreground">#{activeProofSale.id}</span> paid via <span className="font-semibold text-primary">{activeProofSale.ewallet_provider}</span>
                                </DialogDescription>
                            )}
                        </DialogHeader>
                        {activeProofSale?.proof_of_payment_path && (
                            <div className="mt-4 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 border rounded-xl overflow-hidden p-2 relative group min-h-[300px]">
                                <img
                                    src={`/storage/${activeProofSale.proof_of_payment_path}`}
                                    alt={`Proof of payment for sale #${activeProofSale.id}`}
                                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md transition-transform duration-200 hover:scale-[1.02]"
                                />
                                <a 
                                    href={`/storage/${activeProofSale.proof_of_payment_path}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute bottom-4 right-4 bg-zinc-900/80 hover:bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg font-medium transition-colors flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                >
                                    Open original image
                                </a>
                            </div>
                        )}
                        <DialogFooter className="mt-6 flex justify-end">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setActiveProofSale(null)}
                                className="w-full sm:w-auto"
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
