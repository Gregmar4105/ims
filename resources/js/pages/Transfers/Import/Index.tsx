import AppLayout from '@/layouts/app-layout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Upload, FileImage, Loader2, AlertCircle, Trash2, Plus, Save, CheckCircle, PlusCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryItem {
    item_name: string;
    quantity: number;
    exists_in_branch?: boolean;
}

interface AnalysisResult {
    inventory_items: InventoryItem[];
}

export default function ImportTransferIndex() {
    const { data, setData, post, processing, errors } = useForm({
        image: null as File | null,
    });

    // Props from controller
    const { analysis_result, flash } = usePage().props as any;

    // Local state
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        // Check both prop (from render) and flash (fallback)
        const result = analysis_result || flash?.analysis_result;
        if (result?.inventory_items) {
            setItems(result.inventory_items);
            if (!flash?.success && !analysis_result) {
                // Only toast if we didn't just get a success message from backend to avoid double toast
                // But actually backend now sends success prop or flash.
            }
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

    const updateItem = (index: number, field: keyof InventoryItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const addItem = () => {
        setItems([...items, { item_name: '', quantity: 1 }]);
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Import Transfer', href: '/import-transfer' }]}>
            <Head title="Import Transfer" />

            <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Import Transfer from Image</h2>
                    <p className="text-muted-foreground">
                        Upload a photo of a packing list to extract items, then review and edit the results.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Upload Section */}
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Upload Image</CardTitle>
                            <CardDescription>Supported formats: JPG, PNG</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-4">
                                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative h-48 bg-muted/5">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                    />
                                    <div className="flex flex-col items-center gap-2 pointer-events-none w-full h-full justify-center">
                                        {previewUrl ? (
                                            <div className="relative w-full h-full p-2">
                                                <img
                                                    src={previewUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-contain rounded-md"
                                                />
                                                <div className="absolute bottom-2 left-0 right-0 text-center bg-black/50 text-white text-xs py-1 rounded-b-md mx-2">
                                                    Click to change
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
                                                <Upload className="h-10 w-10 text-muted-foreground" />
                                                <span className="font-medium text-sm">Click to upload or drag and drop</span>
                                                <span className="text-xs text-muted-foreground">Maximum file size: 10MB</span>
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

                                <Button type="submit" className="w-full" disabled={processing || !data.image}>
                                    {processing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        "Upload & Analyze"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Results Section */}
                    <div className="space-y-6">
                        {processing ? (
                            <Card className="border-blue-200 bg-white shadow-md">
                                <CardContent className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-blue-600">
                                    <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-60" />
                                    <h3 className="text-xl font-medium text-blue-900 mb-1">Analyzing Document</h3>
                                    <p className="text-sm text-blue-700/80 text-center max-w-sm">
                                        Please wait while the AI extracts inventory items from your image... Supported models may take a few seconds.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : items.length > 0 ? (
                            <Card className="border-green-200 bg-white shadow-md">
                                <CardHeader className="bg-green-50/50 pb-4">
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
                                <CardContent className="p-0 overflow-hidden max-h-[600px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur">
                                            <TableRow>
                                                <TableHead>Item Name</TableHead>
                                                <TableHead className="w-[120px]">Status</TableHead>
                                                <TableHead className="w-[100px]">Qty</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="p-2">
                                                        <Input
                                                            value={item.item_name}
                                                            onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                                                            className="h-8 border-transparent hover:border-input focus:border-primary bg-transparent"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        {item.exists_in_branch !== undefined ? (
                                                            item.exists_in_branch ? (
                                                                <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium bg-green-100 text-green-800 border border-green-200 whitespace-nowrap">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Exists
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                                                                    <PlusCircle className="w-3.5 h-3.5" /> New Item
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 whitespace-nowrap">
                                                                <HelpCircle className="w-3.5 h-3.5" /> Unknown
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="p-2">
                                                        <Input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                                                            className="h-8 w-20 border-transparent hover:border-input focus:border-primary bg-transparent text-right"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="p-2 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                            onClick={() => removeItem(idx)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                <CardFooter className="bg-green-50/50 p-4 border-t">
                                    <Button className="w-full bg-green-600 hover:bg-green-700 shadow-sm" onClick={() => toast.info(`Ready to create transfer with ${items.length} items (Implementation pending)`)}>
                                        <Save className="w-4 h-4 mr-2" />
                                        Create Transfer
                                    </Button>
                                </CardFooter>
                            </Card>
                        ) : (
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/5 text-muted-foreground">
                                <FileImage className="h-12 w-12 mb-3 opacity-10" />
                                <p>Upload an image to see analysis results here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
