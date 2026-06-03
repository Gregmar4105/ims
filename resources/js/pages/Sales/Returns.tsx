import AppLayout from '@/layouts/app-layout';
import { Head, useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, RotateCcw, Search, AlertCircle, CheckCircle, Check, ChevronsUpDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import clsx from 'clsx';

interface Sale {
    id: number;
    created_at: string;
    items: {
        id: number;
        product_id: number;
        quantity: number;
        product: {
            name: string;
        } | null;
    }[];
    branch: {
        branch_name: string;
    } | null;
}

interface Return {
    id: number;
    quantity: number;
    reason: string | null;
    created_at: string;
    product: {
        name: string;
    } | null;
    sale: {
        id: number;
        branch: {
            branch_name: string;
        } | null;
    } | null;
    returned_by: {
        name: string;
    } | null;
}

export default function Returns({ completedSales, recentReturns, filters }: { completedSales: Sale[], recentReturns: Return[], filters: { search?: string } }) {
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [search, setSearch] = useState(filters.search || '');
    const [query, setQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters.search || '')) {
                router.get('/return-items', { search }, { preserveState: true, replace: true, preserveScroll: true });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Sync query with search to allow typing in combobox to trigger server search
    useEffect(() => {
        setSearch(query);
    }, [query]);

    // Update selected sale if sales list changes (and current selection is still valid)
    useEffect(() => {
        if (selectedSale) {
            const updated = completedSales.find(s => s.id === selectedSale.id);
            if (updated) setSelectedSale(updated);
        }
    }, [completedSales]);

    const { data, setData, post, processing, reset, errors } = useForm({
        sale_id: '',
        product_id: '',
        quantity: 1,
        reason: '',
    });

    const selectedItem = selectedSale?.items.find(i => i.product_id.toString() === selectedProductId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        post('/sale-returns', {
            onSuccess: () => {
                toast.success('Return processed successfully');
                reset();
                setSelectedSale(null);
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
                {/* Header & Search */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        {/* Optional Title */}
                    </div>
                </div>

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
                                    Search and select a sale to return.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Select Sale</Label>
                                        <Combobox
                                            value={selectedSale}
                                            onChange={(val) => {
                                                setSelectedSale(val);
                                                setData('sale_id', val?.id.toString() || '');
                                                setSelectedProductId('');
                                            }}
                                            onClose={() => setQuery('')}
                                        >
                                            <div className="relative">
                                                <div className="relative w-full cursor-default overflow-hidden rounded-md border border-input bg-background text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:text-sm">
                                                    <ComboboxInput
                                                        className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 dark:text-gray-100 bg-transparent focus:outline-none"
                                                        displayValue={(sale: Sale) => sale ? `Sale #${sale.id} - ${sale.branch?.branch_name || 'Deleted Branch'}` : ''}
                                                        onChange={(event) => setQuery(event.target.value)}
                                                        placeholder="Search Sale ID..."
                                                    />
                                                    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                        <ChevronsUpDown
                                                            className="h-4 w-4 text-muted-foreground"
                                                            aria-hidden="true"
                                                        />
                                                    </ComboboxButton>
                                                </div>
                                                <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-popover py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50 border">
                                                    {completedSales.length === 0 && query !== '' ? (
                                                        <div className="relative cursor-default select-none py-2 px-4 text-muted-foreground">
                                                            No sales found.
                                                        </div>
                                                    ) : (
                                                        completedSales.map((sale) => (
                                                            <ComboboxOption
                                                                key={sale.id}
                                                                className={({ active }) =>
                                                                    clsx(
                                                                        'relative cursor-default select-none py-2 pl-10 pr-4',
                                                                        active ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                                                                    )
                                                                }
                                                                value={sale}
                                                            >
                                                                {({ selected, active }) => (
                                                                    <>
                                                                        <span
                                                                            className={clsx(
                                                                                'block truncate',
                                                                                selected ? 'font-medium' : 'font-normal'
                                                                            )}
                                                                        >
                                                                            Sale #{sale.id} - {new Date(sale.created_at).toLocaleDateString()}
                                                                        </span>
                                                                        {selected ? (
                                                                            <span
                                                                                className={clsx(
                                                                                    'absolute inset-y-0 left-0 flex items-center pl-3 text-primary',
                                                                                )}
                                                                            >
                                                                                <Check className="h-4 w-4" aria-hidden="true" />
                                                                            </span>
                                                                        ) : null}
                                                                    </>
                                                                )}
                                                            </ComboboxOption>
                                                        ))
                                                    )}
                                                </ComboboxOptions>
                                            </div>
                                        </Combobox>
                                    </div>

                                    {/* Product Select (Keep as Select for simplicity, or convert to Combobox too?) 
                                        Products are usually few per sale, so Select is fine. 
                                        I'll keep it as Select but I need to adapt the logic since I changed standard state.
                                    */}
                                    {selectedSale && (
                                        <div className="space-y-2">
                                            <Label>Select Product</Label>
                                            <select
                                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                value={selectedProductId}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSelectedProductId(val);
                                                    setData('product_id', val);
                                                }}
                                            >
                                                <option value="" disabled>Select product...</option>
                                                {selectedSale.items.map((item) => (
                                                    <option key={item.product_id} value={item.product_id.toString()}>
                                                        {item.product?.name || 'Deleted Product'} (Qty: {item.quantity})
                                                    </option>
                                                ))}
                                            </select>
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
                                                                <span>{ret.product?.name || 'Deleted Product'}</span>
                                                                <span className="text-xs text-muted-foreground">{ret.reason}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col text-xs">
                                                                <span>Sale #{ret.sale?.id || 'Unknown'}</span>
                                                                <span className="text-muted-foreground">{ret.sale?.branch?.branch_name || 'Deleted Branch'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm">{ret.returned_by?.name || 'Deleted User'}</TableCell>
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
