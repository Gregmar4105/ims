import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle, XCircle, Clock, User, ArrowRight, Barcode, QrCode, Store, Search, DollarSign, Briefcase } from 'lucide-react';
import Pagination from '@/components/Pagination';

interface SaleItem {
    id: number;
    product: {
        name: string;
        barcode: string;
        qr_code: string;
    };
    quantity: number;
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
    completed: number;
}

const breadcrumbs = [
    {
        title: 'Sales List',
        href: '/sales-list',
    },
];

export default function Index({ sales, stats, filters }: { sales: PaginatedData<Sale>, stats: Stats, filters: { search?: string } }) {
    const [search, setSearch] = useState(filters.search || '');

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters.search || '')) {
                router.get('/sales-list', { search }, { preserveState: true, replace: true, preserveScroll: true });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

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
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Sales History</h1>
                        <p className="text-muted-foreground mt-1">View all completed and cancelled sales.</p>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                            <Store className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_sales}</div>
                            <p className="text-xs text-muted-foreground">All time records</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${stats.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <p className="text-xs text-muted-foreground">From completed sales</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed Count</CardTitle>
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.completed}</div>
                            <p className="text-xs text-muted-foreground">Successful transactions</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by ID, Branch..."
                            className="pl-8 max-w-md"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
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
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/10">
                                                <TableRow>
                                                    <TableHead className="w-[50%] pl-6">Product</TableHead>
                                                    <TableHead>Identifiers</TableHead>
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
