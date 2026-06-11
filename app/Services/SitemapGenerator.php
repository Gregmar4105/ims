<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Category;
use App\Models\Branch;
use Carbon\Carbon;

class SitemapGenerator
{
    /**
     * Generate the sitemap XML string.
     */
    public function generate(): string
    {
        $baseUrl = config('app.url', 'https://lm2bicycletrading.larable.dev');
        $baseUrl = rtrim($baseUrl, '/');

        // 1. Get latest dates for lastmod tags
        
        // Find latest updated product in LM2 Bicycle Trading
        $latestProduct = Product::whereHas('branches', function ($query) {
            $query->where('branch_name', 'LM2 Bicycle Trading');
        })->latest('updated_at')->first();

        $homepageLastmod = $latestProduct ? $latestProduct->updated_at : Carbon::now();

        // Find latest active category
        $latestCategory = Category::where('status', 'Active')->latest('updated_at')->first();
        $shopLastmod = $latestCategory ? $latestCategory->updated_at : Carbon::now();
        if ($latestProduct && $latestProduct->updated_at->gt($shopLastmod)) {
            $shopLastmod = $latestProduct->updated_at;
        }

        // Find latest updated branch
        $latestBranch = Branch::latest('updated_at')->first();
        $locationsLastmod = $latestBranch ? $latestBranch->updated_at : Carbon::now();

        // 2. Build URL configurations
        $urls = [];

        // Homepage (/)
        $urls[] = [
            'loc' => $baseUrl . '/',
            'lastmod' => $homepageLastmod->toAtomString(),
            'changefreq' => 'daily',
            'priority' => '1.0'
        ];

        // Shop Index (/shop)
        $urls[] = [
            'loc' => $baseUrl . '/shop',
            'lastmod' => $shopLastmod->toAtomString(),
            'changefreq' => 'daily',
            'priority' => '0.9'
        ];

        // Clearance Sale (/clearance-sale)
        $latestClearance = Product::whereNotNull('clearance_price')
            ->where(function ($q) {
                $q->whereNull('clearance_until')
                  ->orWhere('clearance_until', '>', now());
            })
            ->latest('updated_at')
            ->first();
        $clearanceLastmod = $latestClearance ? $latestClearance->updated_at : Carbon::now();
        $urls[] = [
            'loc' => $baseUrl . '/clearance-sale',
            'lastmod' => $clearanceLastmod->toAtomString(),
            'changefreq' => 'daily',
            'priority' => '0.8'
        ];

        // Locations (/locations)
        $urls[] = [
            'loc' => $baseUrl . '/locations',
            'lastmod' => $locationsLastmod->toAtomString(),
            'changefreq' => 'weekly',
            'priority' => '0.7'
        ];

        // Downloads (/downloads)
        $urls[] = [
            'loc' => $baseUrl . '/downloads',
            'lastmod' => Carbon::now()->startOfMonth()->toAtomString(),
            'changefreq' => 'monthly',
            'priority' => '0.5'
        ];

        // Category Detail Pages (/shop/{slug})
        $categories = Category::where('status', 'Active')->get();
        foreach ($categories as $category) {
            $urls[] = [
                'loc' => $baseUrl . '/shop/' . $category->slug,
                'lastmod' => $category->updated_at->toAtomString(),
                'changefreq' => 'weekly',
                'priority' => '0.8'
            ];
        }

        // Product Detail Pages (/product/{id})
        $products = Product::whereHas('branches', function ($query) {
            $query->where('branch_name', 'LM2 Bicycle Trading');
        })->get();

        foreach ($products as $product) {
            $urls[] = [
                'loc' => $baseUrl . '/product/' . $product->id,
                'lastmod' => $product->updated_at->toAtomString(),
                'changefreq' => 'weekly',
                'priority' => '0.8'
            ];
        }

        // 3. Assemble the XML structure
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach ($urls as $url) {
            $xml .= "    <url>\n";
            $xml .= "        <loc>" . htmlspecialchars($url['loc']) . "</loc>\n";
            $xml .= "        <lastmod>" . $url['lastmod'] . "</lastmod>\n";
            $xml .= "        <changefreq>" . $url['changefreq'] . "</changefreq>\n";
            $xml .= "        <priority>" . $url['priority'] . "</priority>\n";
            $xml .= "    </url>\n";
        }

        $xml .= '</urlset>';

        return $xml;
    }
}
