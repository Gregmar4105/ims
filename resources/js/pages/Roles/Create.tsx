import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm, Link } from '@inertiajs/react';
import { Shield, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Roles',
        href: '/roles',
    },
    {
        title: 'Create Role',
        href: '/roles/create',
    },
];

interface CreateProps {
    permissions: any[];
}

export default function Create({ permissions = [] }: CreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        permissions: [] as number[],
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/roles', {
            onSuccess: () => {
                toast.success('Role created successfully');
            },
            onError: () => {
                toast.error('Failed to create role. Please check the form.');
            }
        });
    };

    const handlePermissionChange = (permissionId: number, checked: boolean) => {
        if (checked) {
            setData('permissions', [...data.permissions, permissionId]);
        } else {
            setData('permissions', data.permissions.filter(id => id !== permissionId));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Role" />
            <div className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-start">
                        <Shield className="size-14 mr-3 text-primary" />
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Create Role
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Add a new role and assign permissions.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/roles">
                            <Button variant="outline" size="sm">
                                <X className="size-4 mr-2" />
                                Cancel
                            </Button>
                        </Link>
                        <Button onClick={submit} disabled={processing} size="sm">
                            <Save className="size-4 mr-2" />
                            {processing ? 'Creating...' : 'Create Role'}
                        </Button>
                    </div>
                </div>

                <div className="bg-card text-card-foreground rounded-xl border border-black shadow-sm p-6">
                    <form onSubmit={submit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Role Name</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g. Branch Manager"
                                required
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Permissions</Label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md">
                                {permissions.map((permission) => (
                                    <div key={permission.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`permission-${permission.id}`}
                                            checked={data.permissions.includes(permission.id)}
                                            onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                                        />
                                        <label
                                            htmlFor={`permission-${permission.id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {permission.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            {errors.permissions && <p className="text-sm text-destructive">{errors.permissions}</p>}
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
