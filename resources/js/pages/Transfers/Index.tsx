import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle, Clock, User, ArrowRight, Barcode, QrCode, Search, XCircle, Truck, DollarSign, Settings2, Printer, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Pagination from '@/components/Pagination';

interface Branch {
    id: number;
    branch_name: string;
}

interface UserType {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    barcode: string;
    qr_code: string;
}

interface TransferItem {
    id: number;
    product: Product;
    quantity: number;
    received_quantity: number;
    status: string;
    selected_variations?: Record<string, string>;
}

interface Transfer {
    id: number;
    source_branch_id: number;
    destination_branch_id: number;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    items: TransferItem[];
    source_branch: Branch | null;
    destination_branch: Branch;
    received_by: UserType | null;
    received_by_name: string | null;
    supplier?: { id: number; name: string } | null;
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
    total_transfers: number;
    total_quantity: number;
    today_quantity: number;
    weekly_quantity: number;
    monthly_quantity: number;
}

const breadcrumbs = [
    {
        title: 'Transfer List',
        href: '/transfer-list',
    },
];

export default function Index({ transfers, stats, filters }: { transfers: PaginatedData<Transfer>, stats: Stats, filters: { search?: string, date_from?: string, date_to?: string, status_filter?: string } }) {
    const { auth, current_branch } = usePage<SharedData>().props;
    const userId = auth.user.id;
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
            password: confirmPassword,
            type: 'transfers'
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
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [statusFilter, setStatusFilter] = useState(filters.status_filter || 'all');

    // Revenue Visibility Toggles
    const [showWeekly, setShowWeekly] = useState(() => {
        const stored = localStorage.getItem(`transfer_value_visibility_${userId}`);
        if (stored) { try { const p = JSON.parse(stored); if (p.showWeekly !== undefined) return p.showWeekly; } catch (e) { } }
        return true;
    });
    const [showMonthly, setShowMonthly] = useState(() => {
        const stored = localStorage.getItem(`transfer_value_visibility_${userId}`);
        if (stored) { try { const p = JSON.parse(stored); if (p.showMonthly !== undefined) return p.showMonthly; } catch (e) { } }
        return true;
    });
    const [showAllTime, setShowAllTime] = useState(() => {
        const stored = localStorage.getItem(`transfer_value_visibility_${userId}`);
        if (stored) { try { const p = JSON.parse(stored); if (p.showAllTime !== undefined) return p.showAllTime; } catch (e) { } }
        return true;
    });

    useEffect(() => {
        localStorage.setItem(`transfer_value_visibility_${userId}`, JSON.stringify({
            showWeekly,
            showMonthly,
            showAllTime
        }));
    }, [showWeekly, showMonthly, showAllTime, userId]);

    const performSearch = () => {
        router.get('/transfer-list', {
            search,
            date_from: dateFrom,
            date_to: dateTo,
            status_filter: statusFilter
        }, { preserveState: true, replace: true, preserveScroll: true });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters.search || '')) {
                performSearch();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

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

        return `/transfer-list/print?${params.toString()}`;
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transfer List" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Transfer History</h1>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border shadow-sm">
                                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                                    <DropdownMenuLabel>Quantity Visibility</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuCheckboxItem checked={true} disabled>
                                        Today's Transfers(Required)
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem checked={showWeekly} onCheckedChange={setShowWeekly}>
                                        Weekly Transfers
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem checked={showMonthly} onCheckedChange={setShowMonthly}>
                                        Monthly Transfers
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem checked={showAllTime} onCheckedChange={setShowAllTime}>
                                        All-Time Transfers
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <p className="text-muted-foreground mt-1">View all completed and rejected transfers.</p>
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

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today's Transfers</CardTitle>
                            <Package className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.today_quantity.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    {showWeekly && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Weekly Transfers</CardTitle>
                                <Package className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.weekly_quantity.toLocaleString()}</div>
                            </CardContent>
                        </Card>
                    )}
                    {showMonthly && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Monthly Transfers</CardTitle>
                                <Package className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.monthly_quantity.toLocaleString()}</div>
                            </CardContent>
                        </Card>
                    )}
                    {showAllTime && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">All-Time Transfers</CardTitle>
                                <Truck className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total_quantity.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground mt-1">{stats.total_transfers} completed transfers</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Search Bar & Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by ID, Branch Name..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full sm:w-[150px]"
                        />
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full sm:w-[150px]"
                        />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="incomplete">Incomplete</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="outgoing">Pending/Outgoing</SelectItem>
                                <SelectItem value="readied">Readied</SelectItem>
                                <SelectItem value="requested">Requested</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {transfers.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/30">
                        <CheckCircle className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">No transfers found</h3>
                        <p className="text-muted-foreground">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {transfers.data.map((transfer) => (
                            <Card key={transfer.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-200">
                                <CardHeader className="bg-muted/30 pb-4 border-b">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    variant="default"
                                                    className={`px-2.5 py-0.5 text-sm font-medium ${
                                                        transfer.status === 'completed'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
                                                            : transfer.status === 'incomplete'
                                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                                                            : transfer.status === 'rejected'
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800'
                                                            : transfer.status === 'outgoing'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                                            : transfer.status === 'requested'
                                                            ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800'
                                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        {transfer.status === 'completed' ? (
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                        ) : transfer.status === 'incomplete' ? (
                                                            <Clock className="w-3.5 h-3.5" />
                                                        ) : transfer.status === 'rejected' ? (
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        ) : transfer.status === 'outgoing' ? (
                                                            <Truck className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <Clock className="w-3.5 h-3.5" />
                                                        )}
                                                        {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                                                    </span>
                                                </Badge>
                                                <span className="text-sm text-muted-foreground font-mono">
                                                    #{transfer.id}
                                                </span>
                                            </div>
                                            <CardTitle className="flex items-center gap-2 text-xl mt-2">
                                                <span className="font-semibold">{transfer.source_branch?.branch_name || (transfer.supplier ? `Supplier: ${transfer.supplier.name}` : 'Import Transfer')}</span>
                                                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                                                <span className="font-semibold">{transfer.destination_branch?.branch_name}</span>
                                            </CardTitle>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <a href={`/transfers/${transfer.id}/print`} target="_blank" rel="noopener noreferrer">
                                                <Button variant="outline" size="sm" className="h-9 gap-1.5" type="button">
                                                    <Printer className="w-4 h-4" /> Print
                                                </Button>
                                            </a>
                                        </div>
                                    </div>
                                    <CardDescription className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm">
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            Completed: {formatDate(transfer.updated_at)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            Received by: {transfer.received_by_name || transfer.received_by?.name || 'Unknown'}
                                        </span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/10">
                                                <TableRow>
                                                    <TableHead className="w-[35%] pl-6">Product</TableHead>
                                                    <TableHead>Identifiers</TableHead>
                                                    <TableHead className="text-right pr-6">Sent</TableHead>
                                                    <TableHead className="text-right pr-6">Received</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {transfer.items.map((item) => (
                                                    <TableRow key={item.id} className="hover:bg-muted/5">
                                                        <TableCell className="font-medium pl-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                                    <Package className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div>{item.product?.name}</div>
                                                                    {item.selected_variations && Object.keys(item.selected_variations).length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-zinc-500 font-normal">
                                                                            {Object.entries(item.selected_variations).map(([key, val]) => (
                                                                                <span key={key} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                                                                                    {key}: {val}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
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
                                                        <TableCell className="text-right text-muted-foreground pr-6">
                                                            {item.quantity}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold pr-6">
                                                            {item.received_quantity}
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

                {transfers.data.length > 0 && transfers.last_page > 1 && (
                    <Pagination links={transfers.links} />
                )}
                {/* Delete Branch History Confirmation Modal */}
                <Dialog open={showDeleteHistoryModal} onOpenChange={setShowDeleteHistoryModal}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-red-650 flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-red-500" /> Delete Transfers History
                            </DialogTitle>
                            <DialogDescription className="text-zinc-600 dark:text-zinc-400 mt-2">
                                You are about to permanently delete **all historical transfers** that are either complete or rejected for the active branch <strong className="text-zinc-900 dark:text-zinc-100">{current_branch?.branch_name}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-3.5 rounded-xl text-xs text-red-800 dark:text-red-300 font-medium">
                            <strong>Warning:</strong> This action is irreversible. It will also permanently remove these records from the Google Sheets **Transfers** tab.
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
