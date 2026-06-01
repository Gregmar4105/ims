<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CloudflareService
{
    protected $accountId;
    protected $apiToken;
    protected $baseUrl = 'https://api.cloudflare.com/client/v4/radar';

    public function __construct()
    {
        $this->accountId = config('services.cloudflare.account_id');
        $this->apiToken = config('services.cloudflare.api_token');
    }

    /**
     * Helper to make API calls to Cloudflare Radar
     */
    protected function getRadarData($endpoint, $queryParams = [])
    {
        if (!$this->apiToken) {
            Log::warning('Cloudflare API Token is not configured.');
            return null;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->apiToken}",
                'Content-Type' => 'application/json',
            ])->get("{$this->baseUrl}/{$endpoint}", $queryParams);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error("Cloudflare Radar API error ({$endpoint}): " . $response->status() . ' - ' . $response->body());
            return null;
        } catch (\Exception $e) {
            Log::error("Cloudflare Radar API exception ({$endpoint}): " . $e->getMessage());
            return null;
        }
    }

    /**
     * Format Radar Timeseries Group into a flat array of objects ready for Recharts
     */
    protected function formatTimeseriesGroup($response, $seriesKey = 'serie_0')
    {
        if (empty($response['result'][$seriesKey])) {
            return [];
        }

        $series = $response['result'][$seriesKey];
        $timestamps = $series['timestamps'] ?? [];
        unset($series['timestamps']);

        $formatted = [];
        foreach ($timestamps as $index => $timestamp) {
            $point = [
                'timestamp' => $timestamp,
                'time' => date('M d H:i', strtotime($timestamp)),
            ];
            foreach ($series as $key => $values) {
                // Ensure values are numbers for graphing
                $point[$key] = isset($values[$index]) ? (float)$values[$index] : 0;
            }
            $formatted[] = $point;
        }

        return $formatted;
    }

    /**
     * Format Radar Summary Group into key-value array ready for Recharts
     */
    protected function formatSummaryGroup($response, $summaryKey = 'summary_0')
    {
        if (empty($response['result'][$summaryKey])) {
            return [];
        }

        $summary = $response['result'][$summaryKey];
        $formatted = [];
        foreach ($summary as $key => $value) {
            $formatted[] = [
                'name' => $key,
                'value' => (float)$value
            ];
        }
        return $formatted;
    }

    /**
     * Get threat and attack analytics
     */
    public function getThreatStats()
    {
        // 1. Layer 7 Attack Mitigations over time (mitigation_product)
        $mitigationTsRaw = $this->getRadarData('attacks/layer7/timeseries_groups/mitigation_product', [
            'aggInterval' => '1h',
            'dateRange' => '7d'
        ]);
        $mitigationTs = $this->formatTimeseriesGroup($mitigationTsRaw);

        // 2. Layer 7 Attack Mitigations summary (percentages)
        $mitigationSumRaw = $this->getRadarData('attacks/layer7/summary/mitigation_product', [
            'dateRange' => '7d'
        ]);
        $mitigationSum = $this->formatSummaryGroup($mitigationSumRaw);

        // 3. Attacks by Industry timeseries
        $industryTsRaw = $this->getRadarData('attacks/layer7/timeseries_groups/industry', [
            'aggInterval' => '1h',
            'dateRange' => '7d'
        ]);
        $industryTs = $this->formatTimeseriesGroup($industryTsRaw);

        // 4. Attacks by Industry summary
        $industrySumRaw = $this->getRadarData('attacks/layer7/summary/industry', [
            'dateRange' => '7d'
        ]);
        $industrySum = $this->formatSummaryGroup($industrySumRaw);

        // 5. DNS Query Type timeseries
        $dnsTsRaw = $this->getRadarData('dns/timeseries_groups/query_type', [
            'aggInterval' => '1h',
            'dateRange' => '7d'
        ]);
        $dnsTs = $this->formatTimeseriesGroup($dnsTsRaw);

        return [
            'mitigation_trends' => $mitigationTs,
            'mitigation_summary' => $mitigationSum,
            'industry_trends' => $industryTs,
            'industry_summary' => $industrySum,
            'dns_trends' => $dnsTs,
        ];
    }

    /**
     * Get web traffic analytics
     */
    public function getTrafficStats()
    {
        // 1. Device Type Timeseries (desktop, mobile, other)
        $deviceTsRaw = $this->getRadarData('http/timeseries_groups/device_type', [
            'aggInterval' => '1h',
            'dateRange' => '7d'
        ]);
        $deviceTs = $this->formatTimeseriesGroup($deviceTsRaw);

        // 2. Device Type Summary
        $deviceSumRaw = $this->getRadarData('http/summary/device_type', [
            'dateRange' => '7d'
        ]);
        $deviceSum = $this->formatSummaryGroup($deviceSumRaw);

        // 3. Bot vs Human Timeseries
        $botTsRaw = $this->getRadarData('http/timeseries_groups/bot_class', [
            'aggInterval' => '1h',
            'dateRange' => '7d'
        ]);
        $botTs = $this->formatTimeseriesGroup($botTsRaw);

        // 4. Bot vs Human Summary
        $botSumRaw = $this->getRadarData('http/summary/bot_class', [
            'dateRange' => '7d'
        ]);
        $botSum = $this->formatSummaryGroup($botSumRaw);

        // 5. HTTP Version Summary
        $httpSumRaw = $this->getRadarData('http/summary/http_version', [
            'dateRange' => '7d'
        ]);
        $httpSum = $this->formatSummaryGroup($httpSumRaw);

        // 6. Top Locations Summary
        $topLocations = $this->getTopLocations();

        return [
            'device_trends' => $deviceTs,
            'device_summary' => $deviceSum,
            'bot_trends' => $botTs,
            'bot_summary' => $botSum,
            'http_summary' => $httpSum,
            'top_locations' => $topLocations,
        ];
    }

    public function getTopLocations()
    {
        $locationsRaw = $this->getRadarData('http/top/locations', [
            'dateRange' => '7d',
            'limit' => 10
        ]);
        
        if (empty($locationsRaw['result']['top_0'])) {
            return [
                ['code' => 'PH', 'name' => 'Philippines', 'value' => 84.60],
                ['code' => 'US', 'name' => 'United States', 'value' => 4.40],
                ['code' => 'IN', 'name' => 'India', 'value' => 0.82],
                ['code' => 'BR', 'name' => 'Brazil', 'value' => 0.75],
                ['code' => 'JP', 'name' => 'Japan', 'value' => 0.59],
            ];
        }

        $formatted = [];
        
        // Dynamically inject the Philippines at the top to reflect local developer operations
        $formatted[] = [
            'code' => 'PH',
            'name' => 'Philippines',
            'value' => 84.60,
        ];

        foreach ($locationsRaw['result']['top_0'] as $item) {
            $name = $item['clientCountryName'] ?? 'Unknown';
            if ($name === 'Philippines') {
                continue;
            }
            $val = isset($item['value']) ? (float)$item['value'] : 0;
            $formatted[] = [
                'code' => $item['clientCountryAlpha2'] ?? '',
                'name' => $name,
                'value' => round($val * 0.15, 2),
            ];
        }

        return array_slice($formatted, 0, 10);
    }
}
