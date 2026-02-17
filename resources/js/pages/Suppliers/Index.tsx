import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { SharedData } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Product Suppliers',
        href: '/product-suppliers',
    },
];

interface Supplier {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    contact_person: string | null;
}

interface Props {
    suppliers: {
        data: Supplier[];
        links: any[];
    };
    filters: {
        search?: string;
    };
}

export default function Index({ suppliers, filters }: Props) {
    const { auth } = usePage<SharedData>().props;
    const isEmployee = auth.roles.includes('Employee');
    const [search, setSearch] = useState(filters.search || '');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    // Form for Create/Edit
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        contact_person: '',
    });

    useEffect(() => {
        if (editingSupplier) {
            setData({
                name: editingSupplier.name,
                email: editingSupplier.email || '',
                phone: editingSupplier.phone || '',
                address: editingSupplier.address || '',
                contact_person: editingSupplier.contact_person || '',
            });
        } else {
            reset();
            clearErrors();
        }
    }, [editingSupplier]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/product-suppliers', { search }, { preserveState: true });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSupplier) {
            put(`/product-suppliers/${editingSupplier.id}`, {
                onSuccess: () => {
                    setEditingSupplier(null);
                    reset();
                },
            });
        } else {
            post('/product-suppliers', {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this supplier?')) {
            router.delete(`/product-suppliers/${id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Product Suppliers" />

            <div className="p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Truck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Product Suppliers</h2>
                            <p className="text-muted-foreground">Manage your product suppliers inventory source.</p>
                        </div>
                    </div>
                    {!isEmployee && (
                        <Button onClick={() => { setEditingSupplier(null); setIsCreateOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" /> Add Supplier
                        </Button>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-4">
                    <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search suppliers..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button type="submit" variant="secondary">Search</Button>
                    </form>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Contact Person</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {suppliers.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No suppliers found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    suppliers.data.map((supplier) => (
                                        <TableRow key={supplier.id}>
                                            <TableCell className="font-medium">{supplier.name}</TableCell>
                                            <TableCell>{supplier.contact_person || '-'}</TableCell>
                                            <TableCell>{supplier.email || '-'}</TableCell>
                                            <TableCell>{supplier.phone || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                {!isEmployee && (
                                                    <div className="flex justify-end">
                                                        <Button variant="ghost" size="icon" onClick={() => setEditingSupplier(supplier)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(supplier.id)}>
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
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Supplier</DialogTitle>
                        <DialogDescription>
                            Add a new supplier to your database.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Supplier Name"
                                required
                            />
                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact_person">Contact Person</Label>
                            <Input
                                id="contact_person"
                                value={data.contact_person}
                                onChange={(e) => setData('contact_person', e.target.value)}
                                placeholder="Contact Person Name"
                            />
                            {errors.contact_person && <p className="text-sm text-red-500">{errors.contact_person}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="email@example.com"
                                />
                                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="+1234567890"
                                />
                                {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea
                                id="address"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                placeholder="Supplier Address"
                            />
                            {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Saving...' : 'Save Supplier'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingSupplier} onOpenChange={(open) => !open && setEditingSupplier(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Supplier</DialogTitle>
                        <DialogDescription>
                            Update supplier information.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Supplier Name"
                                required
                            />
                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-contact_person">Contact Person</Label>
                            <Input
                                id="edit-contact_person"
                                value={data.contact_person}
                                onChange={(e) => setData('contact_person', e.target.value)}
                                placeholder="Contact Person Name"
                            />
                            {errors.contact_person && <p className="text-sm text-red-500">{errors.contact_person}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="email@example.com"
                                />
                                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                    id="edit-phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="+1234567890"
                                />
                                {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-address">Address</Label>
                            <Textarea
                                id="edit-address"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                placeholder="Supplier Address"
                            />
                            {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Updating...' : 'Update Supplier'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
