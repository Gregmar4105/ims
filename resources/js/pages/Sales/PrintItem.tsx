import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface Sale {
    id: number;
    branch_id: number;
    status: 'readied' | 'completed' | 'cancelled';
    created_at: string;
    branch: { branch_name: string, address?: string, phone?: string };
    readied_by: { name: string };
    approved_by: { name: string } | null;
    items: Array<{
        id: number;
        quantity: number;
        price: number;
        product: { name: string; barcode: string; qr_code: string };
    }>;
}

export default function PrintItem({ sale }: { sale: Sale }) {
    useEffect(() => {
        window.print();
    }, []);

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: 'numeric', minute: 'numeric'
        }).format(new Date(dateString));
    };

    const totalRevenue = sale.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="min-h-screen bg-white text-gray-900 print:text-black relative">
            <Head title={`Print Sale #${sale.id}`} />

            {/* Floating Print Button for Mobile Fallback */}
            <div className="fixed bottom-6 right-6 z-50 print:hidden">
                <Button onClick={() => window.print()} className="rounded-full shadow-lg gap-2" size="lg">
                    <Printer className="w-5 h-5" /> Print Receipt
                </Button>
            </div>

            <div className="max-w-3xl mx-auto p-8 print:p-0 font-sans">
                {/* Header */}
                <div className="text-center border-b-2 border-dashed border-gray-300 pb-6 mb-6">
                    <h1 className="text-3xl font-bold mb-2 tracking-tighter uppercase">{sale.branch.branch_name}</h1>
                    <p className="text-sm text-gray-500 tracking-widest font-medium uppercase mt-2">Sale Receipt</p>
                </div>

                {/* Metadata */}
                <div className="flex justify-between mb-8 text-sm">
                    <div className="space-y-1">
                        <p><span className="text-gray-500 font-medium">Receipt No:</span> <span className="font-mono ml-1">#{sale.id}</span></p>
                        <p><span className="text-gray-500 font-medium">Status:</span> <span className="capitalize ml-1 font-semibold">{sale.status}</span></p>
                        <p><span className="text-gray-500 font-medium">Date:</span> <span className="ml-1">{formatDate(sale.created_at)}</span></p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p><span className="text-gray-500 font-medium">Served By:</span> <span className="ml-1">{sale.readied_by?.name}</span></p>
                        {sale.approved_by && (
                            <p><span className="text-gray-500 font-medium">Approved By:</span> <span className="ml-1">{sale.approved_by.name}</span></p>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-2 border-gray-300 hover:bg-transparent">
                                <TableHead className="font-bold text-black uppercase text-xs tracking-wider pt-2 pb-2 pl-0">Item Description</TableHead>
                                <TableHead className="text-right font-bold text-black uppercase text-xs tracking-wider pt-2 pb-2">Qty</TableHead>
                                <TableHead className="text-right font-bold text-black uppercase text-xs tracking-wider pt-2 pb-2">Price</TableHead>
                                <TableHead className="text-right font-bold text-black uppercase text-xs tracking-wider pt-2 pb-2 pr-0">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sale.items.map((item) => (
                                <TableRow key={item.id} className="border-b border-gray-100 hover:bg-transparent">
                                    <TableCell className="py-3 pl-0">
                                        <p className="font-medium">{item.product.name}</p>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{item.product.barcode || item.product.qr_code}</p>
                                    </TableCell>
                                    <TableCell className="text-right py-3">{item.quantity}</TableCell>
                                    <TableCell className="text-right py-3">₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right py-3 pr-0 font-medium font-mono">
                                        ₱{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end border-t-2 border-gray-300 pt-4 mb-12">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Total Items</span>
                            <span>{totalItems}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-100">
                            <span>Total</span>
                            <span>₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Disclaimer */}
                <div className="text-center mt-16 pt-8 border-t border-gray-200">
                    <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">
                        *** Not an official invoice ***
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2">
                        System printed document. This receipt is not a valid tax invoice.
                    </p>
                </div>
            </div>
        </div>
    );
}
