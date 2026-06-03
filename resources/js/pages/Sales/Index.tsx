import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle, XCircle, Clock, User, ArrowRight, Barcode, QrCode, Store, Search, DollarSign, Briefcase, Printer, Settings2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Pagination from '@/components/Pagination';

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
}

interface PaginatedData<T> {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Stats {
    total_sales: number;
    total_revenue: number;
    today_revenue: number;
    weekly_revenue: number;
    monthly_revenue: number;
}

const breadcrumbs = [
    {
        title: 'Sales List',
        href: '/sales-list',
    },
];

export default function Index({ sales, stats, filters }: { sales: PaginatedData<Sale>, stats: Stats, filters: { search?: string, date_from?: string, date_to?: string, status_filter?: string } }) {
    const { auth } = usePage<SharedData>().props;
    const userId = auth.user.id;

    const [search, setSearch] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [statusFilter, setStatusFilter] = useState(filters.status_filter || 'all');

    // Revenue Visibility Toggles
    const [showWeekly, setShowWeekly] = useState(() => {
        const stored = localStorage.getItem(`sales_stats_visibility_${userId}`);
        if (stored) { try { const p = JSON.parse(stored); if (p.showWeekly !== undefined) return p.showWeekly; } catch (e) { } }
        return true;
    });
    const [showMonthly, setShowMonthly] = useState(() => {
        const stored = localStorage.getItem(`sales_stats_visibility_${userId}`);
        if (stored) { try { const p = JSON.parse(stored); if (p.showMonthly !== undefined) return p.showMonthly; } catch (e) { } }
        return true;
    });
    const [showAllTime, setShowAllTime] = useState(() => {
        const stored = localStorage.getItem(`sales_stats_visibility_${userId}`);
        if (stored) { try { const p = JSON.parse(stored); if (p.showAllTime !== undefined) return p.showAllTime; } catch (e) { } }
        return true;
    });

    useEffect(() => {
        localStorage.setItem(`sales_stats_visibility_${userId}`, JSON.stringify({
            showWeekly,
            showMonthly,
            showAllTime
        }));
    }, [showWeekly, showMonthly, showAllTime, userId]);

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
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Sales History</h1>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border shadow-sm">
                                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                                    <DropdownMenuLabel>Revenue Visibility</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuCheckboxItem checked={true} disabled>
                                        Today's Revenue (Required)
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem checked={showWeekly} onCheckedChange={setShowWeekly}>
                                        Weekly Revenue
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem checked={showMonthly} onCheckedChange={setShowMonthly}>
                                        Monthly Revenue
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem checked={showAllTime} onCheckedChange={setShowAllTime}>
                                        All-Time Revenue
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <p className="text-muted-foreground mt-1">View all completed and cancelled sales.</p>
                    </div>
                    <a href={buildPrintUrl()} target="_blank" rel="noopener noreferrer">
                        <Button className="flex gap-2">
                            <Printer className="w-4 h-4" /> Print List
                        </Button>
                    </a>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₱{stats.today_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </CardContent>
                    </Card>
                    {showWeekly && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Weekly Revenue</CardTitle>
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₱{stats.weekly_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </CardContent>
                        </Card>
                    )}
                    {showMonthly && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                                <DollarSign className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₱{stats.monthly_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </CardContent>
                        </Card>
                    )}
                    {showAllTime && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">All-Time Revenue</CardTitle>
                                <Briefcase className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₱{stats.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <p className="text-xs text-muted-foreground mt-1">{stats.total_sales} total successful trades</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

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
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
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
            </div>
        </AppLayout>
    );
}
