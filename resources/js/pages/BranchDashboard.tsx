import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowUpRight,
    CloudSun,
    CreditCard,
    DollarSign,
    Users,
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
} from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Branch Dashboard',
        href: '/branch-dashboard',
    },
];

interface DashboardProps {
    branchLocation: string;
    stats: {
        daily: number;
        weekly: number;
        monthly: number;
        ytd: number;
    };
    chartData: { name: string; sales: number }[];
    pieData: { name: string; value: number }[];
    productData: { name: string; value: number }[];
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

// Dynamic color generation for many categories
const getChartColor = (index: number, total: number) => {
    // We use a golden angle approach to spread colors evenly
    const hue = (index * 137.5) % 360;
    return `hsl(${hue}, 65%, 55%)`;
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(amount);
};

const DistributionCard = ({ title, subtitle, data, totalLabel = "Sales", valueType = 'currency' }: { title: string; subtitle: string; data: { name: string; value: number }[]; totalLabel?: string; valueType?: 'currency' | 'number' }) => {
    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-0">
                <CardTitle>{title}</CardTitle>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                        <Tooltip 
                            formatter={(value: number) => [valueType === 'currency' ? formatCurrency(value) : value.toLocaleString(), valueType === 'currency' ? 'Revenue' : 'Quantity']}
                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                        />
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getChartColor(index, data.length)} />
                            ))}
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        const total = data.reduce((acc, curr) => acc + curr.value, 0);
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) - 5}
                                                    className="fill-foreground text-xl font-bold"
                                                >
                                                    {total > 1000000 ? `${(total/1000000).toFixed(1)}M` : (total > 1000 ? `${(total/1000).toFixed(0)}K` : total.toFixed(0))}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 15}
                                                    className="fill-muted-foreground text-[10px] font-medium"
                                                >
                                                    {totalLabel}
                                                </tspan>
                                            </text>
                                        )
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
            <div className="max-h-[100px] overflow-y-auto scrollbar-thin px-6 pb-6 mt-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                    {data.map((entry, index) => {
                        const total = data.reduce((acc, curr) => acc + curr.value, 0);
                        const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
                        return (
                            <div key={`legend-${index}`} className="flex items-center justify-between gap-2 border-b border-muted/30 pb-1">
                                <div className="flex items-center gap-2 truncate">
                                    <div 
                                        className="h-2 w-2 shrink-0 rounded-full" 
                                        style={{ backgroundColor: getChartColor(index, data.length) }}
                                    />
                                    <span className="truncate text-muted-foreground" title={entry.name}>
                                        {entry.name}
                                    </span>
                                </div>
                                <span className="font-medium text-foreground shrink-0">{percentage}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
};

export default function BranchDashboard({ branchLocation, stats, chartData, pieData, productData, leaderboard, filters }: DashboardProps) {
    const { auth } = usePage().props as any;
    
    const [greeting] = useState(() => {
        const hour = new Date().getHours();
        const morning = ['Good morning', 'Rise and shine', 'Top of the morning', 'Morning'];
        const afternoon = ['Good afternoon', 'Hope you are having a great afternoon', 'Afternoon'];
        const evening = ['Good evening', 'Hope you had a productive day', 'Evening'];
        
        let options = morning;
        if (hour >= 12 && hour < 18) options = afternoon;
        else if (hour >= 18) options = evening;
        
        return options[Math.floor(Math.random() * options.length)];
    });

    const firstName = auth?.user?.name?.split(' ')[0] || 'User';
    
    const [weather, setWeather] = useState<string>('Fetching weather forecast...');

    useEffect(() => {
        if (!branchLocation) {
            setWeather('Weather unavailable');
            return;
        }
        
        const fetchWeather = async () => {
            try {
                // Extract city (typically the second to last comma-separated segment)
                let searchLocation = branchLocation;
                if (branchLocation.includes(',')) {
                    const parts = branchLocation.split(',').map(p => p.trim());
                    if (parts.length >= 2) {
                        searchLocation = parts[parts.length - 2];
                    }
                }

                const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchLocation)}&count=1`);
                const geoData = await geoRes.json();
                
                if (geoData.results && geoData.results.length > 0) {
                    const { latitude, longitude, name } = geoData.results[0];
                    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                    const weatherData = await weatherRes.json();
                    
                    if (weatherData.current_weather) {
                        const temp = weatherData.current_weather.temperature;
                        setWeather(`${temp}°C in ${name}`);
                    } else {
                        setWeather(`Weather unavailable for ${name}`);
                    }
                } else {
                    setWeather(`Weather unavailable for ${searchLocation}`);
                }
            } catch (error) {
                console.error('Weather fetch error:', error);
                setWeather('Weather unavailable');
            }
        };
        
        // Fetch immediately on mount or branch change
        fetchWeather();
        
        // Update every 30 minutes (1800000 ms)
        const intervalId = setInterval(fetchWeather, 30 * 60 * 1000);
        
        return () => clearInterval(intervalId);
    }, [branchLocation]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Branch Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-4 md:p-6">

                <div className="mb-4">
                    <h1 className="text-3xl font-bold tracking-tight">{greeting}, {firstName}!</h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                        <CloudSun className="w-4 h-4" />
                        {weather}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
                            <DollarSign className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats.daily)}</div>
                            <p className="text-muted-foreground text-xs">Revenue today</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Weekly Revenue</CardTitle>
                            <Users className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats.weekly)}</div>
                            <p className="text-muted-foreground text-xs">Revenue this week</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                            <CreditCard className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats.monthly)}</div>
                            <p className="text-muted-foreground text-xs">Revenue this month</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">YTD Revenue</CardTitle>
                            <Activity className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats.ytd)}</div>
                            <p className="text-muted-foreground text-xs">Total revenue this year</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Graphs Layout */}
                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Left: Annual Trend (Broad) */}
                    <Card className="lg:col-span-2 flex flex-col">
                        <CardHeader>
                            <CardTitle>Daily Sales Trend</CardTitle>
                            <p className="text-sm text-muted-foreground">Revenue generated per day in the selected period</p>
                        </CardHeader>
                        <CardContent className="pl-2 flex-1 min-h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                                    <CartesianGrid 
                                        strokeDasharray="4 4" 
                                        vertical={false} 
                                        stroke="#d1d5db"
                                    />
                                    <XAxis
                                        dataKey="name"
                                        className="text-muted-foreground text-[11px]"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={15}
                                    />
                                    <YAxis
                                        className="text-muted-foreground text-[11px]"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={10}
                                        width={60}
                                        tickFormatter={(value) => value.toLocaleString()}
                                    />
                                    <Tooltip
                                        contentStyle={{ 
                                            backgroundColor: 'hsl(var(--card))', 
                                            borderRadius: '8px', 
                                            border: '1px solid hsl(var(--border))',
                                            fontSize: '12px'
                                        }}
                                        formatter={(value: number) => [<span style={{ color: '#3b82f6' }}>{formatCurrency(value)}</span>, 'Revenue']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="sales"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Right Column: Distribution Charts */}
                    <div className="flex flex-col gap-4">
                        <DistributionCard 
                            title="Sales by Category" 
                            subtitle="Year to Date Revenue per Category" 
                            data={pieData} 
                        />

                        <DistributionCard 
                            title="Sales by Product" 
                            subtitle="Year to Date Total Quantity Sold per Product" 
                            data={productData} 
                            totalLabel="Qty Sold"
                            valueType="number"
                        />
                    </div>
                </div>

                {/* Personnel Leaderboard */}
                <Card>
                    <CardHeader>
                        <CardTitle>Personnel Leaderboard (By Revenue)</CardTitle>
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
                                    <TableHead className="text-right">Outgoing (Qty)</TableHead>
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
                                        <TableCell className="text-right">{formatCurrency(person.daily)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(person.weekly)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(person.monthlyContribution)}</TableCell>
                                        <TableCell className="text-right">{person.outgoing}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(person.sales)}</TableCell>
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
