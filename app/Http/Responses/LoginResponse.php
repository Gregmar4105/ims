<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    /**
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function toResponse($request)
    {
        // 1. Get the currently logged in user
        $user = $request->user();

        // 2. Check Roles (using Spatie's syntax)
        if ($user->hasRole('System Administrator')) {
            return redirect('/branch-dashboard');
        }

        if ($user->hasRole('Branch Administrator')) {
            return redirect('/branch-dashboard');
        }

        if ($user->hasRole('Employee')) {
            return redirect('/employee-dashboard');
        }

        // If the user does not have any of the required roles, log them out
        // to prevent getting stuck in a 403 session redirection loop.
        auth()->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->withErrors([
            'email' => 'Your account does not have any roles assigned. Please contact your system administrator.',
        ]);
    }
}