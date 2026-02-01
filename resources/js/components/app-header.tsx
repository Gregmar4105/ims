import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.get('/shop', { search: searchQuery });
            setIsSearchOpen(false);
        }
    };

    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        if (query.trim().length > 1) {
            debounceTimeout.current = setTimeout(async () => {
                try {
                    const res = await fetch(`/shop/suggestions?q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    setSuggestions(data);
                } catch (error) {
                    console.error("Failed to fetch suggestions", error);
                }
            }, 300);
        } else {
            setSuggestions([]);
        }
    };

    const toggleSearch = () => {
        setIsSearchOpen(!isSearchOpen);
        // Suggestions clearing
        if (!isSearchOpen) {
            setSuggestions([]);
            setSearchQuery('');
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
                                            <div className='w-full' key={component.title}>
                                                <ListItem
                                                    title={component.title}
                                                    href={component.href}
                                                >
                                                    {component.description}
                                                </ListItem>
                                                {component.href.includes('google.com/maps/embed') && (
                                                    <div className="mt-2 aspect-video w-full overflow-hidden rounded-md border text-xs text-muted-foreground">
                                                        <iframe
                                                            src={component.href}
                                                            className="h-full w-full border-0"
                                                            allowFullScreen
                                                            loading="lazy"
                                                            referrerPolicy="no-referrer-when-downgrade"
                                                        />
                                                    </div>
                                                )}
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
                    <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <Search className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden gap-0">
                            <div className="flex items-center border-b px-3">
                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                <form onSubmit={handleSearchSubmit} className="flex h-full w-full">
                                    <Input
                                        ref={searchInputRef}
                                        className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground border-none focus-visible:ring-0 shadow-none"
                                        placeholder="Search products..."
                                        value={searchQuery}
                                        onChange={handleSearchInput}
                                    />
                                </form>
                            </div>
                            {suggestions.length > 0 && (
                                <div className="max-h-[300px] overflow-y-auto p-2">
                                    <h4 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">Suggestions</h4>
                                    {suggestions.map((product) => (
                                        <Link
                                            key={product.id}
                                            href={`/product/${product.id}`} // Or product slug if available
                                            className="flex items-center gap-3 rounded-md p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                                            onClick={() => setIsSearchOpen(false)}
                                        >
                                            {product.image_path ? (
                                                <img src={`/storage/${product.image_path}`} alt={product.name} className="h-10 w-10 object-contain rounded bg-white p-1 border" />
                                            ) : (
                                                <div className="h-10 w-10 flex items-center justify-center bg-gray-100 rounded text-gray-400">
                                                    <Bike className="h-5 w-5" />
                                                </div>
                                            )}
                                            <div className="flex-1 overflow-hidden">
                                                <div className="truncate font-medium">{product.name}</div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {product.brand?.name} • ₱{product.price ? Number(product.price).toLocaleString() : '0.00'}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                    <div className="border-t mt-2 pt-2">
                                        <button
                                            onClick={(e) => handleSearchSubmit(e as any)}
                                            className="w-full text-left px-2 py-1.5 text-sm text-blue-600 hover:underline"
                                        >
                                            View all results for "{searchQuery}"
                                        </button>
                                    </div>
                                </div>
                            )}
                            {suggestions.length === 0 && searchQuery.length > 1 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    No products found.
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
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