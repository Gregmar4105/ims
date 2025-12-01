import { Link } from "@inertiajs/react";

export default function Pagination({ links }){
    const totalLinks = links.length;
    
    // 1. Identify the 'Previous' and 'Next' links, which are the first and last elements.
    const prevLink = links[0];
    const nextLink = links[totalLinks - 1];

    // 2. Extract the actual page number links (excluding Prev and Next)
    const pageLinks = links.slice(1, totalLinks - 1);
    const totalPages = pageLinks.length;
    const activePageIndex = pageLinks.findIndex(l => l.active);
    
    // 3. Define the maximum number of intermediate page links (excluding Prev/Next)
    const maxIntermediateLinks = 5; 
    
    let start = 0;
    let end = totalPages - 1;

    if (totalPages > maxIntermediateLinks) {
        // Calculate a sliding window around the active page
        let windowStart = activePageIndex - Math.floor(maxIntermediateLinks / 2);
        let windowEnd = activePageIndex + Math.ceil(maxIntermediateLinks / 2) - 1;

        // Clamp the window edges
        if (windowStart < 0) {
            windowEnd += -windowStart; // Shift end to the right
            windowStart = 0;
        }
        if (windowEnd >= totalPages) {
            windowStart -= (windowEnd - (totalPages - 1)); // Shift start to the left
            windowEnd = totalPages - 1;
        }

        // Final clamp check to ensure start doesn't go below 0
        start = Math.max(0, windowStart);
        end = Math.min(totalPages - 1, windowEnd);
    }
    
    // Get the page links within the calculated window
    let visiblePageLinks = pageLinks.slice(start, end + 1);

    // 4. Ensure the First (Page 1) and Last Page links are included,
    //    but only if they are not already in the visible window.

    // Get the actual links for Page 1 (index 0 of pageLinks) and the Last Page (index totalPages - 1 of pageLinks)
    const firstPageLink = pageLinks[0];
    const lastPageLink = pageLinks[totalPages - 1];

    // Check if Page 1 is already in the visible set
    if (!visiblePageLinks.includes(firstPageLink) && firstPageLink) {
        visiblePageLinks.unshift(firstPageLink);
        // Add ellipsis if Page 1 is not adjacent to the visible window
        if (pageLinks[start] !== firstPageLink) {
            visiblePageLinks.splice(1, 0, { label: '...', url: null, active: false });
        }
    }

    // Check if the Last Page is already in the visible set
    if (!visiblePageLinks.includes(lastPageLink) && lastPageLink) {
        visiblePageLinks.push(lastPageLink);
        // Add ellipsis if Last Page is not adjacent to the visible window
        if (pageLinks[end] !== lastPageLink) {
            visiblePageLinks.splice(visiblePageLinks.length - 1, 0, { label: '...', url: null, active: false });
        }
    }

    // 5. Assemble the final list: Previous + Visible Pages (+ Ellipsis) + Next
    const limitedLinks = [
        prevLink,
        ...visiblePageLinks.filter((link, index, self) => 
            // Filter out duplicate ellipses (only happens if the start/end window is adjacent to Page 1/Last Page)
            !(link.label === '...' && index > 0 && self[index - 1].label === '...')
        ),
        nextLink
    ].filter((link, index, self) => 
        // A final filter to remove consecutive ellipses
        !(link.label === '...' && index > 0 && self[index - 1].label === '...')
    );


    return(
        <div className="flex flex-wrap items-center space-x-1 mt-4 mr-4 justify-end">
            {limitedLinks.map((link, index) => (
                <Link
                    key={index}
                    href={link.url ?? '#'}
                    // Handle the '...' label differently (no href, no pointer events)
                    dangerouslySetInnerHTML={{__html: link.label }}
                    className={`px-3 py-1 text-sm rounded border 
                        ${link.active ? 'bg-orange-400 text-white hover:bg-orange-600' : 'bg-white text-gray-700 hover:bg-orange-400'} 
                        ${!link.url ? 'pointer-events-none opacity-50' : 'hover:bg-gray-800'}`}
                />
            ))}
        </div>
    )
}