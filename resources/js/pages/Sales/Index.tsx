import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle, XCircle, Clock, User, ArrowRight, Barcode, QrCode, Store, Search, DollarSign, Briefcase, Printer, Settings2, Image, Wallet, Percent, ClipboardList, ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';
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
    status: 'readied' | 'completed' | 'cancelled' | 'reserved';
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
    home_credited_name?: string | null;
    downpayment?: number | null;
    cash_received?: number | null;
    change_amount?: number | null;
    customer_name?: string | null;
    reservation_buy_date?: string | null;
    returns?: Array<{
        id: number;
        product_id: number;
        quantity: number;
        reason: string | null;
        return_type: 'refund' | 'exchange';
        replacement_product_id?: number | null;
        replacement_quantity?: number | null;
        refund_amount: number;
        restored_to_inventory: boolean;
        product?: {
            name: string;
        } | null;
        replacement_product?: {
            name: string;
        } | null;
    }>;
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
    today_home_credit_sales: number;
    today_reservation_sales: number;
    today_expenses: number;
    today_service_fees: number;
    today_returns_sum: number;
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
    filters: { 
        search?: string; 
        date_from?: string; 
        date_to?: string; 
        status_filter?: string;
        payment_method?: string;
        date_preset?: string;
    },
    todaySales?: Sale[],
    todayExpenses?: Expense[],
    todayServiceFees?: ServiceFee[]
}) {
    const { auth, current_branch } = usePage<SharedData>().props;
    const userId = auth.user.id;
    const isBranchAdmin = auth.roles.includes('Branch Administrator') && !auth.roles.includes('System Administrator');
    const isSystemAdmin = auth.roles.includes('System Administrator');

    const [showDeleteHistoryModal, setShowDeleteHistoryModal] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteHistory = (e: React.FormEvent) => {
        e.preventDefault();
        setDeleteError('');
        setIsDeleting(true);

        router.post('/history/delete-branch-history', {
            password: confirmPassword
        }, {
            onSuccess: () => {
                setShowDeleteHistoryModal(false);
                setConfirmPassword('');
                setIsDeleting(false);
            },
            onError: (errors) => {
                setIsDeleting(false);
                if (errors.password) {
                    setDeleteError(errors.password);
                } else if (errors.error) {
                    setDeleteError(errors.error);
                } else {
                    setDeleteError('An error occurred. Please try again.');
                }
            }
        });
    };

    const [search, setSearch] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState(isBranchAdmin ? '' : (filters.date_from || ''));
    const [dateTo, setDateTo] = useState(isBranchAdmin ? '' : (filters.date_to || ''));
    const [statusFilter, setStatusFilter] = useState(filters.status_filter || 'all');
    const [paymentMethod, setPaymentMethod] = useState(filters.payment_method || 'all');
    const [datePreset, setDatePreset] = useState(isBranchAdmin ? 'today' : (filters.date_preset || 'today'));
    const [activeProofSale, setActiveProofSale] = useState<Sale | null>(null);
    const [showDelegation, setShowDelegation] = useState(typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('show_delegation') === 'true' : false);

    const getPeriodStart = () => {
        if (datePreset === 'today') {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            return d;
        } else if (datePreset === 'weekly') {
            const d = new Date();
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            return monday;
        } else if (datePreset === 'monthly') {
            const d = new Date();
            const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
            firstDay.setHours(0, 0, 0, 0);
            return firstDay;
        } else if (datePreset === 'ytd') {
            const d = new Date();
            const firstDay = new Date(d.getFullYear(), 0, 1);
            firstDay.setHours(0, 0, 0, 0);
            return firstDay;
        } else if (datePreset === 'custom' && dateFrom) {
            const d = new Date(dateFrom);
            d.setHours(0, 0, 0, 0);
            return d;
        }
        return null;
    };

    const periodStart = getPeriodStart();

    const pureCashSales = todaySales.filter(s => s.payment_method === 'cash');
    const pureCashSalesTotal = pureCashSales.reduce((sum, sale) => {
        return sum + sale.items.reduce((s, i) => s + (i.price * i.quantity), 0);
    }, 0);

    const homeCreditSales = todaySales.filter(s => s.payment_method === 'home_credit');
    const totalHomeCreditSales = stats.today_home_credit_sales;
    const totalHomeCreditDownpayment = homeCreditSales.reduce((sum, s) => sum + Number(s.downpayment || 0), 0);
    const totalHomeCreditLeft = totalHomeCreditSales - totalHomeCreditDownpayment;

    const reservationSales = todaySales.filter(s => s.payment_method === 'reservation');
    const totalReservationSales = stats.today_reservation_sales;
    const totalReservationDownpayment = reservationSales.reduce((sum, s) => {
        const saleCreatedAt = new Date(s.created_at);
        if (s.status === 'reserved' || !periodStart || saleCreatedAt >= periodStart) {
            return sum + Number(s.downpayment || 0);
        }
        return sum;
    }, 0);
    const totalReservationLeft = reservationSales.reduce((sum, s) => {
        if (s.status === 'reserved') {
            const saleTotal = s.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            return sum + (saleTotal - Number(s.downpayment || 0));
        }
        return sum;
    }, 0);

    const cashSalesEntries: Array<{
        id: number;
        type: 'cash_sale' | 'home_credit_downpayment' | 'reservation_downpayment' | 'reservation_remaining_cash' | 'reservation_forfeited_downpayment';
        description: string;
        branchName: string;
        time: string;
        amount: number;
        sale: Sale;
    }> = [];

    todaySales.forEach(sale => {
        const saleTotal = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        if (sale.payment_method === 'cash') {
            cashSalesEntries.push({
                id: sale.id,
                type: 'cash_sale',
                description: sale.items.map(i => `${i.product?.name} (x${i.quantity})`).join(', '),
                branchName: sale.branch?.branch_name,
                time: sale.updated_at,
                amount: saleTotal,
                sale: sale
            });
        } else if (sale.payment_method === 'home_credit') {
            if (Number(sale.downpayment) > 0) {
                cashSalesEntries.push({
                    id: sale.id,
                    type: 'home_credit_downpayment',
                    description: `Downpayment for Home Credit (Customer: ${sale.home_credited_name || 'Bikes and Accessories'})`,
                    branchName: sale.branch?.branch_name,
                    time: sale.updated_at,
                    amount: Number(sale.downpayment),
                    sale: sale
                });
            }
        } else if (sale.payment_method === 'reservation') {
            const saleCreatedAt = new Date(sale.created_at);
            if (sale.status === 'reserved') {
                if (Number(sale.downpayment) > 0) {
                    cashSalesEntries.push({
                        id: sale.id,
                        type: 'reservation_downpayment',
                        description: `Downpayment for Reservation (Customer: ${sale.customer_name})`,
                        branchName: sale.branch?.branch_name,
                        time: sale.updated_at,
                        amount: Number(sale.downpayment),
                        sale: sale
                    });
                }
            } else if (sale.status === 'completed') {
                if (!periodStart || saleCreatedAt >= periodStart) {
                    if (Number(sale.downpayment) > 0) {
                        cashSalesEntries.push({
                            id: sale.id,
                            type: 'reservation_downpayment',
                            description: `Downpayment for Reservation (Customer: ${sale.customer_name})`,
                            branchName: sale.branch?.branch_name,
                            time: sale.created_at,
                            amount: Number(sale.downpayment),
                            sale: sale
                        });
                    }
                }
                
                if (!sale.ewallet_provider) {
                    const remainingAmount = saleTotal - Number(sale.downpayment || 0);
                    if (remainingAmount > 0) {
                        cashSalesEntries.push({
                            id: sale.id,
                            type: 'reservation_remaining_cash',
                            description: `Remaining balance for Reservation (Customer: ${sale.customer_name})`,
                            branchName: sale.branch?.branch_name,
                            time: sale.updated_at,
                            amount: remainingAmount,
                            sale: sale
                        });
                    }
                }
            } else if (sale.status === 'cancelled') {
                if (!periodStart || saleCreatedAt >= periodStart) {
                    if (Number(sale.downpayment) > 0) {
                        cashSalesEntries.push({
                            id: sale.id,
                            type: 'reservation_forfeited_downpayment',
                            description: `Forfeited Downpayment for Cancelled Reservation (Customer: ${sale.customer_name})`,
                            branchName: sale.branch?.branch_name,
                            time: sale.updated_at,
                            amount: Number(sale.downpayment),
                            sale: sale
                        });
                    }
                }
            }
        }
    });

    const ewalletSalesFilter = todaySales.filter(s => {
        if (s.payment_method === 'e-wallet') return true;
        if (s.payment_method === 'reservation' && s.status === 'completed' && s.ewallet_provider) return true;
        return false;
    });

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
            status_filter: statusFilter,
            payment_method: paymentMethod,
            date_preset: datePreset
        }, { preserveState: true, replace: true, preserveScroll: true });
    };

    // Filter change handler
    useEffect(() => {
        if (
            dateFrom !== (filters.date_from || '') || 
            dateTo !== (filters.date_to || '') || 
            statusFilter !== (filters.status_filter || 'all') ||
            paymentMethod !== (filters.payment_method || 'all') ||
            datePreset !== (filters.date_preset || 'today')
        ) {
            performSearch();
        }
    }, [dateFrom, dateTo, statusFilter, paymentMethod, datePreset]);

    const handlePresetChange = (preset: string) => {
        setDatePreset(preset);
        setDateFrom('');
        setDateTo('');
    };

    const handleDateFromChange = (val: string) => {
        setDateFrom(val);
        setDatePreset('custom');
    };

    const handleDateToChange = (val: string) => {
        setDateTo(val);
        setDatePreset('custom');
    };

    const buildPrintUrl = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (statusFilter && statusFilter !== 'all') params.append('status_filter', statusFilter);
        if (paymentMethod && paymentMethod !== 'all') params.append('payment_method', paymentMethod);
        if (datePreset) params.append('date_preset', datePreset);

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
            case 'reserved':
                return (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold">
                        <Clock className="w-3.5 h-3.5 mr-1.5" /> Reserved
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
                    <div className="flex items-center gap-2">
                        {isSystemAdmin && current_branch && (
                            <Button 
                                variant="destructive" 
                                onClick={() => {
                                    setConfirmPassword('');
                                    setDeleteError('');
                                    setShowDeleteHistoryModal(true);
                                }}
                                className="flex gap-2 animate-in fade-in zoom-in-95 duration-150"
                            >
                                <Trash2 className="w-4 h-4" /> Delete History
                            </Button>
                        )}
                        <a href={buildPrintUrl()} target="_blank" rel="noopener noreferrer">
                            <Button className="flex gap-2">
                                <Printer className="w-4 h-4" /> Print List
                            </Button>
                        </a>
                    </div>
                </div>

                {/* Date Preset Toggles & Custom Date Range */}
                {!isBranchAdmin && (
                    <div className="flex flex-row items-center flex-wrap gap-3 bg-white dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm w-fit">
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg overflow-x-auto">
                            {[
                                { value: 'today', label: 'Today' },
                                { value: 'weekly', label: 'Weekly' },
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'ytd', label: 'YTD' },
                                { value: 'all', label: 'All Time' }
                            ].map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => handlePresetChange(preset.value)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                                        datePreset === preset.value
                                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/50 dark:border-zinc-700'
                                            : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-850'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="hidden sm:block h-6 w-px bg-zinc-200 dark:bg-zinc-850" />

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-muted/20 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">From:</span>
                                <input
                                    type="date"
                                    className="bg-transparent border-none text-xs outline-none w-[110px] dark:text-zinc-100"
                                    value={dateFrom}
                                    onChange={(e) => handleDateFromChange(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-muted/20 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">To:</span>
                                <input
                                    type="date"
                                    className="bg-transparent border-none text-xs outline-none w-[110px] dark:text-zinc-100"
                                    value={dateTo}
                                    onChange={(e) => handleDateToChange(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                            <CardTitle className="text-sm font-semibold text-muted-foreground">
                                {datePreset === 'today' ? "Today's" : datePreset === 'weekly' ? "Weekly" : datePreset === 'monthly' ? "Monthly" : datePreset === 'ytd' ? "YTD" : datePreset === 'all' ? "All-Time" : "Period's"} Total Sales
                            </CardTitle>
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
                            <CardTitle className="text-sm font-semibold text-muted-foreground">
                                {datePreset === 'today' ? "Today's" : datePreset === 'weekly' ? "Weekly" : datePreset === 'monthly' ? "Monthly" : datePreset === 'ytd' ? "YTD" : datePreset === 'all' ? "All-Time" : "Period's"} Total Expenses
                            </CardTitle>
                            <Wallet className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-650 dark:text-red-400">₱{stats.today_expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground mt-1.5">Logged operational payouts</p>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                            <CardTitle className="text-sm font-semibold text-muted-foreground">
                                {datePreset === 'today' ? "Today's" : datePreset === 'weekly' ? "Weekly" : datePreset === 'monthly' ? "Monthly" : datePreset === 'ytd' ? "YTD" : datePreset === 'all' ? "All-Time" : "Period's"} Total Service Fees
                            </CardTitle>
                            <Percent className="h-4 w-4 text-teal-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">₱{stats.today_service_fees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground mt-1.5">Logged service & extra charges</p>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-sm border-l-4 border-l-emerald-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                            <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                {datePreset === 'today' ? "Cash" : datePreset === 'weekly' ? "Weekly Cash" : datePreset === 'monthly' ? "Monthly Cash" : datePreset === 'ytd' ? "YTD Cash" : datePreset === 'all' ? "All-Time Cash" : "Period Cash"} on Hand
                            </CardTitle>
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
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-50/50 dark:bg-emerald-955/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                            <div>
                                <h2 className="text-xl font-bold text-emerald-955 dark:text-emerald-50 flex items-center gap-2">
                                    <ClipboardList className="w-5.5 h-5.5 text-emerald-600 dark:text-emerald-400" />
                                    {datePreset === 'today' ? "Daily" : datePreset === 'weekly' ? "Weekly" : datePreset === 'monthly' ? "Monthly" : datePreset === 'ytd' ? "YTD" : datePreset === 'all' ? "All-Time" : "Selected Period"} Sales & Cash Delegation
                                </h2>
                                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                                    Itemized breakdown of {datePreset === 'today' ? "today's" : datePreset === 'weekly' ? "this week's" : datePreset === 'monthly' ? "this month's" : datePreset === 'ytd' ? "this year's" : "the selected period's"} completed cash sales, e-wallet transactions, service fees, and logged expenses.
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

                        {/* Three Columns Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            {/* Column 1: Cash Sales */}
                            <Card className="border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col bg-white dark:bg-zinc-950 h-[380px]">
                                <CardHeader className="pb-3 border-b border-emerald-100/50 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-950/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Cash Sales</CardTitle>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-955/20 dark:text-emerald-400 border-emerald-200 font-bold text-[11px]">
                                            ₱{stats.today_cash_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-y-auto">
                                    {cashSalesEntries.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground px-4 text-center">
                                            <DollarSign className="w-8 h-8 mb-2 text-emerald-355 dark:text-emerald-855 opacity-40" />
                                            <p className="text-xs font-semibold">No cash sales today</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-emerald-100/50 dark:divide-emerald-900/10">
                                            {cashSalesEntries.map((entry) => {
                                                return (
                                                    <div key={`${entry.type}-${entry.id}`} className="p-3 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/5 transition-colors">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-350">#{entry.id}</span>
                                                                    <span className="text-[9px] text-muted-foreground truncate">({entry.branchName})</span>
                                                                </div>
                                                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                                                    {entry.description}
                                                                </p>
                                                                <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatTimeOnly(entry.time)}
                                                                </span>
                                                            </div>
                                                            <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 shrink-0">
                                                                ₱{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                            <Card className="border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col bg-white dark:bg-zinc-950 h-[380px]">
                                <CardHeader className="pb-3 border-b border-emerald-100/50 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-955/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-100">E-Wallet Sales</CardTitle>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 font-bold text-[11px]">
                                            ₱{stats.today_ewallet_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-y-auto">
                                    {ewalletSalesFilter.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground px-4 text-center">
                                            <Wallet className="w-8 h-8 mb-2 text-emerald-355 dark:text-emerald-855 opacity-40" />
                                            <p className="text-xs font-semibold">No e-wallet sales today</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-emerald-100/50 dark:divide-emerald-900/10">
                                            {ewalletSalesFilter.map((sale) => {
                                                const saleTotal = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                                const displayAmount = sale.payment_method === 'reservation' 
                                                    ? (saleTotal - Number(sale.downpayment || 0))
                                                    : saleTotal;
                                                return (
                                                    <div key={sale.id} className="p-3 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/5 transition-colors">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-350">#{sale.id}</span>
                                                                    <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-none leading-none capitalize">
                                                                        {sale.ewallet_provider}
                                                                    </Badge>
                                                                    {sale.payment_method === 'reservation' && (
                                                                        <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-yellow-50 text-yellow-700 border-none leading-none font-bold">
                                                                            Reservation Bal.
                                                                        </Badge>
                                                                    )}
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
                                                                ₱{displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Column 3: Home Credit */}
                            <Card className="border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col bg-white dark:bg-zinc-950 h-[380px]">
                                <CardHeader className="pb-3 border-b border-emerald-100/50 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-955/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Home Credit</CardTitle>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 font-bold text-[11px]">
                                            ₱{totalHomeCreditSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col gap-0.5 mt-1.5 text-[10px] text-muted-foreground border-t border-dashed border-emerald-100/50 dark:border-emerald-900/20 pt-1.5">
                                        <div className="flex justify-between">
                                            <span>Cash (DP):</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">₱{totalHomeCreditDownpayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>To Receive:</span>
                                            <span className="font-semibold text-purple-600 dark:text-purple-400">₱{totalHomeCreditLeft.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-y-auto">
                                    {todaySales.filter(s => s.payment_method === 'home_credit').length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground px-4 text-center">
                                            <Percent className="w-8 h-8 mb-2 text-emerald-355 dark:text-emerald-855 opacity-40" />
                                            <p className="text-xs font-semibold">No Home Credit today</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-emerald-100/50 dark:divide-emerald-900/10">
                                            {todaySales.filter(s => s.payment_method === 'home_credit').map((sale) => {
                                                const saleTotal = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                                return (
                                                    <div key={sale.id} className="p-3 hover:bg-emerald-50/20 dark:hover:bg-emerald-955/5 transition-colors">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-350">#{sale.id}</span>
                                                                    <span className="text-[9px] text-muted-foreground truncate">({sale.branch?.branch_name})</span>
                                                                </div>
                                                                <p className="text-[10px] font-semibold text-gray-900 dark:text-gray-100 mt-1 truncate">
                                                                    {sale.home_credited_name || 'Bikes and Accessories'}
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                                                    {sale.items.map(i => `${i.product?.name} (x${i.quantity})`).join(', ')}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                                    <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {formatTimeOnly(sale.updated_at)}
                                                                    </span>
                                                                    {Number(sale.downpayment) > 0 && (
                                                                        <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-emerald-50 text-emerald-700 border-none leading-none">
                                                                            DP: ₱{Number(sale.downpayment).toFixed(0)}
                                                                        </Badge>
                                                                    )}
                                                                    <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-purple-50 text-purple-700 border-none leading-none">
                                                                        Left: ₱{(saleTotal - Number(sale.downpayment || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                    </Badge>
                                                                </div>
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

                            {/* Column 4: Expenses */}
                            <Card className="border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col bg-white dark:bg-zinc-950 h-[380px]">
                                <CardHeader className="pb-3 border-b border-emerald-100/50 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-955/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Expenses</CardTitle>
                                        <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200 font-bold text-[11px]">
                                            ₱{stats.today_expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-y-auto">
                                    {todayExpenses.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground px-4 text-center">
                                            <XCircle className="w-8 h-8 mb-2 text-red-300 dark:text-red-805 opacity-40" />
                                            <p className="text-xs font-semibold">No expenses today</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-emerald-100/50 dark:divide-emerald-900/10">
                                            {todayExpenses.map((expense) => (
                                                <div key={expense.id} className="p-3 hover:bg-emerald-50/20 dark:hover:bg-emerald-955/5 transition-colors">
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
                                                        <span className="font-bold text-xs text-red-655 dark:text-red-450 shrink-0">
                                                            ₱{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Column 5: Service Fees */}
                            <Card className="border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col bg-white dark:bg-zinc-950 h-[380px]">
                                <CardHeader className="pb-3 border-b border-emerald-100/50 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-955/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Service Fees</CardTitle>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 font-bold text-[11px]">
                                            ₱{stats.today_service_fees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-y-auto">
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

                            {/* Column 6: Reservations */}
                            <Card className="border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex flex-col bg-white dark:bg-zinc-950 h-[380px]">
                                <CardHeader className="pb-3 border-b border-emerald-100/50 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-955/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-1">
                                            <Clock className="w-4 h-4 text-blue-500" />
                                            Reservations
                                        </CardTitle>
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 font-bold text-[11px]">
                                            ₱{totalReservationSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col gap-0.5 mt-1.5 text-[10px] text-muted-foreground border-t border-dashed border-emerald-100/50 dark:border-emerald-900/20 pt-1.5">
                                        <div className="flex justify-between">
                                            <span>Cash (DP):</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">₱{totalReservationDownpayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>To Receive:</span>
                                            <span className="font-semibold text-blue-600 dark:text-blue-400">₱{totalReservationLeft.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-y-auto">
                                    {todaySales.filter(s => s.payment_method === 'reservation').length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground px-4 text-center">
                                            <Clock className="w-8 h-8 mb-2 text-emerald-355 dark:text-emerald-855 opacity-40" />
                                            <p className="text-xs font-semibold">No reservations today</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-emerald-100/50 dark:divide-emerald-900/10">
                                            {todaySales.filter(s => s.payment_method === 'reservation').map((sale) => {
                                                const saleTotal = sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                                return (
                                                    <div key={sale.id} className="p-3 hover:bg-emerald-50/20 dark:hover:bg-emerald-955/5 transition-colors">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-350">#{sale.id}</span>
                                                                    <span className="text-[9px] text-muted-foreground truncate">({sale.branch?.branch_name})</span>
                                                                    {sale.status === 'reserved' ? (
                                                                        <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-yellow-50 text-yellow-700 border-none leading-none font-bold">
                                                                            Reserved
                                                                        </Badge>
                                                                    ) : sale.status === 'cancelled' ? (
                                                                        <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-red-50 text-red-700 border-none leading-none font-bold">
                                                                            Cancelled
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-green-50 text-green-700 border-none leading-none font-bold">
                                                                            Completed
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] font-semibold text-gray-900 dark:text-gray-100 mt-1 truncate">
                                                                    {sale.customer_name}
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                                                    {sale.items.map(i => `${i.product?.name} (x${i.quantity})`).join(', ')}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                                    <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {formatTimeOnly(sale.updated_at)}
                                                                    </span>
                                                                    <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-emerald-50 text-emerald-700 border-none leading-none">
                                                                        DP: ₱{Number(sale.downpayment).toFixed(0)}
                                                                    </Badge>
                                                                    {sale.status === 'reserved' ? (
                                                                        <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-blue-50 text-blue-700 border-none leading-none">
                                                                            Left: ₱{(saleTotal - Number(sale.downpayment || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                        </Badge>
                                                                    ) : sale.status === 'cancelled' ? (
                                                                        <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-red-50 text-red-700 border-none leading-none font-medium">
                                                                            Forfeited (Non-refundable)
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-gray-100 text-gray-700 border-none leading-none font-medium">
                                                                            Paid ({sale.ewallet_provider ? 'E-Wallet' : 'Cash'})
                                                                        </Badge>
                                                                    )}
                                                                </div>
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

                        </div>

                        {/* Summary Panel */}
                        <div className="bg-emerald-50/30 dark:bg-emerald-955/5 border border-emerald-150 dark:border-emerald-900/30 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 mt-6">
                            <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 w-full md:w-auto flex-wrap">
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
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Returns (D)</span>
                                    <div className="text-xl font-bold text-red-605 dark:text-red-400 mt-1">₱{stats.today_returns_sum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div className="border-t sm:border-t-0 sm:border-l border-emerald-200/50 dark:border-emerald-800/30 pt-4 sm:pt-0 sm:pl-8">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600/80 dark:text-blue-400/80">E-Wallet Sales (Digital)</span>
                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">₱{stats.today_ewallet_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div className="border-t sm:border-t-0 sm:border-l border-emerald-200/50 dark:border-emerald-800/30 pt-4 sm:pt-0 sm:pl-8">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-purple-650/80 dark:text-purple-405/80">Home Credit Sales</span>
                                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">₱{stats.today_home_credit_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div className="border-t sm:border-t-0 sm:border-l border-emerald-200/50 dark:border-emerald-800/30 pt-4 sm:pt-0 sm:pl-8">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-650/80 dark:text-blue-405/80">Reservation Sales</span>
                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">₱{stats.today_reservation_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 px-6 py-4 rounded-xl shadow-sm text-center md:text-right w-full md:w-auto min-w-[240px]">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Net Cash on Hand (A + B - C - D)</span>
                                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                    ₱{stats.cash_on_hand.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Search Bar & Filters */}
                        <div className="flex flex-col gap-4">
                            {/* Main Filters Row */}
                            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <div className="relative flex-1 w-full min-w-[260px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search by ID, Branch..."
                                        className="pl-8"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[130px] bg-transparent">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                            <SelectItem value="reserved">Reserved</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger className="w-[160px] bg-transparent">
                                            <SelectValue placeholder="Payment Method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Payments</SelectItem>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="e-wallet">E-Wallet</SelectItem>
                                            <SelectItem value="home_credit">Home Credit</SelectItem>
                                            <SelectItem value="reservation">Reservation</SelectItem>
                                        </SelectContent>
                                    </Select>



                                    {(dateFrom || dateTo || statusFilter !== 'all' || paymentMethod !== 'all' || datePreset !== 'today') && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => {
                                                setDateFrom('');
                                                setDateTo('');
                                                setStatusFilter('all');
                                                setPaymentMethod('all');
                                                setDatePreset('today');
                                            }}
                                            className="flex items-center gap-1 h-9 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-955/20 font-semibold"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Clear Filters
                                        </Button>
                                    )}
                                </div>
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
                                                                {sale.payment_method === 'e-wallet' ? `E-Wallet (${sale.ewallet_provider})` : 
                                                                 sale.payment_method === 'home_credit' ? 'Home Credit' : 
                                                                 sale.payment_method === 'reservation' ? 'Reservation' : 'Cash'}
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
                                                        {sale.payment_method === 'home_credit' && (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-xs bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/30 px-2 py-0.5 rounded">
                                                                    Home Credit: {sale.home_credited_name}
                                                                </span>
                                                                {Number(sale.downpayment) > 0 && (
                                                                    <span className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/30 px-2 py-0.5 rounded">
                                                                        Downpayment: ₱{Number(sale.downpayment).toFixed(2)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {sale.payment_method === 'reservation' && (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-xs bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30 px-2 py-0.5 rounded font-semibold">
                                                                    Customer: {sale.customer_name}
                                                                </span>
                                                                {Number(sale.downpayment) > 0 && (
                                                                    <span className="text-xs bg-emerald-50 dark:bg-emerald-955/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/30 px-2 py-0.5 rounded font-semibold">
                                                                        Downpayment: ₱{Number(sale.downpayment).toFixed(2)}
                                                                    </span>
                                                                )}
                                                                {sale.status === 'completed' ? (
                                                                    <span className="text-xs bg-green-50 dark:bg-green-955/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/30 px-2 py-0.5 rounded font-semibold">
                                                                        Remaining Paid via: {sale.ewallet_provider ? `E-Wallet (${sale.ewallet_provider})` : 'Cash'}
                                                                    </span>
                                                                ) : sale.status === 'cancelled' ? (
                                                                    <span className="text-xs bg-red-50 dark:bg-red-955/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/30 px-2 py-0.5 rounded font-semibold">
                                                                        Forfeited (Non-refundable)
                                                                    </span>
                                                                ) : sale.reservation_buy_date ? (
                                                                    <span className="text-xs bg-zinc-50 dark:bg-zinc-900 text-foreground border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded font-semibold">
                                                                        Target Buy Date: {sale.reservation_buy_date}
                                                                    </span>
                                                                ) : null}
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
                                            {sale.returns && sale.returns.length > 0 && (
                                                <div className="border-t border-dashed p-4 bg-red-50/10 dark:bg-red-955/5">
                                                    <h4 className="text-xs font-bold text-red-800 dark:text-red-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                                        <RotateCcw className="w-3.5 h-3.5" /> Returns & Exchanges
                                                    </h4>
                                                    <div className="space-y-1.5">
                                                        {sale.returns.map((ret) => (
                                                            <div key={ret.id} className="text-xs flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/50 pb-1.5 last:border-0 last:pb-0">
                                                                <div>
                                                                    <span className="font-semibold">{ret.quantity}x {ret.product?.name || 'Deleted Product'}</span>
                                                                    <span className="mx-1.5 text-muted-foreground">•</span>
                                                                    <span className={`capitalize inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                        ret.return_type === 'exchange'
                                                                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                                    }`}>
                                                                        {ret.return_type === 'exchange' ? 'Exchange' : 'Refund'}
                                                                    </span>
                                                                    {ret.return_type === 'exchange' && ret.replacement_product && (
                                                                        <>
                                                                            <span className="mx-1.5 text-muted-foreground">exchanged for</span>
                                                                            <span className="font-semibold text-blue-600 dark:text-blue-400">{ret.replacement_quantity}x {ret.replacement_product.name}</span>
                                                                        </>
                                                                    )}
                                                                    <span className="text-[10px] text-muted-foreground ml-2">
                                                                        ({ret.restored_to_inventory ? 'Restocked original' : 'Discarded original'})
                                                                    </span>
                                                                    {ret.reason && (
                                                                        <span className="ml-2 text-muted-foreground italic">("{ret.reason}")</span>
                                                                    )}
                                                                </div>
                                                                {ret.return_type === 'refund' && (
                                                                    <span className="font-bold text-red-650 dark:text-red-400">
                                                                        -₱{Number(ret.refund_amount).toFixed(2)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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

                {/* Delete Branch History Confirmation Modal */}
                <Dialog open={showDeleteHistoryModal} onOpenChange={setShowDeleteHistoryModal}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-red-650 flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-red-500" /> Delete Branch History
                            </DialogTitle>
                            <DialogDescription className="text-zinc-600 dark:text-zinc-400 mt-2">
                                You are about to permanently delete **all historical sales and transfers** that are either complete, cancelled, or rejected for the active branch <strong className="text-zinc-900 dark:text-zinc-100">{current_branch?.branch_name}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-3.5 rounded-xl text-xs text-red-800 dark:text-red-300 font-medium">
                            <strong>Warning:</strong> This action is irreversible. It will also permanently remove these records from Google Sheets.
                        </div>
                        <form onSubmit={handleDeleteHistory} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Enter your account password to confirm
                                </label>
                                <Input 
                                    type="password" 
                                    placeholder="Enter your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full"
                                />
                                {deleteError && (
                                    <p className="text-xs text-red-650 font-medium text-red-550">{deleteError}</p>
                                )}
                            </div>
                            <DialogFooter className="mt-6 gap-2">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setShowDeleteHistoryModal(false)}
                                    className="w-full sm:w-auto"
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    variant="destructive"
                                    className="w-full sm:w-auto"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
