import AppLayout from '@/layouts/app-layout';
import { Head, useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, RotateCcw, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface Sale {
    id: number;
    created_at: string;
    items: {
        id: number;
        product_id: number;
        quantity: number;
        product: {
            name: string;
        };
    }[];
    branch: {
        branch_name: string;
    };
}

interface Return {
    id: number;
    quantity: number;
    reason: string | null;
    created_at: string;
    product: {
        name: string;
    };
    sale: {
        id: number;
        branch: {
            branch_name: string;
        };
    };
    returned_by: {
        name: string;
    };
}

export default function Returns({ completedSales, recentReturns }: { completedSales: Sale[], recentReturns: Return[] }) {
    const [selectedSaleId, setSelectedSaleId] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');

    const { data, setData, post, processing, reset, errors } = useForm({
        sale_id: '',
        product_id: '',
        quantity: 1,
        reason: '',
    });

    const selectedSale = completedSales.find(s => s.id.toString() === selectedSaleId);
    const selectedItem = selectedSale?.items.find(i => i.product_id.toString() === selectedProductId);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        post('/sale-returns', {
            onSuccess: () => {
                toast.success('Return processed successfully');
                reset();
                setSelectedSaleId('');
                setSelectedProductId('');
            },
            onError: () => {
                toast.error('Failed to process return');
            }
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Return Items', href: '/return-items' }]}>
            <Head title="Return Items" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Return Form */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <RotateCcw className="w-5 h-5" />
                                    Process Return
                                </CardTitle>
                                <CardDescription>
                                    Select a sale and product to return to inventory.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Select Sale</Label>
                                        <Select
                                            value={selectedSaleId}
                                            onValueChange={(val) => {
                                                setSelectedSaleId(val);
                                                setData('sale_id', val);
                                                setSelectedProductId('');
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a sale..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {completedSales.map((sale) => (
                                                    <SelectItem key={sale.id} value={sale.id.toString()}>
                                                        Sale #{sale.id} - {new Date(sale.created_at).toLocaleDateString()}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedSale && (
                                        <div className="space-y-2">
                                            <Label>Select Product</Label>
                                            <Select
                                                value={selectedProductId}
                                                onValueChange={(val) => {
                                                    setSelectedProductId(val);
                                                    setData('product_id', val);
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select product..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {selectedSale.items.map((item) => (
                                                        <SelectItem key={item.product_id} value={item.product_id.toString()}>
                                                            {item.product.name} (Qty: {item.quantity})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {selectedItem && (
                                        <div className="space-y-2">
                                            <Label>Quantity to Return</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                max={selectedItem.quantity}
                                                value={data.quantity}
                                                onChange={(e) => setData('quantity', parseInt(e.target.value))}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Max returnable: {selectedItem.quantity}
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>Reason (Optional)</Label>
                                        <Textarea
                                            value={data.reason}
                                            onChange={(e) => setData('reason', e.target.value)}
                                            placeholder="Why is this item being returned?"
                                        />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={processing || !selectedProductId}>
                                        {processing ? 'Processing...' : 'Confirm Return'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Returns List */}
                    <div className="lg:col-span-2">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle>Recent Returns</CardTitle>
                                <CardDescription>History of returned items.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {recentReturns.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No returns processed yet.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead>Sale Ref</TableHead>
                                                    <TableHead>Returned By</TableHead>
                                                    <TableHead className="text-right">Qty</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recentReturns.map((ret) => (
                                                    <TableRow key={ret.id}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex flex-col">
                                                                <span>{ret.product.name}</span>
                                                                <span className="text-xs text-muted-foreground">{ret.reason}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col text-xs">
                                                                <span>Sale #{ret.sale.id}</span>
                                                                <span className="text-muted-foreground">{ret.sale.branch.branch_name}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm">{ret.returned_by.name}</TableCell>
                                                        <TableCell className="text-right font-bold">{ret.quantity}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
