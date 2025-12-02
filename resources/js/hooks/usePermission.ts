// hooks/usePermission.ts
import { usePage } from '@inertiajs/react';

export function usePermission() {
    // 1. Get the data safely using the hook
    const { auth } = usePage().props as any;

    // 2. Safely access permissions (with fallback to empty array to prevent crashing)
    const userPermissions = auth?.permissions || [];

    // 3. Define the checker function
    const can = (permission: string): boolean => {
        return userPermissions.includes(permission);
    };

    // 4. Return the function to be used in your component
    return { can };
}