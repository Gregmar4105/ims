<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BranchProfileController extends Controller
{
    /**
     * Show the branch profile settings form.
     */
    public function edit(Request $request)
    {
        $user = $request->user();
        
        // Ensure user has a branch
        if (!$user->branch_id) {
            abort(403, 'You do not belong to any branch.');
        }

        return Inertia::render('settings/branch-profile', [
            'branch' => $user->branch,
        ]);
    }

    /**
     * Update the branch's profile photo.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        if (!$user->branch_id) {
            abort(403, 'You do not belong to any branch.');
        }

        $request->validate([
            'photo' => ['nullable', 'image', 'max:2048'], // Max 2MB
        ]);

        $branch = $user->branch;

        if ($request->hasFile('photo')) {
            // Delete old photo
            if ($branch->profile_photo_path) {
                Storage::disk('public')->delete($branch->profile_photo_path);
            }

            // Generate filename and save
            $file = $request->file('photo');
            $filename = (string) Str::uuid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('branch_profiles', $filename, 'public');

            $branch->forceFill([
                'profile_photo_path' => $path,
            ])->save();
        } elseif ($request->input('clear_photo') === true) {
             // Let them remove photo if they pass boolean
              if ($branch->profile_photo_path) {
                Storage::disk('public')->delete($branch->profile_photo_path);
            }
            $branch->forceFill([
                'profile_photo_path' => null,
            ])->save();
        }

        return back()->with('status', 'branch-profile-updated');
    }
}
