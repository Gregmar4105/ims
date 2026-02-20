// hooks/usePermission.ts
import { usePage } from '@inertiajs/react';

export function usePermission() {
    // 1. Get the data safely using the hook
    const { auth } = usePage().props as any;

    // 2. Safely access permissions and roles
    const userPermissions = auth?.permissions || [];
    const userRoles = auth?.roles || [];

    // 3. Define the checker function
    const can = (permission: string): boolean => {
        // Map pseudo-permissions to actual roles
        if (permission === 'system.admin' && userRoles.includes('System Administrator')) return true;
        if (permission === 'branch.admin' && userRoles.includes('Branch Administrator')) return true;
        if (permission === 'employee' && userRoles.includes('Employee')) return true;

        // Also fallback to explicit permission checks if provided
        return userPermissions.includes(permission);
    };

    // 4. Return the function to be used in your component
    return { can };
}