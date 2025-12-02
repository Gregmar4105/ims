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
            return redirect()->intended('/system-dashboard');
        }

        if ($user->hasRole('Branch Administrator')) {
            return redirect()->intended('/branch-dashboard');
        }

        if ($user->hasRole('Employee')) {
            return redirect()->intended('/employee-dashboard');
        }

        abort(403, 'User does not have the right permissions.');
    }
}