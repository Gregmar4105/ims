import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    brand_id: number;
    category_id: number;
    quantity: number;
    physical_location: string | null;
    description: string | null;
    image_path: string | null;
    barcode: string | null;
    qr_code: string | null;
    price: number | null;
    code: string | null;
    code_2: string | null;
    sku: string | null;
    brand?: { name: string };
    category?: { name: string };
    supplier?: { name: string };
}

interface Props {
    products: Product[];
    branchName: string;
    isSystemAdmin: boolean;
}

export default function Print({ products, branchName, isSystemAdmin }: Props) {
    useEffect(() => {
        const attemptPrint = async () => {
            const nativeTriggered = await handleNativePrintFallback('printable-product-list', `product_inventory_${branchName}.png`);
            if (!nativeTriggered) {
                window.print();
            }
        };
        // slight delay to ensure fonts/CSS render
        setTimeout(attemptPrint, 500);
    }, [branchName]);

    const handleManualPrint = async () => {
        const nativeTriggerेड = await handleNativePrintFallback('printable-product-list', `product_inventory_${branchName}.png`);
        if (!nativeTriggerेड) {
            window.print();
        }
    };

    return (
        <div className="bg-white min-h-screen font-sans text-black p-4 relative">
            <Head title={`Print Product List - ${branchName}`} />

            {/* Floating Print Button for Mobile Fallback */}
            <div className="fixed bottom-6 right-6 z-50 print:hidden">
                <Button onClick={() => window.print()} className="rounded-full shadow-lg gap-2" size="lg">
                    <Printer className="w-5 h-5" /> Print Inventory
                </Button>
            </div>

            <div className="bg-white">
                {/* Print Header */}
                <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tighter uppercase">Inventory Report</h1>
                        <p className="text-gray-600 font-medium tracking-tight">Larable IMS Platform</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold">Branch: {branchName}</p>
                        <p className="text-sm text-gray-500">
                            Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-sm text-gray-500">Total Items: {products.length}</p>
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b-2 border-black bg-gray-50/50">
                                <th className="py-2 pr-2 font-bold w-[40px]">#</th>
                                <th className="py-2 px-2 font-bold max-w-[200px]">Product Name</th>
                                <th className="py-2 px-2 font-bold">Category</th>
                                <th className="py-2 px-2 font-bold">Brand</th>
                                <th className="py-2 px-2 font-bold">Supplier</th>
                                <th className="py-2 px-2 font-bold">Codes (SKU/Code/2Code)</th>
                                <th className="py-2 px-2 font-bold text-right">Price</th>
                                <th className="py-2 pl-2 font-bold text-right">Stock</th>
                                {isSystemAdmin && <th className="py-2 pl-2 font-bold text-center">Loc</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {products.map((product, index) => (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="py-3 pr-2 text-gray-500">{index + 1}</td>
                                    <td className="py-3 px-2 font-semibold">
                                        <div className="line-clamp-2 leading-tight pr-4">
                                            {product.name}
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-gray-600">{product.category?.name || '-'}</td>
                                    <td className="py-3 px-2 text-gray-600">{product.brand?.name || '-'}</td>
                                    <td className="py-3 px-2 text-gray-600 truncate max-w-[120px]" title={product.supplier?.name || ''}>
                                        {product.supplier?.name || '-'}
                                    </td>
                                    <td className="py-3 px-2">
                                        <div className="flex flex-col gap-0.5 text-xs text-mono max-w-[150px]">
                                            <div className="flex items-start justify-between">
                                                <span className="text-[10px] text-gray-400 font-sans mr-1">SKU</span>
                                                <span className="font-bold truncate" title={product.sku || ''}>{product.sku || '-'}</span>
                                            </div>
                                            <div className="flex items-start justify-between">
                                                <span className="text-[10px] text-gray-400 font-sans mx-1">C</span>
                                                <span className="font-bold truncate" title={product.code || ''}>{product.code || '-'}</span>
                                            </div>
                                            <div className="flex items-start justify-between">
                                                <span className="text-[10px] text-gray-400 font-sans mr-1">2C</span>
                                                <span className="font-bold truncate" title={product.code_2 || ''}>{product.code_2 || '-'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-right font-medium">
                                        ₱{product.price ? Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                                    </td>
                                    <td className="py-3 pl-2 text-right">
                                        <span className={`font-bold py-0.5 px-2 rounded-full ${product.quantity <= 0 ? 'bg-red-100 text-red-800' :
                                            product.quantity <= 5 ? 'bg-amber-100 text-amber-800' :
                                                'bg-emerald-100 text-emerald-800'
                                            }`}>
                                            {product.quantity}
                                        </span>
                                    </td>
                                    {isSystemAdmin && (
                                        <td className="py-3 pl-2 text-center text-xs text-gray-500">
                                            {product.physical_location || '-'}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {products.length === 0 && (
                        <div className="text-center py-12 text-gray-500 italic">
                            No products found for the selected filters.
                        </div>
                    )}
                </div>

                {/* Print Footer */}
                <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500 print:fixed print:bottom-4 print:w-full print:left-0">
                    End of Report
                </div>

                {/* Print-specific styles to hide browser UI tools ideally */}
                <style>{`
                @media print {
                    @page { margin: 10mm; size: landscape; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
            </div>
        </div>
    );
}
