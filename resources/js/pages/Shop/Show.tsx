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
    branches?: {
        id: number;
        branch_name: string;
        pivot: {
            quantity: number;
        }
    }[];
}

const getParsedVariations = (variations: any): any[] => {
    if (!variations) return [];
    if (typeof variations === 'string') {
        try {
            const decoded = JSON.parse(variations);
            if (Array.isArray(decoded)) return decoded;
        } catch (e) {
            // Might be a plain string
        }
        return [];
    }
    if (Array.isArray(variations)) return variations;
    return [];
};

export default function Show({ product }: { product: Product }) {
    const parsedVariations = getParsedVariations(product.variations);

    const breadcrumbs = [
        { title: 'Home', href: '/' },
        { title: 'Shop', href: '/' },
        { title: product.name, href: `/product/${product.id}` },
    ];

    const lm2Branch = product.branches?.find(b => b.branch_name === 'LM2 Bicycle Trading');
    const isAvailable = lm2Branch && lm2Branch.pivot.quantity > 0;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const imageUrl = product.image_path ? `${origin}/storage/${product.image_path}` : `${origin}/LM2.png`;
    const productUrl = `${origin}/product/${product.id}`;

    const cleanDescription = product.description
        ? product.description.replace(/<[^>]*>/g, '').trim()
        : `Buy ${product.name} online at LM2 Bicycle Trading. Check price, availability, and specs.`;

    const shortDescription = cleanDescription.length > 155
        ? `${cleanDescription.substring(0, 152)}...`
        : cleanDescription;

    const productSchema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": [imageUrl],
        "description": cleanDescription,
        ...(product.brand ? {
            "brand": {
                "@type": "Brand",
                "name": product.brand.name
            }
        } : {}),
        ...(product.category ? {
            "category": product.category.name
        } : {}),
        "offers": {
            "@type": "Offer",
            "url": productUrl,
            "priceCurrency": "PHP",
            "price": product.price ? Number(product.price) : 0,
            "availability": isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition"
        }
    };

    return (
        <>
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title={product.name}>
                    <meta name="description" head-key="description" content={shortDescription} />
                    <meta property="og:title" content={`${product.name} - LM2 Bicycle Trading`} />
                    <meta property="og:description" content={shortDescription} />
                    {product.image_path && (
                        <meta property="og:image" content={imageUrl} />
                    )}
                    <meta property="og:type" content="product" />
                    <meta property="og:url" content={productUrl} />
                    <script type="application/ld+json">
                        {JSON.stringify(productSchema)}
                    </script>
                </Head>
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
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="text-gray-500">
                                            {product.brand.name}
                                        </Badge>
                                        {product.branches && (
                                            <Badge variant={isAvailable ? "default" : "destructive"} className={isAvailable ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                                                {isAvailable ? 'Available' : 'Unavailable'}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                                {!product.brand && product.branches && (
                                    <div className="mb-2">
                                        <Badge variant={isAvailable ? "default" : "destructive"} className={isAvailable ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                                            {isAvailable ? 'Available' : 'Unavailable'}
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


                            {parsedVariations.length > 0 && (
                                <>
                                    <Separator />
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Options</h3>
                                        <div className="space-y-3">
                                            {parsedVariations.map((v: any, idx: number) => {
                                                const optionsArray = Array.isArray(v.options)
                                                    ? v.options.map((opt: any) => typeof opt === 'object' ? opt.value : String(opt))
                                                    : typeof v.options === 'string' ? v.options.split(',') : [];
                                                return (
                                                    <div key={idx} className="flex flex-col gap-1">
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{v.name}</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {optionsArray.map((opt: string, oIdx: number) => (
                                                                <Badge key={oIdx} variant="outline" className="px-3 py-1 font-normal">
                                                                    {opt.trim()}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="mt-8 flex gap-4">
                                {/* Buttons removed per user request */}
                            </div>
                        </div>
                    </div>
                </div>
            </AppLayout>
            <Footer />
        </>
    );
}
