import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/welcome-layout';
import { Smartphone, Monitor, Download, Calendar, HardDrive, ShieldCheck, ArrowRight, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DownloadFile {
    filename: string;
    version: string;
    url: string;
    size: string;
    date: string;
}

interface Props {
    android: {
        latest: DownloadFile | null;
        history: DownloadFile[];
    };
    windows: {
        latest: DownloadFile | null;
        history: DownloadFile[];
    };
}

export default function Downloads({ android, windows }: Props) {
    return (
        <AppLayout>
            <Head title="Downloads" />
            
            <div className="max-w-6xl mx-auto px-4 py-12">
                {/* Header Section */}
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Get the App
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Take your inventory management on the go with our Android app, or stay productive at your desk with our Windows desktop client.
                    </p>
                </div>

                {/* Primary Download Cards */}
                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    {/* Android Card */}
                    <Card className="relative overflow-hidden group border-2 transition-all hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Smartphone size={120} />
                        </div>
                        <CardHeader className="pb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-2xl">Android Application</CardTitle>
                            <CardDescription>Mobile inventory tracking and barcode scanning.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {android.latest ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <ShieldCheck className="w-4 h-4 text-green-500" />
                                            <span>Latest: v{android.latest.version}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <HardDrive className="w-4 h-4" />
                                            <span>{android.latest.size}</span>
                                        </div>
                                    </div>
                                    <Button asChild className="w-full h-14 text-lg font-bold shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700">
                                        <a href={android.latest.url} download>
                                            <Download className="mr-2 h-5 w-5" /> Download .APK
                                        </a>
                                    </Button>
                                </div>
                            ) : (
                                <div className="py-8 text-center border-2 border-dashed rounded-xl bg-muted/30">
                                    <p className="text-muted-foreground">No Android builds available yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Windows Card */}
                    <Card className="relative overflow-hidden group border-2 transition-all hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Monitor size={120} />
                        </div>
                        <CardHeader className="pb-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
                                <Monitor className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-2xl">Windows Desktop</CardTitle>
                            <CardDescription>Advanced management and reporting interface.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {windows.latest ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <ShieldCheck className="w-4 h-4 text-green-500" />
                                            <span>Latest: v{windows.latest.version}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <HardDrive className="w-4 h-4" />
                                            <span>{windows.latest.size}</span>
                                        </div>
                                    </div>
                                    <Button asChild className="w-full h-14 text-lg font-bold shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700">
                                        <a href={windows.latest.url} download>
                                            <Download className="mr-2 h-5 w-5" /> Download .EXE
                                        </a>
                                    </Button>
                                </div>
                            ) : (
                                <div className="py-8 text-center border-2 border-dashed rounded-xl bg-muted/30">
                                    <p className="text-muted-foreground">No Windows builds available yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Version History Section */}
                <div className="space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                            <History className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-bold">Release History</h2>
                    </div>

                    <Tabs defaultValue="android" className="w-full">
                        <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-8">
                            <TabsTrigger value="android">Android Builds</TabsTrigger>
                            <TabsTrigger value="windows">Windows Builds</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="android" className="space-y-4">
                            {android.history.length > 0 ? (
                                <div className="overflow-hidden rounded-xl border bg-card">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="px-6 py-4 text-sm font-semibold">Version</th>
                                                <th className="px-6 py-4 text-sm font-semibold">File Details</th>
                                                <th className="px-6 py-4 text-sm font-semibold">Release Date</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {android.history.map((file, idx) => (
                                                <tr key={file.filename} className="group hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-medium">v{file.version}</span>
                                                            {idx === 0 && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none">Latest</Badge>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <HardDrive className="w-3.5 h-3.5" />
                                                            {file.size}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {file.date}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <a href={file.url} download>
                                                                <Download className="w-4 h-4 mr-2" />
                                                                Download
                                                            </a>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-muted/10 rounded-2xl border-2 border-dashed">
                                    <p className="text-muted-foreground">No historical versions found.</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="windows" className="space-y-4">
                            {windows.history.length > 0 ? (
                                <div className="overflow-hidden rounded-xl border bg-card">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="px-6 py-4 text-sm font-semibold">Version</th>
                                                <th className="px-6 py-4 text-sm font-semibold">File Details</th>
                                                <th className="px-6 py-4 text-sm font-semibold">Release Date</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {windows.history.map((file, idx) => (
                                                <tr key={file.filename} className="group hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-medium">v{file.version}</span>
                                                            {idx === 0 && <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-none">Latest</Badge>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <HardDrive className="w-3.5 h-3.5" />
                                                            {file.size}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {file.date}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <a href={file.url} download>
                                                                <Download className="w-4 h-4 mr-2" />
                                                                Download
                                                            </a>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-muted/10 rounded-2xl border-2 border-dashed">
                                    <p className="text-muted-foreground">No historical versions found.</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}
