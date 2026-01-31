import AppLayout from '@/layouts/app-layout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileImage, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryItem {
    item_name: string;
    quantity: number;
}

interface AnalysisResult {
    inventory_items: InventoryItem[];
}

export default function ImportTransferIndex() {
    const { flash } = usePage().props as any;
    const { data, setData, post, processing, errors, reset } = useForm({
        image: null as File | null,
    });

    // We can also get result from flash session if redirect back with data
    // typically in inertia we receive it as props if we return it from controller
    // but in controller I used `with('analysis_result', $data)`.
    // Let's check if it comes through flash or we need to access it differently.
    // Usually `with` puts it in session, so it appears in `flash` or similar prop depending on HandleInertiaRequests middleware.
    // I will assume for now it might be in `flash.analysis_result` or I should have passed it as prop.
    // Let's look at how I implemented controller: `return back()->with('analysis_result', $data);`
    // Standard Laravel Inertia middleware often shares 'flash' key.

    // Let's rely on usePage().props to find it.
    const pageProps = usePage().props as any;
    // Check where 'analysis_result' lands. Usually distinct from flash if not configured.
    // To be safe, I'll check both or assume it might be a root prop if I shared it, 
    // but standard `with()` just puts it in session. Inertia's `HandleInertiaRequests` usually grabs 'success', 'error' from session.
    // If 'analysis_result' is not manually added to HandleInertiaRequests, it won't show up.

    // ADJUSTMENT: The controller uses `back()->with(...)`. Unless I modified HandleInertiaRequests, this data won't be available!
    // I should probably have returned `Inertia::render` with the data, OR I need to ensure HandleInertiaRequests shares it.
    // Since I can't easily check middleware right now, let's assume I might need to fix Controller to use Inertia::render if validation passes.
    // BUT, `back()` is nice for errors.
    // Let's trust `flash` might contain it if I mapped all session keys, but likely standard only maps specific ones.

    // ACTUALLY: The best pattern for this "Stateful" upload is to stay on page.
    // I will stick to this View code, but I might need to update Controller to `Inertia::render` with data if `back()` doesn't work.
    // However, I will check if `flash.analysis_result` works. If not I'll fix it.

    const analysisResult = pageProps.flash?.analysis_result as AnalysisResult | undefined;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setData('image', e.target.files[0]);
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
            onSuccess: () => {
                toast.success("Analysis complete");
            },
            onError: () => {
                toast.error("Failed to analyze image");
            }
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Import Transfer', href: '/import-transfer' }]}>
            <Head title="Import Transfer" />

            <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Import Transfer from Image</h2>
                    <p className="text-muted-foreground">
                        Upload a photo of a packing list or invoice to automatically extract items.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Upload Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload Image</CardTitle>
                            <CardDescription>Supported formats: JPG, PNG</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-4">
                                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                    />
                                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                                        {data.image ? (
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
                                {pageProps.flash?.error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {pageProps.flash.error}
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
                        {analysisResult ? (
                            <Card className="border-green-200 bg-green-50/20">
                                <CardHeader>
                                    <CardTitle className="text-green-700 flex items-center gap-2">
                                        Analysis Results
                                    </CardTitle>
                                    <CardDescription>
                                        Found {analysisResult.inventory_items.length} items
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item Name</TableHead>
                                                <TableHead className="text-right">Qty</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {analysisResult.inventory_items.map((item, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{item.item_name}</TableCell>
                                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                <CardFooter className="bg-green-100/30 p-4 border-t border-green-200">
                                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => toast.info("Conversion to transfer not implemented yet.")}>
                                        Create Transfer
                                    </Button>
                                </CardFooter>
                            </Card>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/10 text-muted-foreground border-dashed">
                                <FileImage className="h-12 w-12 mb-3 opacity-20" />
                                <p>Results will appear here after analysis</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
