import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Check, Loader2, Image as ImageIcon, AlertCircle, Trash2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface Brand {
    id: number;
    name: string;
}

interface Category {
    id: number;
    name: string;
}

interface Supplier {
    id: number;
    name: string;
}

interface UploadItem {
    id: string;
    file: File;
    preview: string;
    name: string;
    brand_id: string;
    category_id: string;
    supplier_id: string;
    quantity: string;
    price: string;
    sku: string;
    barcode: string;
    qr_code: string;
    physical_location: string;
    description: string;
    errors: Record<string, string>;
    isValidating: Record<string, boolean>;
}

interface Props {
    brands: Brand[];
    categories: Category[];
    suppliers: Supplier[];
    isSystemAdmin: boolean;
    currentBranch: { id: number; branch_name: string } | null;
}

export default function DragAndDropUpload({ brands, categories, suppliers, isSystemAdmin, currentBranch }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Products', href: '/products' },
        { title: 'Multiple Uploads', href: '/drag-and-drop-product-upload' },
    ];

    const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newItems = acceptedFiles.map((file) => ({
            id: Math.random().toString(36).substring(7),
            file,
            preview: URL.createObjectURL(file),
            name: '',
            brand_id: '',
            category_id: '',
            supplier_id: '',
            quantity: '0',
            price: '',
            sku: '',
            barcode: '',
            qr_code: '',
            physical_location: '',
            description: '',
            errors: {},
            isValidating: {},
        }));
        setUploadItems((prev) => [...prev, ...newItems]);
    }, []);

    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        onDrop(files);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            onDrop(Array.from(e.target.files));
        }
    };

    const removeUpload = (id: string) => {
        setUploadItems((prev) => {
            const item = prev.find(i => i.id === id);
            if (item) URL.revokeObjectURL(item.preview);
            return prev.filter(i => i.id !== id);
        });
    };

    const updateItem = (id: string, field: keyof UploadItem, value: any) => {
        setUploadItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const validateField = async (id: string, field: string, value: string) => {
        if (!value) return;

        updateItem(id, 'isValidating', { ...uploadItems.find(i => i.id === id)?.isValidating, [field]: true });

        try {
            const response = await axios.post('/api/products/validate-field', { field, value });
            const exists = response.data.exists;
            
            setUploadItems((prev) =>
                prev.map((item) => {
                    if (item.id === id) {
                        const newErrors = { ...item.errors };
                        if (exists) {
                            newErrors[field] = `This ${field.replace('_', ' ')} already exists.`;
                        } else {
                            delete newErrors[field];
                        }
                        const newValidating = { ...item.isValidating };
                        delete newValidating[field];
                        return { ...item, errors: newErrors, isValidating: newValidating };
                    }
                    return item;
                })
            );
        } catch (error) {
            console.error('Validation error:', error);
        }
    };

    const handleSubmit = () => {
        if (uploadItems.length === 0) {
            toast.error('Please add at least one product.');
            return;
        }

        // Check for required names
        const missingNames = uploadItems.filter(i => !i.name);
        if (missingNames.length > 0) {
            toast.error('All products must have a name.');
            return;
        }

        // Check for required classifications
        const missingClass = uploadItems.filter(i => !i.brand_id || !i.category_id);
        if (missingClass.length > 0) {
            toast.error('All products must have a Brand and Category.');
            return;
        }

        // Check for existing errors
        const hasErrors = uploadItems.some(i => Object.keys(i.errors).length > 0);
        if (hasErrors) {
            toast.error('Please fix the errors before submitting.');
            return;
        }

        setIsProcessing(true);
        const formData = new FormData();
        
        uploadItems.forEach((item, index) => {
            formData.append(`products[${index}][name]`, item.name);
            formData.append(`products[${index}][brand_id]`, item.brand_id);
            formData.append(`products[${index}][category_id]`, item.category_id);
            if (item.supplier_id) formData.append(`products[${index}][supplier_id]`, item.supplier_id);
            formData.append(`products[${index}][quantity]`, item.quantity);
            if (item.price) formData.append(`products[${index}][price]`, item.price);
            if (item.sku) formData.append(`products[${index}][sku]`, item.sku);
            if (item.barcode) formData.append(`products[${index}][barcode]`, item.barcode);
            if (item.qr_code) formData.append(`products[${index}][qr_code]`, item.qr_code);
            if (item.physical_location) formData.append(`products[${index}][physical_location]`, item.physical_location);
            if (item.description) formData.append(`products[${index}][description]`, item.description);
            formData.append(`products[${index}][photo]`, item.file);
        });

        router.post('/api/products/bulk-create', formData, {
            forceFormData: true,
            onSuccess: () => {
                setUploadItems([]);
                toast.success('Products created successfully!');
                setIsProcessing(false);
            },
            onError: (errors) => {
                console.error(errors);
                toast.error('Failed to create products. Please check your inputs.');
                setIsProcessing(false);
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Multiple Product Upload" />

            <div className="flex flex-col gap-6 p-4 md:p-8">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Multiple Product Upload</h1>
                        <p className="text-muted-foreground mt-1">Drag and drop images to quickly create new products.</p>
                    </div>
                    {isSystemAdmin && currentBranch && (
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="flex items-center gap-4 py-3">
                                <ImageIcon className="w-5 h-5 text-primary" />
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground leading-none">Target Branch</p>
                                    <p className="text-sm font-bold text-primary">{currentBranch.branch_name}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Upload Section */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-200 flex flex-col items-center justify-center gap-4 bg-card/50 backdrop-blur-sm ${
                        isDragging ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-muted-foreground/20 hover:border-primary/50'
                    }`}
                >
                    <div className="p-4 bg-primary/10 rounded-full">
                        <Upload className={`w-8 h-8 ${isDragging ? 'text-primary animate-bounce' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-semibold">Drag and drop multiple photos here</p>
                        <p className="text-sm text-muted-foreground">Each photo will start a new product entry</p>
                    </div>
                    <Input
                        type="file"
                        multiple
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileSelect}
                    />
                </div>

                {/* Processing List */}
                {uploadItems.length > 0 && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Products to Create ({uploadItems.length})</h2>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setUploadItems([])} disabled={isProcessing}>
                                    Clear All
                                </Button>
                                <Button onClick={handleSubmit} disabled={isProcessing} className="gap-2">
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Create All Products
                                </Button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6">
                            {uploadItems.map((item) => (
                                <ProductUploadCard
                                    key={item.id}
                                    item={item}
                                    brands={brands}
                                    categories={categories}
                                    suppliers={suppliers}
                                    onRemove={() => removeUpload(item.id)}
                                    onUpdate={(field, value) => updateItem(item.id, field, value)}
                                    onValidate={(field, value) => validateField(item.id, field, value)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function ProductUploadCard({
    item,
    brands,
    categories,
    suppliers,
    onRemove,
    onUpdate,
    onValidate,
}: {
    item: UploadItem;
    brands: Brand[];
    categories: Category[];
    suppliers: Supplier[];
    onRemove: () => void;
    onUpdate: (field: keyof UploadItem, value: any) => void;
    onValidate: (field: string, value: string) => void;
}) {
    return (
        <Card className="overflow-hidden border-2 border-muted hover:border-primary/30 transition-all duration-300 shadow-md">
            <div className="flex flex-col md:flex-row">
                {/* Photo Section */}
                <div className="md:w-1/4 relative group bg-muted/20 min-h-[200px]">
                    <img src={item.preview} alt="Upload preview" className="w-full h-full object-cover" />
                    <button
                        onClick={onRemove}
                        className="absolute top-2 left-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Section */}
                <div className="md:w-3/4 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Basic Info */}
                    <div className="space-y-2">
                        <Label>Product Name*</Label>
                        <Input 
                            value={item.name} 
                            onChange={e => onUpdate('name', e.target.value)}
                            onBlur={e => onValidate('name', e.target.value)}
                            placeholder="Product Name"
                            className={item.errors.name ? 'border-red-500' : ''}
                        />
                        {item.errors.name && <p className="text-[10px] text-red-500">{item.errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>SKU</Label>
                        <div className="relative">
                            <Input 
                                value={item.sku} 
                                onChange={e => onUpdate('sku', e.target.value)}
                                onBlur={e => onValidate('sku', e.target.value)}
                                placeholder="SKU"
                                className={item.errors.sku ? 'border-red-500' : ''}
                            />
                            {item.isValidating.sku && <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-primary" />}
                        </div>
                        {item.errors.sku && <p className="text-[10px] text-red-500">{item.errors.sku}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Price (₱)</Label>
                        <Input 
                            type="number" 
                            value={item.price} 
                            onChange={e => onUpdate('price', e.target.value)}
                            placeholder="0.00" 
                        />
                    </div>

                    {/* Stock & Codes */}
                    <div className="space-y-2">
                        <Label>Initial Quantity</Label>
                        <Input 
                            type="number" 
                            value={item.quantity} 
                            onChange={e => onUpdate('quantity', e.target.value)}
                            placeholder="0" 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Barcode</Label>
                        <div className="relative">
                            <Input 
                                value={item.barcode} 
                                onChange={e => onUpdate('barcode', e.target.value)}
                                onBlur={e => onValidate('barcode', e.target.value)}
                                placeholder="Barcode"
                                className={item.errors.barcode ? 'border-red-500' : ''}
                            />
                            {item.isValidating.barcode && <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-primary" />}
                        </div>
                        {item.errors.barcode && <p className="text-[10px] text-red-500">{item.errors.barcode}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>QR Code</Label>
                        <div className="relative">
                            <Input 
                                value={item.qr_code} 
                                onChange={e => onUpdate('qr_code', e.target.value)}
                                onBlur={e => onValidate('qr_code', e.target.value)}
                                placeholder="QR Code"
                                className={item.errors.qr_code ? 'border-red-500' : ''}
                            />
                            {item.isValidating.qr_code && <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-primary" />}
                        </div>
                        {item.errors.qr_code && <p className="text-[10px] text-red-500">{item.errors.qr_code}</p>}
                    </div>

                    {/* Classifications */}
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={item.category_id} onValueChange={val => onUpdate('category_id', val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Brand</Label>
                        <Select value={item.brand_id} onValueChange={val => onUpdate('brand_id', val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Brand" />
                            </SelectTrigger>
                            <SelectContent>
                                {brands.map(b => (
                                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Supplier</Label>
                        <Select value={item.supplier_id} onValueChange={val => onUpdate('supplier_id', val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Supplier" />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers.map(s => (
                                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Physical Location</Label>
                        <Input 
                            value={item.physical_location} 
                            onChange={e => onUpdate('physical_location', e.target.value)}
                            placeholder="e.g. Aisle 3, Shelf B" 
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
}
