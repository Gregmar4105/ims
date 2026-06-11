<?php

namespace App\Console\Commands;

use App\Services\SitemapGenerator;
use Illuminate\Console\Command;

class GenerateSitemap extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sitemap:generate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate the sitemap.xml file and write it to the public folder.';

    /**
     * Execute the console command.
     */
    public function handle(SitemapGenerator $generator): int
    {
        $this->info('Generating sitemap...');
        
        $xml = $generator->generate();
        $path = public_path('sitemap.xml');
        
        file_put_contents($path, $xml);
        
        $this->info("Sitemap generated successfully at: {$path}");
        
        return Command::SUCCESS;
    }
}
