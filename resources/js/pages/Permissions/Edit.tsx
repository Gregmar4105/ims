import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm, Link } from '@inertiajs/react';
import { Key, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Permissions',
        href: '/permissions',
    },
    {
        title: 'Edit Permission',
        href: '#',
    },
];

interface EditProps {
    permission: {
        id: number;
        name: string;
    };
}

export default function Edit({ permission }: EditProps) {
    const { data, setData, put, processing, errors } = useForm({
        name: permission.name || '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/permissions/${permission.id}`, {
            onSuccess: () => {
                toast.success('Permission updated successfully');
            },
            onError: () => {
                toast.error('Failed to update permission. Please check the form.');
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Permission" />
            <div className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-start">
                        <Key className="size-14 mr-3 text-primary" />
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Edit Permission
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Update permission details.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/permissions">
                            <Button variant="outline" size="sm">
                                <X className="size-4 mr-2" />
                                Cancel
                            </Button>
                        </Link>
                        <Button onClick={submit} disabled={processing} size="sm">
                            <Save className="size-4 mr-2" />
                            {processing ? 'Updating...' : 'Update Permission'}
                        </Button>
                    </div>
                </div>

                <div className="bg-card text-card-foreground rounded-xl border border-black shadow-sm p-6">
                    <form onSubmit={submit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Permission Name</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g. edit_posts"
                                required
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
