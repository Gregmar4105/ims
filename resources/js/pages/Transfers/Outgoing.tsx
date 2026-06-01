import { useState } from 'react';
import { Link, useForm, router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Truck, CheckCircle, Clock, User, Barcode, QrCode, Plus, XCircle, Send, ShoppingCart } from 'lucide-react';

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
    status: string; // 'readied', 'outgoing', 'received', 'completed'
    is_request: boolean;
    notes: string | null;
    created_at: string;
    items: TransferItem[];
    destination_branch: Branch;
    readied_by: UserType;
    approved_by: UserType | null;
}

const breadcrumbs = [
    {
        title: 'Outgoing Transfers',
        href: '/outgoing',
    },
];

export default function Outgoing({ transfers }: { transfers: Transfer[] }) {
    const { post } = useForm();
    const [initiatingTransfer, setInitiatingTransfer] = useState<Transfer | null>(null);
    const [adjustedItems, setAdjustedItems] = useState<{ id: number; product: Product; quantity: number }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInitiateClick = (transfer: Transfer) => {
        setInitiatingTransfer(transfer);
        setAdjustedItems(transfer.items.map(item => ({
            id: item.id,
            product: item.product,
            quantity: item.quantity
        })));
    };

    const handleConfirmInitiate = () => {
        if (!initiatingTransfer) return;

        if (adjustedItems.some(item => item.quantity < 1)) {
            alert('Please ensure all items have a quantity of at least 1.');
            return;
        }

        setIsSubmitting(true);
        router.post(`/transfers/${initiatingTransfer.id}/initiate`, {
            items: adjustedItems.map(item => ({
                id: item.id,
                quantity: item.quantity
            }))
        }, {
            onSuccess: () => {
                setInitiatingTransfer(null);
                setIsSubmitting(false);
            },
            onError: () => {
                setIsSubmitting(false);
            }
        });
    };

    const updateAdjustedItemQty = (itemId: number, qty: number) => {
        if (qty < 1) return;
        setAdjustedItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, quantity: qty } : item
        ));
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

    const handleInitiate = (id: number) => {
        if (confirm('Are you sure you want to initiate this transfer? It will be marked as outgoing.')) {
            post(`/transfers/${id}/initiate`);
        }
    };

    const handleReject = (id: number) => {
        if (confirm('Are you sure you want to reject this transfer? This action cannot be undone.')) {
            post(`/transfers/${id}/reject`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Outgoing Transfers" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Outgoing Transfers</h1>
                        <p className="text-muted-foreground mt-1">Manage and track transfers sent to other branches.</p>
                    </div>
                    <Button className="gap-2 shadow-sm" asChild>
                        <Link href="/transfers/create">
                            <Plus className="w-4 h-4" />
                            New Transfer
                        </Link>
                    </Button>
                </div>

                {transfers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/30">
                        <Truck className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">No outgoing transfers</h3>
                        <p className="text-muted-foreground">Create a new transfer to get started.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {transfers.map((transfer) => (
                            <Card 
                                key={transfer.id} 
                                className={`overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200 ${
                                    transfer.is_request 
                                        ? 'border-violet-300 dark:border-violet-900/65 bg-violet-50/5 dark:bg-violet-950/5 ring-1 ring-violet-500/5 shadow-violet-50/50 dark:shadow-none' 
                                        : ''
                                }`}
                            >
                                <CardHeader className="bg-muted/30 pb-4 border-b">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                {transfer.status === 'requested' ? (
                                                    <Badge
                                                        variant="default"
                                                        className="px-2.5 py-0.5 text-sm font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                                                    >
                                                        <span className="flex items-center gap-1.5"><ShoppingCart className="w-3.5 h-3.5" /> Requested</span>
                                                    </Badge>
                                                ) : transfer.status === 'readied' ? (
                                                    <Badge
                                                        variant="secondary"
                                                        className="px-2.5 py-0.5 text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800"
                                                    >
                                                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Readied</span>
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="default"
                                                        className="px-2.5 py-0.5 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                                    >
                                                        <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Outgoing</span>
                                                    </Badge>
                                                )}
                                                {transfer.is_request && transfer.status !== 'requested' && (
                                                    <Badge
                                                        variant="outline"
                                                        className="px-2 py-0.5 text-xs font-semibold border-violet-300 text-violet-700 bg-violet-50 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-800"
                                                    >
                                                        Request Order
                                                    </Badge>
                                                )}
                                                <span className="text-sm text-muted-foreground font-mono">
                                                    #{transfer.id}
                                                </span>
                                            </div>
                                            <CardTitle className="flex items-center gap-2 text-xl mt-2">
                                                <span className="text-muted-foreground font-normal text-base">To:</span>
                                                <span className="font-semibold">{transfer.destination_branch?.branch_name || 'Unknown Branch'}</span>
                                            </CardTitle>
                                        </div>
 
                                        {['readied', 'requested'].includes(transfer.status) && (
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleReject(transfer.id)}
                                                    className="flex-1 sm:flex-none gap-2"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    {transfer.status === 'requested' ? "Reject Request" : "Reject"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleInitiateClick(transfer)}
                                                    className={`flex-1 sm:flex-none gap-2 text-white ${
                                                        transfer.status === 'requested'
                                                            ? 'bg-violet-600 hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-800'
                                                            : 'bg-green-600 hover:bg-green-700'
                                                    }`}
                                                >
                                                    <Send className="w-4 h-4" />
                                                    {transfer.status === 'requested' ? "Approve & Transfer" : "Initiate Transfer"}
                                                </Button>
                                            </div>
                                        )}
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

            <Dialog open={initiatingTransfer !== null} onOpenChange={(open) => !open && setInitiatingTransfer(null)}>
                <DialogContent className="sm:max-w-xl overflow-hidden bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                            <Send className="w-5 h-5 text-green-600" />
                            Verify and Initiate Transfer #{initiatingTransfer?.id}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground mt-1">
                            Verify prepared quantities for items being shipped to <span className="font-semibold text-gray-900 dark:text-gray-100">{initiatingTransfer?.destination_branch?.branch_name}</span>. You can adjust the quantity counts if they were prepared incorrectly.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 space-y-4 flex-1 min-w-0 w-full max-w-full">
                        <div className="max-h-[300px] overflow-y-auto border rounded-lg divide-y bg-muted/5 w-full max-w-full border-gray-100 dark:border-gray-800">
                            {adjustedItems.map((item) => (
                                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/10 transition-colors gap-3 w-full max-w-full">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate" title={item.product?.name}>
                                            {item.product?.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1.5">
                                            {item.product?.barcode && (
                                                <span className="flex items-center gap-1 font-mono bg-gray-100 dark:bg-zinc-900 border border-gray-150 dark:border-gray-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                                    <Barcode className="w-3.5 h-3.5" />
                                                    {item.product.barcode}
                                                </span>
                                            )}
                                            {item.product?.qr_code && (
                                                <span className="flex items-center gap-1 font-mono bg-gray-100 dark:bg-zinc-900 border border-gray-150 dark:border-gray-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                                    <QrCode className="w-3.5 h-3.5" />
                                                    {item.product.qr_code}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto border-t border-dashed sm:border-0 pt-2 sm:pt-0 border-gray-100 dark:border-gray-800">
                                        <span className="text-xs text-muted-foreground font-semibold">Qty:</span>
                                        <div className="flex items-center gap-1">
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="icon" 
                                                className="h-8 w-8 rounded-full"
                                                onClick={() => updateAdjustedItemQty(item.id, item.quantity - 1)}
                                                disabled={item.quantity <= 1}
                                            >
                                                -
                                            </Button>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (!isNaN(val)) {
                                                        updateAdjustedItemQty(item.id, val);
                                                    }
                                                }}
                                                className="w-16 h-8 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1"
                                            />
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="icon" 
                                                className="h-8 w-8 rounded-full"
                                                onClick={() => updateAdjustedItemQty(item.id, item.quantity + 1)}
                                            >
                                                +
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {initiatingTransfer?.notes && (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 border border-yellow-100 dark:border-yellow-900/20">
                                <span className="font-semibold">Prepared Notes: </span>
                                {initiatingTransfer.notes}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="bg-muted/10 p-4 border-t flex flex-col-reverse sm:flex-row justify-end gap-2 -mx-6 -mb-6 border-gray-100 dark:border-gray-800">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setInitiatingTransfer(null)}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="button" 
                            onClick={handleConfirmInitiate}
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700 text-white gap-2 font-semibold w-full sm:w-auto border-0"
                        >
                            <CheckCircle className="w-4 h-4" />
                            {isSubmitting ? 'Initiating...' : 'Confirm & Initiate'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
