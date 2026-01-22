import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Box, ChevronRight, Package, Search, ShoppingCart, Truck } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Employee Dashboard',
        href: '/employee-dashboard',
    },
];

interface Product {
    id: number;
    name: string;
    sku: string;
    price: number;
}

interface SaleItem {
    id: number;
    product: Product;
    quantity: number;
}

interface Sale {
    id: number;
    branch: { name: string };
    readied_by: { name: string };
    created_at: string;
    items: SaleItem[];
    status: string;
}

interface TransferItem {
    id: number;
    product: Product;
    quantity: number;
}

interface Transfer {
    id: number;
    destination_branch: { name: string };
    readied_by: { name: string };
    created_at: string;
    items: TransferItem[];
    status: string;
}

interface Props {
    preparedSales: Sale[];
    readiedTransfers: Transfer[];
}

export default function EmployeeDashboard({ preparedSales, readiedTransfers }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'sales' | 'transfers'>('sales');

    const filteredSales = preparedSales.filter(sale =>
        sale.id.toString().includes(searchTerm) ||
        sale.items.some(item => item.product.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredTransfers = readiedTransfers.filter(transfer =>
        transfer.id.toString().includes(searchTerm) ||
        transfer.destination_branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.items.some(item => item.product.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const StatCard = ({ title, count, icon: Icon, color }: { title: string, count: number, icon: any, color: string }) => (
        <Card className="overflow-hidden border-none shadow-md ring-1 ring-black/5 dark:ring-white/10">
            <div className={`absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y--8 rounded-full ${color} opacity-10 blur-2xl transition-all duration-300 group-hover:opacity-20`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-').replace('500', '600')}`} />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold tracking-tight">{count}</div>
                <p className="text-xs text-muted-foreground mt-1">Pending items</p>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employee Dashboard" />
            <div className="flex flex-1 flex-col gap-8 p-6 md:p-8 max-w-7xl mx-auto w-full">

                {/* Header Section */}
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-400">
                            Create Magic Today
                        </h1>
                        <p className="text-muted-foreground">Here's what needs your attention immediately.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 w-full max-w-2xl">
                    <div onClick={() => setActiveTab('sales')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                        <StatCard
                            title="Prepared Sales"
                            count={preparedSales.length}
                            icon={ShoppingCart}
                            color={activeTab === 'sales' ? "text-blue-500" : "text-gray-500"}
                        />
                    </div>
                    <div onClick={() => setActiveTab('transfers')} className="cursor-pointer transition-transform hover:scale-[1.02]">
                        <StatCard
                            title="Outgoing Transfers"
                            count={readiedTransfers.length}
                            icon={Truck}
                            color={activeTab === 'transfers' ? "text-orange-500" : "text-gray-500"}
                        />
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 bg-secondary/30 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('sales')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'sales'
                                        ? 'bg-white text-primary shadow-sm dark:bg-gray-800'
                                        : 'text-muted-foreground hover:bg-secondary/50'
                                    }`}
                            >
                                Sales Ready
                            </button>
                            <button
                                onClick={() => setActiveTab('transfers')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'transfers'
                                        ? 'bg-white text-primary shadow-sm dark:bg-gray-800'
                                        : 'text-muted-foreground hover:bg-secondary/50'
                                    }`}
                            >
                                Transfers Ready
                            </button>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search items..."
                                className="pl-8 bg-white/50 backdrop-blur-sm dark:bg-gray-900/50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <Card className="border-none shadow-lg ring-1 ring-black/5 dark:ring-white/10 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {activeTab === 'sales' ? <ShoppingCart className="h-5 w-5 text-blue-500" /> : <Truck className="h-5 w-5 text-orange-500" />}
                                {activeTab === 'sales' ? 'Sales Ready for Handover' : 'Transfers Ready for Shipping'}
                            </CardTitle>
                            <CardDescription>
                                {activeTab === 'sales'
                                    ? 'Review and handover these prepared sales to customers.'
                                    : 'Process these transfers for outgoing shipment.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border bg-white dark:bg-gray-900">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[100px]">Reference</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead>{activeTab === 'sales' ? 'Branch' : 'Destination'}</TableHead>
                                            <TableHead>Prepared By</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(activeTab === 'sales' ? filteredSales : filteredTransfers).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Package className="h-8 w-8 opacity-20" />
                                                        <p>No items found</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            (activeTab === 'sales' ? filteredSales : filteredTransfers).map((item: any) => (
                                                <TableRow key={item.id} className="group cursor-pointer hover:bg-secondary/30 transition-colors">
                                                    <TableCell className="font-medium">
                                                        <span className="font-mono text-xs bg-secondary px-2 py-1 rounded">
                                                            #{item.id.toString().padStart(5, '0')}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-medium">{item.items[0]?.product.name}</span>
                                                            {item.items.length > 1 && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    + {item.items.length - 1} other items
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-normal">
                                                            {activeTab === 'sales' ? item.branch?.name : item.destination_branch?.name}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                                                                {item.readied_by?.name.charAt(0)}
                                                            </div>
                                                            <span className="text-sm text-muted-foreground">{item.readied_by?.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {new Date(item.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            View Details <ChevronRight className="ml-1 h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

// Helper needed to make Typescript happy if any implicit any issues arise, though interface above covers it.
