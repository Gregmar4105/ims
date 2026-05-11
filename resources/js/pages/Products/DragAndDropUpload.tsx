import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Check, Loader2, Image as ImageIcon, AlertCircle, Trash2, FolderOpen, Plus, Barcode, QrCode, Clock, Info } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { Badge } from '@/components/ui/badge';

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

interface Supplier {
    id: number;
    name: string;
}

interface UploadItem {
    id: string;
    file: File | null;
    preview: string;
    name: string;
    brand: string;
    category: string;
    supplier: string;
    quantity: string;
    price: string;
    sku: string;
    barcode: string;
    qr_code: string;
    code: string;
    code_2: string;
    reorder_level: string;
    active_until_zero_days: string;
    physical_location: string;
    description: string;
    variations: Variation[];
    isExisting: boolean;
    errors: Record<string, string>;
    isValidating: Record<string, boolean>;
    isFetching: boolean;
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
    const [uploadProgress, setUploadProgress] = useState(0);

    const fetchProductDetails = async (id: string, name: string) => {
        setUploadItems(prev => prev.map(item => item.id === id ? { ...item, isFetching: true } : item));
        try {
            const response = await axios.get('/api/products/details', { params: { value: name, field: 'name' } });
            if (response.data) {
                const p = response.data;
                setUploadItems(prev => prev.map(item => item.id === id ? {
                    ...item,
                    isExisting: true,
                    brand: p.brand_name || '',
                    category: p.category_name || '',
                    supplier: p.supplier_name || '',
                    quantity: String(p.quantity || 0),
                    price: String(p.price || ''),
                    sku: p.sku || '',
                    barcode: p.barcode || '',
                    qr_code: p.qr_code || '',
                    code: p.code || '',
                    code_2: p.code_2 || '',
                    reorder_level: String(p.reorder_level || 0),
                    active_until_zero_days: String(p.active_until_zero_days || ''),
                    physical_location: p.physical_location || '',
                    description: p.description || '',
                    variations: p.variations || [],
                    isFetching: false,
                } : item));
                toast.info(`Pre-filled existing data for "${name}"`);
            } else {
                setUploadItems(prev => prev.map(item => item.id === id ? { ...item, isFetching: false } : item));
            }
        } catch (error) {
            console.error('Error fetching details:', error);
            setUploadItems(prev => prev.map(item => item.id === id ? { ...item, isFetching: false } : item));
        }
    };

    const processFiles = useCallback((files: File[]) => {
        const newItems = files.map((file) => {
            // Extract name from filename (remove extension and common patterns)
            const name = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ").trim();
            const id = Math.random().toString(36).substring(7);
            
            return {
                id,
                file,
                preview: URL.createObjectURL(file),
                name,
                brand: '',
                category: '',
                supplier: '',
                quantity: '0',
                price: '',
                sku: '',
                barcode: '',
                qr_code: '',
                code: '',
                code_2: '',
                reorder_level: '0',
                active_until_zero_days: '',
                physical_location: '',
                description: '',
                variations: [],
                isExisting: false,
                errors: {},
                isValidating: {},
                isFetching: false,
            };
        });

        setUploadItems((prev) => [...prev, ...newItems]);

        // Auto-fetch details for each new item
        newItems.forEach(item => {
            fetchProductDetails(item.id, item.name);
        });
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
        processFiles(files);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processFiles(Array.from(e.target.files));
        }
    };

    const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
            processFiles(files);
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
                        // If it exists but it's not the same product we're editing (though we don't have IDs here, so it's tricky)
                        // Actually, if isExisting is true, validation should probably be different.
                        // For now, let's just warn if name matches but we thought it was new.
                        if (exists && !item.isExisting) {
                           // newErrors[field] = `This ${field.replace('_', ' ')} already exists.`;
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

        const missingNames = uploadItems.filter(i => !i.name);
        if (missingNames.length > 0) {
            toast.error('All products must have a name.');
            return;
        }

        const missingClass = uploadItems.filter(i => !i.brand || !i.category);
        if (missingClass.length > 0) {
            toast.error('All products must have a Brand and Category.');
            return;
        }

        setIsProcessing(true);
        setUploadProgress(0);

        const formData = new FormData();
        
        uploadItems.forEach((item, index) => {
            formData.append(`products[${index}][name]`, item.name);
            formData.append(`products[${index}][brand]`, item.brand);
            formData.append(`products[${index}][category]`, item.category);
            if (item.supplier) formData.append(`products[${index}][supplier]`, item.supplier);
            formData.append(`products[${index}][quantity]`, item.quantity);
            if (item.price) formData.append(`products[${index}][price]`, item.price);
            if (item.sku) formData.append(`products[${index}][sku]`, item.sku);
            if (item.barcode) formData.append(`products[${index}][barcode]`, item.barcode);
            if (item.qr_code) formData.append(`products[${index}][qr_code]`, item.qr_code);
            if (item.code) formData.append(`products[${index}][code]`, item.code);
            if (item.code_2) formData.append(`products[${index}][code_2]`, item.code_2);
            if (item.reorder_level) formData.append(`products[${index}][reorder_level]`, item.reorder_level);
            if (item.active_until_zero_days) formData.append(`products[${index}][active_until_zero_days]`, item.active_until_zero_days);
            if (item.physical_location) formData.append(`products[${index}][physical_location]`, item.physical_location);
            if (item.description) formData.append(`products[${index}][description]`, item.description);
            if (item.variations.length > 0) formData.append(`products[${index}][variations]`, JSON.stringify(item.variations));
            if (item.file) formData.append(`products[${index}][photo]`, item.file);
        });

        router.post('/api/products/bulk-create', formData, {
            forceFormData: true,
            onProgress: (progress) => {
                if (progress) setUploadProgress(progress.percentage);
            },
            onSuccess: () => {
                setUploadItems([]);
                toast.success('Products processed successfully!');
                setIsProcessing(false);
                setUploadProgress(0);
            },
            onError: (errors) => {
                console.error(errors);
                toast.error('Failed to process products. Please check your inputs.');
                setIsProcessing(false);
                setUploadProgress(0);
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Multiple Product Upload" />

            <div className="flex flex-col gap-6 p-4 md:p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Multiple Product Upload</h1>
                        <p className="text-muted-foreground mt-1">Drag and drop images or a folder to quickly manage products.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {isSystemAdmin && currentBranch && (
                            <Card className="bg-primary/5 border-primary/20 shadow-none">
                                <CardContent className="flex items-center gap-3 py-2 px-4">
                                    <ImageIcon className="w-4 h-4 text-primary" />
                                    <div>
                                        <p className="text-[10px] font-medium text-muted-foreground leading-none">Target Branch</p>
                                        <p className="text-xs font-bold text-primary">{currentBranch.branch_name}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        <div className="flex gap-2">
                            <Button variant="outline" className="gap-2 relative overflow-hidden group">
                                <FolderOpen className="w-4 h-4" />
                                <span>Upload Folder</span>
                                <Input
                                    type="file"
                                    //@ts-ignore
                                    webkitdirectory=""
                                    directory=""
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleFolderSelect}
                                />
                            </Button>
                        </div>
                    </div>
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
                        <p className="text-sm text-muted-foreground">Each photo will start or update a product entry</p>
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 bg-background/95 backdrop-blur py-4 border-b">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-xl font-semibold">Queue ({uploadItems.length})</h2>
                                {isProcessing && (
                                    <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary transition-all duration-300" 
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setUploadItems([])} disabled={isProcessing}>
                                    Clear All
                                </Button>
                                <Button onClick={handleSubmit} disabled={isProcessing} className="gap-2 min-w-[150px]">
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Processing {uploadProgress}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            <span>Save All Products</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-8 mt-4">
                            {uploadItems.map((item) => (
                                <ProductUploadCard
                                    key={item.id}
                                    item={item}
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
    onRemove,
    onUpdate,
    onValidate,
}: {
    item: UploadItem;
    onRemove: () => void;
    onUpdate: (field: keyof UploadItem, value: any) => void;
    onValidate: (field: string, value: string) => void;
}) {
    const addVariation = () => {
        onUpdate('variations', [...item.variations, { name: '', options: '' }]);
    };

    const removeVariation = (index: number) => {
        const newVars = [...item.variations];
        newVars.splice(index, 1);
        onUpdate('variations', newVars);
    };

    const updateVariation = (index: number, field: keyof Variation, value: string) => {
        const newVars = [...item.variations];
        newVars[index][field] = value;
        onUpdate('variations', newVars);
    };

    return (
        <Card className="overflow-hidden border-2 border-muted hover:border-primary/30 transition-all duration-300 shadow-md relative">
            {item.isFetching && (
                <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full shadow-lg border">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm font-medium">Fetching details...</span>
                    </div>
                </div>
            )}
            
            <div className="flex flex-col xl:flex-row">
                {/* Photo Section */}
                <div className="xl:w-1/4 relative group bg-muted/20 min-h-[300px]">
                    <img src={item.preview} alt="Upload preview" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 flex flex-col gap-2">
                        <button
                            onClick={onRemove}
                            className="p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="absolute bottom-2 left-2 flex gap-2">
                         {item.isExisting ? (
                            <Badge className="bg-blue-500 hover:bg-blue-600 border-none shadow-lg px-3 py-1">
                                Update Existing
                            </Badge>
                        ) : (
                            <Badge className="bg-green-500 hover:bg-green-600 border-none shadow-lg px-3 py-1">
                                New Product
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Form Section */}
                <div className="xl:w-3/4 p-6 flex flex-col gap-8">
                    {/* Basic Info Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">Brand*</Label>
                            <AutocompleteInput
                                value={item.brand}
                                onValueChange={val => onUpdate('brand', val)}
                                placeholder="Search or type brand"
                                searchUrl="/api/brands/search"
                                className={item.errors.brand ? 'border-red-500' : ''}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Category*</Label>
                            <AutocompleteInput
                                value={item.category}
                                onValueChange={val => onUpdate('category', val)}
                                placeholder="Search or type category"
                                searchUrl="/api/categories/search"
                                className={item.errors.category ? 'border-red-500' : ''}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Supplier (Optional)</Label>
                            <AutocompleteInput
                                value={item.supplier}
                                onValueChange={val => onUpdate('supplier', val)}
                                placeholder="Search or type supplier"
                                searchUrl="/api/suppliers/search"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Product Name*</Label>
                            <Input 
                                value={item.name} 
                                onChange={e => onUpdate('name', e.target.value)}
                                placeholder="Product Name"
                                className={item.errors.name ? 'border-red-500' : ''}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Quantity*</Label>
                            <Input 
                                type="number" 
                                value={item.quantity} 
                                onChange={e => onUpdate('quantity', e.target.value)}
                                placeholder="0" 
                            />
                        </div>
                    </div>

                    {/* Identifiers Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Barcode className="w-4 h-4 text-muted-foreground" />
                                Barcode
                            </Label>
                            <div className="relative">
                                <Input 
                                    value={item.barcode} 
                                    onChange={e => onUpdate('barcode', e.target.value)}
                                    onBlur={e => onValidate('barcode', e.target.value)}
                                    placeholder="Scan or enter barcode"
                                    className={item.errors.barcode ? 'border-red-500' : ''}
                                />
                                {item.isValidating.barcode && <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-primary" />}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <QrCode className="w-4 h-4 text-muted-foreground" />
                                QR Code
                            </Label>
                            <div className="relative">
                                <Input 
                                    value={item.qr_code} 
                                    onChange={e => onUpdate('qr_code', e.target.value)}
                                    onBlur={e => onValidate('qr_code', e.target.value)}
                                    placeholder="Scan or enter QR code"
                                    className={item.errors.qr_code ? 'border-red-500' : ''}
                                />
                                {item.isValidating.qr_code && <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-primary" />}
                            </div>
                        </div>
                    </div>

                    {/* Secondary Identifiers Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Code</Label>
                            <Input 
                                value={item.code} 
                                onChange={e => onUpdate('code', e.target.value)}
                                placeholder="Product Code" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>2Code</Label>
                            <Input 
                                value={item.code_2} 
                                onChange={e => onUpdate('code_2', e.target.value)}
                                placeholder="Secondary Code" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>SKU</Label>
                            <Input 
                                value={item.sku} 
                                onChange={e => onUpdate('sku', e.target.value)}
                                onBlur={e => onValidate('sku', e.target.value)}
                                placeholder="Stock Keeping Unit" 
                            />
                        </div>
                    </div>

                    {/* Pricing and Stock Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Reorder Level</Label>
                            <Input 
                                type="number" 
                                value={item.reorder_level} 
                                onChange={e => onUpdate('reorder_level', e.target.value)}
                                placeholder="0" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Price (₱)</Label>
                            <Input 
                                type="number" 
                                step="0.01"
                                value={item.price} 
                                onChange={e => onUpdate('price', e.target.value)}
                                placeholder="0.00" 
                            />
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

                    {/* Description and Out of Stock */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea 
                                value={item.description} 
                                onChange={e => onUpdate('description', e.target.value)}
                                placeholder="Product description..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                             <div className="p-4 rounded-lg border bg-muted/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <Label className="text-sm font-semibold">Grace Period (Days)</Label>
                                </div>
                                <p className="text-[10px] text-muted-foreground mb-3">
                                    Visibility days after stock reaches 0.
                                </p>
                                <Input
                                    type="number"
                                    value={item.active_until_zero_days}
                                    onChange={e => onUpdate('active_until_zero_days', e.target.value)}
                                    placeholder="Leave empty for forever"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Variations */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Variations (Optional)</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addVariation} className="h-8">
                                <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {item.variations.map((v, i) => (
                                <div key={i} className="flex gap-3 items-center p-3 border rounded-md bg-muted/20">
                                    <Input
                                        placeholder="Name (e.g. Color)"
                                        value={v.name}
                                        onChange={e => updateVariation(i, 'name', e.target.value)}
                                        className="h-9"
                                    />
                                    <Input
                                        placeholder="Options (e.g. Red, Blue)"
                                        value={v.options}
                                        onChange={e => updateVariation(i, 'options', e.target.value)}
                                        className="h-9"
                                    />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeVariation(i)} className="text-red-500 hover:bg-red-50 shrink-0">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
