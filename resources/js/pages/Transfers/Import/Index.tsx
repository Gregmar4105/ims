import AppLayout from '@/layouts/app-layout';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Upload, FileImage, Loader2, AlertCircle, Trash2, Plus, Save, CheckCircle, PlusCircle, HelpCircle, Sparkles, Barcode, QrCode, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import axios from 'axios';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
}

export default function ImportTransferIndex({ brands = [], categories = [], suppliers = [], importDailyUsage = 0, importMinuteUsage = 0 }: IndexProps) {
    const { data, setData, post, processing, errors } = useForm({
        image: null as File | null,
    });

    // Props from controller
    const { analysis_result, flash } = usePage().props as any;

    // Local state
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                quantity_added: item.quantity
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
        
        const preparedItems = items.filter(i => !i.exists_in_branch);

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
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Import Transfer from Image</h2>
                    <p className="text-muted-foreground">
                        Upload a photo of a packing list to extract items, then review and edit the results.
                    </p>
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
                                    {items.map((item, idx) => (
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
                                    ))}
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
        </AppLayout>
    );
}
