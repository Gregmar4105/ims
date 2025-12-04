import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle, XCircle, Clock, User, ArrowRight, Barcode, QrCode, Store } from 'lucide-react';
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

const breadcrumbs = [
    {
        title: 'Sales List',
        href: '/sales-list',
    },
];

export default function Index({ sales }: { sales: PaginatedData<Sale> }) {
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Sales History</h1>
                        <p className="text-muted-foreground mt-1">View all completed and cancelled sales.</p>
                    </div>
                </div>

                {sales.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/30">
                        <Store className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">No sales found</h3>
                        <p className="text-muted-foreground">Completed sales will appear here.</p>
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
