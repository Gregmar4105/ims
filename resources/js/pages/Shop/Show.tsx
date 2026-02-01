import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/welcome-layout';
import Footer from '@/components/Footer';
import { PackageOpen, ArrowLeft, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Product {
    id: number;
    name: string;
    description: string | null;
    image_path: string | null;
    price: number | string | null;
    variations: { name: string; options: string }[] | null; // Adjust based on actual data structure
    brand?: {
        name: string;
        slug: string;
    };
    category?: {
        name: string;
        slug: string;
    };
}

export default function Show({ product }: { product: Product }) {

    const breadcrumbs = [
        { title: 'Home', href: '/' },
        { title: 'Shop', href: '/' },
        { title: product.name, href: `/product/${product.id}` },
    ];

    return (
        <>
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title={product.name} />
                <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                    {/* Back Button */}
                    <div className="mb-6">
                        <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Shop
                        </Link>
                    </div>

                    <div className="grid gap-10 lg:grid-cols-2">
                        {/* Left Column: Image */}
                        <div className="relative overflow-hidden rounded-xl border bg-white p-8 dark:border-sidebar-border dark:bg-zinc-900">
                            {product.image_path ? (
                                <img
                                    src={`/storage/${product.image_path}`}
                                    alt={product.name}
                                    className="h-full w-full object-contain object-center transition-transform hover:scale-105 duration-500"
                                />
                            ) : (
                                <div className="flex h-96 w-full items-center justify-center bg-gray-50 dark:bg-zinc-800">
                                    <PackageOpen className="h-24 w-24 text-gray-300" />
                                </div>
                            )}
                        </div>

                        {/* Right Column: Details */}
                        <div className="flex flex-col gap-6">
                            <div>
                                {product.brand && (
                                    <div className="mb-2">
                                        <Badge variant="outline" className="text-gray-500">
                                            {product.brand.name}
                                        </Badge>
                                    </div>
                                )}
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                                    {product.name}
                                </h1>
                                {product.category && (
                                    <p className="mt-2 text-sm text-gray-500">
                                        Category: <span className="font-medium text-gray-900 dark:text-gray-300">{product.category.name}</span>
                                    </p>
                                )}
                            </div>

                            <div className="flex items-end gap-4">
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    ₱{product.price ? Number(product.price).toLocaleString() : '0.00'}
                                </p>
                            </div>

                            <Separator />

                            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Description</h3>
                                <p className="whitespace-pre-wrap">{product.description || "No description available."}</p>
                            </div>

                            {product.variations && Array.isArray(product.variations) && product.variations.length > 0 && (
                                <>
                                    <Separator />
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Options</h3>
                                        {/* Render variations here if structure is known */}
                                        {/* For now just dumping as JSON or basic list if structure is array of objects */}
                                        <div className="space-y-2">
                                            {/* Example rendering assuming variations is array of objects or strings */}
                                            <pre className="text-xs bg-gray-100 p-2 rounded dark:bg-zinc-800 hidden">
                                                {JSON.stringify(product.variations, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="mt-8 flex gap-4">
                                <Button size="lg" className="w-full md:w-auto" disabled>
                                    Out of Stock (Quantity Hidden)
                                </Button>
                                {/* Note: User asked to hide quantity. Usually that implies not showing 'Out of Stock' based on quantity? 
                                    Or just hiding the number. If availability is unknown, maybe just a "Contact Us" or "Visit Store" button? 
                                    The user didn't specify CTA. Since it's a welcome page, maybe "Visit Store" is better.
                                */}
                                <Button variant="outline" size="lg" asChild>
                                    <Link href="/locations">Visit Store</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </AppLayout>
            <Footer />
        </>
    );
}
