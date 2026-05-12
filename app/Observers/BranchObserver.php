<?php

namespace App\Observers;

use App\Models\Branch;
use App\Services\GoogleSheetsService;

class BranchObserver
{
    protected $sheetsService;

    public function __construct(GoogleSheetsService $sheetsService)
    {
        $this->sheetsService = $sheetsService;
    }

    /**
     * Handle the Branch "created" event.
     */
    public function created(Branch $branch): void
    {
        $this->sheetsService->createBranchSheet($branch->branch_name);
    }

    /**
     * Handle the Branch "updated" event.
     */
    public function updated(Branch $branch): void
    {
        if ($branch->isDirty('branch_name')) {
            $oldName = $branch->getOriginal('branch_name');
            // Sheets doesn't have a simple "rename" without sheetId, 
            // but we can just create the new one. 
            // Better to just ensure the new one exists.
            $this->sheetsService->createBranchSheet($branch->branch_name);
        }
    }

    /**
     * Handle the Branch "deleted" event.
     */
    public function deleted(Branch $branch): void
    {
        $this->sheetsService->deleteBranchSheet($branch->branch_name);
    }
}
