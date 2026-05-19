import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { usePermission } from '@/hooks/usePermission';
import { type BreadcrumbItem } from '@/types';
import {
    LayoutDashboard,
    MapPlus,
    Brush,
    Users,
    UserPen,
    TriangleAlert,
    Store,
    MessagesSquare,
    ListChecks,
    BellRing,
    RotateCcw,
    ArrowLeftRight,
    ArrowRightFromLine,
    ArrowLeftToLine,
    FileImage,
    PackageOpen,
    ShoppingBasket,
    Tag,
    ScanBarcode,
    IdCardLanyard,
    ScanQrCode,
    User,
    Lock,
    Shield,
    SunMoon,
    MonitorCog,
    UserCog,
    ShoppingBag,
    Settings,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'More Actions',
        href: '/more',
    },
];

interface NavActionItem {
    title: string;
    url: string;
    icon: React.ComponentType<any>;
    color: string;
}

interface CategoryGroup {
    title: string;
    icon: React.ComponentType<any>;
    check: (can: (permission: string) => boolean) => boolean;
    items: NavActionItem[];
}

const categories: CategoryGroup[] = [
    {
        title: "System Administration",
        icon: MonitorCog,
        check: (can) => can('system.admin'),
        items: [
            { title: "System Dashboard", url: "/system-dashboard", icon: LayoutDashboard, color: "blue" },
            { title: "Branch List", url: "/branches", icon: MapPlus, color: "emerald" },
            { title: "Personalization", url: "/personalization", icon: Brush, color: "purple" },
        ]
    },
    {
        title: "User Management",
        icon: UserCog,
        check: (can) => can('system.admin'),
        items: [
            { title: "Users", url: "/users", icon: Users, color: "indigo" },
            { title: "Roles", url: "/roles", icon: UserPen, color: "red" },
            { title: "Permissions", url: "/permissions", icon: TriangleAlert, color: "amber" },
        ]
    },
    {
        title: "Branch Administration",
        icon: Store,
        check: (can) => can('branch.admin'),
        items: [
            { title: "Branch Dashboard", url: "/branch-dashboard", icon: LayoutDashboard, color: "blue" },
            { title: "Chats", url: "/chats", icon: MessagesSquare, color: "emerald" },
        ]
    },
    {
        title: "Sales",
        icon: ShoppingBag,
        check: (can) => can('branch.admin'),
        items: [
            { title: "Sales History", url: "/sales-list", icon: ListChecks, color: "emerald" },
            { title: "New Sale", url: "/new-sales", icon: BellRing, color: "blue" },
            { title: "Return Items", url: "/return-items", icon: RotateCcw, color: "red" },
        ]
    },
    {
        title: "Transfer",
        icon: ArrowLeftRight,
        check: (can) => can('branch.admin'),
        items: [
            { title: "Transfer History", url: "/transfer-list", icon: ListChecks, color: "indigo" },
            { title: "Outgoing", url: "/outgoing", icon: ArrowRightFromLine, color: "orange" },
            { title: "Incoming", url: "/incoming", icon: ArrowLeftToLine, color: "teal" },
            { title: "Import Transfer", url: "/import-transfer", icon: FileImage, color: "purple" },
        ]
    },
    {
        title: "Products",
        icon: PackageOpen,
        check: () => true, // Accessible to all roles with internal CRUD gating
        items: [
            { title: "Product List", url: "/products", icon: ListChecks, color: "indigo" },
            { title: "Reorders", url: "/reorders", icon: ShoppingBasket, color: "red" },
            { title: "Category", url: "/categories", icon: Tag, color: "amber" },
            { title: "Brands", url: "/brands", icon: Tag, color: "blue" },
            { title: "Suppliers", url: "/product-suppliers", icon: Users, color: "emerald" },
            { title: "QR Barcodes", url: "/qr-barcodes", icon: ScanBarcode, color: "purple" },
            { title: "Photo Uploads", url: "/temporary-photo-product-upload", icon: FileImage, color: "rose" },
        ]
    },
    {
        title: "Employee",
        icon: IdCardLanyard,
        check: (can) => can('employee'),
        items: [
            { title: "Employee Dashboard", url: "/employee-dashboard", icon: IdCardLanyard, color: "emerald" },
            { title: "Branch Chats", url: "/branch-chats", icon: MessagesSquare, color: "blue" },
        ]
    },
    {
        title: "Account & Settings",
        icon: Settings,
        check: () => true, // Everyone can see account settings
        items: [
            { title: "Profile", url: "/settings/profile", icon: User, color: "zinc" },
            { title: "Password", url: "/settings/password", icon: Lock, color: "zinc" },
            { title: "Two-Factor", url: "/settings/two-factor", icon: Shield, color: "zinc" },
            { title: "Appearance", url: "/settings/appearance", icon: SunMoon, color: "zinc" },
        ]
    }
];

const getColorClasses = (color: string) => {
    switch (color) {
        case 'blue':
            return {
                iconBg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
                shadow: 'shadow-[0_0_10px_rgba(59,130,246,0.08)]'
            };
        case 'emerald':
            return {
                iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.08)]'
            };
        case 'purple':
            return {
                iconBg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
                shadow: 'shadow-[0_0_10px_rgba(168,85,247,0.08)]'
            };
        case 'indigo':
            return {
                iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
                shadow: 'shadow-[0_0_10px_rgba(99,102,241,0.08)]'
            };
        case 'red':
            return {
                iconBg: 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400',
                shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.08)]'
            };
        case 'amber':
            return {
                iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
                shadow: 'shadow-[0_0_10px_rgba(245,158,11,0.08)]'
            };
        case 'orange':
            return {
                iconBg: 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
                shadow: 'shadow-[0_0_10px_rgba(249,115,22,0.08)]'
            };
        case 'teal':
            return {
                iconBg: 'bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400',
                shadow: 'shadow-[0_0_10px_rgba(20,184,166,0.08)]'
            };
        case 'rose':
            return {
                iconBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400',
                shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.08)]'
            };
        case 'zinc':
        default:
            return {
                iconBg: 'bg-zinc-500/10 dark:bg-zinc-500/20 text-zinc-600 dark:text-zinc-400',
                shadow: 'shadow-[0_0_10px_rgba(113,113,122,0.08)]'
            };
    }
};

export default function More() {
    const { can } = usePermission();

    // Filter categories that the current user has access to
    const visibleCategories = categories.filter(category => category.check(can));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="More Actions" />
            <div className="flex flex-col gap-4 p-4 md:p-6 pb-36 md:pb-12">
                
                {/* Modern Premium Page Header */}
                <div className="mb-2">
                    <h1 className="text-3xl font-bold tracking-tight">More Actions</h1>
                    <p className="text-muted-foreground mt-1">
                        Quickly navigate to features and actions available for your role.
                    </p>
                </div>

                {/* Categories Flat List Layout */}
                <div className="flex flex-col gap-4 md:gap-6">
                    {visibleCategories.map((category) => {
                        const CategoryIcon = category.icon;
                        return (
                            <div key={category.title} className="flex flex-col gap-2.5 pb-4 md:pb-5 border-b border-border/40 last:border-b-0 last:pb-0">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                        <CategoryIcon className="w-4 h-4" />
                                    </div>
                                    <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                        {category.title}
                                    </h2>
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {category.items.map((item) => {
                                        const ActionIcon = item.icon;
                                        const theme = getColorClasses(item.color);
                                        return (
                                            <button
                                                key={item.title}
                                                onClick={() => router.visit(item.url)}
                                                className="flex flex-col items-center justify-center py-2.5 px-0.5 bg-background dark:bg-zinc-900 border border-border/80 rounded-xl shadow-sm hover:bg-accent/50 dark:hover:bg-zinc-800 transition-all active:scale-95 text-center group cursor-pointer"
                                            >
                                                <div className={`p-2 rounded-lg mb-1.5 group-hover:scale-110 transition-transform duration-200 ${theme.iconBg} ${theme.shadow}`}>
                                                    <ActionIcon className="w-4 h-4" />
                                                </div>
                                                <span className="font-semibold text-[9px] sm:text-[10px] md:text-[11px] text-foreground tracking-tight leading-tight line-clamp-2 w-full px-1">
                                                    {item.title}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}
