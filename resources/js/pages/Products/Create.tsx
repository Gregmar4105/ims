import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';

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

interface Variation {
    name: string;
    options: string;
}

interface Brand {
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
}

export default function Create({ brands, categories }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        brand_id: '',
        category_id: '',
        quantity: '',
        physical_location: '',
        description: '',
        variations: [] as Variation[],
        image: null as File | null,
    });

    const [imagePreview, setImagePreview] = useState<string | null>(null);

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
        setData('variations', [...data.variations, { name: '', options: '' }]);
    }

    function removeVariation(index: number) {
        const newVariations = [...data.variations];
        newVariations.splice(index, 1);
        setData('variations', newVariations);
    }

    function updateVariation(index: number, field: keyof Variation, value: string) {
        const newVariations = [...data.variations];
        newVariations[index][field] = value;
        setData('variations', newVariations);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/products');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Product" />

            <div className="p-4 max-w-3xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Product</CardTitle>
                        <CardDescription>
                            Enter the details of the new product. It will be associated with your branch.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="brand">Brand</Label>
                                    <Select value={data.brand_id} onValueChange={(val) => setData('brand_id', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Brand" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {brands.map((brand) => (
                                                <SelectItem key={brand.id} value={String(brand.id)}>
                                                    {brand.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.brand_id && <p className="text-sm text-red-500">{errors.brand_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={data.category_id} onValueChange={(val) => setData('category_id', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={String(category.id)}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.category_id && <p className="text-sm text-red-500">{errors.category_id}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Product Name</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        placeholder="e.g. Keysto-121"
                                        required
                                    />
                                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
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
                                {data.variations.map((variation, index) => (
                                    <div key={index} className="flex gap-4 items-start p-4 border rounded-md bg-gray-50 dark:bg-gray-900">
                                        <div className="flex-1 space-y-2">
                                            <Input
                                                placeholder="Name (e.g. Color)"
                                                value={variation.name}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVariation(index, 'name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Input
                                                placeholder="Options (e.g. Red, Blue)"
                                                value={variation.options}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVariation(index, 'options', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeVariation(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
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
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
