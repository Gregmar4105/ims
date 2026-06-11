<?php

namespace App\Http\Controllers;

use App\Services\SitemapGenerator;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    /**
     * The sitemap generator service.
     *
     * @var SitemapGenerator
     */
    protected $generator;

    /**
     * Create a new controller instance.
     */
    public function __construct(SitemapGenerator $generator)
    {
        $this->generator = $generator;
    }

    /**
     * Return the sitemap as an XML response.
     */
    public function index(): Response
    {
        $xml = cache()->remember('sitemap-xml', now()->addDay(), function () {
            return $this->generator->generate();
        });

        return response($xml, 200)
            ->header('Content-Type', 'text/xml');
    }
}
