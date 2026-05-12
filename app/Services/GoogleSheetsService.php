<?php

namespace App\Services;

use Google\Client;
use Google\Service\Sheets;
use Google\Service\Sheets\ValueRange;
use Google\Service\Sheets\BatchUpdateSpreadsheetRequest;
use Google\Service\Sheets\Request;
use Illuminate\Support\Facades\Log;

class GoogleSheetsService
{
    protected $client;
    protected $service;
    protected $spreadsheetId;
    protected $existingSheets = null;

    public function __construct()
    {
        $this->client = new Client();
        $this->client->setAuthConfig(config('google.sheets.service_account_json'));
        $this->client->addScope(Sheets::SPREADSHEETS);
        
        $this->service = new Sheets($this->client);
        $this->spreadsheetId = $this->parseSpreadsheetId(config('google.sheets.spreadsheet_id'));
    }

    protected function parseSpreadsheetId($url)
    {
        if (preg_match('/\/d\/(.*?)(\/|$)/', $url, $matches)) {
            return $matches[1];
        }
        return $url;
    }

    /**
     * Refresh the list of existing sheets in the spreadsheet.
     * Fetches metadata once to avoid multiple API calls.
     */
    protected function loadExistingSheets($force = false)
    {
        if ($this->existingSheets === null || $force) {
            try {
                $spreadsheet = $this->service->spreadsheets->get($this->spreadsheetId);
                $this->existingSheets = [];
                foreach ($spreadsheet->getSheets() as $sheet) {
                    $this->existingSheets[$sheet->getProperties()->getTitle()] = $sheet->getProperties()->getSheetId();
                }
            } catch (\Exception $e) {
                Log::error('Google Sheets Load Sheets Error: ' . $e->getMessage());
                $this->existingSheets = [];
            }
        }
    }

    /**
     * Create a new sheet (tab) with headers.
     */
    public function createBranchSheet(string $branchName)
    {
        try {
            $this->loadExistingSheets();
            
            if (isset($this->existingSheets[$branchName])) {
                return true;
            }

            // Create new sheet
            $body = new BatchUpdateSpreadsheetRequest([
                'requests' => [
                    'addSheet' => [
                        'properties' => [
                            'title' => $branchName
                        ]
                    ]
                ]
            ]);

            $this->service->spreadsheets->batchUpdate($this->spreadsheetId, $body);
            
            // Refresh local list
            $this->loadExistingSheets(true);

            // Set Headers
            $headers = [
                'ID', 'Product Name', 'Brand', 'Category', 'Supplier', 
                'Barcode', 'QR Code', 'Code', '2code', 'SKU', 
                'Variations', 'Physical Location', 'Description', 
                'Reorder Level', 'Price', 'Quantity'
            ];

            $this->updateHeaders($branchName, $headers);

            return true;
        } catch (\Exception $e) {
            Log::error('Google Sheets Create Sheet Error: ' . $e->getMessage());
            return false;
        }
    }

    protected function updateHeaders(string $sheetName, array $headers)
    {
        $body = new ValueRange([
            'values' => [$headers]
        ]);
        $params = ['valueInputOption' => 'RAW'];
        $this->service->spreadsheets_values->update(
            $this->spreadsheetId,
            $sheetName . '!A1',
            $body,
            $params
        );
    }

    /**
     * Delete a sheet (tab).
     */
    public function deleteBranchSheet(string $branchName)
    {
        try {
            $this->loadExistingSheets();
            
            if (!isset($this->existingSheets[$branchName])) {
                return true;
            }

            $sheetId = $this->existingSheets[$branchName];

            $body = new BatchUpdateSpreadsheetRequest([
                'requests' => [
                    'deleteSheet' => [
                        'sheetId' => $sheetId
                    ]
                ]
            ]);
            $this->service->spreadsheets->batchUpdate($this->spreadsheetId, $body);
            
            $this->loadExistingSheets(true);

            return true;
        } catch (\Exception $e) {
            Log::error('Google Sheets Delete Sheet Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Update the entire content of a sheet (tab) at once.
     */
    public function updateSheetContent(string $sheetName, array $rows)
    {
        try {
            $this->createBranchSheet($sheetName);

            $body = new ValueRange([
                'values' => $rows
            ]);
            $params = ['valueInputOption' => 'RAW'];

            // Clear existing content
            $this->service->spreadsheets_values->clear($this->spreadsheetId, $sheetName . '!A:Z', new \Google\Service\Sheets\ClearValuesRequest());

            return $this->service->spreadsheets_values->update(
                $this->spreadsheetId,
                $sheetName . '!A1',
                $body,
                $params
            );
        } catch (\Exception $e) {
            Log::error('Google Sheets Update Sheet Content Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Upsert product data in a specific branch sheet.
     */
    public function upsertProductInBranch(string $branchName, array $data, $productId)
    {
        try {
            $this->createBranchSheet($branchName);

            // Find row index
            $range = $branchName . '!A:A';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();
            
            $rowIndex = -1;
            if ($values) {
                foreach ($values as $index => $row) {
                    if (isset($row[0]) && $row[0] == $productId) {
                        $rowIndex = $index + 1;
                        break;
                    }
                }
            }

            $body = new ValueRange([
                'values' => [$data]
            ]);
            $params = ['valueInputOption' => 'RAW'];

            if ($rowIndex !== -1) {
                $updateRange = $branchName . '!A' . $rowIndex;
                return $this->service->spreadsheets_values->update(
                    $this->spreadsheetId,
                    $updateRange,
                    $body,
                    $params
                );
            } else {
                return $this->service->spreadsheets_values->append(
                    $this->spreadsheetId,
                    $branchName . '!A1',
                    $body,
                    $params
                );
            }
        } catch (\Exception $e) {
            Log::error('Google Sheets Branch Upsert Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Remove product from a branch sheet (mark as deleted or clear row).
     */
    public function removeProductFromBranch(string $branchName, $productId)
    {
        try {
            $range = $branchName . '!A:A';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();
            
            $rowIndex = -1;
            if ($values) {
                foreach ($values as $index => $row) {
                    if (isset($row[0]) && $row[0] == $productId) {
                        $rowIndex = $index + 1;
                        break;
                    }
                }
            }

            if ($rowIndex !== -1) {
                $updateRange = $branchName . '!P' . $rowIndex; 
                $body = new ValueRange([
                    'values' => [['REMOVED']]
                ]);
                $params = ['valueInputOption' => 'RAW'];
                return $this->service->spreadsheets_values->update(
                    $this->spreadsheetId,
                    $updateRange,
                    $body,
                    $params
                );
            }
            return true;
        } catch (\Exception $e) {
            Log::error('Google Sheets Branch Product Remove Error: ' . $e->getMessage());
            return false;
        }
    }
}
