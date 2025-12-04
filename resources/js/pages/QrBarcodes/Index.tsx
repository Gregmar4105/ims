import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { QrCode, ScanBarcode, Sparkles } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { Badge } from "@/components/ui/badge";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'QR & Barcodes',
        href: '/qr-barcodes',
    },
];

interface Product {
    id: number;
    name: string;
    barcode: string | null;
    qr_code: string | null;
    created_at: string;
    updated_at: string;
    branch?: {
        branch_name: string;
    };
    brand?: {
        name: string;
    };
    category?: {
        name: string;
    };
    creator?: {
        name: string;
    };
}

interface Props {
    products: {
        data: Product[];
        links: any[];
        total: number;
    };
}

export default function Index({ products }: Props) {
    const { flash } = usePage().props as any;

    function generateCodes(productId: number) {
        router.post('/qr-barcodes', {
            product_id: productId,
        }, {
            preserveScroll: true,
        });
    }

    function generateAllCodes() {
        if (confirm('Are you sure you want to generate codes for all products missing them?')) {
            router.post('/qr-barcodes', {
                generate_all: true,
            }, {
                preserveScroll: true,
            });
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="QR & Barcodes" />

            <div className="mx-4 mt-4 flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <ScanBarcode className="size-14 mr-3" />
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                QR & Barcode Generation
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Generate codes for products that are missing them.
                            </p>
                        </div>
                    </div>
                    <Button onClick={generateAllCodes}>
                        <Sparkles className="mr-2 h-4 w-4" /> Generate All
                    </Button>
                </div>

                {flash?.success && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{flash.success}</span>
                    </div>
                )}
            </div>

            <div className="p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden h-[calc(100vh-220px)] overflow-y-auto relative">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
                            <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Brand</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead>Updated At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                        All products have codes generated!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.data.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{product.branch?.branch_name}</TableCell>
                                        <TableCell>{product.brand?.name}</TableCell>
                                        <TableCell>{product.category?.name}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {!product.barcode && <Badge variant="destructive">Missing Barcode</Badge>}
                                                {!product.qr_code && <Badge variant="destructive">Missing QR</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {product.creator?.name || 'System'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(product.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(product.updated_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => generateCodes(product.id)}>
                                                <Sparkles className="mr-2 h-4 w-4" /> Generate Codes
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-4">
                    <Pagination links={products.links} />
                </div>
            </div>
        </AppLayout>
    );
}
