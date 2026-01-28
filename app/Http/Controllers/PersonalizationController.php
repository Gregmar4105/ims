<?php

namespace App\Http\Controllers;

use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PersonalizationController extends Controller
{
    /**
     * Display the personalization settings page.
     */
    public function index()
    {
        $bannerPath = SiteSetting::get('homepage_banner');
        $bannerUrl = $bannerPath ? Storage::url($bannerPath) : null;

        return Inertia::render('Personalization/Index', [
            'currentBanner' => $bannerUrl,
            'defaultBanner' => 'https://specialized.com.ph/cdn/shop/collections/plp-banner_Bikes_2000x.progressive.jpg?v=1587621713',
        ]);
    }

    /**
     * Update the homepage banner.
     */
    public function updateBanner(Request $request)
    {
        $validated = $request->validate([
            'banner' => 'required|image|max:5120', // 5MB max
        ]);

        // Get old banner path to delete later
        $oldBannerPath = SiteSetting::get('homepage_banner');

        // Store the new banner
        $path = $request->file('banner')->store('banners', 'public');

        // Update the setting
        SiteSetting::set('homepage_banner', $path);

        // Delete old banner if it exists
        if ($oldBannerPath && Storage::disk('public')->exists($oldBannerPath)) {
            Storage::disk('public')->delete($oldBannerPath);
        }

        return back()->with('success', 'Homepage banner updated successfully.');
    }

    /**
     * Reset the homepage banner to default.
     */
    public function resetBanner()
    {
        $currentPath = SiteSetting::get('homepage_banner');

        // Delete the current banner file
        if ($currentPath && Storage::disk('public')->exists($currentPath)) {
            Storage::disk('public')->delete($currentPath);
        }

        // Remove the setting (will fall back to default)
        SiteSetting::where('key', 'homepage_banner')->delete();

        return back()->with('success', 'Homepage banner reset to default.');
    }
}
