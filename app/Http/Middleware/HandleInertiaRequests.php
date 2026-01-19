<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
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

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user()?->load('branch'),
                // 👇 ADDED THIS: This sends the permissions to your React frontend
                'permissions' => $request->user() 
                    ? $request->user()->getAllPermissions()->pluck('name') 
                    : [],
                // Optional: You can send roles too if you need them later
                'roles' => $request->user() 
                    ? $request->user()->getRoleNames() 
                    : [],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'categories' => \App\Models\Category::where('status', 'Active')
                ->withCount('products')
                ->orderByDesc('products_count')
                ->take(5)
                ->get()
                ->map(function ($category) {
                    $category->setRelation('brands', \App\Models\Brand::whereHas('products', function ($q) use ($category) {
                        $q->where('category_id', $category->id)
                          ->whereHas('branches', function ($bq) {
                              $bq->whereIn('branch_name', ['Main Branch', 'LM2 Bicycle Trading']);
                          });
                    })->take(5)->get(['id', 'name', 'slug']));
                    return $category;
                }),
        ];
    }
}
