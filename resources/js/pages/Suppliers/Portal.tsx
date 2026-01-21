import { Head, useForm } from '@inertiajs/react';
import WelcomeLayout from '@/layouts/welcome-layout';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Send } from 'lucide-react';
import { toast } from "sonner";

interface Supplier {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    brand_id: number;
    brand?: {
        name: string;
    };
}

interface Props {
    suppliers: Supplier[];
    branches: Branch[];
    products: Product[];
}

interface Item {
    product_id: string;
    quantity: string;
}

export default function Portal({ suppliers, branches, products }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        supplier_id: '',
        destination_branch_id: '',
        items: [{ product_id: '', quantity: '' }] as Item[],
        notes: '',
    });

    function addItem() {
        setData('items', [...data.items, { product_id: '', quantity: '' }]);
    }

    function removeItem(index: number) {
        if (data.items.length === 1) return;
        const newItems = [...data.items];
        newItems.splice(index, 1);
        setData('items', newItems);
    }

    function updateItem(index: number, field: keyof Item, value: string) {
        const newItems = [...data.items];
        newItems[index][field] = value;
        setData('items', newItems);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/suppliers/send', {
            onSuccess: () => {
                reset();
                toast.success("Shipment Sent: Your items have been sent to the branch successfully.");
            },
        });
    }

    return (
        <WelcomeLayout>
            <Head title="Supplier Portal" />

            <div className="py-12">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg border">
                        <div className="p-6 md:p-8">
                            <div className="mb-8">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supplier Portal</h1>
                                <p className="mt-2 text-gray-600 dark:text-gray-400">
                                    Send products to our branches directly. Please fill out the shipment details below.
                                </p>
                            </div>

                            <form onSubmit={submit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="supplier">Select Your Company</Label>
                                        <Select
                                            value={data.supplier_id}
                                            onValueChange={(val) => setData('supplier_id', val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Supplier" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {suppliers.map((supplier) => (
                                                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                                                        {supplier.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.supplier_id && <p className="text-sm text-red-500">{errors.supplier_id}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="branch">Destination Branch</Label>
                                        <Select
                                            value={data.destination_branch_id}
                                            onValueChange={(val) => setData('destination_branch_id', val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Branch" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {branches.map((branch) => (
                                                    <SelectItem key={branch.id} value={String(branch.id)}>
                                                        {branch.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.destination_branch_id && <p className="text-sm text-red-500">{errors.destination_branch_id}</p>}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <Label className="text-base font-semibold">Items to Send</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                            <Plus className="h-4 w-4 mr-2" /> Add Item
                                        </Button>
                                    </div>

                                    {data.items.map((item, index) => (
                                        <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
                                            <div className="flex-1 space-y-2">
                                                <Label className="text-xs text-muted-foreground">Product</Label>
                                                <Select
                                                    value={item.product_id}
                                                    onValueChange={(val) => updateItem(index, 'product_id', val)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Product" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {products.map((product) => (
                                                            <SelectItem key={product.id} value={String(product.id)}>
                                                                <span className="font-medium">{product.name}</span>
                                                                {product.brand && <span className="text-muted-foreground ml-2 text-xs">({product.brand.name})</span>}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {errors[`items.${index}.product_id`] && (
                                                    <p className="text-sm text-red-500">{errors[`items.${index}.product_id`]}</p>
                                                )}
                                            </div>

                                            <div className="w-32 space-y-2">
                                                <Label className="text-xs text-muted-foreground">Quantity</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    placeholder="Qty"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                />
                                                {errors[`items.${index}.quantity`] && (
                                                    <p className="text-sm text-red-500">{errors[`items.${index}.quantity`]}</p>
                                                )}
                                            </div>

                                            <div className="pt-8">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(index)}
                                                    disabled={data.items.length === 1}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {errors.items && <p className="text-sm text-red-500">{errors.items}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes / Reference No. (Optional)</Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Add any additional details or reference numbers for this shipment..."
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button type="submit" disabled={processing} size="lg" className="w-full md:w-auto">
                                        <Send className="h-4 w-4 mr-2" />
                                        {processing ? 'Sending...' : 'Send Items'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </WelcomeLayout>
    );
}
