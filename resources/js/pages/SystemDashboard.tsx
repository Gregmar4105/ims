import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Activity, Clock, HardDrive, Cpu, MemoryStick, Power, RefreshCw, Server, AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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

export default function SystemDashboard() {
    const [stats, setStats] = useState<{ server1: ServerStats; server2: ServerStats } | null>(null);
    const [loading, setLoading] = useState(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [shutdownDialogOpen, setShutdownDialogOpen] = useState(false);
    const [shutdownLoading, setShutdownLoading] = useState(false);

    const { data, setData, post, processing, reset, errors } = useForm({
        scheduled_at: '',
        is_recurring: false,
    });

    const fetchStats = async () => {
        setLoading(true);
        try {
            const url = '/system-dashboard/api/stats';
            console.log('Fetching stats from:', url);
            const res = await fetch(url);
            console.log('Response status:', res.status);

            if (!res.ok) {
                const text = await res.text();
                console.error('Fetch error body:', text);
                throw new Error(`HTTP ${res.status}: ${text}`);
            }

            const data = await res.json();
            console.log('Stats data:', data);
            setStats(data);
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

    useEffect(() => {
        fetchStats();
        fetchSchedules();
        const interval = setInterval(fetchStats, 10000); // 10 seconds polling
        const scheduleInterval = setInterval(fetchSchedules, 30000);
        return () => {
            clearInterval(interval);
            clearInterval(scheduleInterval);
        };
    }, []);

    const handleShutdown = async () => {
        setShutdownLoading(true);
        try {
            const res = await fetch('/system-dashboard/api/shutdown', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                }
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || 'Shutdown command sent to all servers');
                setShutdownDialogOpen(false);
            } else {
                console.error('Shutdown failed:', res.status, data);
                toast.error(data.message || 'Failed to send shutdown command');
            }
        } catch (error) {
            console.error('Shutdown error:', error);
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
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
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
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
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
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{name} ({data.node || 'Unknown'})</CardTitle>
                    {data.status === 'online' ?
                        <Badge className="bg-green-500 hover:bg-green-600">Online</Badge> :
                        <Badge variant="destructive">Offline</Badge>
                    }
                </CardHeader>
                <CardContent>
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
                        <h4 className="text-sm font-medium flex items-center gap-2"><HardDrive className="h-4 w-4" /> Storage Pools</h4>
                        {(!data.storage || data.storage.length === 0) ? (
                            <p className="text-xs text-muted-foreground">No additional storage pools found.</p>
                        ) : (
                            <div className="space-y-4">
                                {data.storage.map((pool, idx) => {
                                    const percent = Math.round(pool.used_fraction * 100);
                                    // Make sure percent is valid
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
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Proxmox Cluster Status</h2>
                        <p className="text-muted-foreground">Monitor and control your server infrastructure.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={fetchStats} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Dialog open={shutdownDialogOpen} onOpenChange={setShutdownDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="destructive">
                                    <Power className="mr-2 h-4 w-4" /> Shutdown All
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Confirm System Shutdown</DialogTitle>
                                    <DialogDescription>
                                        Are you sure you want to shutdown ALL Proxmox servers immediately? This action will stop all running VMs and containers.
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

                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    <ServerCard name="Proxmox Server 1" data={stats?.server1} />
                    <ServerCard name="Proxmox Server 2" data={stats?.server2} />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Schedule Shutdown</CardTitle>
                            <CardDescription>Schedule a one-time or daily shutdown for both servers.</CardDescription>
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
                                    <Button type="submit">Schedule</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Pending Schedules</CardTitle>
                            <CardDescription>Upcoming scheduled tasks.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {schedules.length === 0 ? (
                                <div className="flex h-[100px] items-center justify-center text-muted-foreground">
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
                                                <TableCell className="font-medium capitalize">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{schedule.command} (All)</span>
                                                        {schedule.is_recurring && <Badge variant="secondary" className="w-fit text-[10px] h-5 px-1.5">Daily</Badge>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{new Date(schedule.scheduled_at).toLocaleString()}</TableCell>
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
            </div>
        </AppLayout>
    );
}
