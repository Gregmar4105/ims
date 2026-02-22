import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Layers, Package, Tag, ScanBarcode, Truck, Edit, Info, ArrowLeft } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';

interface Variation {
    name: string;
    options: string;
}

interface Product {
    id: number;
    name: string;
    brand_id: number;
    category_id: number;
    quantity: number;
    physical_location: string | null;
    description: string | null;
    variations: Variation[] | null;
    image_path: string | null;
    barcode: string | null;
    qr_code: string | null;
    price: number | null;
    code: string | null;
    code_2: string | null;
    sku: string | null;
    reorder_level: number;
    branches?: { branch_name: string }[];
    brand?: { name: string };
    category?: { name: string };
    supplier?: { name: string };
}

interface Props {
    product: Product;
}

export default function Show({ product }: Props) {
    const { auth } = usePage<SharedData>().props;
    const isSystemAdmin = auth.roles.includes('System Administrator');
    const isEmployee = auth.roles.includes('Employee') && !isSystemAdmin && !auth.roles.includes('Branch Administrator');
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Products',
            href: '/products',
        },
        {
            title: product.name,
            href: `/products/${product.id}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Product - ${product.name}`} />

            <div className="p-4 md:p-8 space-y-6">
                <div className="flex items-center justify-between gap-4 w-full">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-left">{product.name}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500 justify-start">
                            <span className="font-semibold text-blue-600">{product.brand?.name}</span>
                            <span>•</span>
                            <span>{product.category?.name}</span>
                        </div>
                    </div>
                    {!isEmployee && (
                        <div className="flex gap-2">
                            <Link href={`/products/${product.id}/edit`}>
                                <Button>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Product
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Image & Quick Status */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border shadow-sm aspect-square flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                        {product.image_path ? (
                            <img
                                src={`/storage/${product.image_path}`}
                                alt={product.name}
                                className="w-full h-full object-contain p-4"
                            />
                        ) : (
                            <Package className="h-32 w-32 text-gray-300" />
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b pb-4">
                            <span className="text-gray-500">Price</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                ₱{product.price ? Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-4">
                            <span className="text-gray-500">Stock Status</span>
                            <Badge className={`${product.quantity === 0 ? 'bg-red-500' :
                                product.quantity <= 5 ? 'bg-amber-500' :
                                    'bg-emerald-600'
                                }`}>
                                Qty: {product.quantity}
                            </Badge>
                        </div>
                        {product.physical_location && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Location</span>
                                <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                                    <MapPin className="h-4 w-4" />
                                    <span>{product.physical_location}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border shadow-sm space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Product Codes</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                    <span className="text-xs font-medium text-gray-500 uppercase block mb-1">SKU</span>
                                    <div className="font-mono text-sm font-bold flex items-center gap-2">
                                        <Package className="h-4 w-4 text-gray-400" />
                                        {product.sku || '-'}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                    <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Code</span>
                                    <div className="font-mono text-sm font-bold flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-gray-400" />
                                        {product.code || '-'}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                    <span className="text-xs font-medium text-gray-500 uppercase block mb-1">2Code</span>
                                    <div className="font-mono text-sm font-bold flex items-center gap-2">
                                        <ScanBarcode className="h-4 w-4 text-gray-400" />
                                        {product.code_2 || '-'}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                    <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Barcode</span>
                                    <div className="flex items-center justify-center bg-white p-2 rounded mt-2">
                                        {product.barcode ? (
                                            <Barcode value={product.barcode} height={40} fontSize={12} width={1.5} background="transparent" />
                                        ) : (
                                            <span className="text-sm text-gray-400 font-mono">-</span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                    <span className="text-xs font-medium text-gray-500 uppercase block mb-1">QR Code</span>
                                    <div className="flex items-center justify-center bg-white p-2 rounded mt-2">
                                        {product.qr_code ? (
                                            <QRCode value={product.qr_code} size={64} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                                        ) : (
                                            <span className="text-sm text-gray-400 font-mono">-</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-lg font-semibold mb-2">Description</h3>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                {product.description || <span className="italic text-gray-400">No description provided.</span>}
                            </p>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-lg font-semibold mb-2">Details</h3>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
                                {product.supplier && (
                                    <div className="flex flex-col">
                                        <dt className="text-gray-500">Supplier</dt>
                                        <dd className="font-medium flex items-center gap-1.5 mt-1">
                                            <Truck className="h-4 w-4 text-gray-400" />
                                            {product.supplier.name}
                                        </dd>
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <dt className="text-gray-500">Reorder Level</dt>
                                    <dd className="font-medium flex items-center gap-1.5 mt-1">
                                        <Layers className="h-4 w-4 text-gray-400" />
                                        {product.reorder_level}
                                    </dd>
                                </div>

                                {isSystemAdmin && (
                                    <div className="flex flex-col">
                                        <dt className="text-gray-500">Branch(es)</dt>
                                        <dd className="col-span-1 pt-1 space-y-1">
                                            {product.branches && product.branches.length > 0 ? (
                                                product.branches.map((branch, i) => (
                                                    <Badge key={i} variant="outline" className="mr-1">
                                                        <Layers className="h-3 w-3 mr-1" />
                                                        {branch.branch_name}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                                                    <Layers className="h-4 w-4 text-gray-400" /> Global / All Branches
                                                </span>
                                            )}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        {product.variations && product.variations.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Variations</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {product.variations.map((v, i) => (
                                            <Badge key={i} variant="secondary" className="text-sm px-2 py-1">
                                                <span className="font-semibold mr-1">{v.name}:</span> {v.options}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
