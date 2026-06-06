import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    TrendingUp,
    Wallet,
    Banknote,
    Users,
    Activity,
    PhilippinePeso,
    Layers,
    RefreshCw,
    BarChart2,
    PieChart as PieChartIcon,
    Grid,
    Search,
    Calendar,
    ArrowUpRight,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Label,
    Legend,
} from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reports and Analytics',
        href: '/reports-and-analytics',
    },
];

interface Branch {
    id: number;
    branch_name: string;
    location?: string;
}

interface TrendingItem {
    id: number;
    name: string;
    sku: string;
    category: string;
    quantity_sold: number;
    revenue: number;
    avg_price: number;
}

interface MatrixItem {
    id: number;
    name: string;
    sku: string;
    category: string;
    price: number;
    branches: {
        [branchId: number]: {
            stock: number;
            sales: number;
        }
    };
    total_stock: number;
    total_sales: number;
}

interface ReportsProps {
    branches: Branch[];
    branchId: string | number;
    datePreset: string;
    dateFrom: string;
    dateTo: string;
    search: string;
    stats: {
        revenue: number;
        expenses: number;
        fees: number;
        returns: number;
        returns_count: number;
        net_profit: number;
        items_sold: number;
    };
    trendingItems: TrendingItem[];
    branchMatrix: MatrixItem[];
    chartData: { name: string; sales: number }[];
    pieData: { name: string; value: number; count?: number }[];
    paymentData: { name: string; value: number; count?: number }[];
}

const getChartColor = (index: number, total: number) => {
    const hue = (index * 137.5) % 360;
    return `hsl(${hue}, 70%, 50%)`;
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(amount);
};

export default function ReportsIndex({
    branches,
    branchId,
    datePreset: initialDatePreset,
    dateFrom: initialDateFrom,
    dateTo: initialDateTo,
    search: initialSearch,
    stats,
    trendingItems,
    branchMatrix,
    chartData,
    pieData,
    paymentData,
}: ReportsProps) {
    const { auth } = usePage().props as any;
    const isSystemAdmin = auth.roles.includes('System Administrator');

    // Filter states
    const [datePreset, setDatePreset] = useState(initialDatePreset);
    const [dateFrom, setDateFrom] = useState(initialDateFrom);
    const [dateTo, setDateTo] = useState(initialDateTo);
    const [selectedBranch, setSelectedBranch] = useState(branchId);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [activeTab, setActiveTab] = useState('overview');

    // Trigger router reload when basic filters change
    const applyFilters = (preset = datePreset, from = dateFrom, to = dateTo, branch = selectedBranch) => {
        router.get('/reports-and-analytics', {
            date_preset: preset,
            date_from: from,
            date_to: to,
            branch_id: branch,
            search: searchQuery
        }, { preserveState: true, replace: true, preserveScroll: true });
    };

    // Handle search input debouncing
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery !== initialSearch) {
                applyFilters(datePreset, dateFrom, dateTo, selectedBranch);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handlePresetChange = (preset: string) => {
        setDatePreset(preset);
        setDateFrom('');
        setDateTo('');
        applyFilters(preset, '', '', selectedBranch);
    };

    const handleBranchChange = (branchVal: string) => {
        setSelectedBranch(branchVal);
        applyFilters(datePreset, dateFrom, dateTo, branchVal);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports & Analytics" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 overflow-x-auto">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <TrendingUp className="w-8 h-8 text-primary" />
                            Reports & Analytics
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Comprehensive business intelligence, inventory tracking, and sales analytics.
                        </p>
                    </div>
                    
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => applyFilters(datePreset, dateFrom, dateTo, selectedBranch)}
                        className="flex items-center gap-2 shrink-0"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reload Data
                    </Button>
                </div>

                {/* Filter Toolbar */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 bg-card rounded-xl border shadow-sm">
                    {/* Date Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { value: 'today', label: 'Today' },
                            { value: 'weekly', label: 'Weekly' },
                            { value: 'monthly', label: 'Monthly' },
                            { value: 'ytd', label: 'YTD' },
                            { value: 'custom', label: 'Custom' }
                        ].map((preset) => (
                            <Button
                                key={preset.value}
                                variant={datePreset === preset.value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handlePresetChange(preset.value)}
                                className="h-8 text-xs font-semibold"
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>

                    {/* Custom Range Inputs */}
                    {datePreset === 'custom' && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-lg border text-xs">
                                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">From:</span>
                                <input
                                    type="date"
                                    className="bg-transparent border-none text-xs outline-none w-[115px] dark:text-zinc-150"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        applyFilters('custom', e.target.value, dateTo, selectedBranch);
                                    }}
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-lg border text-xs">
                                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">To:</span>
                                <input
                                    type="date"
                                    className="bg-transparent border-none text-xs outline-none w-[115px] dark:text-zinc-150"
                                    value={dateTo}
                                    onChange={(e) => {
                                        setDateTo(e.target.value);
                                        applyFilters('custom', dateFrom, e.target.value, selectedBranch);
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Branch Override Selector for System Admins */}
                    {isSystemAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-medium text-muted-foreground">Branch:</span>
                            <select
                                className="h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring dark:bg-zinc-900"
                                value={selectedBranch}
                                onChange={(e) => handleBranchChange(e.target.value)}
                            >
                                <option value="all">All Branches</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.branch_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* KPI Overview Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Revenue Card */}
                    <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gross Revenue</CardTitle>
                            <Banknote className="h-5 w-5 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(stats.revenue)}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {stats.items_sold.toLocaleString()} items sold in period
                            </p>
                        </CardContent>
                    </Card>

                    {/* Expenses Card */}
                    <Card className="border-l-4 border-l-red-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Expenses</CardTitle>
                            <Wallet className="h-5 w-5 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tracking-tight text-red-650 dark:text-red-400">
                                {formatCurrency(stats.expenses)}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Logged payouts & operational cash outs
                            </p>
                        </CardContent>
                    </Card>

                    {/* Fees Card */}
                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service Fees</CardTitle>
                            <Activity className="h-5 w-5 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                                {formatCurrency(stats.fees)}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Additional service premium collections
                            </p>
                        </CardContent>
                    </Card>

                    {/* Net Performance Card */}
                    <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Margin</CardTitle>
                            <PhilippinePeso className="h-5 w-5 text-indigo-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                                {formatCurrency(stats.net_profit)}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Refund deductions: {formatCurrency(stats.returns)} ({stats.returns_count} returns)
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs Selector */}
                <div className="border-b border-muted">
                    <div className="flex gap-4">
                        {[
                            { id: 'overview', label: 'Visual Overview', icon: BarChart2 },
                            { id: 'trending', label: 'Trending Items', icon: TrendingUp },
                            { id: 'matrix', label: 'Branch Stock Matrix', icon: Grid }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
                                    activeTab === tab.id
                                        ? 'border-primary text-foreground'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Contents */}
                <div className="flex-1">
                    {/* Tab 1: Visual Overview */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Sales Trend Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Sales Trend Timeline</CardTitle>
                                    <CardDescription>
                                        Revenue growth visualizer over the selected range.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px] md:h-[400px]">
                                    {chartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} className="text-[10px] text-muted-foreground" />
                                                <YAxis tickLine={false} axisLine={false} tickMargin={10} width={60} className="text-[10px] text-muted-foreground" tickFormatter={(value) => value.toLocaleString()} />
                                                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                                                <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            No sales trend data found for the selected period.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Distributions Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Category Distribution */}
                                <Card className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle>Sales by Category</CardTitle>
                                        <CardDescription>Percentage share of total revenue per category.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[260px]">
                                        {pieData.length > 0 ? (
                                            <>
                                                <ResponsiveContainer width="100%" height={200}>
                                                    <PieChart>
                                                        <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                                                        <Pie
                                                            data={pieData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={4}
                                                            dataKey="value"
                                                        >
                                                            {pieData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={getChartColor(index, pieData.length)} />
                                                            ))}
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="grid grid-cols-2 gap-3 w-full mt-4 text-xs max-h-[120px] overflow-y-auto px-4">
                                                    {pieData.map((entry, index) => (
                                                        <div key={entry.name} className="flex items-center justify-between border-b pb-1">
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getChartColor(index, pieData.length) }} />
                                                                <span className="truncate text-muted-foreground">{entry.name}</span>
                                                            </div>
                                                            <span className="font-semibold text-foreground">{formatCurrency(entry.value)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">No data available</span>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Payment Method Distribution */}
                                <Card className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle>Payment Methods</CardTitle>
                                        <CardDescription>Revenue distribution based on payment types.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[260px]">
                                        {paymentData.length > 0 ? (
                                            <>
                                                <ResponsiveContainer width="100%" height={200}>
                                                    <PieChart>
                                                        <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                                                        <Pie
                                                            data={paymentData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={4}
                                                            dataKey="value"
                                                        >
                                                            {paymentData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={getChartColor(index + 3, paymentData.length)} />
                                                            ))}
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="grid grid-cols-2 gap-3 w-full mt-4 text-xs max-h-[120px] overflow-y-auto px-4">
                                                    {paymentData.map((entry, index) => (
                                                        <div key={entry.name} className="flex items-center justify-between border-b pb-1">
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getChartColor(index + 3, paymentData.length) }} />
                                                                <span className="truncate text-muted-foreground">{entry.name}</span>
                                                            </div>
                                                            <span className="font-semibold text-foreground">{formatCurrency(entry.value)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">No data available</span>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Trending Items */}
                    {activeTab === 'trending' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Trending Products</CardTitle>
                                <CardDescription>
                                    Top 10 performing items in terms of quantities sold.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {trendingItems.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product details</TableHead>
                                                <TableHead>SKU</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead className="text-center font-semibold">Qty Sold</TableHead>
                                                <TableHead className="text-right">Avg Price</TableHead>
                                                <TableHead className="text-right font-semibold">Total Revenue</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {trendingItems.map((item, index) => (
                                                <TableRow key={item.id} className="hover:bg-muted/50">
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-muted-foreground w-4">#{index + 1}</span>
                                                            <span>{item.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{item.sku || '-'}</TableCell>
                                                    <TableCell>{item.category}</TableCell>
                                                    <TableCell className="text-center font-semibold">{item.quantity_sold.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.avg_price)}</TableCell>
                                                    <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(item.revenue)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground">
                                        No trending items found for this selection.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Tab 3: Branch Stock & Sales Matrix */}
                    {activeTab === 'matrix' && (
                        <Card>
                            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
                                <div>
                                    <CardTitle>Branch Stock & Sales Matrix</CardTitle>
                                    <CardDescription>
                                        Cross-reference current stock levels with unit sales made in the selected period.
                                    </CardDescription>
                                </div>
                                <div className="relative w-full md:w-72 shrink-0">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search product matrix..."
                                        className="pl-8"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                {branchMatrix.length > 0 ? (
                                    <Table className="min-w-[700px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="font-bold min-w-[180px]">Product Details</TableHead>
                                                <TableHead className="font-bold">Category</TableHead>
                                                <TableHead className="font-bold text-right">Unit Price</TableHead>
                                                {branches.map((b) => (
                                                    <TableHead key={b.id} className="text-center font-bold border-l bg-muted/20" colSpan={2}>
                                                        {b.branch_name}
                                                    </TableHead>
                                                ))}
                                                <TableHead className="font-bold text-center border-l bg-indigo-50/10" colSpan={2}>
                                                    Overall Total
                                                </TableHead>
                                            </TableRow>
                                            <TableRow className="bg-muted/5">
                                                <TableHead></TableHead>
                                                <TableHead></TableHead>
                                                <TableHead></TableHead>
                                                {branches.map((b) => (
                                                    <React.Fragment key={`sub-${b.id}`}>
                                                        <TableHead className="text-center text-[10px] font-semibold border-l py-1.5">Stock</TableHead>
                                                        <TableHead className="text-center text-[10px] font-semibold text-blue-600 dark:text-blue-400 py-1.5">Sales</TableHead>
                                                    </React.Fragment>
                                                ))}
                                                <TableHead className="text-center text-[10px] font-bold border-l py-1.5">Stock</TableHead>
                                                <TableHead className="text-center text-[10px] font-bold text-blue-600 dark:text-blue-400 py-1.5">Sales</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {branchMatrix.map((item) => (
                                                <TableRow key={item.id} className="hover:bg-muted/30">
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col">
                                                            <span className="truncate max-w-[200px]" title={item.name}>{item.name}</span>
                                                            <span className="text-[10px] text-muted-foreground">{item.sku || '-'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">{item.category}</TableCell>
                                                    <TableCell className="text-right text-xs font-semibold">{formatCurrency(item.price)}</TableCell>
                                                    {branches.map((b) => {
                                                        const stock = item.branches[b.id]?.stock ?? 0;
                                                        const sales = item.branches[b.id]?.sales ?? 0;
                                                        return (
                                                            <React.Fragment key={`val-${item.id}-${b.id}`}>
                                                                <TableCell className="text-center text-xs border-l">
                                                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                                                        stock === 0
                                                                            ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
                                                                            : stock <= 5
                                                                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                                                                            : 'text-foreground'
                                                                    }`}>
                                                                        {stock}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-center text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                                    {sales > 0 ? sales : '-'}
                                                                </TableCell>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    <TableCell className="text-center text-xs border-l font-bold bg-indigo-50/5">
                                                        {item.total_stock}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs text-blue-600 dark:text-blue-400 font-bold bg-indigo-50/5">
                                                        {item.total_sales > 0 ? item.total_sales : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground">
                                        No items found matching the search criteria.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
