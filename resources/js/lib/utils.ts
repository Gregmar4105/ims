import { InertiaLinkProps } from '@inertiajs/react';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toBlob } from 'html-to-image';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function isSameUrl(
    url1: NonNullable<InertiaLinkProps['href']>,
    url2: NonNullable<InertiaLinkProps['href']>,
) {
    return resolveUrl(url1) === resolveUrl(url2);
}

export function resolveUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

export async function handleNativePrintFallback(elementId: string, filename: string): Promise<boolean> {
    const el = document.getElementById(elementId);
    if (!el) return false;

    // Temporarily apply print styles if needed? Actually html-to-image usually respects the current style.

    try {
        const blob = await toBlob(el, { pixelRatio: 2, backgroundColor: '#ffffff' });
        if (!blob) return false;

        // Force Android/Median to treat this as a document/PDF rather than a basic image 
        // to encourage the "Print" option in the intent chooser.
        const file = new File([blob], filename + '.pdf', { type: 'application/pdf' });

        // 1. Try Median JS Bridge if it's injected
        if (typeof window !== 'undefined' && (window as any).median?.share?.sharePage) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                const base64data = reader.result as string;
                // Replace the MIME type in the base64 string to match the forced PDF type
                const pdfBase64 = base64data.replace(/^data:image\/(png|jpeg);/, 'data:application/pdf;');
                (window as any).median.share.sharePage({ url: pdfBase64 });
            };
            return true; // Assume success if Median intercept function exists
        }

        // 2. Try Standard Web Share API (often blocked in Median but works for native Safari/Chrome mobile)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Print Document',
            });
            return true;
        }

    } catch (e) {
        console.error('Failed native print/share fallback conversion', e);
    }

    // Returns false if neither native feature was triggered, so caller can run window.print()
    return false;
}
