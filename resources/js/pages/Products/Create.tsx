import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Upload, Store, Clock, Info, ArrowLeft, QrCode, Barcode } from 'lucide-react';
import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { AutocompleteInput } from '@/components/AutocompleteInput';

import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Products',
        href: '/products',
    },
    {
        title: 'Add Product',
        href: '/products/create',
    },
];

interface VariationOption {
    value: string;
    quantity: number;
}

interface Variation {
    name: string;
    options: string | VariationOption[];
    is_quantified?: boolean;
}

interface Brand {
    id: number;
    name: string;
}

interface Supplier {
    id: number;
    name: string;
}

interface Category {
    id: number;
    name: string;
}

interface Props {
    brands: Brand[];
    categories: Category[];
    suppliers: Supplier[];
    isSystemAdmin: boolean;
    currentBranch: { id: number; branch_name: string } | null;
}

export default function Create({ brands, categories, suppliers, isSystemAdmin, currentBranch }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        brand: '',
        category: '',
        supplier: '',
        quantity: '',
        physical_location: '',
        description: '',
        price: '',
        barcode: '',
        qr_code: '',
        code: '',
        code_2: '',
        sku: '',
        reorder_level: '',
        active_until_zero_days: '' as string,
        variations: [] as Variation[],
        image: null as File | null,
    });

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [zeroStockOption, setZeroStockOption] = useState<string>('forever');

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setData('image', file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }

    function addVariation() {
        setData('variations', [...data.variations, { name: '', options: '', is_quantified: false }]);
    }

    function removeVariation(index: number) {
        const newVariations = [...data.variations];
        newVariations.splice(index, 1);
        setData('variations', newVariations);
    }

    function updateVariation(index: number, field: keyof Variation, value: any) {
        const newVariations = [...data.variations];
        newVariations[index][field] = value;
        setData('variations', newVariations);
    }

    function toggleVariationQuantified(index: number) {
        const newVariations = [...data.variations];
        const v = newVariations[index];
        const currentlyQuantified = v.is_quantified ?? false;

        if (currentlyQuantified) {
            const optArray = Array.isArray(v.options) ? v.options : [];
            const optStr = optArray.map(o => o.value).join(', ');
            v.options = optStr;
            v.is_quantified = false;
        } else {
            const optStr = typeof v.options === 'string' ? v.options : '';
            const optArray = optStr.split(',')
                .map(o => o.trim())
                .filter(o => o.length > 0)
                .map(val => ({ value: val, quantity: 0 }));
            
            if (optArray.length === 0) {
                optArray.push({ value: '', quantity: 0 });
            }
            v.options = optArray;
            v.is_quantified = true;
        }
        setData('variations', newVariations);
    }

    function addOption(vIndex: number) {
        const newVariations = [...data.variations];
        const v = newVariations[vIndex];
        if (Array.isArray(v.options)) {
            v.options = [...v.options, { value: '', quantity: 0 }];
            setData('variations', newVariations);
        }
    }

    function removeOption(vIndex: number, oIndex: number) {
        const newVariations = [...data.variations];
        const v = newVariations[vIndex];
        if (Array.isArray(v.options)) {
            const newOpts = [...v.options];
            newOpts.splice(oIndex, 1);
            v.options = newOpts;
            setData('variations', newVariations);
        }
    }

    function updateOptionField(vIndex: number, oIndex: number, field: keyof VariationOption, value: any) {
        const newVariations = [...data.variations];
        const v = newVariations[vIndex];
        if (Array.isArray(v.options)) {
            const newOpts = [...v.options];
            if (field === 'quantity') {
                newOpts[oIndex][field] = Number(value);
            } else {
                newOpts[oIndex][field] = String(value);
            }
            v.options = newOpts;
            setData('variations', newVariations);
        }
    }

    function handleZeroStockChange(value: string) {
        setZeroStockOption(value);
        if (value === 'forever') {
            setData('active_until_zero_days', '');
        } else if (value === 'immediately') {
            setData('active_until_zero_days', '0');
        } else if (value === 'custom') {
            setData('active_until_zero_days', '7');
        } else {
            setData('active_until_zero_days', value);
        }
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        
        // Sum validation check on client side
        const prodQty = Number(data.quantity) || 0;
        for (const v of data.variations) {
            if (v.is_quantified && Array.isArray(v.options)) {
                const sum = v.options.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
                if (sum !== prodQty) {
                    toast.error(`Variation "${v.name}" option quantities sum (${sum}) must equal the total product quantity (${prodQty}).`);
                    return;
                }
            }
        }

        post('/products');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Product" />

            <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <Link href="/products">
                                <Button variant="outline" size="sm">
                                    <ArrowLeft className="mr-2 h-4 w-4" /></Button>
                            </Link>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Add New Product</h1>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 ml-9">
                            Enter the details of the new product.
                        </p>
                    </div>
                </div>

                {/* Branch indicator for System Admin */}
                {isSystemAdmin && currentBranch && (
                    <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <Store className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                Creating product for: <span className="text-blue-600 dark:text-blue-300">{currentBranch.branch_name}</span>
                            </p>
                            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                                Switch branches from the header dropdown to change the target branch.
                            </p>
                        </div>
                    </div>
                )}

                {isSystemAdmin && !currentBranch && (
                    <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                No branch selected
                            </p>
                            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                                Please select a branch from the Branch Dashboard first to assign stock.
                            </p>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border shadow-sm">
                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="brand">Brand</Label>
                                <AutocompleteInput
                                    value={data.brand}
                                    onValueChange={(val) => setData('brand', val)}
                                    placeholder="Search or type brand name"
                                    searchUrl="/api/brands/search"
                                    error={errors.brand}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <AutocompleteInput
                                    value={data.category}
                                    onValueChange={(val) => setData('category', val)}
                                    placeholder="Search or type category name"
                                    searchUrl="/api/categories/search"
                                    error={errors.category}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="supplier">Supplier (Optional)</Label>
                                <AutocompleteInput
                                    value={data.supplier}
                                    onValueChange={(val) => setData('supplier', val)}
                                    placeholder="Search or type supplier name"
                                    searchUrl="/api/suppliers/search"
                                    error={errors.supplier}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Product Name</Label>
                                <AutocompleteInput
                                    value={data.name}
                                    onValueChange={(val) => setData('name', val)}
                                    placeholder="e.g. Keysto-121"
                                    searchUrl="/api/products/search"
                                    error={errors.name}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="0"
                                    value={data.quantity}
                                    onChange={e => setData('quantity', e.target.value)}
                                    placeholder="0"
                                    required
                                />
                                {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="barcode">Barcode (Optional)</Label>
                                <div className="relative">
                                    <Barcode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="barcode"
                                        className="pl-9"
                                        value={data.barcode}
                                        onChange={e => setData('barcode', e.target.value)}
                                        placeholder="Scan or enter barcode"
                                    />
                                </div>
                                {errors.barcode && <p className="text-sm text-red-500">{errors.barcode}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="qr_code">QR Code (Optional)</Label>
                                <div className="relative">
                                    <QrCode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="qr_code"
                                        className="pl-9"
                                        value={data.qr_code}
                                        onChange={e => setData('qr_code', e.target.value)}
                                        placeholder="Scan or enter QR code"
                                    />
                                </div>
                                {errors.qr_code && <p className="text-sm text-red-500">{errors.qr_code}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="reorder_level">Reorder Level</Label>
                                <Input
                                    id="reorder_level"
                                    type="number"
                                    min="0"
                                    value={data.reorder_level}
                                    onChange={e => setData('reorder_level', e.target.value)}
                                    placeholder="0"
                                />
                                {errors.reorder_level && <p className="text-sm text-red-500">{errors.reorder_level}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="price">Price (₱)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.price}
                                    onChange={e => setData('price', e.target.value)}
                                    placeholder="0.00"
                                />
                                {errors.price && <p className="text-sm text-red-500">{errors.price}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="physical_location">Physical Location</Label>
                                <Input
                                    id="physical_location"
                                    value={data.physical_location}
                                    onChange={e => setData('physical_location', e.target.value)}
                                    placeholder="e.g. Aisle 3, Shelf B"
                                />
                                {errors.physical_location && <p className="text-sm text-red-500">{errors.physical_location}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="code">Code</Label>
                                <Input
                                    id="code"
                                    value={data.code}
                                    onChange={e => setData('code', e.target.value)}
                                    placeholder="Product Code"
                                />
                                {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="code_2">2Code</Label>
                                <Input
                                    id="code_2"
                                    value={data.code_2}
                                    onChange={e => setData('code_2', e.target.value)}
                                    placeholder="Secondary Code"
                                />
                                {errors.code_2 && <p className="text-sm text-red-500">{errors.code_2}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU</Label>
                                <Input
                                    id="sku"
                                    value={data.sku}
                                    onChange={e => setData('sku', e.target.value)}
                                    placeholder="Stock Keeping Unit"
                                />
                                {errors.sku && <p className="text-sm text-red-500">{errors.sku}</p>}
                            </div>
                        </div>

                        {/* Active When Out of Stock */}
                        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <Label className="text-sm font-semibold">Keep Active When Out of Stock</Label>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                                Choose how long this product stays visible and active after its stock reaches 0.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select value={zeroStockOption} onValueChange={handleZeroStockChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="forever">Stay Active Forever</SelectItem>
                                        <SelectItem value="immediately">Deactivate Immediately</SelectItem>
                                        <SelectItem value="7">7 Days</SelectItem>
                                        <SelectItem value="14">14 Days</SelectItem>
                                        <SelectItem value="30">30 Days</SelectItem>
                                        <SelectItem value="custom">Custom Days</SelectItem>
                                    </SelectContent>
                                </Select>
                                {zeroStockOption === 'custom' && (
                                    <Input
                                        type="number"
                                        min="1"
                                        value={data.active_until_zero_days}
                                        onChange={e => setData('active_until_zero_days', e.target.value)}
                                        placeholder="Enter number of days"
                                    />
                                )}
                            </div>
                            {errors.active_until_zero_days && <p className="text-sm text-red-500 mt-2">{errors.active_until_zero_days}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                placeholder="Product description..."
                                rows={4}
                            />
                            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Variations (Optional)</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addVariation}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Variation
                                </Button>
                            </div>
                            {data.variations.map((variation, index) => {
                                const prodQty = Number(data.quantity) || 0;
                                const optionsSum = variation.is_quantified && Array.isArray(variation.options)
                                    ? variation.options.reduce((acc, curr) => acc + (curr.quantity || 0), 0)
                                    : 0;
                                const matchesProductQuantity = optionsSum === prodQty;

                                return (
                                    <div key={index} className="space-y-4 p-5 border rounded-xl bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 shadow-sm transition-all duration-300">
                                        <div className="flex gap-4 items-center justify-between">
                                            <div className="flex-1 max-w-[240px]">
                                                <Label className="text-xs text-muted-foreground uppercase font-semibold">Variation Name</Label>
                                                <Input
                                                    className="mt-1 font-medium bg-white dark:bg-gray-800"
                                                    placeholder="Name (e.g. Color)"
                                                    value={variation.name}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVariation(index, 'name', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mt-5">
                                                <Button
                                                    type="button"
                                                    variant={variation.is_quantified ? 'outline' : 'default'}
                                                    size="sm"
                                                    onClick={() => toggleVariationQuantified(index)}
                                                    className="h-9 px-3 rounded-lg text-xs"
                                                >
                                                    Simple Text
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={variation.is_quantified ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => toggleVariationQuantified(index)}
                                                    className="h-9 px-3 rounded-lg text-xs"
                                                >
                                                    Quantified Stock
                                                </Button>
                                            </div>

                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => removeVariation(index)} 
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 mt-5"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {!variation.is_quantified ? (
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground font-semibold">Options (Comma separated)</Label>
                                                <Input
                                                    className="bg-white dark:bg-gray-800"
                                                    placeholder="e.g. Red, Blue, Green"
                                                    value={typeof variation.options === 'string' ? variation.options : ''}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVariation(index, 'options', e.target.value)}
                                                    required
                                                />
                                                <span className="text-[11px] text-gray-400">Simple list of options. No stock quantity checks are run.</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-150 dark:border-gray-800">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Quantified Options</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => addOption(index)}
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-xs px-2.5 h-7"
                                                    >
                                                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Option
                                                    </Button>
                                                </div>

                                                {Array.isArray(variation.options) && variation.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className="flex items-center gap-3">
                                                        <div className="flex-1">
                                                            <Input
                                                                className="h-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                                                                placeholder="Option Value (e.g. Red)"
                                                                value={opt.value}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOptionField(index, oIdx, 'value', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <div className="w-[120px]">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                className="h-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                                                                placeholder="Qty"
                                                                value={opt.quantity || ''}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOptionField(index, oIdx, 'quantity', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeOption(index, oIdx)}
                                                            className="text-gray-400 hover:text-red-500 h-9 w-9"
                                                            disabled={variation.options.length <= 1}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}

                                                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        Total distributed: <strong className="text-gray-700 dark:text-gray-200">{optionsSum}</strong> / {prodQty}
                                                    </span>
                                                    {matchesProductQuantity ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                            ✓ Sum matches branch stock
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                                                            ⚠ Must equal branch stock ({prodQty})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="image">Product Image</Label>
                            <div className="flex items-center gap-4">
                                <div className="relative w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Upload className="h-8 w-8 text-gray-400" />
                                    )}
                                    <input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleImageChange}
                                        required
                                    />
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <p>Click to upload or drag and drop</p>
                                    <p>SVG, PNG, JPG or GIF (max. 2MB)</p>
                                </div>
                            </div>
                            {errors.image && <p className="text-sm text-red-500">{errors.image}</p>}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Creating...' : 'Create Product'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
