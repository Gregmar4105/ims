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

        return [
            ...parent::share($request),
            'reorderCount' => $reorderCount,
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user()?->load('branch'),
                'permissions' => $request->user() 
                    ? $request->user()->getAllPermissions()->pluck('name') 
                    : [],
                'roles' => $request->user() 
                    ? $request->user()->getRoleNames() 
                    : [],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'categories' => $categories,
            'notification_sound' => $notificationSound,
        ];
    }
}
