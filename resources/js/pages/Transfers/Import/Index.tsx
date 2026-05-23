import AppLayout from '@/layouts/app-layout';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Upload, FileImage, Loader2, AlertCircle, Trash2, Plus, Save, CheckCircle, PlusCircle, HelpCircle, Sparkles, Barcode, QrCode, Eye, AlertTriangle, RefreshCw, X, Ban, FileSpreadsheet, Check } from 'lucide-react';
import { toast } from 'sonner';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import axios from 'axios';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Variation {
    name: string;
    options: string;
}

interface InventoryItem {
    item_name: string;
    quantity: number;
    exists_in_branch?: boolean;
    product_id?: number;
    brand_id?: string;
    category_id?: string;
    supplier_id?: string;
    price?: string | number;
    code?: string;
    code_2?: string;
    sku?: string;
    barcode?: string;
    qr_code?: string;
    physical_location?: string;
    reorder_level?: number;
    current_stock?: number;
    description?: string;
    variations?: Variation[];
    // Helper fields for autocomplete
    brand_name?: string;
    category_name?: string;
    supplier_name?: string;
    attach_image?: boolean;
}

interface AnalysisResult {
    inventory_items: InventoryItem[];
}

interface IndexProps {
    analysis_result?: AnalysisResult;
    flash?: any;
    brands: { id: number; name: string }[];
    categories: { id: number; name: string }[];
    suppliers: { id: number; name: string }[];
    importDailyUsage?: number;
    importMinuteUsage?: number;
    scanned_image_path?: string;
}

export default function ImportTransferIndex({ brands = [], categories = [], suppliers = [], importDailyUsage = 0, importMinuteUsage = 0, scanned_image_path }: IndexProps) {
    const { data, setData, post, processing, errors } = useForm({
        image: null as File | null,
    });

    // Props from controller
    const { analysis_result, flash, scanned_image_path: scannedImagePathProp } = usePage().props as any;
    const activeScannedImagePath = scanned_image_path || scannedImagePathProp;

    // Local state
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Google Sheets Pull Sync States
    const { auth } = usePage<any>().props;
    const isSystemAdmin = auth?.user?.roles?.includes('System Administrator') || auth?.roles?.includes('System Administrator');
    const [isPullModalOpen, setIsPullModalOpen] = useState(false);
    const [isFetchingPull, setIsFetchingPull] = useState(false);
    const [pullBranchName, setPullBranchName] = useState('');
    const [pullItems, setPullItems] = useState<any[]>([]);
    const [isSavingPull, setIsSavingPull] = useState(false);

    const handlePullFromGoogleSheets = async () => {
        setIsFetchingPull(true);
        const toastId = toast.loading("Connecting to Google Sheets & analyzing branch inventory...", { duration: 10000 });
        try {
            const response = await axios.get('/google-sheets/pull-compare');
            if (response.data.success) {
                setPullBranchName(response.data.branch_name);
                setPullItems(response.data.items);
                setIsPullModalOpen(true);
                toast.success(`Successfully pulled ${response.data.items.length} items from sheets!`, { id: toastId });
            } else {
                toast.error(response.data.error || "Failed to pull sheet contents.", { id: toastId });
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || "Error pulling from Google Sheets.", { id: toastId });
        } finally {
            setIsFetchingPull(false);
        }
    };

    const handleUpdatePullItemCell = (index: number, field: string, value: any) => {
        const updated = [...pullItems];
        updated[index] = {
            ...updated[index],
            values: {
                ...updated[index].values,
                [field]: value
            }
        };

        const item = updated[index];
        if (item.original_id) {
            let hasChanges = false;
            const changesList: string[] = [];

            // Fields that exist in original db
            Object.keys(item.db_values).forEach((key) => {
                const dbVal = item.db_values[key];
                const currentVal = item.values[key];
                
                if (key === 'price') {
                    if (parseFloat(currentVal) !== parseFloat(dbVal)) {
                        hasChanges = true;
                        changesList.push(key);
                    }
                } else if (key === 'quantity' || key === 'reorder_level') {
                    if (parseInt(currentVal) !== parseInt(dbVal)) {
                        hasChanges = true;
                        changesList.push(key);
                    }
                } else {
                    if (String(currentVal ?? '').trim() !== String(dbVal ?? '').trim()) {
                        hasChanges = true;
                        changesList.push(key);
                    }
                }
            });

            item.status = hasChanges ? 'modified' : 'unchanged';
            item.changes = changesList;
        }

        // Check for duplicate barcode/sku/qr within the pulled list
        const barcodeCounts: Record<string, number> = {};
        const qrCodeCounts: Record<string, number> = {};
        const skuCounts: Record<string, number> = {};

        updated.forEach((it) => {
            if (it.is_rejected) return;
            const bc = String(it.values.barcode || '').trim();
            const qr = String(it.values.qr_code || '').trim();
            const sk = String(it.values.sku || '').trim();

            if (bc) barcodeCounts[bc] = (barcodeCounts[bc] || 0) + 1;
            if (qr) qrCodeCounts[qr] = (qrCodeCounts[qr] || 0) + 1;
            if (sk) skuCounts[sk] = (skuCounts[sk] || 0) + 1;
        });

        // Re-calculate warnings
        updated.forEach((it) => {
            const bc = String(it.values.barcode || '').trim();
            const qr = String(it.values.qr_code || '').trim();
            const sk = String(it.values.sku || '').trim();

            let newWarnings = [...(it.warnings || [])];
            // Clear prior internal duplicate warnings
            newWarnings = newWarnings.filter(
                (w) => !w.includes('multiple times in the Google Sheet')
            );

            if (bc && barcodeCounts[bc] > 1) {
                newWarnings.push(`Duplicate barcode '${bc}' found multiple times in the Google Sheet.`);
            }
            if (qr && qrCodeCounts[qr] > 1) {
                newWarnings.push(`Duplicate QR Code '${qr}' found multiple times in the Google Sheet.`);
            }
            if (sk && skuCounts[sk] > 1) {
                newWarnings.push(`Duplicate SKU '${sk}' found multiple times in the Google Sheet.`);
            }

            // Deduplicate warnings list
            it.warnings = Array.from(new Set(newWarnings));

            if (it.warnings.length > 0) {
                it.status = 'duplicate';
            } else if (it.status === 'duplicate') {
                it.status = it.original_id ? 'modified' : 'new';
            }
        });

        setPullItems(updated);
    };

    const handleToggleRejectPullItem = (index: number) => {
        const updated = [...pullItems];
        updated[index] = {
            ...updated[index],
            is_rejected: !updated[index].is_rejected
        };
        // Re-validate duplicates for all non-rejected items
        setPullItems(updated);
        // Force a recalculation trigger
        handleUpdatePullItemCell(index, 'id', updated[index].values.id);
    };

    const handleSavePullData = async () => {
        setIsSavingPull(true);
        const toastId = toast.loading("Writing confirmed sheet changes to database...", { duration: 15000 });
        try {
            const response = await axios.post('/google-sheets/pull-save', {
                items: pullItems
            });
            if (response.data.success) {
                toast.success(response.data.message || "Database synchronized successfully!", { id: toastId });
                setIsPullModalOpen(false);
                router.reload();
            } else {
                toast.error(response.data.error || "Failed to sync changes.", { id: toastId });
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || "Error applying sheets changes.", { id: toastId });
        } finally {
            setIsSavingPull(false);
        }
    };

    const renderInputCell = (index: number, field: string, type: 'text' | 'number' = 'text') => {
        const item = pullItems[index];
        const value = item.values[field];
        const originalValue = item.db_values[field];
        const isChanged = item.changes?.includes(field);

        return (
            <td className={`p-0 border relative min-w-[140px] ${isChanged ? 'bg-amber-100/40 dark:bg-amber-950/20' : ''} ${item.is_rejected ? 'bg-muted/40' : ''}`}>
                <input
                    type={type}
                    value={value ?? ''}
                    disabled={item.is_rejected}
                    onChange={(e) => handleUpdatePullItemCell(index, field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                    className={`w-full h-8 px-2 text-xs bg-transparent border-none focus:ring-1 focus:ring-emerald-500 outline-none ${isChanged ? 'font-semibold text-amber-800 dark:text-amber-300' : ''} ${item.is_rejected ? 'text-muted-foreground line-through' : ''}`}
                />
                {isChanged && originalValue !== undefined && (
                    <span className="absolute bottom-0 right-1 text-[8px] text-amber-600 dark:text-amber-400 font-bold pointer-events-none scale-90 select-none">
                        DB: {originalValue}
                    </span>
                )}
            </td>
        );
    };

    useEffect(() => {
        // Check both prop (from render) and flash (fallback)
        const result = analysis_result || flash?.analysis_result;
        if (result?.inventory_items) {
            // Map IDs to names for AutocompleteInput if they exist
            const mappedItems = result.inventory_items.map((item: InventoryItem) => ({
                ...item,
                brand_name: item.brand_id ? brands.find(b => String(b.id) === String(item.brand_id))?.name : '',
                category_name: item.category_id ? categories.find(c => String(c.id) === String(item.category_id))?.name : '',
                supplier_name: item.supplier_id ? suppliers.find(s => String(s.id) === String(item.supplier_id))?.name : '',
                attach_image: false,
            }));
            setItems(mappedItems);
        }
    }, [analysis_result, flash]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setData('image', file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.image) {
            toast.error("Please select an image first");
            return;
        }
        post('/import-transfer', {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                // Toast handled in useEffect upon flash data arrival
            },
            onError: () => {
                toast.error("Failed to analyze image");
            }
        });
    };

    const updateItem = (index: number, field: keyof InventoryItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const updateStock = async (index: number) => {
        const item = items[index];
        if (!item.product_id) return;

        try {
            const response = await axios.post('/import-transfer/update-stock', {
                product_id: item.product_id,
                quantity_added: item.quantity,
                image_path: item.attach_image ? activeScannedImagePath : null,
                attach_image: !!item.attach_image
            });

            if (response.data.success) {
                toast.success(response.data.message);
                const newItems = [...items];
                newItems[index].current_stock = response.data.new_stock;
                newItems[index].quantity = 0;
                setItems(newItems);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update stock");
        }
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const addItem = () => {
        setItems([...items, { item_name: '', quantity: 1, variations: [] }]);
    };

    const confirmSubmitAll = () => {
        setIsConfirmModalOpen(true);
    };

    const submitAll = () => {
        setIsConfirmModalOpen(false);
        
        const preparedItems = items.filter(i => !i.exists_in_branch).map(item => ({
            ...item,
            image_path: item.attach_image ? activeScannedImagePath : null
        }));

        router.post('/import-transfer/bulk-store', { items: preparedItems } as any, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('Successfully created new products.');
            },
            onError: (err) => {
                console.error(err);
                toast.error("Failed to process the items. Please check if all required fields are filled.");
            }
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Import Transfer', href: '/import-transfer' }]}>
            <Head title="Import Transfer" />

            <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Import Transfer from Image</h2>
                        <p className="text-muted-foreground">
                            Upload a photo of a packing list to extract items, then review and edit the results.
                        </p>
                    </div>
                    {isSystemAdmin && (
                        <Button 
                            onClick={handlePullFromGoogleSheets}
                            disabled={isFetchingPull}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm flex items-center gap-2"
                        >
                            {isFetchingPull ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="w-4 h-4" />
                            )}
                            Pull from Google Sheet
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Upload Section */}
                    <Card className="lg:col-span-6 sticky top-6">
                        <CardHeader className="flex flex-col gap-2">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    Upload Image
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none font-medium whitespace-nowrap text-[10px] px-1.5 py-0 h-4">
                                        <Sparkles className="w-2.5 h-2.5 mr-1" />
                                        Larable AI default Subscription
                                    </Badge>
                                </CardTitle>
                                <CardDescription className="flex items-center justify-between mt-1">
                                    <span>Supported formats: JPG, PNG</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-semibold ${importMinuteUsage >= 5 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                            {importMinuteUsage} / 5 Per Minute
                                        </span>
                                        <span className={`text-xs font-semibold ${importDailyUsage >= 20 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                            {importDailyUsage} / 20 Daily Limit
                                        </span>
                                    </div>
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-4">
                                <div 
                                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative h-96 bg-muted/5 overflow-hidden"
                                    onClick={() => previewUrl && setIsModalOpen(true)}
                                >
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={handleFileChange}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex flex-col items-center gap-2 pointer-events-none w-full h-full justify-center">
                                        {previewUrl ? (
                                            <div className="relative w-full h-full p-2">
                                                <img
                                                    src={previewUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-contain rounded-md"
                                                />
                                                <div className="absolute bottom-2 left-0 right-0 text-center bg-black/50 text-white text-xs py-1.5 rounded-b-md mx-2 flex items-center justify-center gap-2">
                                                    <Eye className="w-3 h-3" /> Click to view full size
                                                </div>
                                            </div>
                                        ) : data.image ? (
                                            <>
                                                <FileImage className="h-10 w-10 text-primary" />
                                                <span className="font-medium text-sm">{data.image.name}</span>
                                                <span className="text-xs text-muted-foreground">Click to change</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                                                <span className="font-medium text-base">Click to upload or drag and drop</span>
                                                <span className="text-xs text-muted-foreground">Supported: JPG, PNG (Max 10MB)</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {errors.image && <span className="text-sm text-red-500">{errors.image}</span>}
                                {flash?.error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {flash.error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={processing || !data.image || importDailyUsage >= 20 || importMinuteUsage >= 5}
                                    variant={(importDailyUsage >= 20 || importMinuteUsage >= 5) ? "secondary" : "default"}
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : importDailyUsage >= 20 ? (
                                        "Daily Limit Reached"
                                    ) : importMinuteUsage >= 5 ? (
                                        "Minute Limit Reached (Wait 60s)"
                                    ) : (
                                        "Upload & Analyze"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Results Section */}
                    <div className="lg:col-span-6 flex flex-col h-full min-h-[500px]">
                        {processing ? (
                            <Card className="border-blue-200 bg-white shadow-md flex-1">
                                <CardContent className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-blue-600">
                                    <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-60" />
                                    <h3 className="text-xl font-medium text-blue-900 mb-1">Analyzing Document</h3>
                                    <p className="text-sm text-blue-700/80 text-center max-w-sm">
                                        Please wait while the AI extracts inventory items from your image...
                                    </p>
                                    <div className="mt-4 flex flex-col items-center">
                                        <p className="text-xs text-blue-700/60 font-medium mb-1">
                                            Powered by Larable AI
                                        </p>
                                        <p className="text-xs text-amber-600 font-medium text-center bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                            AI makes mistakes, always double-check results before proceeding.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : items.length > 0 ? (
                            <Card className="border-green-200 bg-white shadow-md flex-1 flex flex-col">
                                <CardHeader className="bg-green-50/50 pb-4 shrink-0">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-green-800 flex items-center gap-2">
                                            Analysis Results
                                        </CardTitle>
                                        <Button size="sm" variant="outline" onClick={addItem} className="h-8 gap-1 bg-white">
                                            <Plus className="w-3 h-3" /> Add Item
                                        </Button>
                                    </div>
                                    <CardDescription>
                                        Review extracted items ({items.length}). You can edit details before creating the transfer.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 overflow-hidden max-h-[1000px] overflow-y-auto space-y-4 bg-muted/20">
                                    {items.map((item, idx) => {
                                        const thumbnailSrc = previewUrl || (activeScannedImagePath ? `/storage/${activeScannedImagePath}` : null);
                                        return (
                                            <Card key={idx} className={`relative overflow-hidden ${item.exists_in_branch ? 'border-primary/50' : 'border-amber-500/50'}`}>
                                                <div className={`absolute top-0 left-0 w-1.5 h-full ${item.exists_in_branch ? 'bg-primary' : 'bg-amber-500'}`} />
                                                <CardContent className="p-4 sm:p-5">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-2">
                                                        {item.exists_in_branch ? (
                                                            <Badge className="bg-primary hover:bg-primary text-primary-foreground font-medium">
                                                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Existing Product
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="border-amber-500 text-amber-600 font-medium">
                                                                New Product
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 -mt-2 -mr-2"
                                                        onClick={() => removeItem(idx)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                {/* Header fields always shown */}
                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end mb-4">
                                                    <div className="sm:col-span-6 space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Product Name</Label>
                                                        <AutocompleteInput
                                                            value={item.item_name}
                                                            onValueChange={(val) => updateItem(idx, 'item_name', val)}
                                                            placeholder="Search or type product name"
                                                            searchUrl="/api/products/search"
                                                            className="font-medium"
                                                        />
                                                    </div>

                                                    <div className="sm:col-span-3 space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Qty Sent</Label>
                                                        <Input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                                                            className="text-right font-medium"
                                                        />
                                                    </div>

                                                    <div className="sm:col-span-3 space-y-1.5">
                                                        {item.exists_in_branch ? (
                                                            <>
                                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Stock</Label>
                                                                <div className="flex h-9 w-full items-center justify-center rounded-md border border-input bg-muted/30 px-3 py-1 text-sm font-bold text-primary">
                                                                    {item.current_stock ?? 0}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="h-9"></div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">Category</Label>
                                                        <AutocompleteInput
                                                            value={item.category_name || ''}
                                                            onValueChange={(val) => updateItem(idx, 'category_name', val)}
                                                            placeholder="Search or type category"
                                                            searchUrl="/api/categories/search"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">Brand</Label>
                                                        <AutocompleteInput
                                                            value={item.brand_name || ''}
                                                            onValueChange={(val) => updateItem(idx, 'brand_name', val)}
                                                            placeholder="Search or type brand"
                                                            searchUrl="/api/brands/search"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">Supplier (Optional)</Label>
                                                        <AutocompleteInput
                                                            value={item.supplier_name || ''}
                                                            onValueChange={(val) => updateItem(idx, 'supplier_name', val)}
                                                            placeholder="Search or type supplier"
                                                            searchUrl="/api/suppliers/search"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">Price (₱)</Label>
                                                        <Input type="number" className="h-9" value={item.price || ''} onChange={(e) => updateItem(idx, 'price', e.target.value)} placeholder="0.00" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Barcode className="w-3 h-3" /> Barcode</Label>
                                                        <Input className="h-9" value={item.barcode || ''} onChange={(e) => updateItem(idx, 'barcode', e.target.value)} placeholder="Scan Barcode" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><QrCode className="w-3 h-3" /> QR Code</Label>
                                                        <Input className="h-9" value={item.qr_code || ''} onChange={(e) => updateItem(idx, 'qr_code', e.target.value)} placeholder="Scan QR" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">SKU</Label>
                                                        <Input className="h-9" value={item.sku || ''} onChange={(e) => updateItem(idx, 'sku', e.target.value)} placeholder="SKU" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">Code</Label>
                                                        <Input className="h-9" value={item.code || ''} onChange={(e) => updateItem(idx, 'code', e.target.value)} placeholder="Code" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">2Code</Label>
                                                        <Input className="h-9" value={item.code_2 || ''} onChange={(e) => updateItem(idx, 'code_2', e.target.value)} placeholder="2Code" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">Physical Loc.</Label>
                                                        <Input className="h-9" value={item.physical_location || ''} onChange={(e) => updateItem(idx, 'physical_location', e.target.value)} placeholder="Location" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-muted-foreground">Reorder Level</Label>
                                                        <Input type="number" className="h-9" value={item.reorder_level ?? ''} onChange={(e) => updateItem(idx, 'reorder_level', parseInt(e.target.value) || 0)} placeholder="0" />
                                                    </div>
                                                </div>

                                                {thumbnailSrc && (
                                                    <div className="mt-5 pt-4 border-t border-dashed flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-muted/30 p-3 rounded-lg border">
                                                        <div className="flex items-center gap-3">
                                                            <Checkbox
                                                                id={`attach-image-${idx}`}
                                                                checked={item.attach_image || false}
                                                                onCheckedChange={(checked) => updateItem(idx, 'attach_image', !!checked)}
                                                                className="h-5 w-5 rounded border-muted-foreground/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 transition-all duration-200"
                                                            />
                                                            <div className="grid gap-0.5">
                                                                <Label htmlFor={`attach-image-${idx}`} className="text-sm font-semibold flex items-center gap-1.5 cursor-pointer text-foreground">
                                                                    <FileImage className="w-4 h-4 text-emerald-600" />
                                                                    Attach Packing List Photo
                                                                </Label>
                                                                <span className="text-xs text-muted-foreground">
                                                                    Save the scanned image as this product's primary photo.
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {item.attach_image && (
                                                            <div className="relative group/thumb shrink-0 self-start sm:self-auto">
                                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-md blur opacity-30 group-hover/thumb:opacity-60 transition duration-300"></div>
                                                                <div className="relative border bg-background rounded-md p-1 shadow-sm overflow-hidden flex items-center gap-2">
                                                                    <img
                                                                        src={thumbnailSrc}
                                                                        alt="Thumbnail"
                                                                        className="w-12 h-12 object-cover rounded"
                                                                    />
                                                                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                                                                        Ready
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {item.exists_in_branch && (
                                                    <div className="mt-4 flex justify-end">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => updateStock(idx)}
                                                            disabled={!item.quantity || item.quantity <= 0}
                                                            className="gap-2"
                                                        >
                                                            <Save className="w-3.5 h-3.5" /> Update Existing Stock
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                        );
                                    })}
                                </CardContent>
                                <CardFooter className="bg-green-50/50 p-4 border-t sticky bottom-0 z-10">
                                    <Button className="w-full bg-green-600 hover:bg-green-700 shadow-sm" onClick={confirmSubmitAll} disabled={processing}>
                                        <Save className="w-4 h-4 mr-2" />
                                        Update Product List
                                    </Button>
                                </CardFooter>
                            </Card>
                        ) : (
                            <div className="h-full w-full min-h-[500px] flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/5 text-muted-foreground">
                                <FileImage className="h-12 w-12 mb-3 opacity-10" />
                                <p>Upload an image to see analysis results here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Everything looks good?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to add these new items to your product inventory?
                            This action will create new product records and establish their initial stock levels for this branch.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submitAll} disabled={processing}>
                            {processing ? "Saving..." : "Confirm & Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Photo Viewer Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-5xl p-0 overflow-hidden border-none bg-transparent shadow-none">
                    <div className="relative group">
                        {previewUrl && (
                            <>
                                <div className="absolute top-4 left-4 z-10">
                                    <Badge className="bg-black/60 text-white backdrop-blur-md border-none px-4 py-1.5 text-sm font-medium">
                                        Packing List Image
                                    </Badge>
                                </div>
                                <img 
                                    src={previewUrl} 
                                    alt="Full Size Preview" 
                                    className="w-full h-auto max-h-[90vh] object-contain rounded-lg shadow-2xl"
                                />
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Google Sheets Pull sync spreadsheet modal */}
            <Dialog open={isPullModalOpen} onOpenChange={setIsPullModalOpen}>
                <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden bg-background border shadow-2xl rounded-xl">
                    {/* Modal Header */}
                    <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-900/50 p-2 rounded-lg text-emerald-200">
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                                    Sheet Sync: '{pullBranchName}' Tab
                                </DialogTitle>
                                <DialogDescription className="text-emerald-100/80 text-xs mt-0.5">
                                    Review the differences pulled from Google Sheets. You can edit cells directly. Duplicates can be rejected to secure your database records.
                                </DialogDescription>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsPullModalOpen(false)}
                            className="text-emerald-100 hover:text-white hover:bg-emerald-700/50"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Modal Content - Scrolling Grid */}
                    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
                        {/* Summary / Alerts Panel */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/30 border p-3 rounded-lg text-xs">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                    <span>New: {pullItems.filter(i => i.status === 'new' && !i.is_rejected).length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                    <span>Modified: {pullItems.filter(i => i.status === 'modified' && !i.is_rejected).length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                                    <span className="font-semibold text-rose-600 dark:text-rose-400">Duplicates/Warnings: {pullItems.filter(i => i.status === 'duplicate' && !i.is_rejected).length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50"></span>
                                    <span>Rejected: {pullItems.filter(i => i.is_rejected).length}</span>
                                </div>
                            </div>
                            <div className="text-[11px] text-muted-foreground italic font-semibold">
                                * Double-click or click any cell to edit details inline, similar to Google Sheets.
                            </div>
                        </div>

                        {/* Spreadsheet Grid Container */}
                        <div className="flex-1 overflow-x-auto overflow-y-auto border border-muted-foreground/20 rounded-lg shadow-inner bg-background relative max-h-[52vh]">
                            <table className="table-auto w-auto min-w-max border-collapse border border-muted/50">
                                <thead className="bg-emerald-900/10 sticky top-0 z-20 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
                                    <tr className="bg-emerald-800 text-white">
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-center w-24">Sync Status</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-center w-14">Row</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[70px]">ID</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[200px]">Product Name</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[150px]">Barcode</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[150px]">QR Code</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[140px]">SKU</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[100px]">Code</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[100px]">2Code</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-right min-w-[100px]">Price (₱)</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-right min-w-[100px]">Quantity</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-right min-w-[100px]">Reorder Lvl</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[140px]">Brand</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[140px]">Category</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[140px]">Supplier</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[200px]">Variations</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[120px]">Location</th>
                                        <th className="px-3 py-1.5 border border-emerald-700 text-xs font-bold text-left min-w-[250px]">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pullItems.map((item, idx) => {
                                        const isRejected = item.is_rejected;
                                        const hasWarnings = item.warnings && item.warnings.length > 0;
                                        
                                        // Row coloring classes
                                        let rowBg = 'bg-background hover:bg-muted/30';
                                        if (isRejected) {
                                            rowBg = 'bg-muted/40 opacity-60 line-through select-none';
                                        } else if (item.status === 'duplicate') {
                                            rowBg = 'bg-rose-500/10 hover:bg-rose-500/20';
                                        } else if (item.status === 'new') {
                                            rowBg = 'bg-emerald-500/5 hover:bg-emerald-500/10';
                                        } else if (item.status === 'modified') {
                                            rowBg = 'bg-amber-500/5 hover:bg-amber-500/10';
                                        }

                                        return (
                                            <tr key={idx} className={`${rowBg} transition-colors border-b`}>
                                                {/* Actions */}
                                                <td className="px-2 py-1 border text-center whitespace-nowrap z-10 sticky left-0 bg-background shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant={isRejected ? "secondary" : "destructive"}
                                                            className="h-6 px-1.5 text-[10px] font-bold"
                                                            onClick={() => handleToggleRejectPullItem(idx)}
                                                        >
                                                            {isRejected ? "Approve" : "Reject"}
                                                        </Button>
                                                        
                                                        {/* Simple status indicator badge */}
                                                        {isRejected ? (
                                                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">Rejected</Badge>
                                                        ) : item.status === 'duplicate' ? (
                                                            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 bg-rose-600 animate-pulse">Duplicate</Badge>
                                                        ) : item.status === 'new' ? (
                                                            <Badge className="text-[9px] px-1 py-0 h-4 bg-emerald-600 hover:bg-emerald-600 text-white">New</Badge>
                                                        ) : item.status === 'modified' ? (
                                                            <Badge className="text-[9px] px-1 py-0 h-4 bg-amber-50 hover:bg-amber-50 text-amber-950 font-bold">Modified</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-muted-foreground border-muted-foreground/30">Synced</Badge>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Sheet row index */}
                                                <td className="px-2 py-1 border text-center text-[10px] text-muted-foreground font-semibold">
                                                    {item.sheet_row_index}
                                                </td>

                                                {/* ID */}
                                                <td className="px-3 py-1 border text-xs text-muted-foreground font-mono font-semibold">
                                                    {item.original_id || <span className="text-[10px] italic text-emerald-600 font-bold">New</span>}
                                                </td>

                                                {/* Standard columns using helper */}
                                                {renderInputCell(idx, 'name')}
                                                
                                                {/* Barcode with warning check */}
                                                <td className={`p-0 border relative min-w-[150px] ${item.changes?.includes('barcode') ? 'bg-amber-100/40 dark:bg-amber-950/20' : ''} ${isRejected ? 'bg-muted/40' : ''} ${hasWarnings && item.warnings.some((w: string) => w.includes('barcode')) ? 'border-rose-500 border-2' : ''}`}>
                                                    <div className="flex items-center w-full">
                                                        <input
                                                            type="text"
                                                            value={item.values.barcode ?? ''}
                                                            disabled={isRejected}
                                                            onChange={(e) => handleUpdatePullItemCell(idx, 'barcode', e.target.value)}
                                                            className="w-full h-8 px-2 text-xs bg-transparent border-none focus:ring-1 focus:ring-emerald-500 outline-none"
                                                        />
                                                        {hasWarnings && item.warnings.some((w: string) => w.includes('barcode')) && (
                                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 mr-1.5 shrink-0" />
                                                        )}
                                                    </div>
                                                </td>

                                                {/* QR Code with warning check */}
                                                <td className={`p-0 border relative min-w-[150px] ${item.changes?.includes('qr_code') ? 'bg-amber-100/40 dark:bg-amber-950/20' : ''} ${isRejected ? 'bg-muted/40' : ''} ${hasWarnings && item.warnings.some((w: string) => w.includes('QR Code')) ? 'border-rose-500 border-2' : ''}`}>
                                                    <div className="flex items-center w-full">
                                                        <input
                                                            type="text"
                                                            value={item.values.qr_code ?? ''}
                                                            disabled={isRejected}
                                                            onChange={(e) => handleUpdatePullItemCell(idx, 'qr_code', e.target.value)}
                                                            className="w-full h-8 px-2 text-xs bg-transparent border-none focus:ring-1 focus:ring-emerald-500 outline-none"
                                                        />
                                                        {hasWarnings && item.warnings.some((w: string) => w.includes('QR Code')) && (
                                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 mr-1.5 shrink-0" />
                                                        )}
                                                    </div>
                                                </td>

                                                {/* SKU with warning check */}
                                                <td className={`p-0 border relative min-w-[140px] ${item.changes?.includes('sku') ? 'bg-amber-100/40 dark:bg-amber-950/20' : ''} ${isRejected ? 'bg-muted/40' : ''} ${hasWarnings && item.warnings.some((w: string) => w.includes('SKU')) ? 'border-rose-500 border-2' : ''}`}>
                                                    <div className="flex items-center w-full">
                                                        <input
                                                            type="text"
                                                            value={item.values.sku ?? ''}
                                                            disabled={isRejected}
                                                            onChange={(e) => handleUpdatePullItemCell(idx, 'sku', e.target.value)}
                                                            className="w-full h-8 px-2 text-xs bg-transparent border-none focus:ring-1 focus:ring-emerald-500 outline-none"
                                                        />
                                                        {hasWarnings && item.warnings.some((w: string) => w.includes('SKU')) && (
                                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 mr-1.5 shrink-0" />
                                                        )}
                                                    </div>
                                                </td>

                                                {renderInputCell(idx, 'code')}
                                                {renderInputCell(idx, 'code_2')}
                                                {renderInputCell(idx, 'price', 'number')}
                                                {renderInputCell(idx, 'quantity', 'number')}
                                                {renderInputCell(idx, 'reorder_level', 'number')}
                                                {renderInputCell(idx, 'brand_name')}
                                                {renderInputCell(idx, 'category_name')}
                                                {renderInputCell(idx, 'supplier_name')}
                                                {renderInputCell(idx, 'variations')}
                                                {renderInputCell(idx, 'physical_location')}
                                                {renderInputCell(idx, 'description')}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Sheet Health Alerts / Warning panel */}
                        {pullItems.some(i => i.warnings && i.warnings.length > 0 && !i.is_rejected) && (
                            <div className="shrink-0 bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900 rounded-lg p-3 space-y-1.5 max-h-[14vh] overflow-y-auto">
                                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 animate-bounce" />
                                    Sheet Health Alerts & Conflict Warnings
                                </h4>
                                <ul className="list-disc pl-5 text-[11px] text-rose-700 dark:text-rose-300 space-y-1">
                                    {pullItems.flatMap((it: any, idx: number) => {
                                        if (it.is_rejected || !it.warnings) return [];
                                        return it.warnings.map((w: string, wIdx: number) => (
                                            <li key={`${idx}-${wIdx}`}>
                                                <strong>Row {it.sheet_row_index} ('{it.values.name}'):</strong> {w}
                                            </li>
                                        ));
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="bg-muted px-6 py-4 flex items-center justify-between border-t shrink-0">
                        <div className="text-[11px] text-muted-foreground font-semibold flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 block"></span>
                            Approved: {pullItems.filter(i => !i.is_rejected).length} Items ready to sync
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => setIsPullModalOpen(false)}
                                className="h-9 px-4 font-semibold text-xs"
                            >
                                Cancel
                            </Button>
                            
                            {pullItems.some(i => i.warnings && i.warnings.length > 0 && !i.is_rejected) ? (
                                <Button 
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 px-4 text-xs gap-1.5 shadow-sm"
                                    onClick={() => {
                                        toast.warning("Please reject or fix duplicate warnings before saving.");
                                    }}
                                >
                                    <Ban className="w-4 h-4" />
                                    Resolve Warnings First
                                </Button>
                            ) : (
                                <Button 
                                    onClick={handleSavePullData}
                                    disabled={isSavingPull || pullItems.filter(i => !i.is_rejected).length === 0}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 text-xs gap-1.5 shadow-sm"
                                >
                                    {isSavingPull ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    Confirm & Save changes
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
