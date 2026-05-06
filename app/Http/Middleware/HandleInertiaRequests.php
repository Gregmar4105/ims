<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\SiteSetting;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        // ── NativePHP Android: skip ALL custom DB queries ─────────────────
        // The Android app is a REST API client. Local SQLite only has the
        // baseline framework tables — no products/sales/branches/categories.
        // All data is fetched from https://lm2bicycletrading.larable.dev
        if (config('nativephp-internal.running')) {
            return [
                ...parent::share($request),
                'reorderCount'      => 0,
                'name'              => config('app.name'),
                'quote'             => ['message' => trim($message), 'author' => trim($author)],
                'auth'              => [
                    'user'        => null,
                    'permissions' => [],
                    'roles'       => [],
                ],
                'sidebarOpen'       => true,
                'categories'        => [],
                'notification_sound'=> '/audio/nokia_3310.mp3',
            ];
        }

        // ── Web app: normal DB-backed shared data ─────────────────────────
        $reorderCount = 0;
        if ($user = $request->user()) {
            try {
                if ($user->hasRole('System Administrator')) {
                    $reorderCount = \Illuminate\Support\Facades\DB::table('branch_products')
                        ->whereNotNull('reorder_level')
                        ->where('reorder_level', '>', 0)
                        ->whereRaw('quantity <= reorder_level')
                        ->count();
                } elseif ($user->branch_id) {
                    $reorderCount = \Illuminate\Support\Facades\DB::table('branch_products')
                        ->where('branch_id', $user->branch_id)
                        ->whereNotNull('reorder_level')
                        ->where('reorder_level', '>', 0)
                        ->whereRaw('quantity <= reorder_level')
                        ->count();
                }
            } catch (\Throwable) {
                $reorderCount = 0;
            }
        }

        $categories = [];
        try {
            $categories = \App\Models\Category::where('status', 'Active')
                ->withCount('products')
                ->orderByDesc('products_count')
                ->take(20)
                ->get()
                ->unique('name')
                ->take(5)
                ->values()
                ->map(function ($category) {
                    $category->setRelation('brands', \App\Models\Brand::whereHas('products', function ($q) use ($category) {
                        $q->where('category_id', $category->id)
                          ->whereHas('branches', function ($bq) {
                              $bq->whereIn('branch_name', ['Main Branch', 'LM2 Bicycle Trading']);
                          });
                    })->take(5)->get(['id', 'name', 'slug']));
                    return $category;
                });
        } catch (\Throwable) {
            $categories = [];
        }

        $notificationSound = function () {
            try {
                $path = \App\Models\SiteSetting::get('notification_sound');
                return $path ? Storage::url($path) : '/audio/nokia_3310.mp3';
            } catch (\Throwable) {
                return '/audio/nokia_3310.mp3';
            }
        };

        $brands = [];
        try {
            $brands = \App\Models\Brand::where('status', 'Active')
                ->orderBy('name')
                ->get(['id', 'name', 'slug']);
        } catch (\Throwable) {
            $brands = [];
        }

        // Determine active branch for administrators
        $currentBranch = null;
        if ($user) {
            $activeBranchId = $request->input('branch_id', session('active_branch_id', $user->branch_id));
            if ($activeBranchId) {
                $currentBranch = \App\Models\Branch::find($activeBranchId);
            }
        }

        return [
            ...parent::share($request),
            'reorderCount'      => $reorderCount,
            'name'              => config('app.name'),
            'quote'             => ['message' => trim($message), 'author' => trim($author)],
            'auth'              => [
                'user'        => $request->user()?->load('branch'),
                'permissions' => $request->user()
                    ? $request->user()->getAllPermissions()->pluck('name')
                    : [],
                'roles'       => $request->user()
                    ? $request->user()->getRoleNames()
                    : [],
                'branches'    => $request->user()?->hasRole('System Administrator')
                    ? \App\Models\Branch::orderBy('branch_name')->get(['id', 'branch_name'])
                    : [],
            ],
            'sidebarOpen'       => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'categories'        => $categories,
            'brands'            => $brands,
            'notification_sound'=> $notificationSound,
            'current_branch'    => $currentBranch ? [
                'id' => $currentBranch->id,
                'branch_name' => $currentBranch->branch_name,
            ] : null,
        ];

    }
}
