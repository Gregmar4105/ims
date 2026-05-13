<?php

namespace App\Observers;

use App\Models\Sale;
use App\Services\GoogleSheetsService;

class SaleObserver
{
    protected $sheetsService;

    public function __construct(GoogleSheetsService $sheetsService)
    {
        $this->sheetsService = $sheetsService;
    }

    public function saved(Sale $sale): void
    {
        $sale->load(['branch', 'readiedBy', 'approvedBy', 'items.product']);
        $this->sheetsService->upsertSaleInSheets($sale);
    }

    public function deleted(Sale $sale): void
    {
        $this->sheetsService->removeSaleFromSheets($sale->id);
    }
}
