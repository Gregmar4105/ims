import AppLayout from '@/layouts/app-layout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, RotateCcw, Search, AlertCircle, CheckCircle, Check, ChevronsUpDown, ArrowRight, Calendar, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { Badge } from '@/components/ui/badge';
import clsx from 'clsx';

interface Sale {
    id: number;
    branch_id: number;
    created_at: string;
    customer_name?: string | null;
    payment_method?: string;
    ewallet_provider?: string | null;
    items: {
        id: number;
        product_id: number;
        quantity: number;
        price: number;
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
    return_type: 'refund' | 'exchange';
    replacement_product_id?: number | null;
    replacement_quantity?: number | null;
    refund_amount: number;
    restored_to_inventory: boolean;
    product: {
        name: string;
    } | null;
    replacement_product?: {
        name: string;
    } | null;
    sale: {
        id: number;
        branch: {
            branch_name: string;
        } | null;
        payment_method?: string;
    } | null;
    returned_by: {
        name: string;
    } | null;
}

export default function Returns({ completedSales, recentReturns, filters }: { completedSales: Sale[], recentReturns: Return[], filters: { search?: string; date_preset?: string; date_from?: string; date_to?: string } }) {
    const { auth } = usePage<SharedData>().props;
    const isBranchAdmin = auth.roles.includes('Branch Administrator') && !auth.roles.includes('System Administrator');

    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [search, setSearch] = useState(filters.search || '');
    const [query, setQuery] = useState('');

    // Date filters state for returns history table
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [datePreset, setDatePreset] = useState(filters.date_preset || 'today');

    // Date for sale selection form card
    const getTodayString = () => {
        const d = new Date();
        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    };
    const [saleDate, setSaleDate] = useState<string>(getTodayString());
    const [salesForDate, setSalesForDate] = useState<Sale[]>([]);
    const [loadingSales, setLoadingSales] = useState<boolean>(false);

    // Exchange states
    const [replacementSearchQuery, setReplacementSearchQuery] = useState('');
    const [replacementProducts, setReplacementProducts] = useState<any[]>([]);
    const [selectedReplacementProduct, setSelectedReplacementProduct] = useState<any | null>(null);
    const [loadingReplacements, setLoadingReplacements] = useState(false);

    const performSearch = () => {
        router.get('/return-items', {
            search,
            date_preset: datePreset,
            date_from: dateFrom,
            date_to: dateTo
        }, { preserveState: true, replace: true, preserveScroll: true });
    };

    // Debounced search trigger for page filters
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters.search || '')) {
                performSearch();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Triggers search when date range filters change
    useEffect(() => {
        if (
            dateFrom !== (filters.date_from || '') ||
            dateTo !== (filters.date_to || '') ||
            datePreset !== (filters.date_preset || 'today')
        ) {
            performSearch();
        }
    }, [dateFrom, dateTo, datePreset]);

    const handlePresetChange = (preset: string) => {
        setDatePreset(preset);
        setDateFrom('');
        setDateTo('');
    };

    // Fetch completed sales for the selected sale date
    useEffect(() => {
        if (!saleDate) {
            setSalesForDate([]);
            return;
        }

        const fetchSales = async () => {
            setLoadingSales(true);
            try {
                const res = await fetch(`/api/sales/completed?date=${saleDate}`);
                if (res.ok) {
                    const data = await res.json();
                    setSalesForDate(data);
                }
            } catch (err) {
                console.error('Failed to fetch sales for date:', err);
                toast.error('Failed to load sales for the selected date');
            } finally {
                setLoadingSales(false);
            }
        };

        fetchSales();
    }, [saleDate]);

    // Update selected sale if sales list changes (and current selection is still valid)
    useEffect(() => {
        if (selectedSale) {
            const updated = salesForDate.find(s => s.id === selectedSale.id);
            if (updated) {
                setSelectedSale(updated);
            } else {
                setSelectedSale(null);
                setData('sale_id', '');
                setSelectedProductId('');
            }
        }
    }, [salesForDate]);

    const { data, setData, post, processing, reset, errors } = useForm({
        sale_id: '',
        product_id: '',
        quantity: 1,
        reason: '',
        return_type: 'refund', // 'refund' | 'exchange'
        replacement_product_id: '',
        replacement_quantity: 1,
        restored_to_inventory: true,
    });

    const selectedItem = selectedSale?.items.find(i => i.product_id.toString() === selectedProductId);

    // Auto-update replacement quantity and values when original return quantity or product changes
    useEffect(() => {
        if (data.return_type === 'exchange') {
            setData('replacement_quantity', data.quantity);
        }
    }, [data.quantity, data.return_type]);

    // Replacement search query debounced lookup
    useEffect(() => {
        if (!data.sale_id || !replacementSearchQuery) {
            setReplacementProducts([]);
            return;
        }

        const activeSale = salesForDate.find(s => s.id.toString() === data.sale_id);
        const branchId = activeSale?.branch_id;

        const delayDebounce = setTimeout(async () => {
            setLoadingReplacements(true);
            try {
                const url = `/api/sales/search-products?search=${encodeURIComponent(replacementSearchQuery)}${branchId ? `&branch_id=${branchId}` : ''}`;
                const res = await fetch(url);
                const results = await res.json();
                setReplacementProducts(results);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingReplacements(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [replacementSearchQuery, data.sale_id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        post('/sale-returns', {
            onSuccess: () => {
                toast.success('Return processed successfully');
                reset();
                setSelectedSale(null);
                setSelectedProductId('');
                setSelectedReplacementProduct(null);
                setReplacementSearchQuery('');
            },
            onError: () => {
                toast.error('Failed to process return');
            }
        });
    };

    const filteredSales = query === ''
        ? salesForDate
        : salesForDate.filter((sale) => {
            return sale.id.toString().includes(query) ||
                (sale.branch?.branch_name || '').toLowerCase().includes(query.toLowerCase()) ||
                (sale.customer_name || '').toLowerCase().includes(query.toLowerCase());
          });

    return (
        <AppLayout breadcrumbs={[{ title: 'Return Items', href: '/return-items' }]}>
            <Head title="Return Items" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header & Date Range Options */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Return Items</h1>
                        <p className="text-muted-foreground mt-1">Manage customer sales returns and product exchanges.</p>
                    </div>
                    {/* Date Preset Toggles & Custom Date Range */}
                    <div className="flex flex-row items-center flex-wrap gap-3 bg-white dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm w-fit">
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg overflow-x-auto">
                            {[
                                { value: 'today', label: 'Today' },
                                { value: 'weekly', label: 'Weekly' },
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'ytd', label: 'YTD' },
                                { value: 'all', label: 'All Time' }
                            ].map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => handlePresetChange(preset.value)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                                        datePreset === preset.value
                                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/50 dark:border-zinc-700'
                                            : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-850'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="hidden sm:block h-6 w-px bg-zinc-200 dark:bg-zinc-800" />

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-muted/20 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">From:</span>
                                <input
                                    type="date"
                                    className="bg-transparent border-none text-xs outline-none w-[110px] dark:text-zinc-100"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        setDatePreset('custom');
                                    }}
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-muted/20 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">To:</span>
                                <input
                                    type="date"
                                    className="bg-transparent border-none text-xs outline-none w-[110px] dark:text-zinc-100"
                                    value={dateTo}
                                    onChange={(e) => {
                                        setDateTo(e.target.value);
                                        setDatePreset('custom');
                                    }}
                                />
                            </div>
                        </div>
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
                                        <Label htmlFor="sale_date">Sale Date</Label>
                                        <div className="relative">
                                            <Input
                                                id="sale_date"
                                                type="date"
                                                value={saleDate}
                                                onChange={(e) => setSaleDate(e.target.value)}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>

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
                                                        displayValue={(sale: Sale) => sale ? `Sale #${sale.id} - ${sale.branch?.branch_name || 'Deleted Branch'}${sale.customer_name ? ` (${sale.customer_name})` : ''}` : ''}
                                                        onChange={(event) => setQuery(event.target.value)}
                                                        placeholder={loadingSales ? "Loading sales..." : "Search Sale ID..."}
                                                    />
                                                    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                        <ChevronsUpDown
                                                            className="h-4 w-4 text-muted-foreground"
                                                            aria-hidden="true"
                                                        />
                                                    </ComboboxButton>
                                                </div>
                                                <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-popover py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50 border">
                                                    {loadingSales ? (
                                                        <div className="relative cursor-default select-none py-2 px-4 text-muted-foreground">
                                                            Loading sales...
                                                        </div>
                                                    ) : salesForDate.length === 0 ? (
                                                        <div className="relative cursor-default select-none py-2 px-4 text-muted-foreground">
                                                            No sales found on this date.
                                                        </div>
                                                    ) : filteredSales.length === 0 ? (
                                                        <div className="relative cursor-default select-none py-2 px-4 text-muted-foreground">
                                                            No matching sales found.
                                                        </div>
                                                    ) : (
                                                        filteredSales.map((sale) => (
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
                                                                            Sale #{sale.id} {sale.customer_name ? `(${sale.customer_name})` : ''} - {new Date(sale.created_at).toLocaleDateString()}
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
                                        <>
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

                                            <div className="space-y-2">
                                                <Label>Return Action</Label>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="return_type"
                                                            value="refund"
                                                            checked={data.return_type === 'refund'}
                                                            onChange={() => {
                                                                setData(d => ({
                                                                    ...d,
                                                                    return_type: 'refund',
                                                                    restored_to_inventory: true,
                                                                    replacement_product_id: '',
                                                                }));
                                                                setSelectedReplacementProduct(null);
                                                            }}
                                                            className="accent-primary"
                                                        />
                                                        {selectedSale?.payment_method === 'e-wallet' ? 'Refund E-Wallet' : 'Refund Cash'}
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="return_type"
                                                            value="exchange"
                                                            checked={data.return_type === 'exchange'}
                                                            onChange={() => {
                                                                setData(d => ({
                                                                    ...d,
                                                                    return_type: 'exchange',
                                                                    restored_to_inventory: false,
                                                                }));
                                                            }}
                                                            className="accent-primary"
                                                        />
                                                        Exchange Product
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 py-1">
                                                <input
                                                    type="checkbox"
                                                    id="restored_to_inventory"
                                                    checked={data.restored_to_inventory}
                                                    onChange={(e) => setData('restored_to_inventory', e.target.checked)}
                                                    className="accent-primary h-4 w-4 rounded border-gray-300 focus:ring-primary"
                                                />
                                                <Label htmlFor="restored_to_inventory" className="text-sm font-normal cursor-pointer select-none">
                                                    Restock returned item to inventory
                                                </Label>
                                            </div>

                                            {data.return_type === 'exchange' && (
                                                <div className="space-y-2 border-l-2 border-primary pl-3 py-1 bg-muted/20 rounded-r-md">
                                                    <Label className="font-bold text-xs text-primary uppercase">Select Exchange Product</Label>
                                                    <Combobox
                                                        value={selectedReplacementProduct}
                                                        onChange={(val: any) => {
                                                            setSelectedReplacementProduct(val);
                                                            setData('replacement_product_id', val?.id.toString() || '');
                                                        }}
                                                    >
                                                        <div className="relative">
                                                            <div className="relative w-full cursor-default overflow-hidden rounded-md border border-input bg-background text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:text-sm">
                                                                <ComboboxInput
                                                                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 dark:text-gray-100 bg-transparent focus:outline-none"
                                                                    displayValue={(prod: any) => prod ? `${prod.name} (₱${Number(prod.price).toFixed(2)})` : ''}
                                                                    onChange={(event) => setReplacementSearchQuery(event.target.value)}
                                                                    placeholder="Type to search products..."
                                                                />
                                                                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                                </ComboboxButton>
                                                            </div>
                                                            <ComboboxOptions className="absolute mt-1 max-h-40 w-full overflow-auto rounded-md bg-popover py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50 border">
                                                                {loadingReplacements ? (
                                                                    <div className="relative cursor-default select-none py-2 px-4 text-muted-foreground">
                                                                        Searching...
                                                                    </div>
                                                                ) : replacementProducts.length === 0 && replacementSearchQuery !== '' ? (
                                                                    <div className="relative cursor-default select-none py-2 px-4 text-muted-foreground">
                                                                        No products found.
                                                                    </div>
                                                                ) : (
                                                                    replacementProducts.map((prod) => (
                                                                        <ComboboxOption
                                                                            key={prod.id}
                                                                            className={({ active }) =>
                                                                                clsx(
                                                                                    'relative cursor-default select-none py-2 pl-10 pr-4',
                                                                                    active ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                                                                                )
                                                                            }
                                                                            value={prod}
                                                                        >
                                                                            {({ selected, active }) => (
                                                                                <>
                                                                                    <span className={clsx('block truncate', selected ? 'font-medium' : 'font-normal')}>
                                                                                        {prod.name} - ₱{Number(prod.price).toFixed(2)} (Qty: {prod.available_quantity})
                                                                                    </span>
                                                                                    {selected ? (
                                                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
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

                                                    {selectedReplacementProduct && selectedItem && (
                                                        <div className="mt-2 text-xs p-2.5 rounded bg-white dark:bg-zinc-905 border space-y-1">
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Original Purchase Price:</span>
                                                                <span className="font-semibold">₱{Number(selectedItem.price).toFixed(2)} ea</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Replacement Item Price:</span>
                                                                <span className="font-semibold">₱{Number(selectedReplacementProduct.price).toFixed(2)} ea</span>
                                                            </div>
                                                            <div className="flex justify-between border-t pt-1 font-bold">
                                                                <span>Price Difference:</span>
                                                                <span className={
                                                                    Number(selectedReplacementProduct.price) > Number(selectedItem.price)
                                                                        ? "text-blue-600 dark:text-blue-400"
                                                                        : Number(selectedReplacementProduct.price) < Number(selectedItem.price)
                                                                        ? "text-amber-600 dark:text-amber-400"
                                                                        : "text-emerald-600 dark:text-emerald-400"
                                                                }>
                                                                    {Number(selectedReplacementProduct.price) > Number(selectedItem.price)
                                                                        ? `+₱${(Number(selectedReplacementProduct.price) - Number(selectedItem.price)).toFixed(2)} (Customer pays)`
                                                                        : Number(selectedReplacementProduct.price) < Number(selectedItem.price)
                                                                        ? `-₱${(Number(selectedItem.price) - Number(selectedReplacementProduct.price)).toFixed(2)} (Refund difference)`
                                                                        : "Equivalent Swap"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="space-y-2">
                                        <Label>Reason (Optional)</Label>
                                        <Textarea
                                            value={data.reason}
                                            onChange={(e) => setData('reason', e.target.value)}
                                            placeholder="Why is this item being returned?"
                                        />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={processing || !selectedProductId || (data.return_type === 'exchange' && !data.replacement_product_id)}>
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
                                                    <TableHead>Product / Return Info</TableHead>
                                                    <TableHead>Sale Ref</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Returned By</TableHead>
                                                    <TableHead className="text-right">Qty</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recentReturns.map((ret) => (
                                                    <TableRow key={ret.id} className="hover:bg-muted/5">
                                                        <TableCell className="font-medium">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-sm font-semibold">{ret.product?.name || 'Deleted Product'}</span>
                                                                {ret.return_type === 'exchange' && ret.replacement_product && (
                                                                    <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                        <ArrowRight className="w-3 h-3" /> Exchanged for: {ret.replacement_quantity}x {ret.replacement_product.name}
                                                                    </span>
                                                                )}
                                                                {ret.reason && <span className="text-xs text-muted-foreground italic">"{ret.reason}"</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col text-xs">
                                                                <span className="font-bold">Sale #{ret.sale?.id || 'Unknown'}</span>
                                                                <span className="text-muted-foreground text-[10px]">{ret.sale?.branch?.branch_name || 'Deleted Branch'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1 items-start">
                                                                <Badge variant="outline" className={
                                                                    ret.return_type === 'exchange'
                                                                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900"
                                                                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-955/20 dark:text-red-400 dark:border-red-900"
                                                                }>
                                                                    {ret.return_type === 'exchange' ? 'Exchange' : 'Refund'}
                                                                </Badge>
                                                                {ret.return_type === 'refund' && (
                                                                     <div className="flex flex-col gap-0.5">
                                                                         <span className="text-xs font-bold text-red-650 dark:text-red-400">
                                                                             ₱{Number(ret.refund_amount).toFixed(2)}
                                                                         </span>
                                                                         <span className="text-[9px] text-muted-foreground font-medium uppercase">
                                                                             ({ret.sale?.payment_method === 'e-wallet' ? 'E-Wallet' : 'Cash'})
                                                                         </span>
                                                                     </div>
                                                                 )}
                                                                <span className="text-[9px] text-muted-foreground">
                                                                    {ret.restored_to_inventory ? 'Restocked original' : 'Discarded original'}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            <div className="flex flex-col">
                                                                <span>{ret.returned_by?.name || 'Deleted User'}</span>
                                                                <span className="text-[10px] text-muted-foreground">{new Date(ret.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </TableCell>
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
