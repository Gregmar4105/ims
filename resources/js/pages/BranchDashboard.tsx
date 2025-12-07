import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Activity,
    ArrowUpRight,
    Calendar,
    CreditCard,
    DollarSign,
    Users,
} from 'lucide-react';
import { useState } from 'react';
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
} from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Branch Dashboard',
        href: '/branch-dashboard',
    },
];

interface DashboardProps {
    stats: {
        daily: number;
        weekly: number;
        monthly: number;
        ytd: number;
    };
    chartData: { name: string; sales: number }[];
    pieData: { name: string; value: number }[];
    leaderboard: {
        id: number;
        name: string;
        role: string;
        joined: string;
        profile_photo_url: string;
        daily: number;
        weekly: number;
        monthlyContribution: number;
        sales: number;
        outgoing: number;
    }[];
    filters: {
        start_date?: string;
        end_date?: string;
        selectedDateSales?: number;
    };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function BranchDashboard({ stats, chartData, pieData, leaderboard, filters }: DashboardProps) {
    const [startDate, setStartDate] = useState<string>(filters.start_date || '');
    const [endDate, setEndDate] = useState<string>(filters.end_date || '');

    const handleFilterChange = (start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);

        // Trigger fetch if both dates are present OR if one is cleared
        if ((start && end) || (!start && !end)) {
            router.get(
                '/branch-dashboard',
                { start_date: start, end_date: end },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Branch Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-4 md:p-6">

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Daily Sales (Qty)</CardTitle>
                            <DollarSign className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.daily}</div>
                            <p className="text-muted-foreground text-xs">Products sold today</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Weekly Sales (Qty)</CardTitle>
                            <Users className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.weekly}</div>
                            <p className="text-muted-foreground text-xs">Products sold this week</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Monthly Sales (Qty)</CardTitle>
                            <CreditCard className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.monthly}</div>
                            <p className="text-muted-foreground text-xs">Products sold this month</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Year To Date (Qty)</CardTitle>
                            <Activity className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.ytd}</div>
                            <p className="text-muted-foreground text-xs">Total products sold this year</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Graphs & Manual Tracking Layout */}
                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Left: Annual Trend (Broad) */}
                    <Card className="lg:col-span-2 flex flex-col">
                        <CardHeader>
                            <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2 flex-1 min-h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        className="text-muted-foreground text-xs"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={10}
                                    />
                                    <YAxis
                                        className="text-muted-foreground text-xs"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={10}
                                        width={40}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                        cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="sales"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorSales)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Right Column: Pie + Manual Tracking */}
                    <div className="flex flex-col gap-4">
                        <Card className="flex-1">
                            <CardHeader>
                                <CardTitle>Sales Distribution (YTD)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="flex-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" /> Manual Tracking
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">From</span>
                                        <Input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => handleFilterChange(e.target.value, endDate)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">To</span>
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => handleFilterChange(startDate, e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-lg border p-4 bg-muted/50">
                                    <p className="text-sm font-medium">Items Sold in Range</p>
                                    <div className="mt-2 text-3xl font-bold text-primary">
                                        {filters.selectedDateSales ?? 0}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {startDate && endDate ? `${startDate} to ${endDate}` : 'Select a date range'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Personnel Leaderboard */}
                <Card>
                    <CardHeader>
                        <CardTitle>Personnel Leaderboard (By Quantity Sold)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Profile</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Daily</TableHead>
                                    <TableHead className="text-right">Weekly</TableHead>
                                    <TableHead className="text-right">Monthly</TableHead>
                                    <TableHead className="text-right">Outgoing</TableHead>
                                    <TableHead className="text-right">Total Sales</TableHead>
                                    <TableHead className="text-right">Month Winner</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leaderboard.map((person, index) => (
                                    <TableRow key={person.id}>
                                        <TableCell>
                                            <Avatar>
                                                <AvatarImage src={person.profile_photo_url} alt={person.name} />
                                                <AvatarFallback>{person.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell className="font-medium">{person.name}</TableCell>
                                        <TableCell>{person.role}</TableCell>
                                        <TableCell>{person.joined}</TableCell>
                                        <TableCell className="text-right">{person.daily}</TableCell>
                                        <TableCell className="text-right">{person.weekly}</TableCell>
                                        <TableCell className="text-right">{person.monthlyContribution}</TableCell>
                                        <TableCell className="text-right">{person.outgoing}</TableCell>
                                        <TableCell className="text-right">{person.sales}</TableCell>
                                        <TableCell className="text-right">
                                            {index === 0 && person.monthlyContribution > 0 && (
                                                <span className="flex items-center justify-end gap-1 text-yellow-500 font-bold">
                                                    <ArrowUpRight className="h-4 w-4" /> Winner
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
