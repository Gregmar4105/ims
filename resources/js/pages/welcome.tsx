import { login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/welcome-layout';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLogoIcon from '@/components/app-logo-icon';
import { Badge } from '@/components/ui/badge';
import Footer from '@/components/Footer';
import { PackageOpen } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    branch_id: number;
    description: string | null;
    variations: { name: string; options: string }[] | null;
    image_path: string | null;
    created_at: string;
    branch?: {
        branch_name: string;
    };
    category?: {
        name: string;
    };
    brand?: {
        name: string;
    };
    price: number | string;
}

interface Category {
    id: number;
    name: string;
    slug: string;
}

export default function Welcome({
    canRegister = true,
    products = [],
    categories = [],
    bannerUrl = 'https://specialized.com.ph/cdn/shop/collections/plp-banner_Bikes_2000x.progressive.jpg?v=1587621713',
}: {
    canRegister?: boolean;
    products?: Product[];
    categories?: Category[];
    bannerUrl?: string;
}) {
    const { auth } = usePage<SharedData>().props;
    const currentYear = new Date().getFullYear();

    // Helper to determine if a product is "New" (e.g. created within last 30 days)
    const isNew = (dateString: string) => {
        const date = new Date(dateString);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return date > thirtyDaysAgo;
    };

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
                    <div className="relative h-145 w-full overflow-hidden rounded-xl border dark:border-sidebar-border">
                        <img
                            className="absolute inset-0 h-full w-full object-cover object-[60%_center]"
                            src={bannerUrl}
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

                    {products.length > 0 ? (
                        <div className="grid auto-rows-min gap-10 md:grid-cols-4">
                            {products.map((product) => (
                                <div key={product.id} className="group relative flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-black/10 bg-white transition-all hover:shadow-lg dark:border-sidebar-border dark:bg-transparent">
                                    {/* Image Section */}
                                    <div className="relative aspect-square overflow-hidden bg-neutral-50 dark:bg-white/5">
                                        <Link href={`/product/${product.id}`}>
                                            {product.image_path ? (
                                                <img
                                                    className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                                                    src={`/storage/${product.image_path}`}
                                                    alt={product.name}
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <PackageOpen className="h-20 w-20 text-gray-300" />
                                                </div>
                                            )}
                                        </Link>

                                        {isNew(product.created_at) && (
                                            <span className="absolute left-3 top-3 rounded-sm bg-black px-2 py-1 text-sm font-bold text-white dark:bg-white dark:text-black">
                                                New
                                            </span>
                                        )}
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex flex-1 flex-col justify-between gap-4 p-5">

                                        {/* Header & Description */}
                                        {/* Header & Description */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-start gap-4">
                                                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight flex-1" title={product.name}>
                                                    {product.name}
                                                </h3>
                                                <p className="font-bold text-lg text-gray-900 dark:text-white whitespace-nowrap">
                                                    ₱{Number(product.price).toLocaleString()}
                                                </p>
                                            </div>

                                            <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                                                {product.description || 'No description available.'}
                                            </p>

                                            {/* Variations */}
                                            {product.variations && Array.isArray(product.variations) && product.variations.length > 0 && (
                                                <div className="space-y-1">
                                                    <span className="text-xs font-semibold text-gray-900 dark:text-white">Variations:</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {product.variations.map((v: any, idx: number) => (
                                                            <span key={idx} className="text-xs text-gray-500 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
                                                                {v.name}: {v.options}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer: Brand & Details */}
                                        <div className="flex items-center justify-between pt-2">

                                            {product.brand && (
                                                <div className="border border-gray-300 px-2 py-0.5 rounded text-xs text-black font-medium dark:text-white dark:border-gray-600">
                                                    {product.brand.name}
                                                </div>
                                            )}

                                            <Link href={`/product/${product.id}`}>
                                                <button className="group/btn flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white">
                                                    View Details
                                                    <svg
                                                        className="h-4 w-4 -translate-x-1 transition-transform group-hover/btn:translate-x-0"
                                                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                    </svg>
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <h3 className="text-lg font-medium text-gray-900">No products found</h3>
                            <p className="text-gray-500">Check back later for new releases.</p>
                        </div>
                    )}
                </div>
            </AppLayout>
            <Footer />
        </>
    );
}
