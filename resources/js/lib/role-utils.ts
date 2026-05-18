export const getRoleGradient = (input: any) => {
    let roles: string[] = [];
    if (Array.isArray(input)) {
        roles = input;
    } else if (input) {
        const spatieRole = input.roles?.[0]?.name;
        const role = spatieRole || input.role || '';
        if (role) roles = [role];
    }

    if (roles.some(r => r.includes('System Administrator') || r.includes('System Admin') || r.includes('Super Admin'))) {
        return 'bg-gradient-to-tr from-red-500 via-fuchsia-500 to-blue-600 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
    } else if (roles.some(r => r.includes('Branch Administrator') || r.includes('Branch Admin') || r.includes('Branch Manager'))) {
        return 'bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-600 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
    } else if (roles.some(r => r.includes('Employee'))) {
        return 'bg-gradient-to-tr from-green-400 via-emerald-500 to-blue-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
    }

    return 'bg-neutral-200 dark:bg-neutral-800'; 
};
