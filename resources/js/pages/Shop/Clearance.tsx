import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/welcome-layout';
import Footer from '@/components/Footer';
import { PackageOpen } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    description: string | null;
    variations: { name: string; options: string }[] | null;
    image_path: string | null;
    created_at: string;
    brand?: {
        name: string;
    };
    price: number | string;
    clearance_price: number | string | null;
}

interface Props {
    products: Product[];
}

export default function ClearancePage({ products }: Props) {
    return (
        <>
            <AppLayout>
                <Head title="Clearance Sale" />
                <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">

                    {/* Header Section */}
                    <div className="py-10 text-center">
                        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl uppercase">
                            <span className="bg-yellow-400 px-4 py-2">Clearance Sale</span>
                        </h1>
                        <p className="mx-auto mt-6 max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                            Don't miss out on these amazing deals. Limited time only!
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

                                        <div className="absolute left-3 top-3 flex flex-col gap-2">
                                            <span className="bg-yellow-400 px-2 py-1 text-xs font-bold text-black uppercase shadow-sm">
                                                Clearance Sale
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex flex-1 flex-col justify-between gap-4 p-5">

                                        {/* Header & Price */}
                                        <div className="space-y-3">
                                            <div className="flex flex-col gap-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight" title={product.name}>
                                                    {product.name}
                                                </h3>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="bg-yellow-400 px-2 py-1 font-bold text-xl text-black">
                                                        ₱{Number(product.clearance_price).toLocaleString()}
                                                    </span>
                                                    <span className="text-gray-400 line-through text-sm">
                                                        ₱{Number(product.price).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

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
                            <PackageOpen className="mx-auto h-20 w-20 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No products on clearance right now</h3>
                            <p className="text-gray-500">Check back later for amazing deals.</p>
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
