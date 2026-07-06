import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle, Clock, Truck, ShoppingCart } from 'lucide-react';
import { handleNativePrintFallback } from '@/lib/utils';
import { format } from 'date-fns';

interface Branch {
    id: number;
    branch_name: string;
}

interface UserType {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    barcode: string;
    qr_code: string;
}

interface TransferItem {
    id: number;
    product: Product;
    quantity: number;
    received_quantity: number;
    status: string;
    selected_variations?: Record<string, string>;
}

interface Transfer {
    id: number;
    source_branch_id: number;
    destination_branch_id: number;
    status: string;
    is_request: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    items: TransferItem[];
    destination_branch: Branch;
    readied_by: UserType;
    approved_by: UserType | null;
    supplier?: { name: string } | null;
}

interface PrintOutgoingProps {
    transfers: Transfer[];
    filteredBranch: Branch | null;
    sourceBranch: Branch;
}

export default function PrintOutgoing({ transfers, filteredBranch, sourceBranch }: PrintOutgoingProps) {
    useEffect(() => {
        const attemptPrint = async () => {
            const nativeTriggered = await handleNativePrintFallback(
                'printable-outgoing-list', 
                `outgoing_transfers_${filteredBranch ? filteredBranch.branch_name.replace(/\s+/g, '_') : 'all'}_${format(new Date(), 'yyyyMMdd')}`
            );
            if (!nativeTriggered) {
                window.print();
            }
        };
        const timer = setTimeout(attemptPrint, 600);
        return () => clearTimeout(timer);
    }, [transfers, filteredBranch]);

    const handleManualPrint = async () => {
        const nativeTriggered = await handleNativePrintFallback(
            'printable-outgoing-list', 
            `outgoing_transfers_${filteredBranch ? filteredBranch.branch_name.replace(/\s+/g, '_') : 'all'}_${format(new Date(), 'yyyyMMdd')}`
        );
        if (!nativeTriggered) {
            window.print();
        }
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }).format(new Date(dateString));
    };

    const calculateTotalQuantity = (transfer: Transfer) => {
        return transfer.items.reduce((total, item) => total + item.quantity, 0);
    };

    return (
        <div className="min-h-screen bg-white relative text-gray-900 print:text-black">
            <Head title={`Print Outgoing Transfers`} />

            {/* Floating Print Button for Manual Triggering */}
            <div className="fixed bottom-6 right-6 z-50 print:hidden">
                <Button onClick={handleManualPrint} className="rounded-full shadow-lg gap-2" size="lg">
                    <Printer className="w-5 h-5" /> Print Manifests
                </Button>
            </div>

            <div id="printable-outgoing-list" className="p-8 max-w-4xl mx-auto print:p-0 print:max-w-none bg-white">
                {/* Document Header */}
                <div className="border-b-2 border-gray-900 pb-6 mb-8 flex justify-between items-end print:break-inside-avoid">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">Outgoing Transfers Report</h1>
                        <p className="text-sm text-gray-500 mt-1">Source: <span className="font-semibold">{sourceBranch?.branch_name}</span></p>
                        {filteredBranch && (
                            <p className="text-sm text-gray-500 mt-0.5">Filtered Destination: <span className="font-semibold text-gray-800">{filteredBranch.branch_name}</span></p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Date: {formatDate(new Date().toISOString())}</p>
                        <p className="text-sm text-gray-500">Total Manifests: <span className="font-semibold">{transfers.length}</span></p>
                    </div>
                </div>

                {/* Summary Table */}
                <div className="mb-10 border rounded-lg overflow-hidden print:border-none print:shadow-none bg-white print:break-inside-avoid">
                    <div className="bg-gray-50 px-4 py-2 border-b print:bg-transparent">
                        <h2 className="font-bold text-gray-800 uppercase text-xs tracking-wider">Summary List</h2>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 print:bg-transparent hover:bg-transparent">
                                <TableHead className="font-bold text-black text-xs uppercase pt-2 pb-2">Manifest ID</TableHead>
                                <TableHead className="font-bold text-black text-xs uppercase pt-2 pb-2">Destination Branch</TableHead>
                                <TableHead className="font-bold text-black text-xs uppercase pt-2 pb-2">Date Created</TableHead>
                                <TableHead className="font-bold text-black text-xs uppercase pt-2 pb-2">Status</TableHead>
                                <TableHead className="text-right font-bold text-black text-xs uppercase pt-2 pb-2">Total Items</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfers.map((transfer) => (
                                <TableRow key={transfer.id} className="hover:bg-transparent border-b print:border-b-black">
                                    <TableCell className="font-mono text-sm">#{transfer.id}</TableCell>
                                    <TableCell className="font-semibold">{transfer.destination_branch?.branch_name || 'Unknown'}</TableCell>
                                    <TableCell className="text-gray-600 text-xs">{formatDate(transfer.created_at)}</TableCell>
                                    <TableCell className="capitalize text-xs font-semibold">{transfer.status}</TableCell>
                                    <TableCell className="text-right font-semibold">{calculateTotalQuantity(transfer)}</TableCell>
                                </TableRow>
                            ))}
                            {transfers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-gray-500 italic">
                                        No outgoing transfers found matching the filter criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Detail Section - One Page Per Transfer or Clear Division */}
                {transfers.length > 0 && (
                    <div className="space-y-12">
                        {transfers.map((transfer, index) => {
                            const totalItems = calculateTotalQuantity(transfer);
                            return (
                                <div 
                                    key={transfer.id} 
                                    className={`border-t pt-8 print:pt-6 print:border-t-2 print:border-dashed print:border-gray-400 print:break-inside-avoid ${
                                        index > 0 ? 'print:break-before-page' : ''
                                    }`}
                                >
                                    {/* Individual Manifest Header */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-lg font-bold uppercase tracking-tight text-gray-900">
                                                Transfer Manifest #{transfer.id}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                To: <span className="font-bold text-gray-800">{transfer.destination_branch?.branch_name}</span>
                                            </p>
                                        </div>
                                        <div className="text-right text-xs text-gray-500 space-y-0.5">
                                            <p>Created: {formatDate(transfer.created_at)}</p>
                                            <p>Readied By: {transfer.readied_by?.name || 'Unknown'}</p>
                                            {transfer.approved_by && <p>Approved By: {transfer.approved_by.name}</p>}
                                        </div>
                                    </div>

                                    {/* Individual Manifest Table */}
                                    <Table className="mb-4">
                                        <TableHeader>
                                            <TableRow className="border-b-2 border-gray-300 hover:bg-transparent">
                                                <TableHead className="font-bold text-black uppercase text-xs pl-0 py-2">Item Description</TableHead>
                                                <TableHead className="font-bold text-black uppercase text-xs py-2">Barcode / QR</TableHead>
                                                <TableHead className="text-right font-bold text-black uppercase text-xs pr-0 py-2">Quantity</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transfer.items.map((item) => (
                                                <TableRow key={item.id} className="border-b border-gray-100 hover:bg-transparent">
                                                    <TableCell className="pl-0 py-2">
                                                        <p className="font-medium text-sm">{item.product?.name}</p>
                                                        {item.selected_variations && Object.keys(item.selected_variations).length > 0 && (
                                                            <p className="text-xs text-gray-600 italic mt-0.5">
                                                                ({Object.entries(item.selected_variations).map(([key, val]) => `${key}: ${val}`).join(', ')})
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs font-mono text-gray-600">
                                                        {item.product?.barcode || item.product?.qr_code || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-0 py-2 font-semibold font-mono text-sm">
                                                        {item.quantity}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {transfer.notes && (
                                        <div className="p-3 bg-gray-50 border rounded text-xs text-gray-700 mb-4 print:bg-transparent print:border-black">
                                            <strong className="block mb-1">Manifest Notes:</strong>
                                            <span className="whitespace-pre-wrap">{transfer.notes}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-2 mb-8">
                                        <p className="text-xs font-semibold text-gray-700">
                                            Total Manifest Items: <span className="text-sm font-mono font-bold text-black ml-1">{totalItems}</span>
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
