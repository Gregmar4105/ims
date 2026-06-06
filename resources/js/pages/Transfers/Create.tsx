import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Search, X, ArrowRight, Trash2, Plus, Minus, Send, Bike, Store,
    Package, Loader2, ChevronDown
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { SharedData } from '@/types';

interface Branch {
    id: number;
    branch_name: string;
}

interface Product {
    id: number;
    name: string;
    quantity: number;
    barcode: string | null;
    qr_code: string | null;
    image_path: string | null;
    price: number | null;
    code: string | null;
    sku: string | null;
    category_name: string | null;
    brand_name: string | null;
}

const breadcrumbs = [
    { title: 'Outgoing Transfers', href: '/outgoing' },
    { title: 'Create Transfer', href: '/transfers/create' },
];

interface QuantityInputProps {
    value: number;
    max: number;
    onChange: (newValue: number) => void;
    className?: string;
}

function QuantityInput({ value, max, onChange, className }: QuantityInputProps) {
    const [localValue, setLocalValue] = useState(value.toString());

    useEffect(() => {
        setLocalValue(value.toString());
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (/^\d*$/.test(val)) {
            setLocalValue(val);
            const parsed = parseInt(val, 10);
            if (!isNaN(parsed) && parsed > 0) {
                if (parsed > max) {
                    toast.warning(`Cannot exceed available stock of ${max}.`);
                    onChange(max);
                    setLocalValue(max.toString());
                } else {
                    onChange(parsed);
                }
            }
        }
    };

    const handleBlur = () => {
        const parsed = parseInt(localValue, 10);
        if (isNaN(parsed) || parsed <= 0) {
            onChange(1);
            setLocalValue("1");
        } else if (parsed > max) {
            onChange(max);
            setLocalValue(max.toString());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={localValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={className}
        />
    );
}

export default function Create({ products, branches }: { products: Product[]; branches: Branch[] }) {
    const { auth, current_branch } = usePage<SharedData>().props;
    const currentBranchName = current_branch?.branch_name || auth.user?.branch?.branch_name || 'Selected Branch';
    const isSystemAdmin = auth.roles?.includes('System Administrator');

    // Filters
    const [search, setSearch] = useState('');
    const debounceTimer = useRef<number | null>(null);

    // Basket
    const [basket, setBasket] = useState<Array<{ product: Product; quantity: number }>>([]);
    const [destinationBranchId, setDestinationBranchId] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filtered products (client-side)
    const filteredProducts = products.filter((p) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            p.name.toLowerCase().includes(q) ||
            (p.code && p.code.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)) ||
            (p.brand_name && p.brand_name.toLowerCase().includes(q)) ||
            (p.category_name && p.category_name.toLowerCase().includes(q))
        );
    });

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };

    // Basket management
    const addToBasket = (product: Product) => {
        if (product.quantity <= 0) {
            toast.error(`"${product.name}" is out of stock.`);
            return;
        }
        setBasket((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.quantity) {
                    toast.warning(`Cannot add more than available stock (${product.quantity}).`);
                    return prev;
                }
                toast.success(`Incremented quantity for "${product.name}".`);
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            toast.success(`Added "${product.name}" to transfer basket.`);
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: number, amount: number) => {
        setBasket((prev) =>
            prev
                .map((item) => {
                    if (item.product.id === productId) {
                        const newQty = item.quantity + amount;
                        if (newQty <= 0) return null;
                        if (newQty > item.product.quantity) {
                            toast.warning(`Cannot exceed available stock of ${item.product.quantity}.`);
                            return item;
                        }
                        return { ...item, quantity: newQty };
                    }
                    return item;
                })
                .filter(Boolean) as Array<{ product: Product; quantity: number }>
        );
    };

    const setQuantityDirectly = (productId: number, qty: number) => {
        setBasket((prev) =>
            prev.map((item) => {
                if (item.product.id === productId) {
                    const available = item.product.quantity;
                    let newQty = qty;
                    if (newQty > available) {
                        newQty = available;
                    }
                    if (newQty < 1) {
                        newQty = 1;
                    }
                    return { ...item, quantity: newQty };
                }
                return item;
            })
        );
    };

    const removeFromBasket = (productId: number) => {
        setBasket((prev) => prev.filter((item) => item.product.id !== productId));
        toast.info('Removed item from basket.');
    };

    const handleSubmit = () => {
        if (!destinationBranchId) {
            toast.error('Please select a destination branch.');
            return;
        }
        if (basket.length === 0) {
            toast.error('Please add at least one item to the basket.');
            return;
        }

        setIsSubmitting(true);
        router.post(
            '/transfers',
            {
                destination_branch_id: destinationBranchId,
                items: basket.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                })),
                notes,
            },
            {
                onSuccess: () => {
                    setBasket([]);
                    setNotes('');
                    setIsSubmitting(false);
                    toast.success('Transfer readied successfully!');
                },
                onError: (err) => {
                    setIsSubmitting(false);
                    const firstErr = Object.values(err)[0];
                    toast.error(typeof firstErr === 'string' ? firstErr : 'Failed to create transfer.');
                },
            }
        );
    };

    const totalItems = basket.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Transfer" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 w-full max-w-none">

                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 border p-6 rounded-xl shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                            Create Transfer
                            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-1">
                                <Store className="w-3 h-3" />
                                {currentBranchName}
                            </span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Browse available items in this branch and add them to the{' '}
                            <span className="font-semibold text-foreground">transfer basket</span> on the right.
                        </p>
                    </div>
                    {isSystemAdmin && (
                        <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 max-w-xs">
                            💡 To transfer from a different branch, switch the active branch in the sidebar header dropdown.
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start w-full">

                    {/* ───────── LEFT: Product Browser (3 cols) ───────── */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Search Bar */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm flex flex-col">
                            <div className="p-4 border-b flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                                <div className="relative w-full md:max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search by name, code, SKU, brand…"
                                        value={search}
                                        onChange={handleSearchChange}
                                        className="pl-9"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} available
                                </span>
                            </div>

                            {/* Product Table */}
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                                            <TableHead className="w-[72px]">Image</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Category / Brand</TableHead>
                                            <TableHead className="text-right">In Stock</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right pr-6">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.length > 0 ? (
                                            filteredProducts.map((product) => {
                                                const inBasket = basket.find((i) => i.product.id === product.id);
                                                return (
                                                    <TableRow
                                                        key={product.id}
                                                        className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${inBasket ? 'bg-blue-500/[0.04] dark:bg-blue-500/[0.02]' : ''
                                                            }`}
                                                    >
                                                        <TableCell>
                                                            {product.image_path ? (
                                                                <div className="h-12 w-12 rounded-lg border bg-white overflow-hidden flex items-center justify-center p-1">
                                                                    <img
                                                                        src={`/storage/${product.image_path}`}
                                                                        alt={product.name}
                                                                        className="h-full w-full object-contain"
                                                                        loading="lazy"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="h-12 w-12 rounded-lg border bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                                                    <Bike className="h-6 w-6" />
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-semibold text-gray-900 dark:text-white">{product.name}</div>
                                                            <div className="text-xs text-muted-foreground mt-1 space-x-2">
                                                                {product.code && <span>Code: {product.code}</span>}
                                                                {product.sku && <span>SKU: {product.sku}</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">{product.category_name || 'Uncategorized'}</div>
                                                            <div className="text-xs text-muted-foreground mt-1">{product.brand_name || 'No Brand'}</div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${product.quantity <= 5
                                                                    ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10 dark:bg-amber-400/10 dark:text-amber-400'
                                                                    : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-400/10 dark:text-emerald-400'
                                                                }`}>
                                                                {product.quantity} units
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium font-mono">
                                                            ₱{product.price ? Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                                                        </TableCell>
                                                        <TableCell className="text-right pr-6">
                                                            {inBasket ? (
                                                                <div className="flex items-center justify-end gap-1.5 inline-flex">
                                                                    <div className="flex items-center gap-1 border rounded-full bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 p-0.5">
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-7 w-7 rounded-full text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                                                            onClick={() => updateQuantity(product.id, -1)}
                                                                        >
                                                                            <Minus className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                        <QuantityInput
                                                                            value={inBasket.quantity}
                                                                            max={product.quantity}
                                                                            onChange={(newQty) => setQuantityDirectly(product.id, newQty)}
                                                                            className="w-10 text-center text-xs font-bold font-mono text-blue-900 dark:text-blue-100 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
                                                                        />
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            className="h-7 w-7 rounded-full text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                                                            onClick={() => updateQuantity(product.id, 1)}
                                                                            disabled={inBasket.quantity >= product.quantity}
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                                                                        onClick={() => removeFromBasket(product.id)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => addToBasket(product)}
                                                                    className="gap-1.5 h-8 text-xs bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700"
                                                                >
                                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                                    Add to Basket
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                    {search ? 'No matching products found.' : 'No products available in this branch.'}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>

                    {/* ───────── RIGHT: Transfer Basket (1 col, sticky) ───────── */}
                    <div className="lg:col-span-1 sticky top-6">
                        <Card className="border shadow-md overflow-hidden bg-white dark:bg-gray-800 border-blue-500/10 rounded-xl py-0">
                            <CardHeader className="bg-blue-500/5 dark:bg-blue-950/15 border-b p-4 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-blue-500" />
                                    <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Transfer Basket</CardTitle>
                                </div>
                                <Badge className="bg-blue-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    {basket.length} items
                                </Badge>
                            </CardHeader>

                            <CardContent className="p-4 space-y-4">

                                {/* Destination Branch */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                        Destination Branch <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={destinationBranchId} onValueChange={setDestinationBranchId}>
                                        <SelectTrigger className="text-xs h-9">
                                            <SelectValue placeholder="Select destination…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()} className="text-xs">
                                                    {branch.branch_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {basket.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 stroke-[1.2] mb-3" />
                                        <p className="text-xs font-semibold text-gray-500">Basket is empty.</p>
                                        <p className="text-[10px] text-gray-400 mt-1 max-w-[180px]">
                                            Click "Add to Basket" on the table to queue items for transfer.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Basket Item List */}
                                        <div className="max-h-[350px] overflow-y-auto divide-y border rounded-lg bg-gray-50/30 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700">
                                            {basket.map((item) => (
                                                <div
                                                    key={item.product.id}
                                                    className="p-3 hover:bg-gray-100/50 dark:hover:bg-gray-900/50 transition-colors flex items-center justify-between gap-3"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <h4
                                                            className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate"
                                                            title={item.product.name}
                                                        >
                                                            {item.product.name}
                                                        </h4>
                                                        <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">
                                                            Max: {item.product.quantity} available
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {/* Qty stepper */}
                                                        <div className="flex items-center gap-1 border rounded-full bg-white dark:bg-gray-800 p-0.5 shadow-sm border-gray-200 dark:border-gray-700 font-mono">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-5 w-5 rounded-full text-gray-600 dark:text-gray-400"
                                                                onClick={() => updateQuantity(item.product.id, -1)}
                                                            >
                                                                <Minus className="w-2.5 h-2.5" />
                                                            </Button>
                                                            <QuantityInput
                                                                value={item.quantity}
                                                                max={item.product.quantity}
                                                                onChange={(newQty) => setQuantityDirectly(item.product.id, newQty)}
                                                                className="w-8 text-center text-xs font-bold text-gray-900 dark:text-gray-100 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-5 w-5 rounded-full text-gray-600 dark:text-gray-400"
                                                                onClick={() => updateQuantity(item.product.id, 1)}
                                                                disabled={item.quantity >= item.product.quantity}
                                                            >
                                                                <Plus className="w-2.5 h-2.5" />
                                                            </Button>
                                                        </div>

                                                        {/* Remove */}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 rounded-full text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                            onClick={() => removeFromBasket(item.product.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Summary */}
                                        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                                            <span>{basket.length} product{basket.length !== 1 ? 's' : ''}</span>
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{totalItems} total units</span>
                                        </div>

                                        {/* Notes */}
                                        <div className="space-y-1.5 pt-1">
                                            <Label htmlFor="transfer-notes" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                Notes <span className="font-normal text-muted-foreground">(optional)</span>
                                            </Label>
                                            <Textarea
                                                id="transfer-notes"
                                                placeholder="Reasons, remarks, instructions…"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="resize-none text-xs min-h-[70px] border-gray-200 dark:border-gray-700 focus-visible:ring-blue-500 bg-white dark:bg-gray-800"
                                            />
                                        </div>

                                        {/* Submit */}
                                        <div className="pt-2 border-t mt-4 space-y-2 border-gray-200 dark:border-gray-750">
                                            <Button
                                                onClick={handleSubmit}
                                                disabled={isSubmitting || !destinationBranchId}
                                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold gap-2 shadow-lg h-11 text-sm shadow-blue-200 dark:shadow-none border-0"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                                {isSubmitting ? 'Creating Transfer…' : 'Ready Transfer'}
                                            </Button>
                                            <p className="text-[10px] text-muted-foreground text-center">
                                                Transfer will appear on the Outgoing page immediately.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}
