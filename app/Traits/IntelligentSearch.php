<?php

namespace App\Traits;

use App\Models\Product;
use Illuminate\Support\Collection;

trait IntelligentSearch
{
    /**
     * Perform an intelligent search on products.
     *
     * @param string $search
     * @param array $extraFields Fields to also check with LIKE (e.g. sku, barcode)
     * @param int|null $branchId Optional branch restriction
     * @return Collection
     */
    protected function performIntelligentSearch(string $search, array $extraFields = [], ?int $branchId = null): Collection
    {
        if (empty($search)) {
            return collect();
        }

        $searchLower = strtolower($search);
        $searchWords = array_filter(explode(' ', $searchLower));

        $query = Product::query();

        if ($branchId) {
            $query->whereHas('branches', function ($q) use ($branchId) {
                $q->where('branches.id', $branchId);
            });
        }

        $query->where(function ($q) use ($searchWords, $search, $extraFields) {
            foreach ($searchWords as $word) {
                $q->orWhere('name', 'like', "%{$word}%");
            }
            foreach ($extraFields as $field) {
                $q->orWhere($field, 'like', "%{$search}%");
            }
        });

        $candidates = $query->take(50)->get();

        $scored = $candidates->map(function ($product) use ($searchWords, $searchLower, $search, $extraFields) {
            $nameLower = strtolower($product->name);
            $nameWords = array_filter(explode(' ', $nameLower));

            $score = 0;

            // Check for exact identifier matches (Highest priority)
            foreach ($extraFields as $field) {
                if ($product->{$field} === $search) {
                    $score += 200;
                }
            }

            foreach ($searchWords as $sWord) {
                $bestWordScore = 0;
                foreach ($nameWords as $nWord) {
                    if ($sWord === $nWord) {
                        $bestWordScore = 10;
                    } elseif (strpos($nWord, $sWord) !== false) {
                        $bestWordScore = max($bestWordScore, 5);
                    } else {
                        $dist = levenshtein($sWord, $nWord);
                        if ($dist <= 1) {
                            $bestWordScore = max($bestWordScore, 3);
                        } elseif ($dist <= 2 && strlen($sWord) > 4) {
                            $bestWordScore = max($bestWordScore, 1);
                        }
                    }
                }
                $score += $bestWordScore;
            }

            if ($nameLower === $searchLower) {
                $score += 100;
            }

            // Bonus if all search words are present
            $allWordsPresent = true;
            foreach ($searchWords as $sWord) {
                $found = false;
                foreach ($nameWords as $nWord) {
                    if (strpos($nWord, $sWord) !== false || levenshtein($sWord, $nWord) <= 1) {
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    $allWordsPresent = false;
                    break;
                }
            }
            if ($allWordsPresent) {
                $score += 20;
            }

            $product->search_score = $score;
            return $product;
        });

        return $scored->filter(fn($p) => $p->search_score > 0)
            ->sortByDesc('search_score')
            ->values()
            ->take(10);
    }
}
