<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * Issue a Sanctum API token for the NativePHP Android app.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Revoke old mobile tokens to prevent accumulation
        $user->tokens()->where('name', 'mobile-app')->delete();

        $token = $user->createToken('mobile-app')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'branch_id'  => $user->branch_id,
                'branch'     => $user->branch?->only(['id', 'branch_name', 'location']),
                'roles'      => $user->getRoleNames(),
                'avatar_url' => $user->profile_photo_url,
            ],
        ]);
    }

    /**
     * Return the currently authenticated user's info.
     */
    public function user(Request $request)
    {
        $user = $request->user()->load('branch');

        return response()->json([
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'branch_id'  => $user->branch_id,
            'branch'     => $user->branch?->only(['id', 'branch_name', 'location']),
            'roles'      => $user->getRoleNames(),
            'permissions'=> $user->getAllPermissions()->pluck('name'),
            'avatar_url' => $user->profile_photo_url,
        ]);
    }

    /**
     * Revoke the current mobile token (logout).
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    /**
     * Save the user's OneSignal push notification token.
     */
    public function savePushToken(Request $request)
    {
        $request->validate(['push_token' => 'required|string']);

        $request->user()->update([
            'onesignal_player_id' => $request->push_token,
        ]);

        return response()->json(['message' => 'Push token saved.']);
    }
}
