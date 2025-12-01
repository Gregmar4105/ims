import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Head, Link, usePage, router } from '@inertiajs/react';
import { Plus, Pencil, Trash, BadgeCheckIcon, BadgeAlert, Search, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/Pagination';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Users',
        href: '/users',
    },
];

export default function Index({ users }:any) {
    // Normalize data: check if 'users' is a paginated object (has .data) or a simple array
    // If users is null/undefined, default to an empty array to prevent crashes
    const userList = users?.data || users || [];
    
    // Robustly extract links: check users.meta.links (API Resources) first, then users.links (Standard Pagination)
    const links = users?.meta?.links || users?.links || [];

    const { filters } = usePage().props;
    const [search, setSearch] = useState<string>(filters?.search || "");

    // ---- Local instant filtering (unchanged) ----
    // ---- Local instant filtering ----
    const filteredUsers = useMemo(() => {
        // Use userList here instead of users.data to match your normalization logic above
        if (!userList) return [];
        
        const q = search.toLowerCase();

        return userList.filter(({ name, email, email_verified_at, created_at }: any) =>
            (name || "").toLowerCase().includes(q) ||
            (email || "").toLowerCase().includes(q) ||
            (email_verified_at || "").includes(q) ||  // FIX: Handle null dates
            (created_at || "").includes(q)
        );
    }, [search, userList]); // Update dependency to userList

    // ---- Debounce timer ref ----
    const debounceTimer = useRef<number | null>(null);

    const [loading, setLoading] = useState(false);
    const [showNoResults, setShowNoResults] = useState(false);
    const searchToastId = useRef<string | number | null>(null);


    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                window.clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    // ---- server search (debounced) ----
    function scheduleServerSearch(value: string, delay = 300) {
    if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(() => {
        if (!searchToastId.current) {
            searchToastId.current = toast.loading("Searching users...");
        } else {
            toast.loading("Searching users...", { id: searchToastId.current });
        }

        router.get(
            "/users",
            { search: value },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ["users"],

                // onSuccess receives the page props as argument
                onSuccess: (page: { props: { users: any; }; }) => {
                    setLoading(false);

                    // Get updated airlines from the returned page props
                    const updatedUsers = (page.props.users as any)?.data || [];

                    if (updatedUsers.length > 0) {
                        toast.success("Users found!", { id: searchToastId.current || undefined });
                    } else {
                        toast.error("No matching users found.", { id: searchToastId.current || undefined });
                    }

                    searchToastId.current = null;
                },

                onError: () => {
                    setLoading(false);
                    toast.error("Failed to load users.", { id: searchToastId.current || undefined });
                    searchToastId.current = null;
                },
            }
        );
    }, delay);
}


    // ---- Handler for input changes ----
    function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setSearch(value);

        // update URL without reload
        const url = new URL(window.location.href);
        if (value) url.searchParams.set("search", value);
        else url.searchParams.delete("search");
        window.history.pushState({}, "", url);

        // schedule server search for fresh DB results (debounced)
        scheduleServerSearch(value, 300);
    }


  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Users" />
      <div className="mx-4 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Heading & Subheading */}
        <div className="flex">
        <UserCog className="size-14 mr-3"/>
        <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                User Management
            </h2>
            <p className="text-sm text-muted-foreground">
                View, manage, and organize your system's users and their verified status.
            </p>
        </div>
        </div>
    </div>
      <div className="flex items-center relative">
        <Link href="/users/create">
        <Button className="mx-4">Add a User <Plus className="size-5"/></Button>
        </Link>
                <Search className="absolute left-174 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={handleSearchChange}
                    className="border border-gray-400 w-full max-w-xl rounded-md px-3 py-1 mr-4 focus:outline-none focus:ring focus:ring-gray-300"
                />
        </div>
      <div
        className="m-4 bg-white border border-black dark:border-white
        dark:bg-primary-foreground p-4 rounded-lg"
      >
        <div className="border border-black/40 rounded-lg p-4 dark:border-white">
        <Table className="w-full">
          <TableCaption></TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Date Created</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* CHECK filteredUsers, not userList. 
                Otherwise, if a search returns 0 results, the table body stays blank. */}
            {filteredUsers.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {/* Differentiated message based on whether it's a search or empty DB */}
                        {search ? "No users found matching your search." : "No users found."}
                    </TableCell>
                </TableRow>
            ) : (
                filteredUsers.map(({ id, name, email, email_verified_at, user_status ,created_at }: any) => (
                    <TableRow key={id}>
                        <TableCell className="font-medium">{id}</TableCell>
                        <TableCell>{name}</TableCell>
                        <TableCell>{email}</TableCell>
                        <TableCell>
                            {email_verified_at ? (
                                <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700 gap-1">
                                    <BadgeCheckIcon className="w-3 h-3" />
                                    Verified
                                </Badge>
                            ) : (
                                <Badge variant="destructive" className="gap-1">
                                    <BadgeAlert className="w-3 h-3" />
                                    Unverified
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell>
                            {/* Format the date to be human-readable */}
                            {new Date(created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                            {user_status}
                        </TableCell>
                        <TableCell>
                            Branch Placeholder
                        </TableCell>
                        <TableCell>
                            Role Placeholder
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {/* EDIT ACTION */}
                                {/* Assuming you have a named route 'users.edit' */}
                                <Link >
                                    <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </Link>

                                {/* DELETE ACTION */}
                                {/* Added preserveScroll to keep user place after delete */}
                                <Link 
                                    preserveScroll
                                    only={['users']}
                                >
                                    <Button 
                                    variant="outline" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700">
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </TableCell>
                    </TableRow>
                ))
            )}
        </TableBody>
        </Table>
        </div>

        {/* Pagination Links */}
        <div className="mt-4 flex justify-between">
            <h2>Showing Results: <strong>{users.total}</strong> </h2> 
            <Pagination links={links} />
        </div>
      </div>
    </AppLayout>
  );
}