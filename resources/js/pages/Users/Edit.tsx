import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Head, useForm, Link } from '@inertiajs/react';
import { UserCog, Save, X, UserPen } from 'lucide-react'; // Swapped UserPlus for UserCog (Edit Icon)
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Users',
        href: '/users',
    },
    { 
        title: 'Add Users',
        href: '/users.create', 
    },
    { 
        title: 'Edit Users',
        href: '/users.edit', 
    },
];

interface EditProps {
    user: {
        id: number;
        name: string;
        email: string;
        branch_id: string | number;
        role: string;
    };
    branches: any[];
    roles: any[];
}

export default function Edit({ users, branches = [], roles = [] }: EditProps) {
    
    // Initialize form with EXISTING user data
    const { data, setData, put, processing, errors } = useForm({
        name: users.name || '',
        email: users.email || '',
        password: '', // Leave empty. Only send if changing it.
        branch_id: users.branch_id ? String(users.branch_id) : '',
        role: users.role || '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Use PUT method and target specific user ID
        put(`/users.update/${users.id}`, {
            onSuccess: () => {
                toast.success('User updated successfully');
            },
            onError: () => {
                toast.error('Failed to update user. Please check the form.');
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit User" />
            
            <div className="p-4 md:p-6 ">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 ">
                    <div className="flex items-start">
                        {/* Changed Icon to UserCog for "Edit" context */}
                        <UserPen className="size-14 mr-3 text-primary" />
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Edit User
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Update the user's details, branch assignment, or role.
                            </p>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <Link href="/users">
                            <Button variant="outline" size="sm">
                                <X className="size-4 mr-2" />
                                Cancel
                            </Button>
                        </Link>
                        <Button onClick={submit} disabled={processing} size="sm">
                            <Save className="size-4 mr-2" />
                            {processing ? 'Updating...' : 'Update User'}
                        </Button>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-card text-card-foreground rounded-xl border border-black shadow-sm p-6">
                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Name Field */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input 
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Jane Doe"
                                    required
                                />
                                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                            </div>

                            {/* Email Field */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input 
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="jane@company.com"
                                    required
                                />
                                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                            </div>

                            {/* Branch Dropdown */}
                            <div className="space-y-2">
                                <Label>Branch</Label>
                                <Select 
                                    value={data.branch_id} 
                                    onValueChange={(value) => setData('branch_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={String(branch.id)}>
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.branch_id && <p className="text-sm text-destructive">{errors.branch_id}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                    // FIX 1: Ensure you are binding the value to your state
                                    value={data.role ? String(data.role) : undefined} 
                                    onValueChange={(value) => {
                                        // If you want "deselect" capability in a single select, you check if it's already selected
                                        const newValue = value === data.role ? "" : value;
                                        setData('role', newValue);
                                    }}
                                >
                                    <SelectTrigger>
                                        {/* FIX 2: Pass the placeholder directly to SelectValue */}
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {/* Add this item manually */}
                                    <SelectItem value="null_value"></SelectItem>
                                    
                                    {roles.map((role) => (
                                        <SelectItem key={role.id} value={String(role.id)}>
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
                            </div>


                            {/* Password Field (Optional on Edit) */}
                            <div className="space-y-2">
                                <Label htmlFor="password">Reset Password</Label>
                                <Input 
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave blank to keep the current password.
                                </p>
                                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                            </div>

                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}