import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Upload, X, Check, Loader2, Image as ImageIcon, AlertCircle, FolderOpen } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { ProgressBar } from '@/components/ui/ProgressBar';

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
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    errorMessage?: string;
}

export default function TemporaryPhotoUpload({ productsMissingImages: initialProductsMissingImages, missingCount: initialMissingCount }: { productsMissingImages: Product[], missingCount: number }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Products', href: '/products' },
        { title: 'Temporary Photo Upload', href: '/temporary-photo-product-upload' },
    ];

    const [missingProducts, setMissingProducts] = useState<Product[]>(initialProductsMissingImages);
    const [count, setCount] = useState<number>(initialMissingCount);

    const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [isLocalProcessing, setIsLocalProcessing] = useState(false);
    const [localProgress, setLocalProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await axios.get('/api/products/missing-photos-count');
                setMissingProducts(response.data.productsMissingImages);
                setCount(response.data.missingCount);
            } catch (error) {
                console.error('Error polling missing stats:', error);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const autoMapFile = async (item: UploadItem) => {
        // Extract name from filename
        const filename = item.file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ").trim();
        
        // Try to find in missingProducts first (fastest)
        const localMatch = missingProducts.find(p => 
            p.name.toLowerCase() === filename.toLowerCase() || 
            (p.sku && p.sku.toLowerCase() === filename.toLowerCase())
        );

        if (localMatch) {
            updateMapping(item.id, localMatch.id, localMatch.name);
            return true;
        }

        // Otherwise try the API
        try {
            const response = await axios.get('/api/products/search-for-upload', { params: { query: filename } });
            if (response.data && response.data.length > 0) {
                // If there's an exact match in name or SKU
                const exactMatch = response.data.find((p: Product) => 
                    p.name.toLowerCase() === filename.toLowerCase() || 
                    (p.sku && p.sku.toLowerCase() === filename.toLowerCase())
                );
                if (exactMatch) {
                    updateMapping(item.id, exactMatch.id, exactMatch.name);
                    return true;
                }
            }
        } catch (error) {
            console.error('Auto-map error:', error);
        }
        return false;
    };

    const processFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        setIsLocalProcessing(true);
        setLocalProgress(0);

        const newItems: UploadItem[] = files.map((file) => ({
            id: Math.random().toString(36).substring(7),
            file,
            preview: URL.createObjectURL(file),
            productId: null,
            productName: null,
            status: 'pending',
            progress: 0,
        }));
        
        setUploadItems((prev) => [...prev, ...newItems]);

        let matchedCount = 0;
        for (let i = 0; i < newItems.length; i++) {
            const item = newItems[i];
            const matched = await autoMapFile(item);
            if (matched) matchedCount++;
            setLocalProgress(Math.round(((i + 1) / newItems.length) * 100));
        }

        setIsLocalProcessing(false);
        setLocalProgress(100);

        if (matchedCount > 0) {
            toast.success(`Successfully added ${newItems.length} items (${matchedCount} auto-mapped)`);
        } else {
            toast.success(`Successfully added ${newItems.length} items`);
        }
    }, [missingProducts]);

    // Manual drag and drop handling
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const getFilesFromEntries = async (entries: any[]) => {
        const files: File[] = [];
        const readEntry = async (entry: any) => {
            if (entry.isFile) {
                const file = await new Promise<File>((resolve) => entry.file(resolve));
                if (file.type.startsWith('image/')) {
                    files.push(file);
                }
            } else if (entry.isDirectory) {
                const reader = entry.createReader();
                const readAllEntries = async () => {
                    const dirEntries: any[] = await new Promise((resolve) => reader.readEntries(resolve));
                    if (dirEntries.length > 0) {
                        for (const child of dirEntries) {
                            await readEntry(child);
                        }
                        await readAllEntries();
                    }
                };
                await readAllEntries();
            }
        };

        for (const entry of entries) {
            await readEntry(entry);
        }
        return files;
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const items = e.dataTransfer.items;
        if (items) {
            const entries = [];
            for (let i = 0; i < items.length; i++) {
                const entry = items[i].webkitGetAsEntry();
                if (entry) entries.push(entry);
            }
            const files = await getFilesFromEntries(entries);
            processFiles(files);
        } else {
            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            processFiles(files);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processFiles(Array.from(e.target.files));
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

    const handleSubmit = async () => {
        const mappings = uploadItems
            .filter((item) => item.productId !== null);

        if (mappings.length === 0) {
            toast.error('Please map at least one photo to a product.');
            return;
        }

        setIsProcessing(true);
        setUploadProgress(0);

        const totalItems = mappings.length;
        let completedItems = 0;
        let successCount = 0;
        let errorCount = 0;
        const errorMessages = new Set<string>();

        for (let i = 0; i < mappings.length; i++) {
            const item = mappings[i];

            if (item.status === 'success') {
                successCount++;
                continue;
            }

            updateItemStatus(item.id, 'uploading');

            const formData = new FormData();
            formData.append(`mappings[0][productId]`, item.productId!.toString());
            formData.append(`mappings[0][photo]`, item.file);

            try {
                await axios.post('/api/products/bulk-photo-update', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            updateItemProgress(item.id, percent);
                            
                            // Overall progress
                            const overall = ((completedItems + (percent / 100)) / totalItems) * 100;
                            setUploadProgress(Math.round(overall));
                        }
                    }
                });

                updateItemStatus(item.id, 'success');
                completedItems++;
                successCount++;
                setUploadProgress(Math.round((completedItems / totalItems) * 100));
            } catch (error: any) {
                console.error(`Error uploading photo for product ${item.productName}:`, error);
                
                let msg = error.response?.data?.message || error.message || 'Unknown error';
                
                // Extract Laravel validation errors if present
                if (error.response?.status === 422 && error.response?.data?.errors) {
                    const validationErrors = error.response.data.errors;
                    const firstKey = Object.keys(validationErrors)[0];
                    if (validationErrors[firstKey] && validationErrors[firstKey][0]) {
                        msg = validationErrors[firstKey][0];
                    }
                }

                errorCount++;
                errorMessages.add(msg);
                
                setUploadItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMessage: msg } : i));
                toast.error(`Failed to upload ${item.productName}: ${msg}`);
            }
        }

        setIsProcessing(false);
        
        if (errorCount === 0) {
            toast.success('All photos updated successfully!');
        } else {
            const uniqueErrors = Array.from(errorMessages);
            if (uniqueErrors.length === 1) {
                toast.error(`Finished with ${errorCount} error(s): ${uniqueErrors[0]}`);
            } else {
                toast.warning(`Finished processing with ${errorCount} errors. Check individual items.`);
            }
        }
    };

    const updateItemStatus = (id: string, status: 'pending' | 'uploading' | 'success' | 'error') => {
        setUploadItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    };

    const updateItemProgress = (id: string, progress: number) => {
        setUploadItems(prev => prev.map(item => item.id === id ? { ...item, progress } : item));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Temporary Photo Product Upload" />

            <div className="flex flex-col gap-6 p-4 md:p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Photo Product Uploads</h1>
                        <p className="text-muted-foreground mt-1">Bulk upload and anchor photos to products.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Card className="bg-primary/5 border-primary/20 shadow-none">
                            <CardContent className="flex items-center gap-4 py-2 px-4">
                                <div className="p-1.5 bg-primary/10 rounded-full">
                                    <ImageIcon className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-muted-foreground leading-none uppercase tracking-wider">Missing</p>
                                    <p className="text-xl font-bold text-primary">{count}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Local Progress Indicator */}
                {isLocalProcessing && (
                    <Card className="bg-primary/5 border-primary/20 shadow-none overflow-hidden animate-in fade-in slide-in-from-top-4">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-sm font-medium">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    <span>Processing files and auto-mapping...</span>
                                </div>
                                <span className="text-primary">{localProgress}%</span>
                            </div>
                            <ProgressBar value={localProgress} className="h-2" />
                        </CardContent>
                    </Card>
                )}

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
                        <p className="text-lg font-semibold">Drag and drop multiple photos or folders here</p>
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 bg-background/95 backdrop-blur py-4 border-b">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-xl font-semibold">Pending Uploads ({uploadItems.length})</h2>
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
                                            <span>Uploading {uploadProgress}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            <span>Update {uploadItems.filter(i => i.productId).length} Products</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
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
                <Card className="border-red-100 dark:border-red-900/30 overflow-hidden shadow-sm">
                    <CardHeader className="bg-red-50/50 dark:bg-red-900/10 flex flex-row items-center justify-between py-3">
                        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400 text-lg">
                            <AlertCircle className="w-5 h-5" />
                            Missing Product Photos ({count})
                        </CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter missing..."
                                className="pl-8 h-8 text-xs bg-background/50 border-red-200 focus-visible:ring-red-400"
                                onChange={(e) => {
                                    const val = e.target.value.toLowerCase();
                                    const items = document.querySelectorAll('.missing-product-item');
                                    items.forEach(item => {
                                        const text = item.getAttribute('data-search')?.toLowerCase() || '';
                                        (item as HTMLElement).style.display = text.includes(val) ? 'flex' : 'none';
                                    });
                                }}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
                            {missingProducts.length > 0 ? (
                                missingProducts.map((product) => (
                                    <div 
                                        key={product.id} 
                                        data-search={`${product.name} ${product.sku}`}
                                        className="missing-product-item flex items-center justify-between p-3 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{product.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{product.sku || 'No SKU'}</span>
                                        </div>
                                        <Badge variant="outline" className="bg-red-100/50 text-red-600 border-red-200 text-[10px] h-5">
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
                const response = await axios.get('/api/products/search-for-upload', {
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
                    {item.productId && item.status === 'pending' && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                            <Badge className="bg-primary text-white scale-110 shadow-lg border-none px-3">Mapped</Badge>
                        </div>
                    )}

                    {item.status === 'uploading' && (
                        <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-[1px] flex flex-col items-center justify-center p-4">
                            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                            <span className="text-[10px] font-bold text-primary mb-2">{item.progress}%</span>
                            <ProgressBar value={item.progress} className="h-1.5 w-full" />
                        </div>
                    )}

                    {item.status === 'success' && (
                        <div className="absolute inset-0 z-50 bg-green-500/20 backdrop-blur-[1px] flex items-center justify-center">
                            <div className="bg-green-500 text-white rounded-full p-2 shadow-lg animate-in zoom-in-50">
                                <Check className="w-6 h-6" />
                            </div>
                        </div>
                    )}

                    {item.status === 'error' && (
                        <div className="absolute inset-0 z-50 bg-red-500/20 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center">
                            <div className="bg-red-500 text-white rounded-full p-1.5 shadow-lg mb-2">
                                <X className="w-4 h-4" />
                            </div>
                            {item.errorMessage && (
                                <p className="text-[9px] font-bold text-red-600 bg-white/90 px-2 py-1 rounded border border-red-200 mb-2 max-w-full truncate">
                                    {item.errorMessage}
                                </p>
                            )}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-6 text-[10px] bg-white border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => updateItemStatus(item.id, 'pending')}
                            >
                                Retry
                            </Button>
                        </div>
                    )}
                </div>

                {/* Search Section */}
                <div className="w-2/3 p-4 flex flex-col gap-3 relative">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Anchor to Product
                        </label>
                        {item.productName && (
                            <Badge variant="secondary" className="max-w-[150px] truncate bg-primary/10 text-primary border-none text-[10px]">
                                {item.productName}
                            </Badge>
                        )}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search name, SKU, barcode..."
                            className="pl-9 bg-muted/30 border-none focus-visible:ring-primary/30 h-10 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onFocus={() => setShowResults(true)}
                        />
                        
                        {showResults && (results.length > 0 || loading) && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-2xl max-h-48 overflow-y-auto">
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
                                            <span className="font-semibold text-sm text-foreground">{product.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{product.sku || 'No SKU'}</span>
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
                        Tip: Name files as product names or SKUs for auto-mapping.
                    </p>
                </div>
            </div>
        </Card>
    );
}

