import { InertiaLinkProps } from '@inertiajs/react';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

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
    if (!el) {
        alert("Print fallback failed: Element not found - " + elementId);
        return false;
    }

    try {
        // We use toCanvas instead of toBlob to get the dimensions easily and draw it into jsPDF
        // We set a high scale for clear printing
        const canvas = await toCanvas(el, { pixelRatio: 2, backgroundColor: '#ffffff' });

        // Calculate proportions
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // Create PDF. Use physical size or a standard page size depending on aspect ratio.
        // Let's use pt for precise pixel mapping, orientation based on the element.
        const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
        const pdf = new jsPDF(orientation, 'pt', [imgWidth, imgHeight]);

        // Add the canvas image to the PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        // Try Median JS Bridge if it's injected
        if (typeof window !== 'undefined') {
            const pdfBlob = pdf.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);

            if ((window as any).median?.share?.downloadFile) {
                try {
                    (window as any).median.share.downloadFile({ url: blobUrl });
                    return true;
                } catch (err: any) {
                    alert("Median sharePage error: " + (err?.message || JSON.stringify(err)));
                }
            }
        }

        // Standard Web Share API Fallback for mobile Safari/Chrome
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], filename + '.pdf', { type: 'application/pdf' });

        if (navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Print Document',
            });
            return true;
        }

    } catch (e: any) {
        alert("PDF Generation Error: " + (e?.message || JSON.stringify(e)));
        console.error('Failed native print/share fallback conversion', e);
    }

    // Returns false if neither native feature was triggered, so caller can run window.print()
    return false;
}
