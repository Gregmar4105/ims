import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Head, Link, usePage, router } from '@inertiajs/react';
import { Plus, Pencil, Trash, Search, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/Pagination';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import DeleteConfirmation from '@/components/DeleteConfirmation';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Branches',
        href: '/branches',
    },
];

export default function Index({ branches }: any) {
    const branchList = branches?.data || branches || [];
    const links = branches?.meta?.links || branches?.links || [];
    const { filters } = usePage().props;
    const [search, setSearch] = useState<string>(filters?.search || "");

    // Delete State
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredBranches = useMemo(() => {
        if (!branchList) return [];
        const q = search.toLowerCase();
        return branchList.filter(({ branch_name, location, branch_status }: any) =>
            (branch_name || "").toLowerCase().includes(q) ||
            (location || "").toLowerCase().includes(q) ||
            (branch_status || "").toLowerCase().includes(q)
        );
    }, [search, branchList]);

    const debounceTimer = useRef<number | null>(null);
    const [loading, setLoading] = useState(false);
    const searchToastId = useRef<string | number | null>(null);

    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                window.clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    function scheduleServerSearch(value: string, delay = 300) {
        if (debounceTimer.current) {
            window.clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = window.setTimeout(() => {
            if (!searchToastId.current) {
                searchToastId.current = toast.loading("Searching branches...");
            } else {
                toast.loading("Searching branches...", { id: searchToastId.current });
            }

            router.get(
                "/branches",
                { search: value },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ["branches"],
                    onSuccess: (page: { props: { branches: any; }; }) => {
                        setLoading(false);
                        const updatedBranches = (page.props.branches as any)?.data || [];
                        if (updatedBranches.length > 0) {
                            toast.success("Branches found!", { id: searchToastId.current || undefined });
                        } else {
                            toast.error("No matching branches found.", { id: searchToastId.current || undefined });
                        }
                        searchToastId.current = null;
                    },
                    onError: () => {
                        setLoading(false);
                        toast.error("Failed to load branches.", { id: searchToastId.current || undefined });
                        searchToastId.current = null;
                    },
                }
            );
        }, delay);
    }

    function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setSearch(value);
        const url = new URL(window.location.href);
        if (value) url.searchParams.set("search", value);
        else url.searchParams.delete("search");
        window.history.pushState({}, "", url);
        scheduleServerSearch(value, 300);
    }

    const confirmDelete = (id: number) => {
        setDeleteId(id);
        setIsDeleteOpen(true);
    };

    const handleDelete = () => {
        if (!deleteId) return;
        setIsDeleting(true);
        router.delete(`/branches/${deleteId}`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsDeleting(false);
                setIsDeleteOpen(false);
                setDeleteId(null);
                toast.success('Branch deleted successfully');
            },
            onError: () => {
                setIsDeleting(false);
                toast.error('Failed to delete branch');
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Branches" />
            <div className="mx-4 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex">
                    <Building className="size-14 mr-3" />
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Branch Management
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Manage your organization's branches.
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex items-center relative">
                <Search className="absolute left-140 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                    type="text"
                    placeholder="Search branches..."
                    value={search}
                    onChange={handleSearchChange}
                    className="border border-gray-400 w-full max-w-xl rounded-md px-3 py-1 mx-4 focus:outline-none focus:ring focus:ring-gray-300"
                />
                <Link href="/branches/create">
                    <Button className="mr-4"><Plus className="size-5" />Add Branch</Button>
                </Link>
            </div>
            <div className="m-4 bg-white border border-black dark:border-white dark:bg-primary-foreground p-4 rounded-lg">
                <div className="border border-black/40 rounded-lg p-4 dark:border-white">
                    <Table className="w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Branch Name</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBranches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        {search ? "No branches found matching your search." : "No branches found."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBranches.map(({ id, branch_name, location, branch_status }: any) => (
                                    <TableRow key={id}>
                                        <TableCell className="font-medium">{id}</TableCell>
                                        <TableCell className="font-medium">{branch_name}</TableCell>
                                        <TableCell>{location}</TableCell>
                                        <TableCell>
                                            <Badge variant={branch_status === 'Active' ? 'default' : 'destructive'}>
                                                {branch_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Link href={`/branches/${id}/edit`}>
                                                    <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700"
                                                    onClick={() => confirmDelete(id)}
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="mt-4 flex justify-between items-center">
                    <h2>Showing Results: <strong>{branches?.total || 0}</strong> </h2>
                    <Pagination links={links} />
                </div>
            </div>

            <DeleteConfirmation
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDelete}
                processing={isDeleting}
                title="Delete Branch"
                description="Are you sure you want to delete this branch? This action cannot be undone."
            />
        </AppLayout>
    );
}
