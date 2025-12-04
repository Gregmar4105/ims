import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';

import { SharedData, type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowLeftRight, ArrowLeftToLine, ArrowRightFromLine, ArrowUpDown, BellRing, BookOpen, Brush, ChevronRight, Download, Folder, Frown, GalleryVertical, GalleryVerticalEnd, IdCardLanyard, LayoutDashboard, LayoutGrid, ListChecks, Mail, MapPlus, MessagesSquare, MonitorCog, NotebookText, PackageOpen, QrCode, ScanQrCode, Settings, ShoppingBag, ShoppingBasket, Sparkles, ScanBarcode, Settings2, Split, SquareTerminal, Tag, Store, TriangleAlert, UserCog, UserLock, UserPen, Users, Wallet, ShoppingCart, Plus, RotateCcw } from 'lucide-react';
import AppLogo from './app-logo';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';
import { usePermission } from '@/hooks/usePermission';


const SystemAdmin = {
    title: "System Administration",
    icon: MonitorCog,
    isActive: true,
    items: [
        { title: "System Dashboard", url: "/system-dashboard", icon: LayoutDashboard, badge: "" },
        { title: "Branch List", url: "/branches", icon: MapPlus },
        { title: "Personalization", url: "/personalization", icon: Brush },
    ],
}

const BranchAdmin = {
    title: "Branch Administration",
    icon: Store,
    isActive: true,
    items: [
        { title: "Branch Dashboard", url: "/branch-dashboard", icon: LayoutDashboard },
        { title: "Chats", url: "/chats", icon: MessagesSquare },
    ],
}

const Sales = {
    title: "Sales",
    icon: ShoppingBag,
    isActive: true,
    items: [
        { title: "Sales List", url: "/sales-list", icon: ListChecks },
        { title: "New Sales", url: "/new-sales", icon: BellRing },
        { title: "Return Items", url: "/return-items", icon: RotateCcw },
    ],
}


const Transfer = {
    title: "Transfer",
    icon: ArrowLeftRight,
    isActive: true,
    items: [
        { title: "Transfer List", url: "/transfer-list", icon: ListChecks },
        { title: "Outgoing", url: "/outgoing", icon: ArrowRightFromLine },
        { title: "Incoming", url: "/incoming", icon: ArrowLeftToLine },
    ],
}

const Products = {
    title: "Products",
    icon: PackageOpen,
    isActive: true,
    items: [
        { title: "Product List", url: "/products", icon: ListChecks },
        {
            title: "Prod. Category",
            url: "/categories",
            icon: Tag,
        },
        {
            title: "Product Brands",
            url: "/brands",
            icon: Tag,
        },
        {
            title: "QR & Barcodes",
            url: "/qr-barcodes",
            icon: ScanBarcode,
        },
    ],
}

const userManagement = {
    title: "User Management",
    icon: UserCog,
    isActive: true,
    items: [
        { title: "Users", url: "/users", icon: Users },
        { title: "Roles", url: "/roles", icon: UserPen },
        { title: "Permissions", url: "/permissions", icon: TriangleAlert },
    ],
}



export function AppSidebar() {
    const { can } = usePermission();

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroupLabel>Larable IMS Platform</SidebarGroupLabel>
                {can('system.admin') &&
                    <Collapsible
                        defaultOpen={SystemAdmin.isActive}
                        className="group/collapsible"
                    >
                        <SidebarMenuItem>

                            {/* Parent Trigger */}
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton tooltip={SystemAdmin.title}>
                                    {SystemAdmin.icon && <SystemAdmin.icon />}
                                    <span>{SystemAdmin.title}</span>
                                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>


                            {/* Parent Content */}
                            <CollapsibleContent>

                                <SidebarMenuSub>
                                    {SystemAdmin.items.map((subItem) => (
                                        <SidebarMenuSubItem key={subItem.title}>
                                            <SidebarMenuSubButton asChild>
                                                <a href={subItem.url}>
                                                    {subItem.icon && <subItem.icon />}
                                                    <span>{subItem.title}</span>
                                                    {subItem.badge && (
                                                        <SidebarMenuBadge className="ml-auto">
                                                            {subItem.badge}
                                                        </SidebarMenuBadge>
                                                    )}
                                                </a>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}

                                    {/* --- FIX START: You need a new Collapsible wrapper here --- */}
                                    <Collapsible className="group/sub-collapsible">

                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton tooltip={userManagement.title}>
                                                {userManagement.icon && <userManagement.icon />}
                                                <span>{userManagement.title}</span>
                                                {/* Note: I changed the rotate class to look at group/sub-collapsible */}
                                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/sub-collapsible:rotate-90" />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {userManagement.items.map((subItem) => (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton asChild>
                                                            <a href={subItem.url}>
                                                                {subItem.icon && <subItem.icon />}
                                                                <span>{subItem.title}</span>
                                                            </a>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>

                                    </Collapsible>

                                </SidebarMenuSub>
                            </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>}

                {can('branch.admin') &&
                    <Collapsible
                        defaultOpen={BranchAdmin.isActive}
                        className="group/collapsible"
                    >
                        <SidebarMenuItem>

                            {/* Parent Trigger */}
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton tooltip={BranchAdmin.title}>
                                    {BranchAdmin.icon && <BranchAdmin.icon />}
                                    <span>{BranchAdmin.title}</span>
                                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>

                            {/* Sub Items Loop */}
                            <CollapsibleContent>
                                <SidebarMenuSub>
                                    {BranchAdmin.items.map((subItem) => (
                                        <SidebarMenuSubItem key={subItem.title}>
                                            <SidebarMenuSubButton asChild>
                                                <a href={subItem.url}>
                                                    {subItem.icon && <subItem.icon />}
                                                    <span>{subItem.title}</span>
                                                </a>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}

                                    <Collapsible className="group/sub-collapsible">

                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton tooltip={Sales.title}>
                                                {Sales.icon && <Sales.icon />}
                                                <span>{Sales.title}</span>
                                                {/* Note: I changed the rotate class to look at group/sub-collapsible */}
                                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/sub-collapsible:rotate-90" />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {Sales.items.map((subItem) => (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton asChild>
                                                            <a href={subItem.url}>
                                                                {subItem.icon && <subItem.icon />}
                                                                <span>{subItem.title}</span>
                                                            </a>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>

                                    </Collapsible>

                                    <Collapsible className="group/sub-collapsible">

                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton tooltip={Transfer.title}>
                                                {Transfer.icon && <Transfer.icon />}
                                                <span>{Transfer.title}</span>
                                                {/* Note: I changed the rotate class to look at group/sub-collapsible */}
                                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/sub-collapsible:rotate-90" />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {Transfer.items.map((subItem) => (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton asChild>
                                                            <a href={subItem.url}>
                                                                {subItem.icon && <subItem.icon />}
                                                                <span>{subItem.title}</span>
                                                            </a>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>

                                    </Collapsible>
                                </SidebarMenuSub>
                            </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>}

                {can('employee') &&
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Employee Dashboard">
                            <IdCardLanyard />
                            <a href="/employee-dashboard">
                                <span>Employee Dashboard</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>}

                <Collapsible
                    defaultOpen={Products.isActive}
                    className="group/collapsible"
                >
                    <SidebarMenuItem>

                        {/* Parent Trigger */}
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={Products.title}>
                                {Products.icon && <Products.icon />}
                                <span>{Products.title}</span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>

                        {/* Sub Items Loop */}
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {Products.items.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.title}>
                                        <SidebarMenuSubButton asChild>
                                            <a href={subItem.url}>
                                                {subItem.icon && <subItem.icon />}
                                                <span>{subItem.title}</span>
                                            </a>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>

                {can('employee') &&
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Scanner">
                            <ScanQrCode />
                            <a href="/qr-and-barcode-scanner">
                                <span>QR & Barcode Scanner</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>}

            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
