import AppLayout from '@/layouts/app-layout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Calendar, DollarSign, Search, ListFilter, ClipboardList, Wallet, User, Clock, Loader2, XCircle, Check, Cog } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Pagination from '@/components/Pagination';

interface Creator {
    id: number;
    name: string;
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
    sale_id?: number | null;
    payment_method?: 'cash' | 'e-wallet' | 'split_bill';
    cash_received?: number | string | null;
    split_ewallet_amount?: number | string | null;
}

interface PaginatedData<T> {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Props {
    serviceFees: PaginatedData<ServiceFee>;
    todayFees: ServiceFee[];
    todayFeesSum: number;
    filters: {
        search?: string;
        date_from?: string;
        date_to?: string;
    };
}

const breadcrumbs = [
    {
        title: 'Service Fees',
        href: '/service-fees',
    },
];

export default function ServiceFees({ serviceFees, todayFees, todayFeesSum, filters }: Props) {
    const { auth } = usePage<SharedData>().props;
    const isSystemAdmin = auth.roles.includes('System Administrator');
    const branchName = auth.user?.branch?.branch_name || 'Active Branch';

    const [search, setSearch] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    const executeDeleteAll = () => {
        setIsDeletingAll(true);
        router.post("/service-fees/delete-all", {}, {
            onSuccess: () => {
                setIsDeleteAllModalOpen(false);
                setIsDeletingAll(false);
                toast.success('Successfully deleted all service fees for this branch.');
            },
            onError: () => {
                setIsDeletingAll(false);
                toast.error("Failed to delete service fees.");
            }
        });
    };

    // Helper to group service fees by date
    const groupFeesByDate = (feesList: ServiceFee[]) => {
        const groups: { [key: string]: { fees: ServiceFee[]; total: number } } = {};
        
        feesList.forEach((fee) => {
            const dateObj = new Date(fee.created_at);
            const dateKey = dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            
            if (!groups[dateKey]) {
                groups[dateKey] = { fees: [], total: 0 };
            }
            groups[dateKey].fees.push(fee);
            groups[dateKey].total += Number(fee.amount);
        });
        
        return groups;
    };

    // Form for logging a new service fee
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        amount: '',
        payment_method: 'cash',
        cash_received: '',
        split_ewallet_amount: '',
    });

    // Recalculate split e-wallet amount for logged service fee when amount or cash received changes
    useEffect(() => {
        if (data.payment_method === 'split_bill') {
            const cashVal = parseFloat(data.cash_received) || 0;
            const totalAmt = parseFloat(data.amount) || 0;
            const ewalletVal = Math.max(0, totalAmt - cashVal);
            const expectedEwallet = ewalletVal.toFixed(2);
            if (data.split_ewallet_amount !== expectedEwallet) {
                setData('split_ewallet_amount', expectedEwallet);
            }
        } else {
            if (data.cash_received !== '' || data.split_ewallet_amount !== '') {
                setData(d => ({
                    ...d,
                    cash_received: '',
                    split_ewallet_amount: ''
                }));
            }
        }
    }, [data.amount, data.payment_method, data.cash_received, data.split_ewallet_amount]);

    // Debounced search for historical service fees
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters.search || '')) {
                performSearch();
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Perform filter updates on date change
    useEffect(() => {
        if (dateFrom !== (filters.date_from || '') || dateTo !== (filters.date_to || '')) {
            performSearch();
        }
    }, [dateFrom, dateTo]);

    const performSearch = () => {
        router.get('/service-fees', {
            search,
            date_from: dateFrom,
            date_to: dateTo,
        }, { preserveState: true, replace: true, preserveScroll: true });
    };

    const handleClearFilters = () => {
        setSearch('');
        setDateFrom('');
        setDateTo('');
        router.get('/service-fees', {}, { preserveState: true, replace: true });
    };

    const handleSubmitFee = (e: React.FormEvent) => {
        e.preventDefault();

        post('/service-fees', {
            onSuccess: () => {
                reset();
                toast.success('Service fee logged successfully');
            },
            onError: () => {
                toast.error('Failed to log service fee. Please check input values.');
            }
        });
    };

    const handleDeleteFee = (id: number) => {
        if (confirm('Are you sure you want to delete this service fee record?')) {
            router.delete(`/service-fees/${id}`, {
                onSuccess: () => {
                    toast.success('Service fee deleted successfully');
                },
                onError: () => {
                    toast.error('Failed to delete service fee.');
                }
            });
        }
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Service Fees" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Service Fees</h1>
                            <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200">
                                Sales Department
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">Track daily service fees and monitor historical service fee logs.</p>
                    </div>
                    {isSystemAdmin && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="hidden md:flex bg-red-600 hover:bg-red-700 text-white shrink-0"
                            onClick={() => setIsDeleteAllModalOpen(true)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete All Service Fees
                        </Button>
                    )}
                </div>

                {/* Two-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column - Historical Logs (2/3 width) */}
                    <div className="lg:col-span-2 space-y-6 flex flex-col">
                        {/* Search and Filters Card */}
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        <CardTitle className="text-lg">Service Fee Logs History</CardTitle>
                                    </div>
                                    <Badge variant="secondary">{serviceFees.total} total logs</Badge>
                                </div>
                                <CardDescription className="mt-1">
                                    Browse, search, and filter all historical entries for this branch.
                                </CardDescription>
                            </CardHeader>

                            {/* Search and Filters Section */}
                            <div className="p-4 bg-muted/20 flex flex-col md:flex-row gap-4 items-end">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search by service description..."
                                        className="pl-8"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md border text-sm w-full md:w-auto">
                                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">From:</span>
                                        <input
                                            type="date"
                                            className="bg-transparent border-none text-sm outline-none w-full md:w-[110px]"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md border text-sm w-full md:w-auto">
                                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">To:</span>
                                        <input
                                            type="date"
                                            className="bg-transparent border-none text-sm outline-none w-full md:w-[110px]"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                        />
                                    </div>
                                    {(search || dateFrom || dateTo) && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleClearFilters}
                                            title="Clear filters"
                                            className="shrink-0"
                                        >
                                            <XCircle className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Grouped Containers List */}
                        {serviceFees.data.length === 0 ? (
                            <Card className="border shadow-sm py-20">
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                    <Cog className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-medium text-sm">No service fees found</p>
                                    <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or log a new service fee.</p>
                                </div>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(groupFeesByDate(serviceFees.data)).map(([date, group]) => (
                                    <Card key={date} className="border shadow-sm overflow-hidden">
                                        <CardHeader className="bg-red-50/10 dark:bg-red-955/5 py-2.5 px-4 flex flex-row items-center justify-between border-b">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{date}</span>
                                            </div>
                                            <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200 font-bold text-xs">
                                                Daily Total: ₱{group.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader className="bg-muted/10">
                                                    <TableRow>
                                                        <TableHead className="pl-6">Service Name / Description</TableHead>
                                                        <TableHead>Connected Sale</TableHead>
                                                        <TableHead>MOP</TableHead>
                                                        <TableHead>Logged By</TableHead>
                                                        <TableHead>Time</TableHead>
                                                        <TableHead className="text-right pr-6">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {group.fees.map((fee) => (
                                                        <TableRow key={fee.id} className="hover:bg-muted/5">
                                                            <TableCell className="font-medium pl-6">
                                                                {fee.name}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-sm">
                                                                {fee.sale_id ? (
                                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200">
                                                                        Sale #{fee.sale_id}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic">None (Direct Log)</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-sm">
                                                                {fee.payment_method === 'split_bill' ? (
                                                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200">
                                                                        Split (₱{Number(fee.cash_received).toFixed(0)}/₱{Number(fee.split_ewallet_amount).toFixed(0)})
                                                                    </Badge>
                                                                ) : fee.payment_method === 'e-wallet' ? (
                                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200">
                                                                        E-Wallet
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-200">
                                                                        Cash
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-sm">
                                                                <div className="flex items-center gap-1.5">
                                                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                                    {fee.creator?.name || 'Unknown'}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-sm">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                                    {formatTimeOnly(fee.created_at)}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right pr-6 font-bold text-gray-900 dark:text-gray-100">
                                                                ₱{Number(fee.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Pagination footer */}
                        {serviceFees.data.length > 0 && serviceFees.last_page > 1 && (
                            <div className="flex justify-center py-4 px-6 bg-muted/10 rounded-lg border">
                                <Pagination links={serviceFees.links} />
                            </div>
                        )}
                    </div>

                    {/* Right Column - Log Service Fee & Today's Daily Activity (1/3 width) */}
                    <div className="space-y-6">

                        {/* Log Service Fee Form Container */}
                        <Card className="border shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    Log New Service Fee
                                </CardTitle>
                                <CardDescription>Enter details to record a service fee.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleSubmitFee}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Service Name / Description</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. Bike Tune Up, Wheel Alignment"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                        />
                                        {errors.name && (
                                            <p className="text-xs text-destructive">{errors.name}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Amount (₱)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">₱</span>
                                            <Input
                                                id="amount"
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                placeholder="0.00"
                                                className="pl-7"
                                                value={data.amount}
                                                onChange={(e) => setData('amount', e.target.value)}
                                                required
                                            />
                                        </div>
                                        {errors.amount && (
                                            <p className="text-xs text-destructive">{errors.amount}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Payment Method</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setData('payment_method', 'cash')}
                                                className={`flex items-center justify-center gap-1 py-2.5 rounded-md border text-xs font-semibold transition-all ${data.payment_method === 'cash'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-input hover:bg-accent bg-background'
                                                }`}
                                            >
                                                <CircleDollarSign className="w-3.5 h-3.5" />
                                                Cash
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setData('payment_method', 'e-wallet')}
                                                className={`flex items-center justify-center gap-1 py-2.5 rounded-md border text-xs font-semibold transition-all ${data.payment_method === 'e-wallet'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-input hover:bg-accent bg-background'
                                                }`}
                                            >
                                                <Wallet className="w-3.5 h-3.5" />
                                                E-Wallet
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setData('payment_method', 'split_bill')}
                                                className={`flex items-center justify-center gap-1 py-2.5 rounded-md border text-xs font-semibold transition-all ${data.payment_method === 'split_bill'
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-input hover:bg-accent bg-background'
                                                }`}
                                            >
                                                <Coins className="w-3.5 h-3.5" />
                                                Split Bill
                                            </button>
                                        </div>
                                        {errors.payment_method && (
                                            <p className="text-xs text-destructive">{errors.payment_method}</p>
                                        )}
                                    </div>

                                    {data.payment_method === 'split_bill' && (
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="cash-received">Cash Portion</Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">₱</span>
                                                    <Input
                                                        id="cash-received"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        className="pl-7"
                                                        value={data.cash_received}
                                                        onChange={(e) => setData('cash_received', e.target.value)}
                                                    />
                                                </div>
                                                {errors.cash_received && (
                                                    <p className="text-xs text-destructive">{errors.cash_received}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="split-ewallet">E-Wallet Portion</Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">₱</span>
                                                    <Input
                                                        id="split-ewallet"
                                                        type="text"
                                                        className="pl-7 bg-muted"
                                                        value={data.split_ewallet_amount}
                                                        disabled
                                                        readOnly
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-2 flex justify-end">
                                    <Button type="submit" disabled={processing} className="w-full mt-2 sm:w-auto bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700">
                                        {processing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                Log Service Fee
                                                <Check className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>

                        {/* Today's Daily Service Fees Container */}
                        <Card className="border shadow-sm border-l-4 border-l-red-500 flex flex-col min-h-[300px]">
                            <CardHeader className="pb-3 border-b">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        <CardTitle className="text-md">Today's Service Fees</CardTitle>
                                    </div>
                                    <Badge variant="secondary" className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-none">
                                        Today
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Service fees logged today. Automatically resets after 11:59 PM daily.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[350px]">
                                {todayFees.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-14 text-muted-foreground px-4 text-center">
                                        <Cog className="w-10 h-10 mb-3 opacity-25" />
                                        <p className="text-sm font-medium">No service fees logged today</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Use the form above to add today's service fees.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {todayFees.map((fee) => (
                                            <div key={fee.id} className="p-3.5 flex items-center justify-between hover:bg-muted/10 transition-colors">
                                                <div className="space-y-1 pr-2 min-w-0 flex-1">
                                                    <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">{fee.name}</p>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {formatTimeOnly(fee.created_at)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-3.5 h-3.5" />
                                                            {fee.creator?.name || 'You'}
                                                        </span>
                                                        {fee.sale_id && (
                                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 text-[10px] py-0 px-1.5 leading-none">
                                                                Sale #{fee.sale_id}
                                                            </Badge>
                                                        )}
                                                        {fee.payment_method === 'split_bill' ? (
                                                            <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 text-[10px] py-0 px-1.5 leading-none">
                                                                Split (₱{Number(fee.cash_received).toFixed(0)}/₱{Number(fee.split_ewallet_amount).toFixed(0)})
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className={`${fee.payment_method === 'e-wallet' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-200'} text-[10px] py-0 px-1.5 leading-none`}>
                                                                {fee.payment_method === 'e-wallet' ? 'E-Wallet' : 'Cash'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="font-bold text-sm text-red-600 dark:text-red-400">
                                                        ₱{Number(fee.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                        onClick={() => handleDeleteFee(fee.id)}
                                                        title="Delete entry"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="bg-red-50/20 dark:bg-red-955/10 border-t p-4 flex justify-between items-center mt-auto shrink-0">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Total</span>
                                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                                    ₱{todayFeesSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </CardFooter>
                        </Card>

                    </div>

                </div>

            </div>
            {/* Confirmation Dialog */}
            <Dialog open={isDeleteAllModalOpen} onOpenChange={setIsDeleteAllModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 font-bold">
                            <Trash2 className="h-5 w-5" /> Confirm Deletion of All Service Fees
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 flex flex-col items-center text-center">
                        <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                            <Trash2 className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Are you absolutely sure?</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            You are about to delete <strong>ALL</strong> service fees for the branch <strong>{branchName}</strong>.
                        </p>
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                IMPORTANT: This action cannot be undone. All service fee records for this branch will be permanently deleted from the database.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 sm:justify-center">
                        <Button variant="outline" onClick={() => setIsDeleteAllModalOpen(false)} className="flex-1" disabled={isDeletingAll}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={executeDeleteAll} className="flex-1" disabled={isDeletingAll}>
                            {isDeletingAll ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete All'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </AppLayout>
    );
}
