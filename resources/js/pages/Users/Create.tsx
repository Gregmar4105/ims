import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Head, useForm, Link } from '@inertiajs/react'; // Changed usePage/router to useForm for better form handling
import { UserPlus, Save, X } from 'lucide-react';
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
];

export default function Create({ branches = [], roles = [] }: { branches: any[], roles: any[] }) {
    
    // Inertia form handling
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: 'password123', // Set your default password logic here
        branch_name: '',
        role: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        
        post('/users.store', {
            onSuccess: () => {
                toast.success('User created successfully');
                reset();
            },
            onError: () => {
                toast.error('Failed to create user. Please check the form.');
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add User" />
            
            <div className="p-4 md:p-6 ">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 ">
                    <div className="flex items-start">
                            <UserPlus className="size-14 mr-3 text-primary" />
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Add a User
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Add a new user to the system and assign their branch.
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
                            {processing ? 'Saving...' : 'Save User'}
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
                                    // FIX 1: Bind to the correct state variable (branch_name), not 'branches'
                                    value={data.branch_name ? String(data.branch_name) : undefined}
                                    onValueChange={(value) => {
                                        // Handle the manual "clear" option
                                        if (value === "null_value") {
                                            setData('branch_name', '');
                                        } else {
                                            setData('branch_name', value);
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* Clear Option */}
                                        <SelectItem value="null_value">
                                            <span className="text-muted-foreground italic"></span>
                                        </SelectItem>

                                        {/* FIX 2: Loop over branches and use 'branch' variables, not 'role' */}
                                        {branches.map((branch) => (
                                            <SelectItem 
                                                key={branch.id} 
                                                value={String(branch.id)} // Store the ID
                                            >
                                                {/* FIX 3: Render the specific name property, not the object */}
                                                {branch.branch_name} 
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {/* Update error key if your backend returns 'branch_id' or 'branch_name' */}
                                {errors.branch_name && <p className="text-sm text-destructive">{errors.branch_name}</p>}
                            </div>

                            {/* Role Dropdown */}
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

                            {/* Default Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password">Default Password</Label>
                                <Input 
                                    id="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    This password will be set initially. The user should change it upon login.
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