import { Link } from "@inertiajs/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ links }) {
    const totalLinks = links.length;

    // --- LOGIC (UNTOUCHED) ---
    const prevLink = links[0];
    const nextLink = links[totalLinks - 1];
    const pageLinks = links.slice(1, totalLinks - 1);
    const totalPages = pageLinks.length;
    const activePageIndex = pageLinks.findIndex(l => l.active);
    const maxIntermediateLinks = 5;

    let start = 0;
    let end = totalPages - 1;

    if (totalPages > maxIntermediateLinks) {
        let windowStart = activePageIndex - Math.floor(maxIntermediateLinks / 2);
        let windowEnd = activePageIndex + Math.ceil(maxIntermediateLinks / 2) - 1;

        if (windowStart < 0) {
            windowEnd += -windowStart;
            windowStart = 0;
        }
        if (windowEnd >= totalPages) {
            windowStart -= (windowEnd - (totalPages - 1));
            windowEnd = totalPages - 1;
        }

        start = Math.max(0, windowStart);
        end = Math.min(totalPages - 1, windowEnd);
    }

    let visiblePageLinks = pageLinks.slice(start, end + 1);
    const firstPageLink = pageLinks[0];
    const lastPageLink = pageLinks[totalPages - 1];

    if (!visiblePageLinks.includes(firstPageLink) && firstPageLink) {
        visiblePageLinks.unshift(firstPageLink);
        if (pageLinks[start] !== firstPageLink) {
            visiblePageLinks.splice(1, 0, { label: '...', url: null, active: false });
        }
    }

    if (!visiblePageLinks.includes(lastPageLink) && lastPageLink) {
        visiblePageLinks.push(lastPageLink);
        if (pageLinks[end] !== lastPageLink) {
            visiblePageLinks.splice(visiblePageLinks.length - 1, 0, { label: '...', url: null, active: false });
        }
    }

    const limitedLinks = [
        prevLink,
        ...visiblePageLinks.filter((link, index, self) =>
            !(link.label === '...' && index > 0 && self[index - 1].label === '...')
        ),
        nextLink
    ].filter((link, index, self) =>
        !(link.label === '...' && index > 0 && self[index - 1].label === '...')
    );
    // --- END LOGIC ---

    // Helper to render label (Handles "Previous/Next" text vs Icons)
    const renderLabel = (label) => {
        if (label.includes('Previous')) {
            return <span className="sr-only">Previous</span>;
        }
        if (label.includes('Next')) {
            return <span className="sr-only">Next</span>;
        }
        return <span dangerouslySetInnerHTML={{ __html: label }} />;
    };

    // Helper to pick Icon based on label
    const getIcon = (label) => {
        if (label.includes('Previous')) return <ChevronLeft className="w-4 h-4" />; 
        if (label.includes('Next')) return <ChevronRight className="w-4 h-4" />;
        return null;
    }

    return (
        <div className="flex items-center justify-end border-gray-200 pt-4 px-4 sm:px-0">
            <nav className="isolate inline-flex -space-x-px gap-1 rounded-md shadow-sm" aria-label="Pagination">
                {limitedLinks.map((link, index) => {
                    const isEllipsis = link.label === '...';
                    
                    // Base styles
                    let baseClasses = "relative inline-flex items-center justify-center px-2 py-1 text-sm font-medium transition-colors focus:z-20 focus:outline-offset-0 rounded-md";

                    // Variant styles (Monochrome)
                    if (isEllipsis) {
                        baseClasses += " text-gray-500 bg-transparent cursor-default border-transparent";
                    } else if (link.active) {
                        // Active State (Black/Dark Gray)
                        baseClasses += " z-10 bg-gray-900 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 shadow-sm hover:bg-black";
                    } else if (!link.url) {
                        // Disabled State (Prev/Next when no url)
                        baseClasses += " text-gray-300 bg-white border border-gray-200 cursor-not-allowed";
                    } else {
                        // Default Inactive State (White with Gray Border)
                        baseClasses += " text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-900";
                    }

                    return (
                        <Link
                            key={index}
                            href={link.url ?? '#'}
                            className={baseClasses}
                            // Disable click events for ellipses or disabled links
                            onClick={(e) => (!link.url || isEllipsis) && e.preventDefault()}
                        >
                            {/* Render Icon if it's Prev/Next */}
                            {getIcon(link.label)}
                            
                            {/* Render Text Label */}
                            {renderLabel(link.label)}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}