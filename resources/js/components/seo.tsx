import { Head, usePage } from '@inertiajs/react';
import React from 'react';

export default function SEO() {
    const { url } = usePage();
    const { seo } = usePage().props as any;

    // Construct the full canonical URL. 
    // In production, window.location.origin should be used.
    const canonicalUrl = typeof window !== 'undefined' 
        ? window.location.origin + url 
        : '';

    return (
        <Head>
            <link rel="canonical" href={canonicalUrl} />
            {seo?.description && <meta name="description" content={seo.description} />}
            {seo?.keywords && <meta name="keywords" content={seo.keywords} />}
        </Head>
    );
}
