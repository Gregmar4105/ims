import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface Sale {
    id: number;
    branch_id: number;
    status: 'readied' | 'completed' | 'cancelled';
    created_at: string;
    branch: { branch_name: string };
    readied_by: { name: string };
    approved_by: { name: string } | null;
    items: Array<{
        id: number;
        quantity: number;
        price: number;
        product: { name: string; barcode: string; qr_code: string };
    }>;
}

export default function PrintList({ sales, filters }: { sales: Sale[], filters: any }) {
    useEffect(() => {
        // Automatically trigger print dialog once component mounts
        window.print();
    }, []);

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: 'numeric'
        }).format(new Date(dateString));
    };

    const calculateTotal = (sale: Sale) => {
        return sale.items.reduce((total, item) => total + (item.quantity * item.price), 0);
    };

    return (
        <div className="min-h-screen bg-white">
            <Head title="Print Sales List" />

            <div className="p-8 max-w-5xl mx-auto print:p-0 print:max-w-none">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-6 border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sales Report</h1>
                        <p className="text-sm text-gray-500 mt-1">Generated on {formatDate(new Date().toISOString())}</p>
                    </div>
                </div>

                {/* Filters Context */}
                {(filters.date_from || filters.date_to || (filters.status_filter && filters.status_filter !== 'all')) && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 print:break-inside-avoid">
                        <strong className="block mb-2 font-semibold">Active Report Filters:</strong>
                        <ul className="list-disc pl-5 space-y-1">
                            {filters.status_filter && filters.status_filter !== 'all' && (
                                <li>Status: <span className="capitalize">{filters.status_filter}</span></li>
                            )}
                            {filters.date_from && <li>From: {formatDate(filters.date_from)}</li>}
                            {filters.date_to && <li>To: {formatDate(filters.date_to)}</li>}
                        </ul>
                    </div>
                )}

                {/* Data Table */}
                <div className="border rounded-lg overflow-hidden print:border-none print:shadow-none bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 print:bg-transparent">
                                <TableHead className="w-[100px] font-bold text-gray-900">ID</TableHead>
                                <TableHead className="font-bold text-gray-900">Branch</TableHead>
                                <TableHead className="font-bold text-gray-900">Date</TableHead>
                                <TableHead className="font-bold text-gray-900">Status</TableHead>
                                <TableHead className="text-right font-bold text-gray-900">Items</TableHead>
                                <TableHead className="text-right font-bold text-gray-900">Revenue</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sales.map((sale) => (
                                <TableRow key={sale.id} className="print:border-b">
                                    <TableCell className="font-mono text-sm text-gray-600">#{sale.id}</TableCell>
                                    <TableCell className="font-medium text-gray-900">{sale.branch.branch_name}</TableCell>
                                    <TableCell className="text-gray-600">{formatDate(sale.created_at)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 font-medium text-sm">
                                            {sale.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                                            {sale.status === 'cancelled' && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                                            {sale.status === 'readied' && <Clock className="w-3.5 h-3.5 text-yellow-600" />}
                                            <span className={`capitalize ${sale.status === 'completed' ? 'text-green-700' :
                                                sale.status === 'cancelled' ? 'text-red-700' : 'text-gray-700'
                                                }`}>
                                                {sale.status}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-gray-700">
                                        {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-gray-900">
                                        ₱{calculateTotal(sale).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {sales.length === 0 && (
                        <div className="py-12 text-center text-gray-500 italic">
                            No sales records match the exact criteria for this report.
                        </div>
                    )}
                </div>

                {/* Footer Summation */}
                {sales.length > 0 && (
                    <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end print:break-inside-avoid">
                        <div className="text-right">
                            <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold mb-1">Total Report Revenue</p>
                            <p className="text-3xl font-bold text-gray-900">
                                ₱{sales.filter(s => s.status === 'completed').reduce((sum, sale) => sum + calculateTotal(sale), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Sum of completed transactions only</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
