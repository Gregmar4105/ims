import AppLayout from '@/layouts/app-layout';
import { Head, useForm, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Calendar, DollarSign, Search, ListFilter, ClipboardList, Wallet, User, Clock, Loader2, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Pagination from '@/components/Pagination';

interface Creator {
    id: number;
    name: string;
}

interface Expense {
    id: number;
    branch_id: number;
    name: string;
    amount: number;
    created_by: number;
    created_at: string;
    updated_at: string;
    creator?: Creator;
}

interface PaginatedData<T> {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Props {
    expenses: PaginatedData<Expense>;
    todayExpenses: Expense[];
    todayExpensesSum: number;
    filters: {
        search?: string;
        date_from?: string;
        date_to?: string;
    };
}

const breadcrumbs = [
    {
        title: 'Expense Tracker',
        href: '/expense-tracker',
    },
];

export default function ExpenseTracker({ expenses, todayExpenses, todayExpensesSum, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    // Form for logging a new expense
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        amount: '',
    });

    // Debounced search for historical expenses
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters.search || '')) {
                performSearch();
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Perform filter updates on date change
    useEffect(() => {
        if (dateFrom !== (filters.date_from || '') || dateTo !== (filters.date_to || '')) {
            performSearch();
        }
    }, [dateFrom, dateTo]);

    const performSearch = () => {
        router.get('/expense-tracker', {
            search,
            date_from: dateFrom,
            date_to: dateTo,
        }, { preserveState: true, replace: true, preserveScroll: true });
    };

    const handleClearFilters = () => {
        setSearch('');
        setDateFrom('');
        setDateTo('');
        router.get('/expense-tracker', {}, { preserveState: true, replace: true });
    };

    const handleSubmitExpense = (e: React.FormEvent) => {
        e.preventDefault();
        
        post('/expense-tracker', {
            onSuccess: () => {
                reset();
                toast.success('Expense logged successfully');
            },
            onError: () => {
                toast.error('Failed to log expense. Please check input values.');
            }
        });
    };

    const handleDeleteExpense = (id: number) => {
        if (confirm('Are you sure you want to delete this expense record?')) {
            router.delete(`/expense-tracker/${id}`, {
                onSuccess: () => {
                    toast.success('Expense deleted successfully');
                },
                onError: () => {
                    toast.error('Failed to delete expense.');
                }
            });
        }
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }).format(new Date(dateString));
    };

    const formatTimeOnly = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        }).format(new Date(dateString));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Expense Tracker" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Expense Tracker</h1>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                Sales Department
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">Track daily expenses and monitor historical spending lists.</p>
                    </div>
                </div>

                {/* Two-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left Column - Historical Logs (2/3 width) */}
                    <div className="lg:col-span-2 space-y-6 flex flex-col">
                        <Card className="flex-1 flex flex-col border shadow-sm">
                            <CardHeader className="pb-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5 text-primary" />
                                        <CardTitle className="text-lg">Expense Logs History</CardTitle>
                                    </div>
                                    <Badge variant="secondary">{expenses.total} total logs</Badge>
                                </div>
                                <CardDescription className="mt-1">
                                    Browse, search, and filter all historical entries for this branch.
                                </CardDescription>
                            </CardHeader>
                            
                            {/* Search and Filters Section */}
                            <div className="p-4 bg-muted/20 border-b flex flex-col md:flex-row gap-4 items-end">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        placeholder="Search by expense description..."
                                        className="pl-8"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md border text-sm w-full md:w-auto">
                                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">From:</span>
                                        <input
                                            type="date"
                                            className="bg-transparent border-none text-sm outline-none w-full md:w-[110px]"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md border text-sm w-full md:w-auto">
                                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">To:</span>
                                        <input
                                            type="date"
                                            className="bg-transparent border-none text-sm outline-none w-full md:w-[110px]"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                        />
                                    </div>
                                    {(search || dateFrom || dateTo) && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={handleClearFilters}
                                            title="Clear filters"
                                            className="shrink-0"
                                        >
                                            <XCircle className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <CardContent className="p-0 flex-1">
                                {expenses.data.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                        <Wallet className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="font-medium text-sm">No expenses found</p>
                                        <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or log a new expense.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/10">
                                                <TableRow>
                                                    <TableHead className="pl-6">Expense Name / Description</TableHead>
                                                    <TableHead>Logged By</TableHead>
                                                    <TableHead>Date & Time</TableHead>
                                                    <TableHead className="text-right pr-6">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {expenses.data.map((expense) => (
                                                    <TableRow key={expense.id} className="hover:bg-muted/5">
                                                        <TableCell className="font-medium pl-6">
                                                            {expense.name}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            <div className="flex items-center gap-1.5">
                                                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                                {expense.creator?.name || 'Unknown'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                                {formatDate(expense.created_at)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right pr-6 font-bold text-gray-900 dark:text-gray-100">
                                                            ₱{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>

                            {expenses.data.length > 0 && expenses.last_page > 1 && (
                                <CardFooter className="border-t bg-muted/10 py-4 px-6 flex justify-center">
                                    <Pagination links={expenses.links} />
                                </CardFooter>
                            )}
                        </Card>
                    </div>

                    {/* Right Column - Log Expense & Today's Daily Activity (1/3 width) */}
                    <div className="space-y-6">
                        
                        {/* Log Expense Form Container */}
                        <Card className="border shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-primary" />
                                    Log New Expense
                                </CardTitle>
                                <CardDescription>Enter details to record an expense.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleSubmitExpense}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Expense Name / Description</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. Office Supplies, Transportation"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                        />
                                        {errors.name && (
                                            <p className="text-xs text-destructive">{errors.name}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Amount (₱)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">₱</span>
                                            <Input
                                                id="amount"
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                placeholder="0.00"
                                                className="pl-7"
                                                value={data.amount}
                                                onChange={(e) => setData('amount', e.target.value)}
                                                required
                                            />
                                        </div>
                                        {errors.amount && (
                                            <p className="text-xs text-destructive">{errors.amount}</p>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-2 border-t bg-muted/5 flex justify-end">
                                    <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                                        {processing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Log Expense
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>

                        {/* Today's Daily Expenses Container */}
                        <Card className="border shadow-sm border-l-4 border-l-primary flex flex-col min-h-[300px]">
                            <CardHeader className="pb-3 border-b">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-primary" />
                                        <CardTitle className="text-md">Today's Daily Expenses</CardTitle>
                                    </div>
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                                        Today
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Expenses logged today. Automatically resets after 11:59 PM daily.
                                </CardDescription>
                            </CardHeader>
                            
                            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[350px]">
                                {todayExpenses.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-14 text-muted-foreground px-4 text-center">
                                        <Wallet className="w-10 h-10 mb-3 opacity-25" />
                                        <p className="text-sm font-medium">No expenses logged today</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Use the form above to add today's expenses.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {todayExpenses.map((expense) => (
                                            <div key={expense.id} className="p-3.5 flex items-center justify-between hover:bg-muted/10 transition-colors">
                                                <div className="space-y-1 pr-2 min-w-0 flex-1">
                                                    <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">{expense.name}</p>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {formatTimeOnly(expense.created_at)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-3.5 h-3.5" />
                                                            {expense.creator?.name || 'You'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="font-bold text-sm text-primary">
                                                        ₱{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                        onClick={() => handleDeleteExpense(expense.id)}
                                                        title="Delete entry"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                            
                            <CardFooter className="bg-muted/20 border-t p-4 flex justify-between items-center mt-auto shrink-0">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Total</span>
                                <span className="text-lg font-bold text-primary">
                                    ₱{todayExpensesSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </CardFooter>
                        </Card>
                        
                    </div>
                    
                </div>
                
            </div>
        </AppLayout>
    );
}
