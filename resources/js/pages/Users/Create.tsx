import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Head, Link, usePage, router } from '@inertiajs/react';
import { Plus, Pencil, Trash, BadgeCheckIcon, BadgeAlert, Search, UserCog, UserPlus } from 'lucide-react';
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
    {
        title: 'Add Users',
        href: '/users/create',
    },
];

export default function Create({ users }:any) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Users" />
      <div className="mx-4 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Heading & Subheading */}
        <div className="flex">
        <UserPlus className="size-14 mr-3"/>
        <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Add a User
            </h2>
            <p className="text-sm text-muted-foreground">
                Add a user in your branch.
            </p>
        </div>
        </div>
    </div>
        
    </AppLayout>
  );
}