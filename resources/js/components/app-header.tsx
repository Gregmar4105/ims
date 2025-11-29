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
import { dashboard } from '@/routes';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Menu, Search, Bike, Mars, Venus, Cog, Wind, HatGlasses, MapPlus } from 'lucide-react';
import React from 'react';
import AppLogo from './app-logo';
import AppLogoIcon from './app-logo-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// --- 1. Organized Data ---

const rightNavItems: NavItem[] = [
    {
        title: 'Branches',
        href: '/branches',
        icon: MapPlus,
    },
    {
        title: 'Learn More',
        href: 'https://larable.dev',
        icon:  Bike,
    },
];

const features: { title: string; href: string; description: string }[] = [
    {
        title: "LM2 Bicycle Trading",
        href: "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d2704.390268520652!2d120.32140132065776!3d16.547015982846894!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x339185f2599e5a3d%3A0xdfb1df35ec51792d!2sLM2%20Bicycle%20Trading!5e0!3m2!1sen!2sph!4v1764396662532!5m2!1sen!2sph",
        description: "# 4 Baccuit Norte, Bauang, La Union 2501",
    },
];

const bikes: { title: string; href: string; description: string; }[] = [
    {
        title: "Mountain Bikes",
        href: "/mountain-bikes",
        description: "Built for durability and control on rugged, off-road terrain, such as dirt trails, rocks, and roots.",
    },
    {
        title: "Road Bikes",
        href: "/road-bikes",
        description: "Engineered for speed and efficiency on smooth, paved surfaces.",
    },
    {
        title: "Gravel Bikes",
        href: "/gravel-bikes",
        description: "Versatile hybrids that blend the speed of a road bike with the ruggedness of a mountain bike, designed to handle varied surfaces like asphalt, dirt, and gravel paths. ",
    },
    {
        title: "Electric Bikes",
        href: "/electric-bikes",
        description: "Incorporate an integrated electric motor and a rechargeable battery to provide a pedal assist boost, making cycling easier, particularly on hills or over long distances.",
    }
];

const parts: { title: string; href: string;  }[] = [
    {
        title: "Tires & Tubes",
        href: "/tires-and-tubes"
    },
    {
        title: "Saddles",
        href: "/saddles"
    },
    {
        title: "Drivetrains",
        href: "/drivetrains"
    },
    {
        title: "Pedals",
        href: "/pedals"
    },
    {
        title: "Stems",
        href: "/stems"
    },
    {
        title: "Wheels",
        href: "/wheels"
    },
    {
        title: "Power Meters & Computers",
        href: "/power-meters-and-computers"
    },
    {
        title: "Handlebars",
        href: "/handlebars"
    },
    {
        title: "Seatpost",
        href: "/seatpost"
    },
    {
        title: "Suspension",
        href: "/suspension"
    },
];

const mens: { title: string; href: string;  }[] = [
    {
        title: "Jerseys",
        href: "/jerseys-men"
    },
    {
        title: "Bib & Shorts",
        href: "/bib-and-shorts-men"
    },
    {
        title: "Jackets & Vests",
        href: "/jackets-and-vests-men"
    },
    {
        title: "Base Layers",
        href: "/base-layers-men"
    },
    {
        title: "Warmers",
        href: "/warmers-men"
    },
    {
        title: "Tights",
        href: "/tights-men"
    },
    {
        title: "Gloves",
        href: "/gloves-men"
    },
    {
        title: "Shirts",
        href: "/shirts-men"
    },
    {
        title: "Hats",
        href: "/hats-men"
    },
    {
        title: "Socks",
        href: "/socks-men"
    },
    {
        title: "Hoodies",
        href: "/hoodies-men"
    },
    
];

const womens: { title: string; href: string;  }[] = [
    {
        title: "Jerseys",
        href: "/jerseys-women"
    },
    {
        title: "Bib & Shorts",
        href: "/bib-and-shorts-women"
    },
    {
        title: "Jackets & Vests",
        href: "/jackets-and-vests-women"
    },
    {
        title: "Base Layers",
        href: "/base-layers-women"
    },
    {
        title: "Warmers",
        href: "/warmers-women"
    },
    {
        title: "Tights",
        href: "/tights-women"
    },
    {
        title: "Gloves",
        href: "/gloves-women"
    },
    {
        title: "Shirts",
        href: "/shirts-women"
    },
    {
        title: "Hats",
        href: "/hats-women"
    },
    {
        title: "Socks",
        href: "/socks-women"
    },
    {
        title: "Hoodies",
        href: "/hoodies-women"
    },
    
];

const accessories: { title: string; href: string;  }[] = [
    {
        title: "Shoes",
        href: "/shoes"
    },
    {
        title: "Lights",
        href: "/lights"
    },
    {
        title: "Tools",
        href: "/tools"
    },
    {
        title: "Battle Cages",
        href: "/battle-cages"
    },
    {
        title: "Commute Gear",
        href: "/commute-gear"
    },
    {
        title: "Helmets",
        href: "/helmets"
    },
    {
        title: "Pumps",
        href: "/pumps"
    },
    {
        title: "Grips & Tape",
        href: "/grips-and-tape"
    },
    {
        title: "Bags & Storage",
        href: "/bags-and-storage"
    },
    {
        title: "Waterbottles",
        href: "/waterbottles"
    },
    {
        title: "Turbo Gear",
        href: "/turbo-gear"
    },
    {
        title: "Cycling Glasses",
        href: "/cycling-glasses"
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
    const page = usePage<SharedData>();
    const { auth } = page.props;

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
                                <Link href={dashboard()} className="flex items-center gap-2 text-lg font-medium">
                                    Dashboard
                                </Link>
                                <div className="grid gap-2">
                                    <h4 className="font-medium text-muted-foreground">Features</h4>
                                    {features.map((item) => (
                                        <Link key={item.title} href={item.href} className="block py-1 text-sm hover:underline">
                                            {item.title}
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
                            
                            {/* Dashboard Link */}
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
                                                        Powered by <a href="https://larable.dev" target="_blank" className="text-amber-600">Larable™</a>
                                                    </p>
                                                </a>
                                            </NavigationMenuLink>
                                        </li>
                                        {features.map((component) => (
                                            <div className='w-77'>
                                            <ListItem
                                                key={component.title}
                                                title={component.title}
                                                href={component.href}
                                            >
                                                {component.description}
                                            </ListItem>
                                            </div>
                                        ))}
                                        <div className="ml-3 h-40 w-77">
                                        <iframe 
                                            src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d2704.390268520652!2d120.32140132065776!3d16.547015982846894!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x339185f2599e5a3d%3A0xdfb1df35ec51792d!2sLM2%20Bicycle%20Trading!5e0!3m2!1sen!2sph!4v1764396662532!5m2!1sen!2sph" 
                                            className="w-full h-full" 
                                            loading="lazy"
                                            style={{ border: 0 }} // Optional: removes default border
                                        ></iframe>
                                        </div>
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            {/* Features Dropdown */}
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className="bg-ghost">Bikes</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className="p-3 text-lg font-medium flex">Bicycles <Wind className="rotate-180 ml-1 h-5 w-5 mt-1"/><Bike className="ml-0.5"/></div>
                                    <ul className="grid w-[800px] md:w-[200px] md:grid-cols-2 lg:w-[900px]">
                                        {bikes.map((component) => (
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

                            {/* Company Dropdown */}
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className="bg-ghost">Parts</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className="p-3 text-lg font-medium flex items-center">Bike Parts & Components<Cog className="ml-1" /></div>
                                    <ul className="grid w-[500px] md:w-[200px] md:grid-cols-2 lg:w-[600px]">
                                        {parts.map((component) => (
                                            <ListItem
                                                key={component.title}
                                                title={component.title}
                                                href={component.href}
                                            >
                                            </ListItem>
                                        ))}
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            {/* Company Dropdown */}
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className="bg-ghost">Apparel</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    {/* Added gap and padding for spacing. Adjusted width to fit 2 columns. */}
                                    <ul className="grid w-[400px] p-4 md:w-[500px] md:grid-cols-2 lg:w-[500px]">
                                    
                                    {/* Column 1: Men's */}
                                    <li className="row-span-3">
                                        <div className="mb-2 text-lg font-medium flex items-center">Men's Apparel<Mars className="ml-1" /></div>
                                        <ul className="flex flex-col">
                                        {mens.map((component) => (
                                            <ListItem
                                            key={component.title}
                                            title={component.title}
                                            href={component.href}
                                            >
                                            {/* Add description text here if needed */}
                                            </ListItem>
                                        ))}
                                        </ul>
                                    </li>

                                    {/* Column 2: Women's */}
                                    <li className="row-span-3">
                                        <div className="mb-2 text-lg font-medium flex items-center">Women's Apparel <Venus className="ml-1" /> </div>
                                        <ul className="flex flex-col">
                                        {womens.map((component) => (
                                            <ListItem
                                            key={component.title}
                                            title={component.title}
                                            href={component.href}
                                            >
                                            {/* Add description text here if needed */}
                                            </ListItem>
                                        ))}
                                        </ul>
                                    </li>

                                    </ul>
                                </NavigationMenuContent>
                                </NavigationMenuItem>


                            {/* Company Dropdown */}
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className="bg-ghost">Accessories</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className="p-3 text-lg font-medium flex items-center">Accessories<HatGlasses className="ml-1" /></div>
                                    <ul className="grid w-[600px] md:w-[600px] md:grid-cols-2 lg:w-[600px]">
                                        {accessories.map((component) => (
                                            <ListItem
                                                key={component.title}
                                                title={component.title}
                                                href={component.href}
                                            >
                                            </ListItem>
                                        ))}
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>

                            {/* Company Dropdown */}
                            <NavigationMenuItem>
                                <NavigationMenuTrigger className="bg-ghost">Contact Us</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid w-[700px] gap-3 md:w-[700px] md:grid-cols-2 lg:w-[700px]">
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
                <div className="ml-auto flex items-center space-x-2">

                    <div>
                        <Search className="h-5 w-5"/>
                    </div>
                    
                    {/* Search & Tooltip Icons (Hidden on Mobile) */}
                    <div className="flex items-center space-x-1">
                        
                        <div className="hidden lg:flex">
                            {rightNavItems.map((item) => (
                                <TooltipProvider key={item.title} delayDuration={0}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <a
                                                href={resolveUrl(item.href)}
                                                rel="noopener noreferrer"
                                                className="group inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                            >
                                                {item.icon && (
                                                    <Icon
                                                        iconNode={item.icon}
                                                        className="h-5 w-5 opacity-80 group-hover:opacity-100"
                                                    />
                                                )}
                                                <span className="sr-only">{item.title}</span>
                                            </a>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{item.title}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ))}
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