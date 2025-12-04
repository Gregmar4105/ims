import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Head, Link, usePage, router } from '@inertiajs/react';
import { Plus, Pencil, Trash, Search, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/Pagination';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import DeleteConfirmation from '@/components/DeleteConfirmation';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Roles',
        href: '/roles',
    },
];

export default function Index({ roles }: any) {
    const roleList = roles?.data || roles || [];
    const links = roles?.meta?.links || roles?.links || [];
    const { filters } = usePage().props;
    const [search, setSearch] = useState<string>(filters?.search || "");

    // Delete State
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredRoles = useMemo(() => {
        if (!roleList) return [];
        const q = search.toLowerCase();
        return roleList.filter(({ name }: any) =>
            (name || "").toLowerCase().includes(q)
        );
    }, [search, roleList]);

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
                searchToastId.current = toast.loading("Searching roles...");
            } else {
                toast.loading("Searching roles...", { id: searchToastId.current });
            }

            router.get(
                "/roles",
                { search: value },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ["roles"],
                    onSuccess: (page: { props: { roles: any; }; }) => {
                        setLoading(false);
                        const updatedRoles = (page.props.roles as any)?.data || [];
                        if (updatedRoles.length > 0) {
                            toast.success("Roles found!", { id: searchToastId.current || undefined });
                        } else {
                            toast.error("No matching roles found.", { id: searchToastId.current || undefined });
                        }
                        searchToastId.current = null;
                    },
                    onError: () => {
                        setLoading(false);
                        toast.error("Failed to load roles.", { id: searchToastId.current || undefined });
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
        router.delete(`/roles/${deleteId}`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsDeleting(false);
                setIsDeleteOpen(false);
                setDeleteId(null);
                toast.success('Role deleted successfully');
            },
            onError: () => {
                setIsDeleting(false);
                toast.error('Failed to delete role');
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles" />
            <div className="mx-4 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex">
                    <Shield className="size-14 mr-3" />
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Role Management
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Manage roles and their associated permissions.
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex items-center relative">
                <Search className="absolute left-140 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                    type="text"
                    placeholder="Search roles..."
                    value={search}
                    onChange={handleSearchChange}
                    className="border border-gray-400 w-full max-w-xl rounded-md px-3 py-1 mx-4 focus:outline-none focus:ring focus:ring-gray-300"
                />
                <Link href="/roles/create">
                    <Button className="mr-4"><Plus className="size-5" />Add a Role</Button>
                </Link>
            </div>
            <div className="m-4 bg-white border border-black dark:border-white dark:bg-primary-foreground p-4 rounded-lg">
                <div className="border border-black/40 rounded-lg p-4 dark:border-white h-[calc(100vh-300px)] overflow-y-auto relative">
                    <Table className="w-full">
                        <TableHeader className="sticky top-0 z-10 bg-white dark:bg-primary-foreground shadow-sm">
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Permissions</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRoles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                        {search ? "No roles found matching your search." : "No roles found."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRoles.map(({ id, name, permissions }: any) => (
                                    <TableRow key={id}>
                                        <TableCell className="font-medium">{id}</TableCell>
                                        <TableCell className="font-medium">{name}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {permissions && permissions.length > 0 ? (
                                                    permissions.slice(0, 5).map((perm: any) => (
                                                        <Badge key={perm.id} variant="secondary" className="text-xs">
                                                            {perm.name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground italic text-sm">No Permissions</span>
                                                )}
                                                {permissions && permissions.length > 5 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{permissions.length - 5} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Link href={`/roles/${id}/edit`}>
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
                    <h2>Showing Results: <strong>{roles?.total || 0}</strong> </h2>
                    <Pagination links={links} />
                </div>
            </div>

            <DeleteConfirmation
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDelete}
                processing={isDeleting}
                title="Delete Role"
                description="Are you sure you want to delete this role? This action cannot be undone."
            />
        </AppLayout>
    );
}
