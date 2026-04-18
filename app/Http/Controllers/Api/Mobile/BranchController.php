<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $branches = \App\Models\Branch::withCount(['users', 'products'])->get();

        return response()->json([
            'data' => $branches
        ]);
    }
}
