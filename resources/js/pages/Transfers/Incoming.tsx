import { useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Truck, CheckCircle, Clock, User, Barcode, QrCode } from 'lucide-react';

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
}

interface Transfer {
    id: number;
    source_branch_id: number;
    destination_branch_id: number;
    status: string;
    notes: string | null;
    created_at: string;
    items: TransferItem[];
    source_branch: Branch;
    readied_by: UserType;
    approved_by: UserType | null;
}

const breadcrumbs = [
    {
        title: 'Incoming Transfers',
        href: '/incoming',
    },
];

export default function Incoming({ transfers }: { transfers: Transfer[] }) {
    const { post } = useForm();

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }).format(new Date(dateString));
    };

    const handleConfirm = (id: number) => {
        if (confirm('Are you sure you want to confirm receipt of this transfer? Stock will be added to your branch.')) {
            post(`/transfers/${id}/confirm`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Incoming Transfers" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Incoming Transfers</h1>
                        <p className="text-muted-foreground mt-1">Review and confirm transfers from other branches.</p>
                    </div>
                </div>

                {transfers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/30">
                        <Truck className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">No incoming transfers</h3>
                        <p className="text-muted-foreground">Transfers sent to your branch will appear here.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {transfers.map((transfer) => (
                            <Card key={transfer.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-200">
                                <CardHeader className="bg-muted/30 pb-4 border-b">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    variant="default"
                                                    className="px-2.5 py-0.5 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                                >
                                                    <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Incoming</span>
                                                </Badge>
                                                <span className="text-sm text-muted-foreground font-mono">
                                                    #{transfer.id}
                                                </span>
                                            </div>
                                            <CardTitle className="flex items-center gap-2 text-xl mt-2">
                                                <span className="text-muted-foreground font-normal text-base">From:</span>
                                                <span className="font-semibold">{transfer.source_branch?.branch_name || 'Unknown Branch'}</span>
                                            </CardTitle>
                                        </div>

                                        <Button
                                            size="sm"
                                            className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                                            onClick={() => handleConfirm(transfer.id)}
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Confirm Receipt
                                        </Button>
                                    </div>
                                    <CardDescription className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm">
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            Created: {formatDate(transfer.created_at)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            Readied by: {transfer.readied_by?.name || 'Unknown'}
                                        </span>
                                        {transfer.approved_by && (
                                            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                <CheckCircle className="w-4 h-4" />
                                                Approved by: {transfer.approved_by.name}
                                            </span>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/10">
                                                <TableRow>
                                                    <TableHead className="w-[40%] pl-6">Product</TableHead>
                                                    <TableHead>Identifiers</TableHead>
                                                    <TableHead className="text-right pr-6">Quantity</TableHead>
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
                                {transfer.notes && (
                                    <div className="px-6 py-3 bg-yellow-50 dark:bg-yellow-900/10 text-sm text-yellow-800 dark:text-yellow-200 border-t border-yellow-100 dark:border-yellow-900/20 flex items-start gap-2">
                                        <span className="font-semibold shrink-0">Notes:</span>
                                        <span>{transfer.notes}</span>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
