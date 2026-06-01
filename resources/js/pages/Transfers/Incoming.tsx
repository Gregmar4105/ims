import { useState } from 'react';
import { useForm, Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { SharedData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Truck, CheckCircle, Clock, User, Barcode, QrCode, AlertTriangle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import axios from 'axios';

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
    const { auth } = usePage<SharedData>().props;
    const currentUser = auth.user;

    const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [verifiedProducts, setVerifiedProducts] = useState<Record<number, boolean>>({});
    const [receiverName, setReceiverName] = useState('');
    const [branchUsers, setBranchUsers] = useState<Array<{ id: number; name: string }>>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const { data, setData, post, processing, reset, errors } = useForm({
        status: 'completed',
        received_by: '',
        received_by_name: '',
        items: [] as Array<{ id: number; received_quantity: number }>,
    });

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }).format(new Date(dateString));
    };

    const handleOpenConfirmModal = async (transfer: Transfer) => {
        setSelectedTransfer(transfer);
        setReceiverName(currentUser.name);
        setData({
            status: 'completed',
            received_by: currentUser.id.toString(),
            received_by_name: currentUser.name,
            items: transfer.items.map(item => ({
                id: item.id,
                received_quantity: item.received_quantity > 0 ? item.received_quantity : item.quantity
            }))
        });

        const initialVerified: Record<number, boolean> = {};
        transfer.items.forEach(item => {
            initialVerified[item.id] = true;
        });
        setVerifiedProducts(initialVerified);
        setIsOpen(true);

        try {
            const response = await axios.get(`/api/branches/${transfer.destination_branch_id}/users`);
            setBranchUsers(response.data);
        } catch (error) {
            console.error("Error fetching branch users:", error);
        }
    };

    const handleToggleVerify = (itemId: number, checked: boolean) => {
        setVerifiedProducts(prev => ({ ...prev, [itemId]: checked }));

        if (!checked) {
            setData('items', data.items.map(item =>
                item.id === itemId ? { ...item, received_quantity: 0 } : item
            ));
        } else {
            const originalItem = selectedTransfer?.items.find(i => i.id === itemId);
            if (originalItem) {
                setData('items', data.items.map(item =>
                    item.id === itemId ? { ...item, received_quantity: originalItem.quantity } : item
                ));
            }
        }
    };

    const handleQuantityChange = (itemId: number, val: number) => {
        const originalItem = selectedTransfer?.items.find(i => i.id === itemId);
        const maxQty = originalItem ? originalItem.quantity : 999999;
        const clampedVal = Math.max(0, Math.min(maxQty, val));

        setData('items', data.items.map(item =>
            item.id === itemId ? { ...item, received_quantity: clampedVal } : item
        ));
    };

    const handleSubmitConfirm = () => {
        if (!selectedTransfer) return;

        post(`/transfers/${selectedTransfer.id}/confirm`, {
            onSuccess: () => {
                setIsOpen(false);
                setSelectedTransfer(null);
                reset();
            }
        });
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
                                                {transfer.status === 'incomplete' ? (
                                                    <Badge
                                                        variant="default"
                                                        className="px-2.5 py-0.5 text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                                    >
                                                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Incomplete</span>
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="default"
                                                        className="px-2.5 py-0.5 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                                    >
                                                        <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Incoming</span>
                                                    </Badge>
                                                )}
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
                                            onClick={() => handleOpenConfirmModal(transfer)}
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

            <Dialog open={isOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsOpen(false);
                    setSelectedTransfer(null);
                    reset();
                }
            }}>
                <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-xl border shadow-2xl bg-white dark:bg-zinc-950">
                    <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                            <Truck className="w-6 h-6 text-primary animate-pulse" />
                            Confirm Receipt
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground mt-1">
                            Verify if the delivered products match the sent items from <span className="font-semibold text-zinc-900 dark:text-zinc-50">{selectedTransfer?.source_branch?.branch_name}</span>. Adjust quantities and transfer status as needed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                        {/* Status Selection */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Overall Transfer Status</Label>
                            <Select 
                                value={data.status} 
                                onValueChange={(val) => setData('status', val)}
                            >
                                <SelectTrigger className="w-full h-11">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="completed">
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">Complete</span>
                                    </SelectItem>
                                    <SelectItem value="incomplete">
                                        <span className="font-medium text-amber-500">Incomplete (Split Delivery)</span>
                                    </SelectItem>
                                    <SelectItem value="rejected">
                                        <span className="font-medium text-rose-600 dark:text-rose-400">Reject Entire Transfer</span>
                                    </SelectItem>
                                    <SelectItem value="outgoing">
                                        <span className="font-medium text-blue-500">Pending (Keep Active)</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1.5">
                                {data.status === 'completed' && "✓ All products received and verified. Stock will be fully updated."}
                                {data.status === 'incomplete' && "⚠ Some items are still missing/on the way. This transfer will remain in incoming for future updates."}
                                {data.status === 'rejected' && "✖ Decline receipt. Stock will be completely returned to the sender."}
                                {data.status === 'outgoing' && "⏳ Keep the transfer as pending (outgoing) for verification later."}
                            </p>
                        </div>

                        {/* Received By Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="received_by" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Accepted/Received By</Label>
                            {selectedTransfer && (
                                <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
                                    <PopoverAnchor asChild>
                                        <Input
                                            id="received_by"
                                            value={receiverName}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setReceiverName(val);
                                                setData(prev => ({
                                                    ...prev,
                                                    received_by_name: val,
                                                    received_by: '', // Reset ID since they are typing manually
                                                }));
                                                // Keep the popover open so suggestions can be shown/clicked
                                                setIsDropdownOpen(true);
                                            }}
                                            onFocus={() => {
                                                setIsDropdownOpen(true);
                                            }}
                                            placeholder="Type or select recipient..."
                                            className="h-11 focus-visible:ring-primary"
                                        />
                                    </PopoverAnchor>
                                    <PopoverContent 
                                        className="w-[var(--radix-popover-trigger-width)] p-0" 
                                        align="start" 
                                        onOpenAutoFocus={(e) => e.preventDefault()}
                                        onInteractOutside={() => setIsDropdownOpen(false)}
                                    >
                                        <div className="max-h-[200px] overflow-y-auto p-1">
                                            {branchUsers.filter(u => 
                                                u.name.toLowerCase().includes(receiverName.toLowerCase())
                                            ).length > 0 ? (
                                                branchUsers.filter(u => 
                                                    u.name.toLowerCase().includes(receiverName.toLowerCase())
                                                ).map((user) => (
                                                    <div
                                                        key={user.id}
                                                        className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors ${
                                                            data.received_by === user.id.toString() ? "bg-accent font-semibold" : ""
                                                        }`}
                                                        onClick={() => {
                                                            setData(prev => ({
                                                                ...prev,
                                                                received_by: user.id.toString(),
                                                                received_by_name: user.name,
                                                            }));
                                                            setReceiverName(user.name);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                    >
                                                        {user.name}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-4 px-2 text-xs text-muted-foreground text-center">
                                                    No matching branch users. Name will be saved as text.
                                                </div>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                            {(errors.received_by || errors.received_by_name) && (
                                <p className="text-sm text-red-500 mt-1">{errors.received_by_name || errors.received_by}</p>
                            )}
                        </div>

                        {data.status !== 'rejected' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b">
                                    <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Product Checklist</Label>
                                    <span className="text-xs text-muted-foreground font-medium">Verify each product and adjust quantities</span>
                                </div>
                                <div className="space-y-3">
                                    {selectedTransfer?.items.map((item) => {
                                        const formItem = data.items.find(i => i.id === item.id);
                                        const isVerified = verifiedProducts[item.id] ?? true;
                                        const currentQty = formItem?.received_quantity ?? 0;

                                        return (
                                            <div 
                                                key={item.id} 
                                                className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg border transition-all duration-200 gap-4 bg-muted/10 ${
                                                    !isVerified 
                                                        ? 'border-rose-200 dark:border-rose-950/30 bg-rose-50/20 dark:bg-rose-950/10 opacity-75' 
                                                        : 'hover:bg-muted/30 border-zinc-100 dark:border-zinc-800'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3 w-full sm:w-[60%]">
                                                    <div className="pt-0.5">
                                                        <Checkbox 
                                                            id={`verify-${item.id}`}
                                                            checked={isVerified}
                                                            onCheckedChange={(checked) => handleToggleVerify(item.id, !!checked)}
                                                            className="h-5 w-5 rounded border-zinc-300 dark:border-zinc-700"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label 
                                                            htmlFor={`verify-${item.id}`}
                                                            className={`font-semibold text-sm cursor-pointer select-none text-zinc-900 dark:text-zinc-50 ${!isVerified ? 'line-through text-muted-foreground' : ''}`}
                                                        >
                                                            {item.product?.name}
                                                        </Label>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                            {item.product?.barcode && (
                                                                <span className="font-mono flex items-center gap-1"><Barcode className="w-3.5 h-3.5" />{item.product.barcode}</span>
                                                            )}
                                                            {item.product?.qr_code && (
                                                                <span className="font-mono flex items-center gap-1"><QrCode className="w-3.5 h-3.5" />{item.product.qr_code}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-[40%]">
                                                    <div className="text-right">
                                                        <span className="text-xs text-muted-foreground block font-medium">Sent Qty</span>
                                                        <span className="font-bold text-sm text-zinc-700 dark:text-zinc-300">{item.quantity}</span>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1 min-w-[120px]">
                                                        <span className="text-xs text-muted-foreground font-medium block">Received Qty</span>
                                                        <div className="flex items-center gap-2">
                                                            <Input 
                                                                type="number"
                                                                min={0}
                                                                max={item.quantity}
                                                                disabled={!isVerified}
                                                                value={currentQty}
                                                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                                                className="w-20 text-center font-semibold h-9 focus-visible:ring-primary"
                                                            />
                                                        </div>
                                                        {!isVerified && (
                                                            <span className="text-[10px] text-rose-500 font-semibold mt-0.5">Product Mismatch</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {data.status === 'rejected' && (
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-200">
                                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-sm">Warning: Decline Receipt</h4>
                                    <p className="text-xs mt-1">This action will reject the entire transfer manifest. All products sent will be immediately returned to the sender's stock and the transfer's status will be marked as Rejected.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-6 bg-muted/20 border-t flex items-center justify-between sm:justify-end gap-3">
                        <DialogClose asChild>
                            <Button 
                                variant="outline" 
                                className="w-full sm:w-auto h-11"
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button 
                            onClick={handleSubmitConfirm}
                            disabled={processing}
                            className={`w-full sm:w-auto h-11 px-6 font-semibold gap-2 ${
                                data.status === 'rejected' 
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                        >
                            {processing ? (
                                <span className="animate-spin mr-1">⌛</span>
                            ) : data.status === 'rejected' ? (
                                <XCircle className="w-4 h-4" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                            Submit Receipt
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
