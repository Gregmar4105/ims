import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Transfer {
    id: number;
    source_branch_id: number;
    destination_branch_id: number;
    status: string;
    updated_at: string;
    source_branch: { branch_name: string };
    destination_branch: { branch_name: string };
    readied_by: { name: string };
    approved_by: { name: string } | null;
    received_by: { name: string } | null;
    items: Array<{
        id: number;
        quantity: number;
        received_quantity: number;
        product: { name: string; barcode: string; qr_code: string };
    }>;
}

export default function PrintItem({ transfer }: { transfer: Transfer }) {
    useEffect(() => {
        window.print();
    }, []);

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: 'numeric', minute: 'numeric'
        }).format(new Date(dateString));
    };

    const totalExpected = transfer.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReceived = transfer.items.reduce((sum, item) => sum + item.received_quantity, 0);

    return (
        <div className="min-h-screen bg-white text-gray-900 print:text-black">
            <Head title={`Print Transfer #${transfer.id}`} />

            <div className="max-w-3xl mx-auto p-8 print:p-0 font-sans">
                {/* Header */}
                <div className="text-center border-b-2 border-dashed border-gray-300 pb-6 mb-6">
                    <h1 className="text-3xl font-bold mb-2 tracking-tighter uppercase">{transfer.destination_branch?.branch_name}</h1>
                    <p className="text-sm text-gray-500 tracking-widest font-medium uppercase mt-2">Transfer Manifest</p>
                </div>

                {/* Metadata */}
                <div className="flex justify-between mb-8 text-sm">
                    <div className="space-y-1">
                        <p><span className="text-gray-500 font-medium">Manifest No:</span> <span className="font-mono ml-1">#{transfer.id}</span></p>
                        <p><span className="text-gray-500 font-medium">Status:</span> <span className="capitalize ml-1 font-semibold">{transfer.status}</span></p>
                        <p><span className="text-gray-500 font-medium">Date:</span> <span className="ml-1">{formatDate(transfer.updated_at)}</span></p>
                        <p><span className="text-gray-500 font-medium">Source Branch:</span> <span className="ml-1 font-semibold">{transfer.source_branch?.branch_name}</span></p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p><span className="text-gray-500 font-medium">Readied By:</span> <span className="ml-1">{transfer.readied_by?.name || 'Unknown'}</span></p>
                        {transfer.approved_by && (
                            <p><span className="text-gray-500 font-medium">Approved By:</span> <span className="ml-1">{transfer.approved_by.name}</span></p>
                        )}
                        {transfer.received_by && (
                            <p><span className="text-gray-500 font-medium">Received By:</span> <span className="ml-1">{transfer.received_by.name}</span></p>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-2 border-gray-300 hover:bg-transparent">
                                <TableHead className="font-bold text-black uppercase text-xs tracking-wider pt-2 pb-2 pl-0">Item Description</TableHead>
                                <TableHead className="text-right font-bold text-black uppercase text-xs tracking-wider pt-2 pb-2">Exp Qty</TableHead>
                                <TableHead className="text-right font-bold text-black uppercase text-xs tracking-wider pt-2 pb-2 pr-0">Rcvd Qty</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfer.items.map((item) => (
                                <TableRow key={item.id} className="border-b border-gray-100 hover:bg-transparent">
                                    <TableCell className="py-3 pl-0">
                                        <p className="font-medium">{item.product?.name}</p>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{item.product?.barcode || item.product?.qr_code}</p>
                                    </TableCell>
                                    <TableCell className="text-right py-3 text-gray-500">{item.quantity}</TableCell>
                                    <TableCell className="text-right py-3 pr-0 font-medium font-mono">
                                        {item.received_quantity}
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
                            <span>Expected Items</span>
                            <span>{totalExpected}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-100">
                            <span>Received</span>
                            <span>{totalReceived}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Disclaimer */}
                <div className="text-center mt-16 pt-8 border-t border-gray-200">
                    <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">
                        *** Not an official invoice ***
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2">
                        System printed document. This manifest is not a valid tax invoice.
                    </p>
                </div>
            </div>
        </div>
    );
}
