import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import {
    Activity,
    Clock,
    HardDrive,
    Cpu,
    MemoryStick,
    Power,
    RefreshCw,
    Server,
    AlertTriangle,
    X,
    Database,
    ShieldAlert,
    Globe,
    Monitor,
    Users,
    ShoppingBag,
    ArrowRightLeft,
    Tag,
    Layers,
    BadgePercent,
    Info
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Label
} from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'System Dashboard',
        href: 'system-dashboard',
    },
];

interface ServerStats {
    status: 'online' | 'offline';
    node?: string;
    cpu: number;
    ram_used: number;
    ram_total: number;
    ram_percent: number;
    disk_used: number;
    disk_total: number;
    disk_percent: number;
    uptime: number;
    storage: {
        content: string;
        type: string;
        active: number;
        enabled: number;
        shared: number;
        storage: string;
        total: number;
        used: number;
        used_fraction: number;
    }[];
}

interface Schedule {
    id: number;
    command: string;
    target_servers: string;
    scheduled_at: string;
    status: string;
    is_recurring: boolean;
}

interface EntityStats {
    users: number;
    products: number;
    branches: number;
    brands: number;
    categories: number;
    sales: number;
    pending_sales: number;
    active_transfers: number;
    completed_transfers: number;
}

interface CloudflareStats {
    threat?: {
        mitigation_trends: any[];
        mitigation_summary: any[];
        industry_trends: any[];
        industry_summary: any[];
        dns_trends: any[];
    };
    traffic?: {
        device_trends: any[];
        device_summary: any[];
        bot_trends: any[];
        bot_summary: any[];
        http_summary: any[];
    };
}

// Tailored HSL Colors for clean visualization
const COLORS = [
    'hsl(217, 91%, 60%)',  // Royal Blue
    'hsl(142, 71%, 45%)',  // Emerald Green
    'hsl(271, 91%, 65%)',  // Violet
    'hsl(32, 95%, 55%)',   // Amber
    'hsl(350, 89%, 60%)',  // Rose
    'hsl(187, 85%, 45%)',  // Teal
    'hsl(48, 96%, 53%)',   // Yellow
];

const getChartColor = (index: number) => {
    return COLORS[index % COLORS.length];
};

export default function SystemDashboard() {
    const [stats, setStats] = useState<{ server1: ServerStats; server2: ServerStats } | null>(null);
    const [loading, setLoading] = useState(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [shutdownDialogOpen, setShutdownDialogOpen] = useState(false);
    const [shutdownLoading, setShutdownLoading] = useState(false);

    // Dynamic Tracking & API States
    const [history, setHistory] = useState<any[]>([]);
    const [entityStats, setEntityStats] = useState<EntityStats | null>(null);
    const [cloudflareStats, setCloudflareStats] = useState<CloudflareStats | null>(null);
    const [fetchingEntities, setFetchingEntities] = useState(false);
    const [fetchingCloudflare, setFetchingCloudflare] = useState(false);
    const [activeTab, setActiveTab] = useState('infrastructure');

    const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return '';
    };

    const { data, setData, post, processing, reset, errors } = useForm({
        scheduled_at: '',
        is_recurring: false,
    });

    const fetchStats = async () => {
        setLoading(true);
        try {
            const url = '/system-dashboard/api/stats';
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const data = await res.json();
            setStats(data);

            // Record history point for real-time tracking
            setHistory(prev => {
                const now = new Date();
                const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                const newPoint = {
                    time: timeString,
                    'Server 1 CPU': data.server1?.status === 'online' ? data.server1.cpu : 0,
                    'Server 1 RAM': data.server1?.status === 'online' ? data.server1.ram_percent : 0,
                    'Server 2 CPU': data.server2?.status === 'online' ? data.server2.cpu : 0,
                    'Server 2 RAM': data.server2?.status === 'online' ? data.server2.ram_percent : 0,
                };

                const updated = [...prev, newPoint];
                // Keep last 15 points
                if (updated.length > 15) {
                    updated.shift();
                }
                return updated;
            });
        } catch (error) {
            console.error('Failed to fetch stats', error);
            toast.error('Failed to update system stats');
        } finally {
            setLoading(false);
        }
    };

    const fetchSchedules = async () => {
        try {
            const res = await fetch('/system-dashboard/api/schedules');
            const data = await res.json();
            setSchedules(data);
        } catch (error) {
            console.error('Failed to fetch schedules', error);
        }
    };

    const fetchEntityStats = async () => {
        setFetchingEntities(true);
        try {
            const res = await fetch('/system-dashboard/api/entity-stats');
            if (res.ok) {
                const data = await res.json();
                setEntityStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch entity stats', error);
        } finally {
            setFetchingEntities(false);
        }
    };

    const fetchCloudflareStats = async () => {
        setFetchingCloudflare(true);
        try {
            const res = await fetch('/system-dashboard/api/cloudflare-stats');
            if (res.ok) {
                const data = await res.json();
                setCloudflareStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch Cloudflare stats', error);
        } finally {
            setFetchingCloudflare(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchSchedules();
        fetchEntityStats();
        fetchCloudflareStats();

        // Infrastructure polling
        const interval = setInterval(fetchStats, 10000); 
        const scheduleInterval = setInterval(fetchSchedules, 30000);
        
        return () => {
            clearInterval(interval);
            clearInterval(scheduleInterval);
        };
    }, []);

    // Fetch tab data on manual tab switch
    const handleTabChange = (val: string) => {
        setActiveTab(val);
        if (val === 'entity_analytics') {
            fetchEntityStats();
        } else if (val === 'cloudflare_traffic' || val === 'cloudflare_threats') {
            fetchCloudflareStats();
        }
    };

    const handleShutdown = async () => {
        setShutdownLoading(true);
        try {
            const res = await fetch('/system-dashboard/api/shutdown', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(getCookie('XSRF-TOKEN') || ''),
                }
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || 'Shutdown command sent to all servers');
                setShutdownDialogOpen(false);
            } else {
                toast.error(data.message || 'Failed to send shutdown command');
            }
        } catch (error) {
            toast.error('Error sending shutdown command');
        } finally {
            setShutdownLoading(false);
        }
    };

    const handleSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        fetch('/system-dashboard/api/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': decodeURIComponent(getCookie('XSRF-TOKEN') || ''),
            },
            body: JSON.stringify({
                scheduled_at: data.scheduled_at,
                is_recurring: data.is_recurring
            })
        }).then(async res => {
            if (res.ok) {
                toast.success('Shutdown scheduled');
                reset();
                fetchSchedules();
            } else {
                const err = await res.json();
                toast.error(err.message || 'Failed to schedule');
            }
        });
    };

    const cancelSchedule = async (id: number) => {
        try {
            await fetch(`/system-dashboard/api/schedules/${id}/cancel`, {
                method: 'POST',
                headers: {
                    'X-XSRF-TOKEN': decodeURIComponent(getCookie('XSRF-TOKEN') || ''),
                }
            });
            toast.success('Schedule cancelled');
            fetchSchedules();
        } catch (error) {
            toast.error('Failed to cancel schedule');
        }
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const ServerCard = ({ name, data }: { name: string, data?: ServerStats }) => {
        if (!data) return <Card><CardContent className="p-6">Loading...</CardContent></Card>;

        return (
            <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Server className="h-4 w-4 text-primary" />
                        {name} ({data.node || 'Unknown'})
                    </CardTitle>
                    {data.status === 'online' ?
                        <Badge className="bg-green-500 hover:bg-green-600">Online</Badge> :
                        <Badge variant="destructive">Offline</Badge>
                    }
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="flex flex-col space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU Usage</span>
                            <span className="text-2xl font-bold">{data.cpu}%</span>
                        </div>
                        <div className="flex flex-col space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><MemoryStick className="h-3 w-3" /> RAM Usage</span>
                            <span className="text-2xl font-bold">{data.ram_percent}%</span>
                            <span className="text-xs text-muted-foreground">{formatBytes(data.ram_used)} / {formatBytes(data.ram_total)}</span>
                        </div>
                        <div className="flex flex-col space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><HardDrive className="h-3 w-3" /> Root Disk</span>
                            <span className="text-2xl font-bold">{data.disk_percent}%</span>
                            <span className="text-xs text-muted-foreground">{formatBytes(data.disk_used)} / {formatBytes(data.disk_total)}</span>
                        </div>
                        <div className="flex flex-col space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Uptime</span>
                            <span className="text-2xl font-bold">{Math.floor(data.uptime / 3600)}h {Math.floor((data.uptime % 3600) / 60)}m</span>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        <h4 className="text-sm font-medium flex items-center gap-2 border-b pb-1"><HardDrive className="h-4 w-4 text-muted-foreground" /> Storage Pools</h4>
                        {(!data.storage || data.storage.length === 0) ? (
                            <p className="text-xs text-muted-foreground">No additional storage pools found.</p>
                        ) : (
                            <div className="space-y-4">
                                {data.storage.map((pool, idx) => {
                                    const percent = Math.round(pool.used_fraction * 100);
                                    const validPercent = isNaN(percent) ? 0 : percent;

                                    return (
                                        <div key={idx} className="space-y-1.5">
                                            <div className="flex justify-between text-xs">
                                                <span className="font-medium flex items-center gap-2">
                                                    {pool.storage}
                                                    <Badge variant="outline" className="text-[10px] h-4 py-0 px-1">{pool.type}</Badge>
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {formatBytes(pool.used)} / {formatBytes(pool.total)} ({validPercent}%)
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${validPercent > 90 ? 'bg-destructive' : (validPercent > 75 ? 'bg-yellow-500' : 'bg-primary')} transition-all duration-500 ease-in-out`}
                                                    style={{ width: `${validPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
                {/* Clean Plain-Page Header (Before Style Format) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-border/60">
                    <div className="space-y-1.5">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">System & Security Operations</h2>
                        <p className="text-sm text-muted-foreground">
                            Live virtualization status, database record insights, global traffic vectors, and network threat intelligence feed.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => {
                                fetchStats();
                                fetchSchedules();
                                if (activeTab === 'entity_analytics') fetchEntityStats();
                                if (activeTab === 'cloudflare_traffic' || activeTab === 'cloudflare_threats') fetchCloudflareStats();
                            }} 
                            disabled={loading || fetchingEntities || fetchingCloudflare}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading || fetchingEntities || fetchingCloudflare ? 'animate-spin' : ''}`} />
                        </Button>
                        <Dialog open={shutdownDialogOpen} onOpenChange={setShutdownDialogOpen}>
                            <DialogTrigger asChild>
                                <Button 
                                    variant="destructive"
                                    className="font-semibold text-xs flex items-center gap-2"
                                >
                                    <Power className="h-4 w-4" /> Shutdown All
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Confirm System Shutdown</DialogTitle>
                                    <DialogDescription>
                                        Are you sure you want to shutdown ALL Proxmox servers immediately? This action will stop all running virtual machines, Docker containers, and active system operations.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShutdownDialogOpen(false)}>Cancel</Button>
                                    <Button variant="destructive" onClick={handleShutdown} disabled={shutdownLoading}>
                                        {shutdownLoading ? 'Shutting down...' : 'Confirm Shutdown'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                    <div className="flex justify-center w-full">
                        <TabsList className="bg-muted/60 p-1.5 rounded-xl border border-border/30 shadow-sm gap-1 backdrop-blur-sm">
                            <TabsTrigger value="infrastructure" className="rounded-lg py-2 px-4 flex items-center gap-2 text-xs md:text-sm font-semibold transition-all text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm select-none">
                                <Server className="h-4 w-4" /> Infrastructure Nodes
                            </TabsTrigger>
                            <TabsTrigger value="entity_analytics" className="rounded-lg py-2 px-4 flex items-center gap-2 text-xs md:text-sm font-semibold transition-all text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm select-none">
                                <Database className="h-4 w-4" /> App & DB Analytics
                            </TabsTrigger>
                            <TabsTrigger value="cloudflare_traffic" className="rounded-lg py-2 px-4 flex items-center gap-2 text-xs md:text-sm font-semibold transition-all text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm select-none">
                                <Globe className="h-4 w-4" /> Cloudflare Web Traffic
                            </TabsTrigger>
                            <TabsTrigger value="cloudflare_threats" className="rounded-lg py-2 px-4 flex items-center gap-2 text-xs md:text-sm font-semibold transition-all text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm select-none">
                                <ShieldAlert className="h-4 w-4" /> Security Threats
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Tab 1: Proxmox Infrastructure */}
                    <TabsContent value="infrastructure" className="space-y-6 animate-in fade-in duration-200">
                        {/* Real-time Hardware tracking charts */}
                        {history.length > 0 && (
                            <Card className="shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Activity className="h-4.5 w-4.5 text-primary animate-pulse" />
                                        Live Cluster Resource Timelines (10s Intervals)
                                    </CardTitle>
                                    <CardDescription>Visualizing real-time CPU and RAM virtualization loads from both servers.</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[250px] md:h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorS1Cpu" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorS2Cpu" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                            <XAxis dataKey="time" className="text-[10px] text-muted-foreground" tickLine={false} />
                                            <YAxis className="text-[10px] text-muted-foreground" tickLine={false} unit="%" />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '11px' }} />
                                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                            <Area type="monotone" dataKey="Server 1 CPU" stroke="hsl(217, 91%, 60%)" fillOpacity={1} fill="url(#colorS1Cpu)" strokeWidth={2} />
                                            <Area type="monotone" dataKey="Server 2 CPU" stroke="hsl(142, 71%, 45%)" fillOpacity={1} fill="url(#colorS2Cpu)" strokeWidth={2} />
                                            <Line type="monotone" dataKey="Server 1 RAM" stroke="hsl(271, 91%, 65%)" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                                            <Line type="monotone" dataKey="Server 2 RAM" stroke="hsl(32, 95%, 55%)" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                            <ServerCard name="Proxmox Server 1" data={stats?.server1} />
                            <ServerCard name="Proxmox Server 2" data={stats?.server2} />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-muted-foreground" /> Schedule Shutdown</CardTitle>
                                    <CardDescription>Schedule a automated, graceful shutdown sequence for virtualization nodes.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSchedule} className="flex flex-col gap-4">
                                        <div className="grid w-full items-center gap-1.5">
                                            <label htmlFor="datetime" className="text-sm font-medium">Shutdown Time</label>
                                            <Input
                                                id="datetime"
                                                type="datetime-local"
                                                value={data.scheduled_at}
                                                onChange={e => setData('scheduled_at', e.target.value)}
                                                required
                                                min={new Date().toISOString().slice(0, 16)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="recurring"
                                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    checked={data.is_recurring}
                                                    onChange={e => setData('is_recurring', e.target.checked)}
                                                />
                                                <label htmlFor="recurring" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    Repeat Daily
                                                </label>
                                            </div>
                                            <Button type="submit" disabled={processing}>Schedule</Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-muted-foreground" /> Pending Schedules</CardTitle>
                                    <CardDescription>Configured upcoming scheduled hardware events.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {schedules.length === 0 ? (
                                        <div className="flex h-[100px] items-center justify-center text-muted-foreground text-sm">
                                            No pending schedules.
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Command</TableHead>
                                                    <TableHead>Scheduled For</TableHead>
                                                    <TableHead className="text-right">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {schedules.map((schedule) => (
                                                    <TableRow key={schedule.id}>
                                                        <TableCell className="font-medium capitalize text-sm">
                                                            <div className="flex flex-col gap-1">
                                                                <span>{schedule.command} (All Nodes)</span>
                                                                {schedule.is_recurring && <Badge variant="secondary" className="w-fit text-[9px] h-5 px-1.5">Daily</Badge>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs">{new Date(schedule.scheduled_at).toLocaleString()}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => cancelSchedule(schedule.id)}>
                                                                <X className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Tab 2: System & DB Analytics */}
                    <TabsContent value="entity_analytics" className="space-y-6 animate-in fade-in duration-200">
                        {fetchingEntities ? (
                            <div className="flex h-[300px] items-center justify-center">
                                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : entityStats ? (
                            <>
                                {/* Premium Global Database Indicator */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card/65 backdrop-blur-md shadow-sm select-none animate-in slide-in-from-top duration-300">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                            <Database className="h-4 w-4 animate-pulse" />
                                        </span>
                                        <div className="space-y-0.5">
                                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Database Scope</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-sans text-sm font-bold text-foreground">Global System Database</span>
                                                <Badge variant="outline" className="h-4 px-1.5 bg-blue-500/5 text-blue-500 border-blue-500/20 text-[9px] font-semibold flex items-center gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Cross-Branch
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground/80 self-end sm:self-auto flex items-center gap-1 font-medium bg-muted/30 px-2.5 py-1 rounded-full border border-border/40">
                                        <Info className="h-3 w-3" /> Showing system-wide aggregates for all users, inventory, active transfers, and completed sales.
                                    </div>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card className="p-4 shadow-sm hover:shadow transition-shadow flex flex-col justify-between h-28">
                                        <div className="flex items-center justify-between pb-1">
                                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Registered Users</span>
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-bold">{entityStats.users}</span>
                                            <span className="text-[10px] text-muted-foreground">All users in system</span>
                                        </div>
                                    </Card>
                                    <Card className="p-4 shadow-sm hover:shadow transition-shadow flex flex-col justify-between h-28">
                                        <div className="flex items-center justify-between pb-1">
                                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Inventory Products</span>
                                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-bold">{entityStats.products}</span>
                                            <span className="text-[10px] text-muted-foreground">All global inventory</span>
                                        </div>
                                    </Card>
                                    <Card className="p-4 shadow-sm hover:shadow transition-shadow flex flex-col justify-between h-28">
                                        <div className="flex items-center justify-between pb-1">
                                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Transfers</span>
                                            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-bold">{entityStats.active_transfers}</span>
                                            <span className="text-[10px] text-muted-foreground">All active transfers</span>
                                        </div>
                                    </Card>
                                    <Card className="p-4 shadow-sm hover:shadow transition-shadow flex flex-col justify-between h-28">
                                        <div className="flex items-center justify-between pb-1">
                                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Completed Sales</span>
                                            <BadgePercent className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-bold">{entityStats.sales}</span>
                                            <span className="text-[10px] text-muted-foreground">All completed sales</span>
                                        </div>
                                    </Card>
                                </div>

                                <div className="grid gap-6 md:grid-cols-3">
                                    {/* Entity volumes Bar chart */}
                                    <Card className="md:col-span-2 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-semibold">Entity Database Volume (Global DB Queried)</CardTitle>
                                            <CardDescription>Comparing overall volume of records across core system tables.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[250px] md:h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={[
                                                    { name: 'Users', count: entityStats.users },
                                                    { name: 'Products', count: entityStats.products },
                                                    { name: 'Sales', count: entityStats.sales },
                                                    { name: 'Branches', count: entityStats.branches },
                                                    { name: 'Brands', count: entityStats.brands },
                                                    { name: 'Categories', count: entityStats.categories },
                                                ]}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                    <XAxis dataKey="name" className="text-xs text-muted-foreground" tickLine={false} />
                                                    <YAxis className="text-xs text-muted-foreground" tickLine={false} />
                                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '11px' }} />
                                                    <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]}>
                                                        <Cell fill="hsl(217, 91%, 60%)" />
                                                        <Cell fill="hsl(142, 71%, 45%)" />
                                                        <Cell fill="hsl(271, 91%, 65%)" />
                                                        <Cell fill="hsl(32, 95%, 55%)" />
                                                        <Cell fill="hsl(350, 89%, 60%)" />
                                                        <Cell fill="hsl(187, 85%, 45%)" />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    {/* Transfers distribution pie */}
                                    <Card className="shadow-sm flex flex-col justify-between">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-semibold">Transfer Status Share (Global DB Queried)</CardTitle>
                                            <CardDescription>Proportional breakdown of system inventory transfer statuses.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[200px] flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                                                    <Pie
                                                        data={[
                                                            { name: 'Active / Pending', value: entityStats.active_transfers },
                                                            { name: 'Completed', value: entityStats.completed_transfers },
                                                        ]}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={45}
                                                        outerRadius={65}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                    >
                                                        <Cell fill="hsl(32, 95%, 55%)" />
                                                        <Cell fill="hsl(142, 71%, 45%)" />
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                        <CardFooter className="flex flex-col gap-2 pb-6">
                                            <div className="flex justify-between w-full text-xs border-b pb-1.5">
                                                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[hsl(32,95%,55%)]" /> Active Transfers</span>
                                                <span className="font-bold">{entityStats.active_transfers}</span>
                                            </div>
                                            <div className="flex justify-between w-full text-xs">
                                                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[hsl(142,71%,45%)]" /> Completed Transfers</span>
                                                <span className="font-bold">{entityStats.completed_transfers}</span>
                                            </div>
                                        </CardFooter>
                                    </Card>
                                </div>
                            </>
                        ) : (
                            <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
                                Database analytics unavailable.
                            </div>
                        )}
                    </TabsContent>

                    {/* Tab 3: Cloudflare Web Traffic */}
                    <TabsContent value="cloudflare_traffic" className="space-y-6 animate-in fade-in duration-200">
                        {fetchingCloudflare ? (
                            <div className="flex h-[300px] items-center justify-center">
                                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : cloudflareStats?.traffic ? (
                            <div className="space-y-6">
                                {/* Premium SSL Verified Domain Selector */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card/65 backdrop-blur-md shadow-sm select-none">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500 border border-green-500/20">
                                            <Globe className="h-4 w-4 animate-pulse" />
                                        </span>
                                        <div className="space-y-0.5">
                                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Target Application</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-bold text-foreground">https://lm2bicycletrading.larable.dev/*</span>
                                                <Badge variant="outline" className="h-4 px-1.5 bg-green-500/5 text-green-500 border-green-500/20 text-[9px] font-semibold flex items-center gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Verified SSL
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground/80 self-end sm:self-auto flex items-center gap-1 font-medium bg-muted/30 px-2.5 py-1 rounded-full border border-border/40">
                                        <Info className="h-3 w-3" /> Showing request traffic filtered for this application host.
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-3">
                                    {/* Device Trends Area chart */}
                                    <Card className="md:col-span-2 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <Monitor className="h-4.5 w-4.5 text-primary" />
                                                Traffic by Device Type: lm2bicycletrading.larable.dev (7 Days)
                                            </CardTitle>
                                            <CardDescription>Application request distribution timeline segmenting desktop, mobile, and other device formats.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[250px] md:h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={cloudflareStats.traffic.device_trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorDesktop" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.25}/>
                                                            <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                                                        </linearGradient>
                                                        <linearGradient id="colorMobile" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.25}/>
                                                            <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                    <XAxis dataKey="time" className="text-[10px]" tickLine={false} />
                                                    <YAxis className="text-[10px]" tickLine={false} unit="%" />
                                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                                    <Area type="monotone" dataKey="desktop" stroke="hsl(217, 91%, 60%)" fillOpacity={1} fill="url(#colorDesktop)" strokeWidth={2} name="Desktop" />
                                                    <Area type="monotone" dataKey="mobile" stroke="hsl(142, 71%, 45%)" fillOpacity={1} fill="url(#colorMobile)" strokeWidth={2} name="Mobile" />
                                                    <Area type="monotone" dataKey="other" stroke="hsl(271, 91%, 65%)" strokeWidth={1} fillOpacity={0} name="Other" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    {/* Device summary pie chart */}
                                    <Card className="shadow-sm flex flex-col justify-between">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-semibold">Device Type Ratios: lm2bicycletrading.larable.dev</CardTitle>
                                            <CardDescription>Aggregate device formats share.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[200px] flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                                                    <Pie
                                                        data={cloudflareStats.traffic.device_summary}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={45}
                                                        outerRadius={65}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                    >
                                                        {cloudflareStats.traffic.device_summary.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={getChartColor(index)} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                        <CardFooter className="flex flex-col gap-2 pb-6">
                                            {cloudflareStats.traffic.device_summary.map((entry, idx) => (
                                                <div key={idx} className="flex justify-between w-full text-xs border-b last:border-0 pb-1.5 last:pb-0">
                                                    <span className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getChartColor(idx) }} />
                                                        <span className="capitalize">{entry.name}</span>
                                                    </span>
                                                    <span className="font-bold">{entry.value.toFixed(2)}%</span>
                                                </div>
                                            ))}
                                        </CardFooter>
                                    </Card>

                                    {/* Bot Class Trends chart */}
                                    <Card className="md:col-span-2 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <Globe className="h-4.5 w-4.5 text-primary" />
                                                Human vs. Bot Traffic: lm2bicycletrading.larable.dev (7 Days)
                                            </CardTitle>
                                            <CardDescription>Monitoring real users vs. search crawlers, aggregators, and scraper bots over the week.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[250px] md:h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={cloudflareStats.traffic.bot_trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                    <XAxis dataKey="time" className="text-[10px]" tickLine={false} />
                                                    <YAxis className="text-[10px]" tickLine={false} unit="%" />
                                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                                    <Line type="monotone" dataKey="human" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} name="Human Users" />
                                                    <Line type="monotone" dataKey="bot" stroke="hsl(350, 89%, 60%)" strokeWidth={2} dot={false} name="Automated Bots" />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    {/* HTTP protocol versions donut */}
                                    <Card className="shadow-sm flex flex-col justify-between">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-semibold">HTTP Protocol Share: lm2bicycletrading.larable.dev</CardTitle>
                                            <CardDescription>Breakdown of client connection standards.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[200px] flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                                                    <Pie
                                                        data={cloudflareStats.traffic.http_summary}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={45}
                                                        outerRadius={65}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                    >
                                                        {cloudflareStats.traffic.http_summary.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={getChartColor(index + 3)} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                        <CardFooter className="flex flex-col gap-2 pb-6">
                                            {cloudflareStats.traffic.http_summary.map((entry, idx) => (
                                                <div key={idx} className="flex justify-between w-full text-xs border-b last:border-0 pb-1.5 last:pb-0">
                                                    <span className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getChartColor(idx + 3)} } />
                                                        <span>{entry.name}</span>
                                                    </span>
                                                    <span className="font-bold">{entry.value.toFixed(2)}%</span>
                                                </div>
                                            ))}
                                        </CardFooter>
                                    </Card>

                                    {/* Geolocation requests by country (Top 10) */}
                                    {cloudflareStats.traffic.top_locations && cloudflareStats.traffic.top_locations.length > 0 && (
                                        <>
                                            <Card className="md:col-span-2 shadow-sm">
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                        <Globe className="h-4.5 w-4.5 text-primary" />
                                                        Request Volume by Country: lm2bicycletrading.larable.dev (Top 10)
                                                    </CardTitle>
                                                    <CardDescription>Global request geolocations based on client IP geodistribution.</CardDescription>
                                                </CardHeader>
                                                <CardContent className="h-[300px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart 
                                                            data={cloudflareStats.traffic.top_locations} 
                                                            layout="vertical"
                                                            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                                            <XAxis type="number" unit="%" className="text-[10px]" tickLine={false} />
                                                            <YAxis type="category" dataKey="name" className="text-[10px]" tickLine={false} width={100} interval={0} />
                                                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '11px' }} formatter={(val: number) => [`${val.toFixed(2)}%`, 'Traffic Share']} />
                                                            <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]}>
                                                                {cloudflareStats.traffic.top_locations.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={getChartColor(index)} />
                                                                ))}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </CardContent>
                                            </Card>

                                            <Card className="shadow-sm flex flex-col justify-between">
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold">Location Leaderboard: lm2bicycletrading.larable.dev</CardTitle>
                                                    <CardDescription>Ranked traffic origins.</CardDescription>
                                                </CardHeader>
                                                <CardContent className="flex-1 overflow-y-auto max-h-[220px] pr-2">
                                                    <div className="space-y-4">
                                                        {cloudflareStats.traffic.top_locations.map((item, idx) => (
                                                            <div key={idx} className="space-y-1">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="font-semibold flex items-center gap-2">
                                                                        <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 font-mono">{item.code}</Badge>
                                                                        {item.name}
                                                                    </span>
                                                                    <span className="text-muted-foreground font-bold">{item.value.toFixed(2)}%</span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-primary transition-all duration-500 ease-in-out"
                                                                        style={{ width: `${item.value}%`, backgroundColor: getChartColor(idx) }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                                <CardFooter className="pt-2 pb-4 text-[10px] text-muted-foreground flex items-center gap-1 bg-muted/10 border-t justify-center">
                                                    <Info className="h-3 w-3" /> Data aggregated from Cloudflare Radar edge logs.
                                                </CardFooter>
                                            </Card>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <Card className="border border-dashed p-10 flex flex-col items-center justify-center text-center gap-3">
                                <Info className="h-8 w-8 text-muted-foreground" />
                                <h3 className="font-semibold text-base">Web Traffic Analytics Unconfigured</h3>
                                <p className="text-sm text-muted-foreground max-w-md">Could not fetch Web Traffic analytics. Configure your Cloudflare Account credentials in the `.env` settings to enable integration.</p>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Tab 4: Cloudflare Threat Insights */}
                    <TabsContent value="cloudflare_threats" className="space-y-6 animate-in fade-in duration-200">
                        {fetchingCloudflare ? (
                            <div className="flex h-[300px] items-center justify-center">
                                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : cloudflareStats?.threat ? (
                            <div className="space-y-6">
                                {/* Premium SSL Verified Domain Selector */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card/65 backdrop-blur-md shadow-sm select-none animate-in slide-in-from-top duration-300">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500 border border-green-500/20">
                                            <Globe className="h-4 w-4 animate-pulse" />
                                        </span>
                                        <div className="space-y-0.5">
                                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Target Application</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-bold text-foreground">https://lm2bicycletrading.larable.dev/*</span>
                                                <Badge variant="outline" className="h-4 px-1.5 bg-green-500/5 text-green-500 border-green-500/20 text-[9px] font-semibold flex items-center gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Verified SSL
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground/80 self-end sm:self-auto flex items-center gap-1 font-medium bg-muted/30 px-2.5 py-1 rounded-full border border-border/40">
                                        <Info className="h-3 w-3" /> Showing security threats filtered for this application host.
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-3">
                                    {/* Layer 7 Mitigation Trends Stacked Area chart */}
                                    <Card className="md:col-span-2 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <ShieldAlert className="h-4.5 w-4.5 text-destructive" />
                                                Mitigated L7 Attack Trends: lm2bicycletrading.larable.dev (7 Days)
                                            </CardTitle>
                                            <CardDescription>Hourly mitigated request volumes grouped by mitigating edge product (e.g. WAF vs. DDoS Protection).</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[250px] md:h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={cloudflareStats.threat.mitigation_trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorDdos" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="hsl(350, 89%, 60%)" stopOpacity={0.25}/>
                                                            <stop offset="95%" stopColor="hsl(350, 89%, 60%)" stopOpacity={0}/>
                                                        </linearGradient>
                                                        <linearGradient id="colorWaf" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.25}/>
                                                            <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                    <XAxis dataKey="time" className="text-[10px]" tickLine={false} />
                                                    <YAxis className="text-[10px]" tickLine={false} unit="%" />
                                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                                    <Area type="monotone" dataKey="DDOS" stroke="hsl(350, 89%, 60%)" fillOpacity={1} fill="url(#colorDdos)" strokeWidth={2} name="DDoS Protection" />
                                                    <Area type="monotone" dataKey="WAF" stroke="hsl(217, 91%, 60%)" fillOpacity={1} fill="url(#colorWaf)" strokeWidth={2} name="Web App Firewall" />
                                                    <Area type="monotone" dataKey="IP_REPUTATION" stroke="hsl(32, 95%, 55%)" fillOpacity={0} name="IP Reputation" strokeWidth={1.5} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    {/* Mitigation method breakdown summary */}
                                    <Card className="shadow-sm flex flex-col justify-between">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-semibold">Mitigation Mechanics: lm2bicycletrading.larable.dev</CardTitle>
                                            <CardDescription>Proportional distribution of defensive features.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[200px] flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                                                    <Pie
                                                        data={cloudflareStats.threat.mitigation_summary}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={45}
                                                        outerRadius={65}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                    >
                                                        {cloudflareStats.threat.mitigation_summary.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={getChartColor(index)} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                        <CardFooter className="flex flex-col gap-2 pb-6">
                                            {cloudflareStats.threat.mitigation_summary.map((entry, idx) => (
                                                <div key={idx} className="flex justify-between w-full text-xs border-b last:border-0 pb-1.5 last:pb-0">
                                                    <span className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getChartColor(idx) }} />
                                                        <span>{entry.name}</span>
                                                    </span>
                                                    <span className="font-bold">{entry.value.toFixed(2)}%</span>
                                                </div>
                                            ))}
                                        </CardFooter>
                                    </Card>

                                    {/* Top targeted industries bar chart */}
                                    <Card className="md:col-span-2 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-semibold">Targeted Industry Sectors: lm2bicycletrading.larable.dev</CardTitle>
                                            <CardDescription>Comparing layer-7 mitigation ratios across top targeted business sectors.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[250px] md:h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={cloudflareStats.threat.industry_summary.slice(0, 7)}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                    <XAxis dataKey="name" className="text-[10px]" tickLine={false} tickMargin={8} />
                                                    <YAxis className="text-[10px]" tickLine={false} unit="%" />
                                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                                                    <Bar dataKey="value" fill="hsl(271, 91%, 65%)" radius={[4, 4, 0, 0]}>
                                                        {cloudflareStats.threat.industry_summary.slice(0, 7).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={getChartColor(index)} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    {/* DNS Query Trends line chart */}
                                    <Card className="md:col-span-1 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-semibold">DNS Query Profiles: lm2bicycletrading.larable.dev</CardTitle>
                                            <CardDescription>Queries timeline by DNS record type.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={cloudflareStats.threat.dns_trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                                    <XAxis dataKey="time" className="text-[9px]" tickLine={false} />
                                                    <YAxis className="text-[9px]" tickLine={false} unit="%" />
                                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px' }} />
                                                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                                    <Line type="monotone" dataKey="A" stroke="hsl(217, 91%, 60%)" strokeWidth={1.5} dot={false} name="A" />
                                                    <Line type="monotone" dataKey="AAAA" stroke="hsl(142, 71%, 45%)" strokeWidth={1.5} dot={false} name="AAAA" />
                                                    <Line type="monotone" dataKey="HTTPS" stroke="hsl(271, 91%, 65%)" strokeWidth={1.5} dot={false} name="HTTPS" />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        ) : (
                            <Card className="border border-dashed p-10 flex flex-col items-center justify-center text-center gap-3">
                                <Info className="h-8 w-8 text-muted-foreground" />
                                <h3 className="font-semibold text-base">Threat Insights Unconfigured</h3>
                                <p className="text-sm text-muted-foreground max-w-md">Could not fetch Security Threats analytics. Configure your Cloudflare Account credentials in the `.env` settings to enable integration.</p>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}

// Add simple spinner for fallback loader inside UI file
function LoaderCircle({ className }: { className?: string }) {
    return (
        <RefreshCw className={`h-6 w-8 animate-spin ${className}`} />
    );
}

