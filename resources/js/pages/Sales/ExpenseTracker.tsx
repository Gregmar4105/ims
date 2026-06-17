import AppLayout from '@/layouts/app-layout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Calendar, DollarSign, Search, ListFilter, ClipboardList, Wallet, User, Clock, Loader2, XCircle, Check } from 'lucide-react';
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
    const { auth } = usePage<SharedData>().props;
    const isSystemAdmin = auth.roles.includes('System Administrator');
    const branchName = auth.user?.branch?.branch_name || 'Active Branch';

    const [search, setSearch] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    const executeDeleteAll = () => {
        setIsDeletingAll(true);
        router.post("/expense-tracker/delete-all", {}, {
            onSuccess: () => {
                setIsDeleteAllModalOpen(false);
                setIsDeletingAll(false);
                toast.success('Successfully deleted all expenses for this branch.');
            },
            onError: () => {
                setIsDeletingAll(false);
                toast.error("Failed to delete expenses.");
            }
        });
    };

    // Helper to group expenses by date
    const groupExpensesByDate = (expensesList: Expense[]) => {
        const groups: { [key: string]: { expenses: Expense[]; total: number } } = {};
        
        expensesList.forEach((expense) => {
            const dateObj = new Date(expense.created_at);
            const dateKey = dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            
            if (!groups[dateKey]) {
                groups[dateKey] = { expenses: [], total: 0 };
            }
            groups[dateKey].expenses.push(expense);
            groups[dateKey].total += Number(expense.amount);
        });
        
        return groups;
    };

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
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200">
                                Sales Department
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">Track daily expenses and monitor historical spending lists.</p>
                    </div>
                    {isSystemAdmin && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="hidden md:flex bg-red-600 hover:bg-red-700 text-white shrink-0"
                            onClick={() => setIsDeleteAllModalOpen(true)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete All Expenses
                        </Button>
                    )}
                </div>

                {/* Two-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column - Historical Logs (2/3 width) */}
                    <div className="lg:col-span-2 space-y-6 flex flex-col">
                        {/* Search and Filters Card */}
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <CardTitle className="text-lg">Expense Logs History</CardTitle>
                                    </div>
                                    <Badge variant="secondary">{expenses.total} total logs</Badge>
                                </div>
                                <CardDescription className="mt-1">
                                    Browse, search, and filter all historical entries for this branch.
                                </CardDescription>
                            </CardHeader>

                            {/* Search and Filters Section */}
                            <div className="p-4 bg-muted/20 flex flex-col md:flex-row gap-4 items-end">
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
                        </Card>

                        {/* Grouped Containers List */}
                        {expenses.data.length === 0 ? (
                            <Card className="border shadow-sm py-20">
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                    <Wallet className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-medium text-sm">No expenses found</p>
                                    <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or log a new expense.</p>
                                </div>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(groupExpensesByDate(expenses.data)).map(([date, group]) => (
                                    <Card key={date} className="border shadow-sm overflow-hidden">
                                        <CardHeader className="bg-blue-50/10 dark:bg-blue-950/5 py-2.5 px-4 flex flex-row items-center justify-between border-b">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{date}</span>
                                            </div>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 font-bold text-xs">
                                                Daily Total: ₱{group.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader className="bg-muted/10">
                                                    <TableRow>
                                                        <TableHead className="pl-6">Expense Name / Description</TableHead>
                                                        <TableHead>Logged By</TableHead>
                                                        <TableHead>Time</TableHead>
                                                        <TableHead className="text-right pr-6">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {group.expenses.map((expense) => (
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
                                                                    {formatTimeOnly(expense.created_at)}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right pr-6 font-bold text-gray-900 dark:text-gray-100">
                                                                ₱{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Pagination footer */}
                        {expenses.data.length > 0 && expenses.last_page > 1 && (
                            <div className="flex justify-center py-4 px-6 bg-muted/10 rounded-lg border">
                                <Pagination links={expenses.links} />
                            </div>
                        )}
                    </div>

                    {/* Right Column - Log Expense & Today's Daily Activity (1/3 width) */}
                    <div className="space-y-6">

                        {/* Log Expense Form Container */}
                        <Card className="border shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
                                <CardFooter className="pt-2 flex justify-end">
                                    <Button type="submit" disabled={processing} className="w-full mt-2 sm:w-auto bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700">
                                        {processing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                Log Expense
                                                <Check className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>

                        {/* Today's Daily Expenses Container */}
                        <Card className="border shadow-sm border-l-4 border-l-blue-500 flex flex-col min-h-[300px]">
                            <CardHeader className="pb-3 border-b">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <CardTitle className="text-md">Today's Daily Expenses</CardTitle>
                                    </div>
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-none">
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
                                                    <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
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

                            <CardFooter className="bg-blue-50/20 dark:bg-blue-950/10 border-t p-4 flex justify-between items-center mt-auto shrink-0">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Total</span>
                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    ₱{todayExpensesSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </CardFooter>
                        </Card>

                    </div>

                </div>

            </div>
            {/* Confirmation Dialog */}
            <Dialog open={isDeleteAllModalOpen} onOpenChange={setIsDeleteAllModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 font-bold">
                            <Trash2 className="h-5 w-5" /> Confirm Deletion of All Expenses
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 flex flex-col items-center text-center">
                        <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                            <Trash2 className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Are you absolutely sure?</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            You are about to delete <strong>ALL</strong> expenses for the branch <strong>{branchName}</strong>.
                        </p>
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                IMPORTANT: This action cannot be undone. All expense records for this branch will be permanently deleted from the database.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 sm:justify-center">
                        <Button variant="outline" onClick={() => setIsDeleteAllModalOpen(false)} className="flex-1" disabled={isDeletingAll}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={executeDeleteAll} className="flex-1" disabled={isDeletingAll}>
                            {isDeletingAll ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete All'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </AppLayout>
    );
}
