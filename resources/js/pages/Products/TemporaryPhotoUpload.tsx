import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Upload, X, Check, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface Product {
    id: number;
    name: string;
    sku?: string;
    image_path?: string;
    [key: string]: any;
}

interface UploadItem {
    id: string;
    file: File;
    preview: string;
    productId: number | null;
    productName: string | null;
}

export default function TemporaryPhotoUpload({ productsMissingImages, missingCount }: { productsMissingImages: Product[], missingCount: number }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Products', href: '/products' },
        { title: 'Temporary Photo Upload', href: '/temporary-photo-product-upload' },
    ];

    const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
    const { data, setData, post, processing, reset } = useForm({
        mappings: [] as { productId: number; photo: File }[],
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newItems = acceptedFiles.map((file) => ({
            id: Math.random().toString(36).substring(7),
            file,
            preview: URL.createObjectURL(file),
            productId: null,
            productName: null,
        }));
        setUploadItems((prev) => [...prev, ...newItems]);
    }, []);

    // Manual drag and drop handling since react-dropzone isn't in package.json yet
    // I will implement a simple one to avoid dependency issues if it fails to install
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

    const updateMapping = (id: string, productId: number, productName: string) => {
        setUploadItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, productId, productName } : item
            )
        );
    };

    const handleSubmit = () => {
        const mappings = uploadItems
            .filter((item) => item.productId !== null)
            .map((item) => ({
                productId: item.productId as number,
                photo: item.file,
            }));

        if (mappings.length === 0) {
            toast.error('Please map at least one photo to a product.');
            return;
        }

        // We use FormData for file uploads
        const formData = new FormData();
        mappings.forEach((m, index) => {
            formData.append(`mappings[${index}][productId]`, m.productId.toString());
            formData.append(`mappings[${index}][photo]`, m.photo);
        });

        post(route('api.products.bulk-upload'), {
            data: formData,
            forceFormData: true,
            onSuccess: () => {
                setUploadItems([]);
                toast.success('Photos updated successfully!');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Temporary Photo Product Upload" />

            <div className="flex flex-col gap-6 p-4 md:p-8">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Photo Product Uploads</h1>
                        <p className="text-muted-foreground mt-1">Bulk upload and anchor photos to products.</p>
                    </div>
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="flex items-center gap-4 py-3">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <ImageIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground leading-none">Missing Photos</p>
                                <p className="text-2xl font-bold text-primary">{missingCount}</p>
                            </div>
                        </CardContent>
                    </Card>
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
                        <p className="text-sm text-muted-foreground">or click to browse from your computer</p>
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
                            <h2 className="text-xl font-semibold">Pending Uploads ({uploadItems.length})</h2>
                            <Button onClick={handleSubmit} disabled={processing} className="gap-2">
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Update {uploadItems.filter(i => i.productId).length} Products
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {uploadItems.map((item) => (
                                <UploadCard
                                    key={item.id}
                                    item={item}
                                    onRemove={() => removeUpload(item.id)}
                                    onMap={(productId, productName) => updateMapping(item.id, productId, productName)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Failed Photos / Remaining Products */}
                <Card className="border-red-100 dark:border-red-900/30">
                    <CardHeader className="bg-red-50/50 dark:bg-red-900/10">
                        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-5 h-5" />
                            Products Missing Photos ({missingCount})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {productsMissingImages.length > 0 ? (
                                productsMissingImages.map((product) => (
                                    <div key={product.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{product.name}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{product.sku || 'No SKU'}</span>
                                        </div>
                                        <Badge variant="outline" className="bg-background">
                                            No Image
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-muted-foreground italic">
                                    All products have photos! Good job.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

function UploadCard({
    item,
    onRemove,
    onMap,
}: {
    item: UploadItem;
    onRemove: () => void;
    onMap: (id: number, name: string) => void;
}) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        if (search.length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await axios.get(route('api.products.search-upload'), {
                    params: { query: search },
                });
                setResults(response.data);
                setShowResults(true);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    return (
        <Card className="overflow-hidden border-2 border-muted hover:border-primary/30 transition-all duration-300 shadow-sm">
            <div className="flex h-48">
                {/* Photo Section */}
                <div className="w-1/3 relative group">
                    <img src={item.preview} alt="Upload preview" className="w-full h-full object-cover" />
                    <button
                        onClick={onRemove}
                        className="absolute top-2 left-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    {item.productId && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Badge className="bg-primary text-white scale-110 shadow-lg">Mapped</Badge>
                        </div>
                    )}
                </div>

                {/* Search Section */}
                <div className="w-2/3 p-4 flex flex-col gap-3 relative">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Anchor to Product
                        </label>
                        {item.productName && (
                            <Badge variant="secondary" className="max-w-[150px] truncate">
                                {item.productName}
                            </Badge>
                        )}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, SKU or barcode..."
                            className="pl-9 bg-muted/30 focus-visible:ring-primary/30"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onFocus={() => setShowResults(true)}
                        />
                        
                        {showResults && (results.length > 0 || loading) && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-xl max-h-48 overflow-y-auto">
                                {loading ? (
                                    <div className="p-4 flex justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    results.map((product) => (
                                        <button
                                            key={product.id}
                                            className="w-full flex flex-col items-start p-3 hover:bg-accent transition-colors border-b last:border-0"
                                            onClick={() => {
                                                onMap(product.id, product.name);
                                                setShowResults(false);
                                                setSearch('');
                                            }}
                                        >
                                            <span className="font-medium text-sm text-foreground">{product.name}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{product.sku || 'No SKU'}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                        {showResults && search.length >= 2 && results.length === 0 && !loading && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-xl p-4 text-center text-sm text-muted-foreground">
                                No products found.
                            </div>
                        )}
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground mt-auto italic">
                        Tip: Drag more photos anytime to add to this list.
                    </p>
                </div>
            </div>
        </Card>
    );
}

// Helper for ziggy-js route
const route = (name: string, params?: any) => (window as any).route(name, params);
