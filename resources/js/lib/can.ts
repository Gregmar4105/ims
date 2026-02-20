import { usePage } from '@inertiajs/react';

export function can(permission: string): boolean {
    const { auth } = usePage().props as unknown as {
        auth: {
            permissions: string[],
            roles?: string[]
        };
    };

    const userRoles = auth?.roles || [];
    const userPermissions = auth?.permissions || [];

    if (permission === 'system.admin' && userRoles.includes('System Administrator')) return true;
    if (permission === 'branch.admin' && userRoles.includes('Branch Administrator')) return true;
    if (permission === 'employee' && userRoles.includes('Employee')) return true;

    return userPermissions.includes(permission);
}