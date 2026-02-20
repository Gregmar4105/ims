<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RestrictEmployeeCrud
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->hasRole('Employee') && !$user->hasAnyRole(['System Administrator', 'Branch Administrator'])) {
            // Allow GET requests, but block 'create' and 'edit' pages
            if ($request->isMethod('GET')) {
                if ($request->routeIs('*.create') || $request->routeIs('*.edit')) {
                    abort(403, 'Unauthorized action.');
                }
                return $next($request);
            }

            // Block all other methods (POST, PUT, PATCH, DELETE)
            abort(403, 'Unauthorized action.');
        }

        return $next($request);
    }
}
