import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserMenuContent } from '@/components/user-menu-content';
import { cn, resolveUrl } from '@/lib/utils';

import { type NavItem, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Menu, Search, Bike, Mars, Venus, Cog, Wind, HatGlasses, MapPlus, ShoppingBag, X } from 'lucide-react';
import React, { useState, useRef } from 'react';
import AppLogo from './app-logo';
import AppLogoIcon from './app-logo-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

// --- Types ---
interface Category {
    id: number;
    name: string;
    slug: string;
    products_count?: number;
    brands?: {
        id: number;
        name: string;
        slug: string;
    }[];
}

// --- 1. Organized Data ---

const rightNavItems: NavItem[] = [
    {
        title: 'Branches',
        href: '/branches',
        icon: MapPlus,
    },
    {
        title: 'Suppliers',
        href: '/suppliers',
        icon: ShoppingBag,
    },
    {
        title: 'Learn More',
        href: 'https://larable.dev',
        icon: Bike,
    },
];

const features: { title: string; href: string; description: string }[] = [
    {
        title: "LM2 Bicycle Trading",
        href: "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d2704.390268520652!2d120.32140132065776!3d16.547015982846894!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x339185f2599e5a3d%3A0xdfb1df35ec51792d!2sLM2%20Bicycle%20Trading!5e0!3m2!1sen!2sph!4v1764396662532!5m2!1sen!2sph",
        description: "# 4 Baccuit Norte, Bauang, La Union 2501",
    },
];

const contacts = [
    {
        title: "Customer Support",
        href: "/contact/support",
        description:
            "Need help with an online order, shipping, or returns? Reach out to our support team.",
    },
    {
        title: "Service Center",
        href: "/contact/service",
        description:
            "Book a tune-up, flat repair, or full overhaul with our certified mechanics.",
    },
    {
        title: "Visit Showroom",
        href: "/locations",
        description:
            "Find our physical store location to test ride bikes and get professional fitting advice.",
    },
    {
        title: "General Inquiries",
        href: "/contact/general",
        description:
            "Have a question not related to an order? Send us a message or check our FAQ.",
    },
]

// --- 2. Helper Components ---

const ListItem = React.forwardRef<
    React.ElementRef<"a">,
    React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, href, ...props }, ref) => {
    return (
        <li>
            <NavigationMenuLink asChild>
                <Link
                    ref={ref as any}
                    href={href ?? '#'}
                    className={cn(
                        "block select-none space-y-1 rounded-md p-3 leading-none  outline-none transition-colors hover:bg-accent  hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                        className
                    )}
                    {...props}
                >
                    <div className="text-sm font-medium leading-none hover:underline underline-offset-2">{title}</div>
                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        {children}
                    </p>
                </Link>
            </NavigationMenuLink>
        </li>
    )
})
ListItem.displayName = "ListItem"

// --- 3. Main Component ---

export function AppHeader() {
    const page = usePage<SharedData & { categories?: Category[]; auth: { roles: string[] } }>();
    const { auth, categories = [] } = page.props;
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.get('/shop', { search: searchQuery });
            setIsSearchOpen(false);
        }
    };

    const toggleSearch = () => {
        setIsSearchOpen(!isSearchOpen);
        if (!isSearchOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    };

    // Get the dashboard URL based on user role
    const getDashboardUrl = (): string => {
        const roles = (auth as any)?.roles || [];

        if (roles.includes('System Administrator')) {
            return '/system-dashboard';
        }
        if (roles.includes('Branch Manager') || roles.includes('Branch')) {
            return '/branch-dashboard';
        }
        if (roles.includes('Employee')) {
            return '/employee-dashboard';
        }

        // Default fallback
        return '/branch-dashboard';
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-sidebar-border/80  bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">

                {/* --- Left: Mobile Menu & Logo --- */}
                <div className="flex items-center gap-2 lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="-ml-2 h-9 w-9">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                            <SheetHeader>
                                <div className="flex items-center ">
                                    <AppLogoIcon className="h-10 w-10" />
                                    <SheetTitle className="ml-2">LM2 Bicycle Trading</SheetTitle>
                                </div>
                            </SheetHeader>
                            <div className="ml-4 flex flex-col gap-4">
                                {auth.user && (
                                    <Link href={getDashboardUrl()} className="flex items-center gap-2 text-lg font-medium">
                                        Dashboard
                                    </Link>
                                )}
                                <div className="grid gap-2">
                                    <h4 className="font-medium text-muted-foreground">Top Categories</h4>
                                    {categories.map((item) => (
                                        <Link key={item.id} href={`/shop/${item.slug}`} className="block py-1 text-sm hover:underline">
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Logo */}
                <Link href="/" prefetch className="flex items-center space-x-2 mr-4 lg:mr-6">
                    <AppLogo />
                </Link>

                {/* --- Center: Desktop Navigation --- */}
                <div className="hidden lg:flex lg:flex-1">
                    <NavigationMenu>
                        <NavigationMenuList>

                            {/* Home Link */}
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className="bg-ghost"><Link href="/">Home</Link></NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid gap-2 md:w-[500px] lg:w-[600px] lg:grid-cols-[.75fr_1fr]">
                                        <li className="row-span-3">
                                            <NavigationMenuLink asChild>
                                                <a
                                                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                                                    href="/"
                                                >
                                                    <AppLogoIcon className="ml-10 h-30 w-30" />
                                                    <div className="mb-2 mt-4 text-lg font-medium">
                                                        LM2 Bicycle Trading
                                                    </div>
                                                    <p className="text-sm leading-tight text-muted-foreground">
                                                        Your trusted partner in cycling excellence.
                                                    </p>
                                                </a>
                                            </NavigationMenuLink>
                                        </li>
                                        {features.map((component) => (
                                            <div className='w-77' key={component.title}>
                                                <ListItem
                                                    title={component.title}
                                                    href={component.href}
                                                >
                                                    {component.description}
                                                </ListItem>
                                            </div>
                                        ))}
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            {/* Dynamically Render Top Categories as Separate Dropdowns */}
                            {categories.map((category) => (
                                <NavigationMenuItem key={category.id}>
                                    <NavigationMenuTrigger className="bg-ghost">
                                        <Link href={`/shop/${category.slug}`}>{category.name}</Link>
                                    </NavigationMenuTrigger>
                                    <NavigationMenuContent>
                                        <div className="flex w-[500px] p-4 lg:w-[600px]">
                                            {/* Left Col: Main Link & Info */}
                                            <div className="w-1/3 border-r pr-4">
                                                <ul className="grid gap-3">
                                                    <ListItem
                                                        href={`/shop/${category.slug}`}
                                                        title={`View all ${category.name}`}
                                                    >
                                                        See all {category.products_count} products.
                                                    </ListItem>
                                                </ul>
                                            </div>

                                            {/* Right Col: Brands */}
                                            <div className="w-2/3 pl-4">
                                                <h4 className="mb-2 text-sm font-medium leading-none text-muted-foreground">Popular Brands</h4>
                                                {category.brands && category.brands.length > 0 ? (
                                                    <ul className="grid grid-cols-2 gap-2">
                                                        {category.brands.map((brand) => (
                                                            <li key={brand.id}>
                                                                <Link
                                                                    href={`/shop/${category.slug}?brand=${brand.slug}`}
                                                                    className="block select-none rounded-md p-2 text-sm leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                                                >
                                                                    {brand.name}
                                                                </Link>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">No specific brands available.</p>
                                                )}
                                            </div>
                                        </div>
                                    </NavigationMenuContent>
                                </NavigationMenuItem>
                            ))}


                            {/* Support/Contact Dropdown */}
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className="bg-ghost">Support</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid w-[600px] gap-3 md:w-[600px] md:grid-cols-2 lg:w-[600px] p-4">
                                        {contacts.map((component) => (
                                            <ListItem
                                                key={component.title}
                                                title={component.title}
                                                href={component.href}
                                            >
                                                {component.description}
                                            </ListItem>
                                        ))}
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                {/* --- Right: Actions & Auth --- */}
                <div className="ml-auto flex items-center gap-2">
                    <div className={cn(
                        "relative flex items-center transition-all duration-300 ease-in-out",
                        isSearchOpen ? "w-[250px] sm:w-[350px]" : "w-9"
                    )}>
                        <div className={cn(
                            "absolute inset-0 flex items-center overflow-hidden rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 transition-all duration-300",
                            isSearchOpen ? "opacity-100 shadow-sm" : "opacity-0 border-transparent shadow-none pointer-events-none"
                        )}>
                            <form onSubmit={handleSearchSubmit} className="flex h-full w-full items-center px-3">
                                <Search className="h-4 w-4 shrink-0 text-gray-500" />
                                <Input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search products..."
                                    className="h-full w-full border-0 bg-transparent px-2 text-sm focus-visible:ring-0 placeholder:text-gray-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onBlur={() => {
                                        // Keep open if needed, or close if empty? 
                                        // User might click X to close.
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
                                    onClick={() => {
                                        setIsSearchOpen(false);
                                        setSearchQuery('');
                                    }}
                                >
                                    <X className="h-3 w-3 text-gray-400" />
                                </Button>
                            </form>
                        </div>

                        {/* Trigger Button (Visible when closed) */}
                        <div className={cn(
                            "absolute right-0 top-0 flex items-center justify-center transition-all duration-300",
                            isSearchOpen ? "opacity-0 scale-90 pointer-events-none" : "opacity-100 scale-100"
                        )}>
                            <Button variant="ghost" size="icon" onClick={toggleSearch} className="rounded-full">
                                <Search className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                    {/* Auth Logic */}
                    {auth.user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                                        <AvatarFallback>{auth.user.name?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <UserMenuContent user={auth.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/login">
                                <Button variant="default" size="sm">Log in</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}