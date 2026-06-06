import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, Coins, RotateCcw, Printer, Calculator } from 'lucide-react';
import { useState, useMemo, useRef } from 'react';

const breadcrumbs = [
    {
        title: 'End of Day',
        href: '/end-of-day',
    },
];

interface Denomination {
    value: number;
    label: string;
    type: 'bill' | 'coin';
}

const DENOMINATIONS: Denomination[] = [
    { value: 1000, label: '₱1,000', type: 'bill' },
    { value: 500,  label: '₱500',   type: 'bill' },
    { value: 200,  label: '₱200',   type: 'bill' },
    { value: 100,  label: '₱100',   type: 'bill' },
    { value: 50,   label: '₱50',    type: 'bill' },
    { value: 20,   label: '₱20',    type: 'bill' },
    { value: 10,   label: '₱10',    type: 'coin' },
    { value: 5,    label: '₱5',     type: 'coin' },
    { value: 1,    label: '₱1',     type: 'coin' },
];

type Counts = Record<number, number>;

const initialCounts: Counts = Object.fromEntries(DENOMINATIONS.map(d => [d.value, 0]));

export default function EndOfDay() {
    const [counts, setCounts] = useState<Counts>({ ...initialCounts });
    const printRef = useRef<HTMLDivElement>(null);

    const handleCountChange = (denomination: number, raw: string) => {
        const parsed = parseInt(raw, 10);
        setCounts(prev => ({
            ...prev,
            [denomination]: isNaN(parsed) || parsed < 0 ? 0 : parsed,
        }));
    };

    const handleReset = () => {
        setCounts({ ...initialCounts });
    };

    // Computed totals
    const subtotals = useMemo(
        () => DENOMINATIONS.map(d => ({ ...d, count: counts[d.value], subtotal: counts[d.value] * d.value })),
        [counts],
    );

    const grandTotal = useMemo(() => subtotals.reduce((sum, d) => sum + d.subtotal, 0), [subtotals]);
    const totalPieces = useMemo(() => subtotals.reduce((sum, d) => sum + d.count, 0), [subtotals]);

    const billTotal = useMemo(() => subtotals.filter(d => d.type === 'bill').reduce((s, d) => s + d.subtotal, 0), [subtotals]);
    const coinTotal = useMemo(() => subtotals.filter(d => d.type === 'coin').reduce((s, d) => s + d.subtotal, 0), [subtotals]);

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;
        const win = window.open('', '_blank');
        if (!win) return;

        const today = new Date().toLocaleDateString('en-PH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const time = new Date().toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
        });

        win.document.write(`
            <html>
            <head>
                <title>End of Day Report – ${today}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
                    h1 { font-size: 18px; margin-bottom: 4px; }
                    .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                    th, td { padding: 6px 10px; border: 1px solid #ddd; font-size: 13px; }
                    th { background: #f5f5f5; text-align: left; font-weight: 600; }
                    td.right { text-align: right; }
                    .total-row td { font-weight: 700; background: #f0f7ff; }
                    .summary { margin-top: 12px; font-size: 13px; }
                    .summary div { margin-bottom: 4px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <h1>End of Day – Cash Drawer Count</h1>
                <div class="meta">${today} • ${time}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Denomination</th>
                            <th>Type</th>
                            <th class="right">Count</th>
                            <th class="right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subtotals.map(d => `
                            <tr${d.count > 0 ? '' : ' style="color:#999"'}>
                                <td>${d.label}</td>
                                <td>${d.type === 'bill' ? 'Bill' : 'Coin'}</td>
                                <td class="right">${d.count}</td>
                                <td class="right">₱${d.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2">Grand Total</td>
                            <td class="right">${totalPieces}</td>
                            <td class="right">₱${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="summary">
                    <div><strong>Bills:</strong> ₱${billTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div><strong>Coins:</strong> ₱${coinTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
            </body>
            </html>
        `);
        win.document.close();
        win.focus();
        win.print();
    };

    const fmt = (n: number) => `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="End of Day" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">End of Day</h1>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-200">
                                Cash Drawer
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">Count the bills and coins in the cash drawer at end of day.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            className="gap-1.5"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                        </Button>
                        <Button
                            size="sm"
                            onClick={handlePrint}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
                        >
                            <Printer className="w-4 h-4" />
                            Print Report
                        </Button>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" ref={printRef}>

                    {/* Left – Denomination Table (2/3) */}
                    <div className="lg:col-span-2">
                        <Card className="border shadow-sm overflow-hidden">
                            <CardHeader className="pb-3 border-b">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        <CardTitle className="text-lg">Denomination Count</CardTitle>
                                    </div>
                                    <Badge variant="secondary">
                                        {totalPieces} pieces
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Enter the number of each denomination found in the cash drawer.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-muted/10">
                                        <TableRow>
                                            <TableHead className="pl-6 w-[140px]">Denomination</TableHead>
                                            <TableHead className="w-[80px]">Type</TableHead>
                                            <TableHead className="w-[160px] text-center">Count</TableHead>
                                            <TableHead className="text-right pr-6">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subtotals.map((d, idx) => {
                                            const isActive = d.count > 0;
                                            return (
                                                <TableRow
                                                    key={d.value}
                                                    className={`transition-colors ${isActive ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : 'hover:bg-muted/5'}`}
                                                >
                                                    <TableCell className="pl-6 font-semibold text-base">
                                                        <span className={isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}>
                                                            {d.label}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {d.type === 'bill' ? (
                                                            <Badge variant="outline" className="gap-1 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200">
                                                                <Banknote className="w-3.5 h-3.5" />
                                                                Bill
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="gap-1 text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200">
                                                                <Coins className="w-3.5 h-3.5" />
                                                                Coin
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Input
                                                            id={`count-${d.value}`}
                                                            type="number"
                                                            min="0"
                                                            value={d.count === 0 ? '' : d.count}
                                                            placeholder="0"
                                                            onChange={(e) => handleCountChange(d.value, e.target.value)}
                                                            className="w-24 mx-auto text-center font-medium tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                    </TableCell>
                                                    <TableCell className={`text-right pr-6 font-bold tabular-nums ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                                                        {fmt(d.subtotal)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>

                            {/* Grand Total Footer */}
                            <CardFooter className="bg-emerald-50/30 dark:bg-emerald-950/10 border-t p-4 flex justify-between items-center">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grand Total</span>
                                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {fmt(grandTotal)}
                                </span>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Right – Summary Sidebar (1/3) */}
                    <div className="space-y-6">

                        {/* Grand Total Highlight */}
                        <Card className="border shadow-sm border-l-4 border-l-emerald-500 overflow-hidden">
                            <CardHeader className="pb-3">
                                <CardDescription className="text-xs uppercase tracking-wider font-semibold">Cash Drawer Total</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                                    {fmt(grandTotal)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Bills Breakdown */}
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-2 border-b">
                                <div className="flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <CardTitle className="text-md">Bills</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {subtotals.filter(d => d.type === 'bill').map(d => (
                                        <div key={d.value} className="px-4 py-2.5 flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-800 dark:text-gray-200">{d.label}</span>
                                                {d.count > 0 && (
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                        ×{d.count}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className={`font-semibold tabular-nums ${d.count > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                                                {fmt(d.subtotal)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="bg-blue-50/20 dark:bg-blue-950/10 border-t p-3 flex justify-between items-center">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bills Total</span>
                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                    {fmt(billTotal)}
                                </span>
                            </CardFooter>
                        </Card>

                        {/* Coins Breakdown */}
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-2 border-b">
                                <div className="flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    <CardTitle className="text-md">Coins</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {subtotals.filter(d => d.type === 'coin').map(d => (
                                        <div key={d.value} className="px-4 py-2.5 flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-800 dark:text-gray-200">{d.label}</span>
                                                {d.count > 0 && (
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                        ×{d.count}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className={`font-semibold tabular-nums ${d.count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                                {fmt(d.subtotal)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="bg-amber-50/20 dark:bg-amber-950/10 border-t p-3 flex justify-between items-center">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coins Total</span>
                                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                    {fmt(coinTotal)}
                                </span>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
