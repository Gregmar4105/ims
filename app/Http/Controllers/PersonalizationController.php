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
            'currentRingtone' => SiteSetting::get('notification_sound') ? Storage::url(SiteSetting::get('notification_sound')) : '/audio/nokia_3310.mp3',
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

    /**
     * Update the notification ringtone.
     */
    public function updateRingtone(Request $request)
    {
        $validated = $request->validate([
            'ringtone' => 'required|mimes:mp3,wav|max:5120', // 5MB max
        ]);

        // Get old ringtone path
        $oldPath = SiteSetting::get('notification_sound');

        // Store new ringtone
        $path = $request->file('ringtone')->store('ringtones', 'public');

        // Update setting
        SiteSetting::set('notification_sound', $path);

        // Delete old ringtone if it exists
        if ($oldPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        return back()->with('success', 'Notification ringtone updated successfully.');
    }

    /**
     * Reset the notification ringtone to default.
     */
    public function resetRingtone()
    {
        $currentPath = SiteSetting::get('notification_sound');

        // Delete the current custom ringtone file
        if ($currentPath && Storage::disk('public')->exists($currentPath)) {
            Storage::disk('public')->delete($currentPath);
        }

        // Remove the setting
        SiteSetting::where('key', 'notification_sound')->delete();

        return back()->with('success', 'Notification ringtone reset to default.');
    }
}
