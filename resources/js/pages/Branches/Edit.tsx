import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm, Link } from '@inertiajs/react';
import { Building, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Branches',
        href: '/branches',
    },
    {
        title: 'Edit Branch',
        href: '#',
    },
];

interface EditProps {
    branch: {
        id: number;
        branch_name: string;
        location: string;
        branch_status: string;
    };
}

export default function Edit({ branch }: EditProps) {
    const { data, setData, put, processing, errors } = useForm({
        branch_name: branch.branch_name || '',
        location: branch.location || '',
        branch_status: branch.branch_status || 'Active',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/branches/${branch.id}`, {
            onSuccess: () => {
                toast.success('Branch updated successfully');
            },
            onError: () => {
                toast.error('Failed to update branch. Please check the form.');
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Branch" />
            <div className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-start">
                        <Building className="size-14 mr-3 text-primary" />
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Edit Branch
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Update branch details.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/branches">
                            <Button variant="outline" size="sm">
                                <X className="size-4 mr-2" />
                                Cancel
                            </Button>
                        </Link>
                        <Button onClick={submit} disabled={processing} size="sm">
                            <Save className="size-4 mr-2" />
                            {processing ? 'Updating...' : 'Update Branch'}
                        </Button>
                    </div>
                </div>

                <div className="bg-card text-card-foreground rounded-xl border border-black shadow-sm p-6">
                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="branch_name">Branch Name</Label>
                                <Input
                                    id="branch_name"
                                    value={data.branch_name}
                                    onChange={(e) => setData('branch_name', e.target.value)}
                                    placeholder="e.g. Main Office"
                                    required
                                />
                                {errors.branch_name && <p className="text-sm text-destructive">{errors.branch_name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    value={data.location}
                                    onChange={(e) => setData('location', e.target.value)}
                                    placeholder="e.g. New York, NY"
                                    required
                                />
                                {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="branch_status">Status</Label>
                                <Select
                                    value={data.branch_status}
                                    onValueChange={(value) => setData('branch_status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.branch_status && <p className="text-sm text-destructive">{errors.branch_status}</p>}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
