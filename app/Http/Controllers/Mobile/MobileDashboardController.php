<?php

namespace App\Http\Controllers\Mobile;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Inertia\Inertia;

/**
 * Serves the mobile dashboard Inertia page.
 * No local auth required — the page authenticates against
 * the remote API using the token stored in the browser's localStorage.
 */
class MobileDashboardController extends Controller
{
    public function index()
    {
        return Inertia::render('mobile/dashboard');
    }
}
