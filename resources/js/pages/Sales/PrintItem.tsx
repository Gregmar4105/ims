import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { handleNativePrintFallback } from '@/lib/utils';
import { useBluetoothPrinterContext } from '@/contexts/bluetooth-printer-context';
import { PrintSelectionModal } from '@/components/print-selection-modal';

interface Sale {
    id: number;
    branch_id: number;
    status: 'readied' | 'completed' | 'cancelled' | 'reserved';
    created_at: string;
    branch: { branch_name: string, address?: string, phone?: string };
    readied_by: { name: string };
    approved_by: { name: string } | null;
    items: Array<{
        id: number;
        quantity: number;
        price: number;
        original_price: number | null;
        product: { name: string; barcode: string; qr_code: string; code: string | null };
        custom_code: string | null;
    }>;
    payment_method?: string | null;
    ewallet_provider?: string | null;
    home_credited_name?: string | null;
    downpayment?: number | null;
    cash_received?: number | null;
    change_amount?: number | null;
    customer_name?: string | null;
    reservation_buy_date?: string | null;
}

export default function PrintItem({ sale }: { sale: Sale }) {
    const bt = useBluetoothPrinterContext();
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    useEffect(() => {
        const attemptPrint = async () => {
            if (bt.isSupported && bt.autoPrintEnabled) {
                const ok = await bt.printElement('printable-receipt');
                if (ok) return;
            }
            
            const nativeTriggered = await handleNativePrintFallback('printable-receipt', `receipt_${sale.id}`);
            if (!nativeTriggered) {
                window.print();
            }
        };
        const timer = setTimeout(attemptPrint, 800);
        return () => clearTimeout(timer);
    }, [sale.id, bt.isSupported, bt.autoPrintEnabled]);

    const handleManualPrint = async () => {
        const nativeTriggered = await handleNativePrintFallback('printable-receipt', `receipt_${sale.id}`);
        if (!nativeTriggered) {
            window.print();
        }
    };

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

            {/* Floating Print Button */}
            <div className="fixed bottom-6 right-6 z-50 print:hidden">
                <Button 
                    onClick={() => setIsPrintModalOpen(true)} 
                    className="rounded-full shadow-2xl gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold transition-all hover:scale-105 active:scale-95 flex items-center px-6 py-6 text-base" 
                    size="lg"
                >
                    <Printer className="w-5 h-5" />
                    Print Receipt
                </Button>
            </div>

            <div id="printable-receipt" className="max-w-3xl mx-auto p-8 print:p-0 font-sans bg-white">
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
                                        <div className="flex flex-col gap-0.5 mt-0.5 text-xs text-gray-500 font-mono">
                                            {item.custom_code ? (
                                                <p>Code: {item.custom_code}</p>
                                            ) : item.product.code ? (
                                                <p>Code: {item.product.code}</p>
                                            ) : null}
                                            <p>{item.product.barcode || item.product.qr_code}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-3">{item.quantity}</TableCell>
                                    <TableCell className="text-right py-3">
                                        <div className="flex flex-col items-end">
                                            <span className="font-medium">₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            {item.original_price && Number(item.original_price) !== Number(item.price) && (
                                                <span className="text-[10px] text-gray-400 line-through">₱{Number(item.original_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            )}
                                        </div>
                                    </TableCell>
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
                        {sale.payment_method && (
                            <div className="border-t border-dashed border-gray-200 pt-2 space-y-1 text-sm text-gray-600">
                                <div className="flex justify-between">
                                    <span>Payment Method</span>
                                    <span className="capitalize">
                                        {sale.payment_method === 'e-wallet' ? `E-Wallet (${sale.ewallet_provider})` : 
                                         sale.payment_method === 'home_credit' ? `Home Credit (${sale.home_credited_name || 'Bikes and Accessories'})` : 
                                         sale.payment_method === 'reservation' ? 'Reservation' : 'Cash'}
                                    </span>
                                </div>
                                {sale.payment_method === 'cash' && (
                                    <>
                                        <div className="flex justify-between">
                                            <span>Cash Tendered</span>
                                            <span>₱{Number(sale.cash_received).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between font-semibold text-black">
                                            <span>Change</span>
                                            <span>₱{Number(sale.change_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </>
                                )}
                                {sale.payment_method === 'home_credit' && Number(sale.downpayment) > 0 && (
                                    <div className="flex justify-between font-semibold text-black">
                                        <span>Downpayment</span>
                                        <span>₱{Number(sale.downpayment).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                {sale.payment_method === 'reservation' && (
                                    <>
                                        <div className="flex justify-between">
                                            <span>Customer Name</span>
                                            <span className="font-semibold text-black">{sale.customer_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Downpayment</span>
                                            <span>₱{Number(sale.downpayment).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {sale.status === 'completed' ? (
                                            <>
                                                <div className="flex justify-between">
                                                    <span>Remaining Paid via</span>
                                                    <span className="font-semibold text-black">{sale.ewallet_provider ? `E-Wallet (${sale.ewallet_provider})` : 'Cash'}</span>
                                                </div>
                                                {!sale.ewallet_provider && sale.cash_received && (
                                                    <>
                                                        <div className="flex justify-between">
                                                            <span>Remaining Cash Tendered</span>
                                                            <span>₱{Number(sale.cash_received).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                        <div className="flex justify-between font-semibold text-black">
                                                            <span>Change</span>
                                                            <span>₱{Number(sale.change_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex justify-between text-blue-600 font-semibold pt-1 border-t border-dashed">
                                                <span>Remaining Balance</span>
                                                <span>₱{(totalRevenue - Number(sale.downpayment || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
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

            {/* Print Selection Modal */}
            <PrintSelectionModal 
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                onPrintSystem={handleManualPrint}
                elementId="printable-receipt"
                title={`Print Sale #${sale.id}`}
            />
        </div>
    );
}
