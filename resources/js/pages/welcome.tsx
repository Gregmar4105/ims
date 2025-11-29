import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/welcome-layout';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLogoIcon from '@/components/app-logo-icon';
import { Badge } from '@/components/ui/badge';
import Footer from '@/components/Footer';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const currentYear = new Date().getFullYear();
    return (
        
        <>
            <AppLayout>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
                    rel="stylesheet"
                />
            </Head>
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                        <div className="relative h-145 w-full overflow-hidden rounded-xl border border-black dark:border-sidebar-border">
                            <img 
                                className="absolute inset-0 h-full w-full object-cover object-[60%_center]" 
                                src="https://specialized.com.ph/cdn/shop/collections/plp-banner_Bikes_2000x.progressive.jpg?v=1587621713" 
                                alt="Bike shop banner"
                            />
                        </div>
                        <div className="py-10 text-center">
                          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                            New Releases
                          </h1>
                          <p className="mx-auto mt-4 max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                            Explore our latest collection for the season.
                          </p>
                        </div>
                            <div className="grid auto-rows-min gap-10 md:grid-cols-4">

                                <div className="group relative flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-black/10 bg-white transition-all hover:shadow-lg dark:border-sidebar-border dark:bg-transparent">
  
                                    {/* Image Section */}
                                    <div className="relative aspect-square overflow-hidden bg-neutral-50 dark:bg-white/5">
                                    <a href="/register">
                                        <img 
                                        className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" 
                                        src="https://specialized.com.ph/cdn/shop/files/96223-31_DIVERGE-STR-EXPERT-HRVGLD-GLDGSTPRL_HERO_600x.png?v=1715761700" 
                                        alt="Diverge STR Expert" 
                                        />
                                    </a>
                                        {/* Optional: 'New' or 'Sale' Badge */}
                                        <span className="absolute left-3 top-3 rounded-sm bg-black px-2 py-1 text-sm font-bold text-white dark:bg-white dark:text-black">
                                        New
                                        </span>
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                                        
                                        {/* Header & Description */}
                                        <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Diverge STR Expert</h3>
                                            <p className="font-medium text-gray-900 dark:text-white">PHP 54,500</p>
                                        </div>
                                        <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                                            Smoothing out the road with Future Shock suspension front and rear. The ultimate gravel machine.
                                        </p>
                                        </div>

                                        {/* Footer: Colors & CTA */}
                                        <div className="flex items-center justify-between pt-2">
                                        
                                        {/* Color Swatches */}
                                        <div className="flex items-center gap-2">
                                            <span className="sr-only">Available colors</span>
                                            <div className="h-4 w-4 rounded-full border border-gray-200 bg-[#E8BC55] ring-1 ring-transparent ring-offset-2 transition-all hover:ring-black/20 dark:border-white/10 dark:ring-offset-black"></div>
                                        </div>

                                        {/* Subtle View Details */}
                                        <a href="/register">
                                        <button className="group/btn flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white">
                                                View Details
                                            <svg 
                                            className="h-4 w-4 -translate-x-1 transition-transform group-hover/btn:translate-x-0" 
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                            >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                        </button>
                                        </a>
                                        </div>
                                    </div>
                                </div>

                                <div className="group relative flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-black/10 bg-white transition-all hover:shadow-lg dark:border-sidebar-border dark:bg-transparent">
  
                                    {/* Image Section */}
                                    <div className="relative aspect-square overflow-hidden bg-neutral-50 dark:bg-white/5">
                                    <a href="/register">
                                        <img 
                                        className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" 
                                        src="https://specialized.com.ph/cdn/shop/files/73320-21_SJ-LTD-CARBON-EVO-29-FRM-TLD_HERO_600x.jpg?v=1737475024" 
                                        alt="Diverge STR Expert" 
                                        />
                                    </a>
                                        {/* Optional: 'New' or 'Sale' Badge */}
                                        <span className="absolute left-3 top-3 rounded-full bg-black px-2 py-1 text-xs font-bold text-white dark:bg-white dark:text-black">
                                        New
                                        </span>
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                                        
                                        {/* Header & Description */}
                                        <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Diverge STR Expert</h3>
                                            <p className="font-medium text-gray-900 dark:text-white">$4,500</p>
                                        </div>
                                        <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                                            Smoothing out the road with Future Shock suspension front and rear. The ultimate gravel machine.
                                        </p>
                                        </div>

                                        {/* Footer: Colors & CTA */}
                                        <div className="flex items-center justify-between pt-2">
                                        
                                        {/* Color Swatches */}
                                        <div className="flex items-center gap-2">
                                            <span className="sr-only">Available colors</span>
                                            <div className="h-4 w-4 rounded-full border border-gray-200 bg-[#E8BC55] ring-1 ring-transparent ring-offset-2 transition-all hover:ring-black/20 dark:border-white/10 dark:ring-offset-black"></div>
                                        </div>

                                        {/* Subtle View Details */}
                                        <a href="/register">
                                        <button className="group/btn flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white">
                                                View Details
                                            <svg 
                                            className="h-4 w-4 -translate-x-1 transition-transform group-hover/btn:translate-x-0" 
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                            >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                        </button>
                                        </a>
                                        </div>
                                    </div>
                                </div>


                                <div className="group relative flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-black/10 bg-white transition-all hover:shadow-lg dark:border-sidebar-border dark:bg-transparent">
  
                                    {/* Image Section */}
                                    <div className="relative aspect-square overflow-hidden bg-neutral-50 dark:bg-white/5">
                                    <a href="/register">
                                        <img 
                                        className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" 
                                        src="https://specialized.com.ph/cdn/shop/products/48118-200_COMP_SW-POWER-CRANKS-DUAL_TARBLK_HERO_600x.jpg?v=1650874442" 
                                        alt="Diverge STR Expert" 
                                        />
                                    </a>
                                        {/* Optional: 'New' or 'Sale' Badge */}
                                        <span className="absolute left-3 top-3 rounded-full bg-black px-2 py-1 text-xs font-bold text-white dark:bg-white dark:text-black">
                                        New
                                        </span>
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                                        
                                        {/* Header & Description */}
                                        <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Diverge STR Expert</h3>
                                            <p className="font-medium text-gray-900 dark:text-white">$4,500</p>
                                        </div>
                                        <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                                            Smoothing out the road with Future Shock suspension front and rear. The ultimate gravel machine.
                                        </p>
                                        </div>

                                        {/* Footer: Colors & CTA */}
                                        <div className="flex items-center justify-between pt-2">
                                        
                                        {/* Color Swatches */}
                                        <div className="flex items-center gap-2">
                                            <span className="sr-only">Available colors</span>
                                            <div className="h-4 w-4 rounded-full border border-gray-200 bg-[#E8BC55] ring-1 ring-transparent ring-offset-2 transition-all hover:ring-black/20 dark:border-white/10 dark:ring-offset-black"></div>
                                        </div>

                                        {/* Subtle View Details */}
                                        <a href="/register">
                                        <button className="group/btn flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white">
                                                View Details
                                            <svg 
                                            className="h-4 w-4 -translate-x-1 transition-transform group-hover/btn:translate-x-0" 
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                            >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                        </button>
                                        </a>
                                        </div>
                                    </div>
                                </div>


                                <div className="group relative flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-black/10 bg-white transition-all hover:shadow-lg dark:border-sidebar-border dark:bg-transparent">
  
                                    {/* Image Section */}
                                    <div className="relative aspect-square overflow-hidden bg-neutral-50 dark:bg-white/5">
                                    <a href="/register">
                                        <img 
                                        className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" 
                                        src="https://specialized.com.ph/cdn/shop/products/184129_600x.jpg?v=1608712152" 
                                        alt="Diverge STR Expert" 
                                        />
                                    </a>
                                        {/* Optional: 'New' or 'Sale' Badge */}
                                        <span className="absolute left-3 top-3 rounded-full bg-black px-2 py-1 text-xs font-bold text-white dark:bg-white dark:text-black">
                                        New
                                        </span>
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                                        
                                        {/* Header & Description */}
                                        <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">Diverge STR Expert</h3>
                                            <p className="font-medium text-gray-900 dark:text-white">$4,500</p>
                                        </div>
                                        <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                                            Smoothing out the road with Future Shock suspension front and rear. The ultimate gravel machine.
                                        </p>
                                        </div>

                                        {/* Footer: Colors & CTA */}
                                        <div className="flex items-center justify-between pt-2">
                                        
                                        {/* Color Swatches */}
                                        <div className="flex items-center gap-2">
                                            <span className="sr-only">Available colors</span>
                                            <div className="h-4 w-4 rounded-full border border-gray-200 bg-[#E8BC55] ring-1 ring-transparent ring-offset-2 transition-all hover:ring-black/20 dark:border-white/10 dark:ring-offset-black"></div>
                                        </div>

                                        {/* Subtle View Details */}
                                        <a href="/register">
                                        <button className="group/btn flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white">
                                                View Details
                                            <svg 
                                            className="h-4 w-4 -translate-x-1 transition-transform group-hover/btn:translate-x-0" 
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                            >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                        </button>
                                        </a>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
            </AppLayout>
            <Footer/>
        </>
    );
}
