import { useState } from 'react';
import { useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

interface Branch {
    id: number;
    branch_name: string;
}

interface Product {
    id: number;
    name: string;
    quantity: number; // Available quantity in the current branch
    barcode: string;
    qr_code: string;
}

const breadcrumbs = [
    {
        title: 'Outgoing Transfers',
        href: '/outgoing',
    },
    {
        title: 'Create Transfer',
        href: '/transfers/create',
    },
];

export default function Create({ products, branches }: { products: Product[], branches: Branch[] }) {
    const { data, setData, post, processing, errors } = useForm({
        destination_branch_id: '',
        items: [{ product_id: '', quantity: 1 }],
        notes: '',
    });

    const addItem = () => {
        setData('items', [...data.items, { product_id: '', quantity: 1 }]);
    };

    const removeItem = (index: number) => {
        const newItems = [...data.items];
        newItems.splice(index, 1);
        setData('items', newItems);
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setData('items', newItems);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/transfers');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Transfer" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/transfers/outgoing">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Create New Transfer</h1>
                        <p className="text-muted-foreground">Ready items for transfer to another branch.</p>
                    </div>
                </div>

                <Card>
                    <form onSubmit={submit}>
                        <CardHeader>
                            <CardTitle>Transfer Details</CardTitle>
                            <CardDescription>Select the destination and items to transfer.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="destination">Destination Branch</Label>
                                <Select
                                    value={data.destination_branch_id}
                                    onValueChange={(val) => setData('destination_branch_id', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                {branch.branch_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.destination_branch_id && <p className="text-sm text-red-500">{errors.destination_branch_id}</p>}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Items</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Item
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {data.items.map((item, index) => (
                                        <div key={index} className="flex items-end gap-3 p-3 border rounded-lg bg-muted/20">
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs text-muted-foreground">Product</Label>
                                                <Select
                                                    value={item.product_id}
                                                    onValueChange={(val) => updateItem(index, 'product_id', val)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select product" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {products.map((product) => (
                                                            <SelectItem key={product.id} value={product.id.toString()}>
                                                                {product.name} (Qty: {product.quantity})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="w-24 space-y-1">
                                                <Label className="text-xs text-muted-foreground">Quantity</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value))}
                                                />
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={data.items.length === 1} className="mb-0.5">
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                {errors.items && <p className="text-sm text-red-500">{errors.items}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Optional notes regarding this transfer..."
                                    className="min-h-[100px]"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 border-t bg-muted/20 p-4">
                            <Button type="button" variant="ghost" asChild>
                                <Link href="/transfers/outgoing">Cancel</Link>
                            </Button>
                            <Button type="submit" disabled={processing} className="gap-2">
                                <Save className="w-4 h-4" />
                                Create Transfer
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
