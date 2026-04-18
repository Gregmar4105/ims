<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $roles = \Spatie\Permission\Models\Role::withCount('users')->get();

        return response()->json([
            'data' => $roles
        ]);
    }
}
