<?php

namespace App\Observers;

use App\Models\Transfer;
use App\Services\GoogleSheetsService;

class TransferObserver
{
    protected $sheetsService;

    public function __construct(GoogleSheetsService $sheetsService)
    {
        $this->sheetsService = $sheetsService;
    }

    public function saved(Transfer $transfer): void
    {
        $transfer->load(['sourceBranch', 'destinationBranch', 'supplier', 'readiedBy', 'approvedBy', 'receivedBy', 'items.product']);
        $this->sheetsService->upsertTransferInSheets($transfer);
    }

    public function deleted(Transfer $transfer): void
    {
        $this->sheetsService->removeTransferFromSheets($transfer->id);
    }
}
