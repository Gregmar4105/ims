<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Carbon\Carbon;

class DownloadController extends Controller
{
    public function index()
    {
        $androidFiles = $this->getFiles('Downloads/Android', 'android', 'apk');
        $windowsFiles = $this->getFiles('Downloads/Desktop', 'windows', 'exe');

        return Inertia::render('Downloads/Index', [
            'android' => [
                'latest' => $androidFiles[0] ?? null,
                'history' => $androidFiles,
            ],
            'windows' => [
                'latest' => $windowsFiles[0] ?? null,
                'history' => $windowsFiles,
            ],
        ]);
    }

    private function getFiles($path, $platform, $extension)
    {
        if (!Storage::disk('public')->exists($path)) {
            return [];
        }

        $files = Storage::disk('public')->files($path);
        $parsedFiles = [];

        foreach ($files as $file) {
            $filename = basename($file);
            
            // Pattern: lm2-{platform}-app-v{version}.{extension}
            // Example: lm2-android-app-v1.1.1.apk
            if (preg_match("/lm2-{$platform}-app-v([\d\.]+)\.{$extension}/i", $filename, $matches)) {
                $version = $matches[1];
                $parsedFiles[] = [
                    'filename' => $filename,
                    'version' => $version,
                    'url' => Storage::url($file),
                    'size' => $this->formatBytes(Storage::disk('public')->size($file)),
                    'date' => Carbon::createFromTimestamp(Storage::disk('public')->lastModified($file))->format('M d, Y'),
                    'raw_date' => Storage::disk('public')->lastModified($file),
                ];
            }
        }

        // Sort by version (descending)
        usort($parsedFiles, function ($a, $b) {
            return version_compare($b['version'], $a['version']);
        });

        return $parsedFiles;
    }

    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
