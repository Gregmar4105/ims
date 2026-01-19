import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/welcome-layout';
import Footer from '@/components/Footer';
import { PackageOpen } from 'lucide-react';
import { type SharedData } from '@/types';
import Pagination from '@/components/Pagination';

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
    brand?: {
        name: string;
    };
    price: number | null;
}

interface Category {
    id: number;
    name: string;
    slug: string;
    description?: string;
}

interface Props {
    category: Category;
    products: {
        data: Product[];
        links: any[]; // Pagination links
    };
    canRegister?: boolean;
}

export default function CategoryPage({ category, products }: Props) {
    // Helper to determine if a product is "New"
    const isNew = (dateString: string) => {
        const date = new Date(dateString);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return date > thirtyDaysAgo;
    };

    return (
        <>
            <AppLayout>
                <Head title={category.name} />
                <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">

                    {/* Header Section */}
                    <div className="py-10 text-center">
                        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                            {category.name}
                        </h1>
                        <p className="mx-auto mt-4 max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                            Explore our collection of {category.name}.
                        </p>
                    </div>

                    {products.data.length > 0 ? (
                        <>
                            <div className="grid auto-rows-min gap-10 md:grid-cols-4">
                                {products.data.map((product) => (
                                    <div key={product.id} className="group relative flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-black/10 bg-white transition-all hover:shadow-lg dark:border-sidebar-border dark:bg-transparent">
                                        {/* Image Section */}
                                        <div className="relative aspect-square overflow-hidden bg-neutral-50 dark:bg-white/5">
                                            <Link href="/register">
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
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1" title={product.name}>{product.name}</h3>
                                                    <span className="font-bold text-sm bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 whitespace-nowrap">
                                                        ₱{product.price ? Number(product.price).toFixed(2) : '0.00'}
                                                    </span>
                                                </div>
                                                <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                                                    {product.description || 'No description available.'}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center gap-2">
                                                    {product.brand && (
                                                        <span className="text-xs text-gray-500 border px-1.5 py-0.5 rounded">{product.brand.name}</span>
                                                    )}
                                                </div>
                                                <Link href="/register">
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

                            {/* Pagination */}
                            <div className="mt-8 flex justify-center">
                                <Pagination links={products.links} />
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-20">
                            <h3 className="text-lg font-medium text-gray-900">No products found in this category</h3>
                            <p className="text-gray-500">Check back later for new arrivals.</p>
                            <Link href="/">
                                <button className="mt-4 text-sm underline">Go back home</button>
                            </Link>
                        </div>
                    )}
                </div>
            </AppLayout>
            <Footer />
        </>
    );
}
