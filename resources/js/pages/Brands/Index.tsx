import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Pagination from '@/components/Pagination';
import { Badge } from "@/components/ui/badge";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Brands',
        href: '/brands',
    },
];

interface Brand {
    id: number;
    name: string;
    slug: string;
    status: 'Active' | 'Inactive';
    created_at: string;
    updated_at: string;
    creator?: {
        name: string;
    };
}

interface Props {
    brands: {
        data: Brand[];
        links: any[];
        total: number;
    };
    filters: {
        search?: string;
    };
}

export default function Index({ brands, filters }: Props) {
    const { auth } = usePage<SharedData>().props;
    const isSystemAdmin = auth.roles.includes('System Administrator');
    const branchName = auth.user?.branch?.branch_name || 'Active Branch';
    const isEmployee = auth.roles.includes('Employee') && !auth.roles.includes('System Administrator') && !auth.roles.includes('Branch Administrator');
    const [search, setSearch] = useState(filters.search || '');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    const executeDeleteAll = () => {
        setIsDeletingAll(true);
        router.post("/brands/delete-all", {}, {
            onSuccess: () => {
                setIsDeleteAllModalOpen(false);
                setIsDeletingAll(false);
                toast.success('Successfully deleted all brands for this branch.');
            },
            onError: () => {
                setIsDeletingAll(false);
                toast.error("Failed to delete brands.");
            }
        });
    };

    const { data, setData, post, put, delete: destroy, processing, reset, errors, clearErrors } = useForm({
        name: '',
        status: 'Active',
    });

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/brands', { search }, { preserveState: true });
    }

    function openCreateDialog() {
        setEditingBrand(null);
        reset();
        clearErrors();
        setIsDialogOpen(true);
    }

    function openEditDialog(brand: Brand) {
        setEditingBrand(brand);
        setData({
            name: brand.name,
            status: brand.status,
        });
        clearErrors();
        setIsDialogOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (editingBrand) {
            put(`/brands/${editingBrand.id}`, {
                onSuccess: () => setIsDialogOpen(false),
            });
        } else {
            post('/brands', {
                onSuccess: () => setIsDialogOpen(false),
            });
        }
    }

    function deleteBrand(id: number) {
        if (confirm('Are you sure you want to delete this brand?')) {
            destroy(`/brands/${id}`);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Brands" />

            <div className="mx-4 mt-4 flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Sparkles className="size-14 mr-3" />
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Brand Management
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Manage product brands.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSystemAdmin && (
                            <Button
                                variant="destructive"
                                className="hidden md:flex bg-red-600 hover:bg-red-700 text-white shrink-0"
                                onClick={() => setIsDeleteAllModalOpen(true)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete All Brands
                            </Button>
                        )}
                        {!isEmployee && (
                            <Button onClick={openCreateDialog}>
                                <Plus className="mr-2 h-4 w-4" /> Add Brand
                            </Button>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <Input
                                type="text"
                                placeholder="Search brands..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button type="submit" variant="secondary">Search</Button>
                    </form>
                </div>
            </div>

            <div className="p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden h-[calc(100vh-220px)] overflow-y-auto relative">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm">
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead>Updated At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {brands.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No brands found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                brands.data.map((brand) => (
                                    <TableRow key={brand.id}>
                                        <TableCell className="font-medium">{brand.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{brand.slug}</TableCell>
                                        <TableCell>
                                            <Badge variant={brand.status === 'Active' ? 'default' : 'secondary'}>
                                                {brand.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {brand.creator?.name || 'System'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(brand.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(brand.updated_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!isEmployee && (
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(brand)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => deleteBrand(brand.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-4">
                    <Pagination links={brands.links} />
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <AutocompleteInput
                                value={data.name}
                                onValueChange={val => setData('name', val)}
                                placeholder="Enter brand name"
                                searchUrl="/api/brands/search"
                                error={errors.name}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={data.status} onValueChange={(val) => setData('status', val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={processing}>
                                {editingBrand ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog open={isDeleteAllModalOpen} onOpenChange={setIsDeleteAllModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 font-bold">
                            <Trash2 className="h-5 w-5" /> Confirm Deletion of All Brands
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 flex flex-col items-center text-center">
                        <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                            <Trash2 className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Are you absolutely sure?</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            You are about to delete <strong>ALL</strong> brands for the branch <strong>{branchName}</strong>.
                        </p>
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                IMPORTANT: This action cannot be undone. All brand records for this branch will be permanently deleted, and associated products will have their brand cleared.
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
