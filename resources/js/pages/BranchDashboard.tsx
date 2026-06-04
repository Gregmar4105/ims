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
    PhilippinePeso,
    Users,
    ShoppingBag,
    ArrowRightLeft,
    Layers,
    Router,
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
import { Search, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

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
        dailyTrend?: { name: string; sales: number }[];
        weeklyTrend?: { name: string; sales: number }[];
        monthlyTrend?: { name: string; sales: number }[];
        ytdTrend?: { name: string; sales: number }[];
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
        date_preset?: string;
        date_from?: string;
        date_to?: string;
        start_date?: string;
        end_date?: string;
        selectedDateSales?: number;
    };
    pendingCounts?: {
        sales: number;
        transfers: number;
        reorders: number;
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

interface SparklineProps {
    data: { name: string; sales: number }[];
    color: string;
    gradientId: string;
}

const MiniSparkline = ({ data, color, gradientId }: SparklineProps) => {
    if (!data || data.length === 0) return null;
    
    return (
        <div className="h-[25px] md:h-[45px] w-full mt-1 md:mt-3 overflow-hidden rounded-b-lg select-none">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                    data={data} 
                    margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-background/95 border border-border px-2 py-1 rounded shadow-sm text-[10px] font-medium z-50">
                                        <span className="text-muted-foreground mr-1">
                                            {payload[0].payload.name}:
                                        </span>
                                        <span className="font-semibold" style={{ color }}>
                                            {formatCurrency(payload[0].value as number)}
                                        </span>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="sales" 
                        stroke={color} 
                        strokeWidth={1.5} 
                        fillOpacity={1} 
                        fill={`url(#${gradientId})`} 
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 0, fill: color }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

const DistributionCard = ({ title, subtitle, data, totalLabel = "Sales", valueType = 'currency', headerExtra }: { title: string; subtitle: string; data: { name: string; value: number }[]; totalLabel?: string; valueType?: 'currency' | 'number'; headerExtra?: React.ReactNode }) => {
    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-0 flex flex-row items-start justify-between space-y-0">
                <div className="flex-1">
                    <CardTitle className="leading-tight">{title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                </div>
                {headerExtra}
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

export default function BranchDashboard({ branchLocation, stats, chartData, pieData, productData, leaderboard, filters, pendingCounts }: DashboardProps) {
    const { auth } = usePage().props as any;
    const isSystemAdmin = auth.roles.includes('System Administrator');
    const isBranchAdmin = auth.roles.includes('Branch Administrator') && !isSystemAdmin;

    // --- Date Preset and Custom Date States ---
    const [datePreset, setDatePreset] = useState(filters.date_preset || 'today');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const performSearch = () => {
        router.get('/branch-dashboard', {
            date_preset: datePreset,
            date_from: dateFrom,
            date_to: dateTo
        }, { preserveState: true, replace: true, preserveScroll: true });
    };

    useEffect(() => {
        if (
            datePreset !== (filters.date_preset || 'today') ||
            dateFrom !== (filters.date_from || '') ||
            dateTo !== (filters.date_to || '')
        ) {
            performSearch();
        }
    }, [datePreset, dateFrom, dateTo]);

    const handlePresetChange = (preset: string) => {
        setDatePreset(preset);
        setDateFrom('');
        setDateTo('');
    };

    const handleDateFromChange = (val: string) => {
        setDateFrom(val);
        setDatePreset('custom');
    };

    const handleDateToChange = (val: string) => {
        setDateTo(val);
        setDatePreset('custom');
    };

    const getPeriodSubLabel = (baseText: string) => {
        switch (datePreset) {
            case 'today': return `Today's ${baseText}`;
            case 'weekly': return `This week's ${baseText}`;
            case 'monthly': return `This month's ${baseText}`;
            case 'ytd': return `YTD ${baseText}`;
            case 'all': return `All-time ${baseText}`;
            case 'custom': return `Selected period's ${baseText}`;
            default: return `${baseText}`;
        }
    };

    // --- Pending Counts State & Real-time Polling ---
    const [counts, setCounts] = useState({
        sales: pendingCounts?.sales ?? 0,
        transfers: pendingCounts?.transfers ?? 0,
        reorders: pendingCounts?.reorders ?? 0,
    });

    useEffect(() => {
        setCounts({
            sales: pendingCounts?.sales ?? 0,
            transfers: pendingCounts?.transfers ?? 0,
            reorders: pendingCounts?.reorders ?? 0,
        });
    }, [pendingCounts]);

    useEffect(() => {
        const fetchPendingCounts = async () => {
            try {
                const response = await fetch('/branch-dashboard/api/pending-counts');
                if (response.ok) {
                    const data = await response.json();
                    setCounts({
                        sales: data.sales ?? 0,
                        transfers: data.transfers ?? 0,
                        reorders: data.reorders ?? 0,
                    });
                }
            } catch (error) {
                console.error('Error fetching pending counts:', error);
            }
        };

        const interval = setInterval(fetchPendingCounts, 10000); // Poll every 10 seconds
        return () => clearInterval(interval);
    }, []);
    
    // --- Dynamic Stock Distribution State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [stockDistribution, setStockDistribution] = useState<any[]>(productData);
    const stockTitle = selectedProduct ? `Stock: ${selectedProduct.name}` : "Sales by Product";
    const stockSubtitle = selectedProduct ? "Current inventory across all branches" : getPeriodSubLabel("Total Quantity Sold per Product");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        if (!selectedProduct) {
            setStockDistribution(productData);
        }
    }, [productData, selectedProduct]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length >= 2) {
                handleSearch(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSearch = async (query: string) => {
        setIsSearching(true);
        try {
            const response = await fetch(`/branch-dashboard/api/products/search?search=${encodeURIComponent(query)}`);
            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            console.error('Error searching products:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const fetchDistribution = async (product: any) => {
        try {
            const response = await fetch(`/branch-dashboard/api/products/${product.id}/distribution`);
            const data = await response.json();
            setStockDistribution(data.distribution);
            setSelectedProduct(product);
            setIsSearchOpen(false);
            setSearchQuery('');
        } catch (error) {
            console.error('Error fetching distribution:', error);
        }
    };

    const resetToSales = () => {
        setStockDistribution(productData);
        setSelectedProduct(null);
    };
    
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
            <div className="flex h-full flex-1 flex-col gap-4 md:gap-6 overflow-x-auto p-4 md:p-6">

                <div className="mb-0">
                    <h1 className="text-3xl font-bold tracking-tight">{greeting}, {firstName}!</h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                        <CloudSun className="w-4 h-4" />
                        {weather}
                    </p>
                </div>

                {/* Date Preset Toggles & Custom Date Range */}
                <div className="flex flex-row items-center flex-wrap gap-3 bg-white dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm w-fit">
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg overflow-x-auto">
                        {[
                            { value: 'today', label: 'Today' },
                            { value: 'weekly', label: 'Weekly' },
                            { value: 'monthly', label: 'Monthly' },
                            { value: 'ytd', label: 'YTD' },
                            { value: 'all', label: 'All Time' }
                        ].map((preset) => (
                            <button
                                key={preset.value}
                                type="button"
                                onClick={() => handlePresetChange(preset.value)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                                    datePreset === preset.value
                                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/50 dark:border-zinc-700'
                                        : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-850'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    
                    <div className="hidden sm:block h-6 w-px bg-zinc-200 dark:bg-zinc-850" />

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-muted/20 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">From:</span>
                            <input
                                type="date"
                                className="bg-transparent border-none text-xs outline-none w-[110px] dark:text-zinc-100"
                                value={dateFrom}
                                onChange={(e) => handleDateFromChange(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-muted/20 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">To:</span>
                            <input
                                type="date"
                                className="bg-transparent border-none text-xs outline-none w-[110px] dark:text-zinc-100"
                                value={dateTo}
                                onChange={(e) => handleDateToChange(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <Card className={`overflow-hidden flex flex-col justify-between ${isBranchAdmin ? 'h-full' : 'h-auto md:h-full pt-3 pb-0 px-0 md:pt-6 md:pb-0 md:px-0 gap-1 md:gap-4'} ${!isSystemAdmin ? 'col-span-2 lg:col-span-1' : ''}`}>
                        <div>
                            <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isBranchAdmin ? 'p-6 pb-2' : 'p-3 px-4 pb-1 md:p-6 md:pb-2'}`}>
                                <CardTitle className="text-sm font-medium">
                                    {datePreset === 'today' ? "Daily" : datePreset === 'weekly' ? "Weekly" : datePreset === 'monthly' ? "Monthly" : datePreset === 'ytd' ? "YTD" : datePreset === 'all' ? "All-Time" : "Period"} Revenue
                                </CardTitle>
                                <PhilippinePeso className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent className={isBranchAdmin ? 'pb-0' : 'p-4 pt-0 pb-0 md:p-6 md:pt-0 md:pb-0'}>
                                <div className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate" title={formatCurrency(stats.daily)}>
                                    {formatCurrency(stats.daily)}
                                </div>
                                <p className="text-muted-foreground text-[10px] sm:text-xs">
                                    {datePreset === 'today' ? "Revenue today" : datePreset === 'weekly' ? "Revenue this week" : datePreset === 'monthly' ? "Revenue this month" : datePreset === 'ytd' ? "Revenue this year" : datePreset === 'all' ? "Total revenue all-time" : "Revenue for selected period"}
                                </p>
                            </CardContent>
                        </div>
                        {stats.dailyTrend && (
                            <div className="block">
                                <MiniSparkline 
                                    data={stats.dailyTrend} 
                                    color="#10b981" 
                                    gradientId="sparklineDaily" 
                                />
                            </div>
                        )}
                    </Card>
                    {isSystemAdmin && (
                        <>
                            <Card className="overflow-hidden flex flex-col justify-between h-auto md:h-full pt-3 pb-0 px-0 md:pt-6 md:pb-0 md:px-0 gap-1 md:gap-4">
                                <div>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 px-4 pb-1 md:p-6 md:pb-2">
                                        <CardTitle className="text-sm font-medium">Weekly Revenue</CardTitle>
                                        <Users className="text-muted-foreground h-4 w-4" />
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 pb-0 md:p-6 md:pt-0 md:pb-0">
                                        <div className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate" title={formatCurrency(stats.weekly)}>
                                            {formatCurrency(stats.weekly)}
                                        </div>
                                        <p className="text-muted-foreground text-[10px] sm:text-xs">Revenue this week</p>
                                    </CardContent>
                                </div>
                                {stats.weeklyTrend && (
                                    <div className="block">
                                        <MiniSparkline 
                                            data={stats.weeklyTrend} 
                                            color="#3b82f6" 
                                            gradientId="sparklineWeekly" 
                                        />
                                    </div>
                                )}
                            </Card>
                            <Card className="overflow-hidden flex flex-col justify-between h-auto md:h-full pt-3 pb-0 px-0 md:pt-6 md:pb-0 md:px-0 gap-1 md:gap-4">
                                <div>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 px-4 pb-1 md:p-6 md:pb-2">
                                        <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                                        <CreditCard className="text-muted-foreground h-4 w-4" />
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 pb-0 md:p-6 md:pt-0 md:pb-0">
                                        <div className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate" title={formatCurrency(stats.monthly)}>
                                            {formatCurrency(stats.monthly)}
                                        </div>
                                        <p className="text-muted-foreground text-[10px] sm:text-xs">Revenue this month</p>
                                    </CardContent>
                                </div>
                                {stats.monthlyTrend && (
                                    <div className="block">
                                        <MiniSparkline 
                                            data={stats.monthlyTrend} 
                                            color="#8b5cf6" 
                                            gradientId="sparklineMonthly" 
                                        />
                                    </div>
                                )}
                            </Card>
                            <Card className="overflow-hidden flex flex-col justify-between h-auto md:h-full pt-3 pb-0 px-0 md:pt-6 md:pb-0 md:px-0 gap-1 md:gap-4">
                                <div>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 px-4 pb-1 md:p-6 md:pb-2">
                                        <CardTitle className="text-sm font-medium">YTD Revenue</CardTitle>
                                        <Activity className="text-muted-foreground h-4 w-4" />
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 pb-0 md:p-6 md:pt-0 md:pb-0">
                                        <div className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate" title={formatCurrency(stats.ytd)}>
                                            {formatCurrency(stats.ytd)}
                                        </div>
                                        <p className="text-muted-foreground text-[10px] sm:text-xs">Total revenue this year</p>
                                    </CardContent>
                                </div>
                                {stats.ytdTrend && (
                                    <div className="block">
                                        <MiniSparkline 
                                            data={stats.ytdTrend} 
                                            color="#ec4899" 
                                            gradientId="sparklineYtd" 
                                        />
                                    </div>
                                )}
                            </Card>
                        </>
                    )}
                </div>

                {/* Mobile Quick Action Buttons - Single Row */}
                <div className="grid grid-cols-4 gap-2 md:hidden mt-1 mb-2">
                    <button
                        id="btn-quick-sales"
                        onClick={() => router.visit('/sales-list')}
                        className="flex flex-col items-center justify-center py-2.5 px-1 bg-background dark:bg-zinc-900 border border-border/80 rounded-xl shadow-sm hover:bg-accent/50 dark:hover:bg-zinc-800 transition-all active:scale-95 text-center group cursor-pointer animate-in fade-in slide-in-from-bottom-2"
                    >
                        <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg mb-1 group-hover:scale-110 transition-transform duration-200 shadow-[0_0_10px_rgba(59,130,246,0.05)] relative">
                            <ShoppingBag className="w-4 h-4" />
                            {counts.sales > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background animate-in zoom-in-50 duration-200">
                                    {counts.sales}
                                </span>
                            )}
                        </div>
                        <span className="font-semibold text-[11px] text-foreground tracking-tight">Sales</span>
                    </button>
                    
                    <button
                        id="btn-quick-transfers"
                        onClick={() => router.visit('/transfer-list')}
                        className="flex flex-col items-center justify-center py-2.5 px-1 bg-background dark:bg-zinc-900 border border-border/80 rounded-xl shadow-sm hover:bg-accent/50 dark:hover:bg-zinc-800 transition-all active:scale-95 text-center group cursor-pointer animate-in fade-in slide-in-from-bottom-2 [animation-delay:40ms]"
                    >
                        <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg mb-1 group-hover:scale-110 transition-transform duration-200 shadow-[0_0_10px_rgba(245,158,11,0.05)] relative">
                            <ArrowRightLeft className="w-4 h-4" />
                            {counts.transfers > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background animate-in zoom-in-50 duration-200">
                                    {counts.transfers}
                                </span>
                            )}
                        </div>
                        <span className="font-semibold text-[11px] text-foreground tracking-tight">Transfers</span>
                    </button>
                    
                    <button
                        id="btn-quick-reorders"
                        onClick={() => router.visit('/reorders')}
                        className="flex flex-col items-center justify-center py-2.5 px-1 bg-background dark:bg-zinc-900 border border-border/80 rounded-xl shadow-sm hover:bg-accent/50 dark:hover:bg-zinc-800 transition-all active:scale-95 text-center group-pointer active:scale-95 transition-all text-center group cursor-pointer animate-in fade-in slide-in-from-bottom-2 [animation-delay:80ms]"
                    >
                        <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg mb-1 group-hover:scale-110 transition-transform duration-200 shadow-[0_0_10px_rgba(139,92,246,0.05)] relative">
                            <Layers className="w-4 h-4" />
                            {counts.reorders > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background animate-in zoom-in-50 duration-200">
                                    {counts.reorders}
                                </span>
                            )}
                        </div>
                        <span className="font-semibold text-[11px] text-foreground tracking-tight">Reorders</span>
                    </button>
                    
                    <button
                        id="btn-quick-ai-import"
                        onClick={() => router.visit('/import-transfer')}
                        className="flex flex-col items-center justify-center py-2.5 px-1 bg-background dark:bg-zinc-900 border border-border/80 rounded-xl shadow-sm hover:bg-accent/50 dark:hover:bg-zinc-800 transition-all active:scale-95 text-center group cursor-pointer animate-in fade-in slide-in-from-bottom-2 [animation-delay:120ms]"
                    >
                        <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg mb-1 group-hover:scale-110 transition-transform duration-200 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                            <Router className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-[11px] text-foreground tracking-tight whitespace-nowrap">AI Import</span>
                    </button>
                </div>

                {/* Graphs Layout */}
                <div className="grid gap-4 lg:grid-cols-3">                    {/* Left: Annual Trend (Broad) */}
                    <Card className="lg:col-span-2 flex flex-col">
                        <CardHeader>
                            <CardTitle>
                                {datePreset === 'today' ? "Daily Sales Trend" : datePreset === 'weekly' ? "Weekly Sales Trend" : datePreset === 'monthly' ? "Monthly Sales Trend" : datePreset === 'ytd' ? "YTD Sales Trend" : datePreset === 'all' ? "All-Time Sales Trend" : "Period Sales Trend"}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {datePreset === 'today' ? "Revenue generated per day (past 7 days)" : "Revenue generated per interval in the selected period"}
                            </p>
                        </CardHeader>
                        <CardContent className="pl-2 flex-1 min-h-[220px] sm:min-h-[300px] md:min-h-[400px]">
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
                            subtitle={getPeriodSubLabel("Revenue per Category")} 
                            data={pieData} 
                        />

                        <DistributionCard 
                            title={stockTitle} 
                            subtitle={stockSubtitle} 
                            data={stockDistribution} 
                            totalLabel={selectedProduct ? "Total Stock" : "Qty Sold"}
                            valueType="number"
                            headerExtra={
                                isSystemAdmin && (
                                    <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                                                <Search className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-0" align="end">
                                            <div className="p-3 border-b">
                                                <div className="relative">
                                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input 
                                                        placeholder="Search any product..." 
                                                        className="pl-8 h-9"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto p-1">
                                                {isSearching ? (
                                                    <div className="flex items-center justify-center py-4">
                                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : searchResults.length > 0 ? (
                                                    searchResults.map((product) => (
                                                        <button
                                                            key={product.id}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors flex flex-col"
                                                            onClick={() => fetchDistribution(product)}
                                                        >
                                                            <span className="font-medium">{product.name}</span>
                                                            <span className="text-xs text-muted-foreground">{product.code}</span>
                                                        </button>
                                                    ))
                                                ) : searchQuery.length >= 2 ? (
                                                    <div className="py-4 text-center text-sm text-muted-foreground">
                                                        No products found
                                                    </div>
                                                ) : (
                                                    <div className="py-4 text-center text-sm text-muted-foreground">
                                                        Type to search...
                                                    </div>
                                                )}
                                            </div>
                                            {selectedProduct && (
                                                <div className="p-2 border-top bg-muted/30">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                                                        onClick={resetToSales}
                                                    >
                                                        Reset to Sales View
                                                    </Button>
                                                </div>
                                            )}
                                        </PopoverContent>
                                    </Popover>
                                )
                            }
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
