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
        
        $jsonPath = config('google.sheets.service_account_json');
        if (file_exists($jsonPath)) {
            $jsonContent = file_get_contents($jsonPath);
            $config = json_decode($jsonContent, true);
            
            // Clean private key just in case of copy-paste issues
            if (isset($config['private_key'])) {
                $config['private_key'] = str_replace("\\n", "\n", $config['private_key']);
            }
            
            $this->client->setAuthConfig($config);
            
            // Small safety skew for minor clock drifts
            $this->client->setCacheConfig(['skew' => 30]);
        }
 else {
            Log::error('Google Sheets Auth File Not Found: ' . $jsonPath);
        }

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
                'ID', 'Physical Location', 'Supplier', 'Barcode', 'QR Code',
                'SKU', 'Category', 'Product Name', 'Brand', 'Code',
                '2code', 'Variations', 'Description', 'Supplier Description',
                'Reorder Level', 'Price', 'Quantity'
            ];

            $this->updateHeaders($branchName, $headers);

            return true;
        } catch (\Exception $e) {
            file_put_contents(base_path('sync_debug.txt'), 'API ERROR (createBranchSheet): ' . $e->getMessage() . "\n", FILE_APPEND);
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

            // Use cleanRow helper to ensure proper formatting (nulls as 'null', clean JSON for arrays)
            $cleanRows = [];
            foreach ($rows as $row) {
                $cleanRows[] = $this->cleanRow((array)$row);
            }

            $body = new ValueRange([
                'values' => $cleanRows
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
            file_put_contents(base_path('sync_debug.txt'), 'API ERROR (updateSheetContent): ' . $e->getMessage() . "\n", FILE_APPEND);
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
                'values' => [$this->cleanRow($data)]
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

    /**
     * Ensure the Reorders sheet exists with correct headers.
     */
    public function ensureReordersSheet(array $branches)
    {
        try {
            $sheetName = 'Reorders';
            $this->loadExistingSheets();
            
            if (!isset($this->existingSheets[$sheetName])) {
                // Create new sheet
                $body = new BatchUpdateSpreadsheetRequest([
                    'requests' => [
                        'addSheet' => [
                            'properties' => [
                                'title' => $sheetName
                            ]
                        ]
                    ]
                ]);
                $this->service->spreadsheets->batchUpdate($this->spreadsheetId, $body);
                $this->loadExistingSheets(true);
            }

            // Prepare Headers
            $headers = ['ID', 'Product Name', 'Brand', 'Category', 'Supplier'];
            foreach ($branches as $branch) {
                $headers[] = $branch->branch_name . ' Stock';
                $headers[] = $branch->branch_name . ' Reorder';
            }

            $this->updateHeaders($sheetName, $headers);
            return true;
        } catch (\Exception $e) {
            Log::error('Google Sheets Ensure Reorders Sheet Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Upsert a product in the Reorders sheet.
     */
    public function upsertProductInReorders($product, array $branches)
    {
        try {
            $sheetName = 'Reorders';
            $this->ensureReordersSheet($branches);

            // Find row index
            $range = $sheetName . '!A:A';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();
            
            $rowIndex = -1;
            if ($values) {
                foreach ($values as $index => $row) {
                    if (isset($row[0]) && $row[0] == $product->id) {
                        $rowIndex = $index + 1;
                        break;
                    }
                }
            }

            // Build data row
            $data = [
                $product->id,
                $product->name,
                $product->brand?->name,
                $product->category?->name,
                $product->supplier?->name,
            ];

            foreach ($branches as $branch) {
                $bp = $product->branches->where('id', $branch->id)->first();
                $data[] = $bp ? $bp->pivot->quantity : 'null';
                $data[] = $bp ? $bp->pivot->reorder_level : 'null';
            }

            $body = new ValueRange([
                'values' => [$this->cleanRow($data)]
            ]);
            $params = ['valueInputOption' => 'RAW'];

            if ($rowIndex !== -1) {
                $updateRange = $sheetName . '!A' . $rowIndex;
                return $this->service->spreadsheets_values->update($this->spreadsheetId, $updateRange, $body, $params);
            } else {
                return $this->service->spreadsheets_values->append($this->spreadsheetId, $sheetName . '!A1', $body, $params);
            }
        } catch (\Exception $e) {
            Log::error('Google Sheets Reorders Upsert Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Remove a product from the Reorders sheet.
     */
    public function removeProductFromReorders($productId)
    {
        try {
            $sheetName = 'Reorders';
            $this->loadExistingSheets();
            if (!isset($this->existingSheets[$sheetName])) return true;

            $range = $sheetName . '!A:A';
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
                $updateRange = $sheetName . '!A' . $rowIndex . ':Z' . $rowIndex;
                $this->service->spreadsheets_values->clear($this->spreadsheetId, $updateRange, new \Google\Service\Sheets\ClearValuesRequest());
            }
            return true;
        } catch (\Exception $e) {
            Log::error('Google Sheets Reorders Remove Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Ensure the Sales sheet exists with correct headers.
     */
    public function ensureSalesSheet()
    {
        try {
            $sheetName = 'Sales';
            $this->loadExistingSheets();
            
            if (!isset($this->existingSheets[$sheetName])) {
                $body = new BatchUpdateSpreadsheetRequest([
                    'requests' => [
                        'addSheet' => [
                            'properties' => ['title' => $sheetName]
                        ]
                    ]
                ]);
                $this->service->spreadsheets->batchUpdate($this->spreadsheetId, $body);
                $this->loadExistingSheets(true);
            }

            $headers = ['Sale ID', 'Branch', 'Status', 'Date', 'Readied By', 'Approved By', 'Items', 'Total Price', 'Notes'];
            $this->updateHeaders($sheetName, $headers);
            return true;
        } catch (\Exception $e) {
            Log::error('Google Sheets Ensure Sales Sheet Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Upsert a sale in the Sales sheet.
     */
    public function upsertSaleInSheets($sale)
    {
        try {
            $sheetName = 'Sales';
            $this->ensureSalesSheet();

            // Find row index
            $range = $sheetName . '!A:A';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();
            
            $rowIndex = -1;
            if ($values) {
                foreach ($values as $index => $row) {
                    if (isset($row[0]) && $row[0] == $sale->id) {
                        $rowIndex = $index + 1;
                        break;
                    }
                }
            }

            // Build items summary
            $items = $sale->items->map(function($item) {
                return ($item->product->name ?? 'Unknown') . ' x ' . $item->quantity . ' @ ' . $item->price;
            })->implode(', ');

            // Calculate total
            $total = $sale->items->sum(function($item) {
                return $item->price * $item->quantity;
            });

            // Build data row
            $data = [
                $sale->id,
                $sale->branch?->branch_name,
                $sale->status,
                $sale->created_at->format('Y-m-d H:i'),
                $sale->readiedBy?->name,
                $sale->approvedBy?->name,
                $items,
                $total,
                $sale->notes,
            ];

            $body = new ValueRange([
                'values' => [$this->cleanRow($data)]
            ]);
            $params = ['valueInputOption' => 'RAW'];

            if ($rowIndex !== -1) {
                $updateRange = $sheetName . '!A' . $rowIndex;
                return $this->service->spreadsheets_values->update($this->spreadsheetId, $updateRange, $body, $params);
            } else {
                return $this->service->spreadsheets_values->append($this->spreadsheetId, $sheetName . '!A1', $body, $params);
            }
        } catch (\Exception $e) {
            Log::error('Google Sheets Sales Upsert Error: ' . $e->getMessage());
            return false;
        }
    }

    public function removeSaleFromSheets($saleId)
    {
        try {
            $sheetName = 'Sales';
            $this->loadExistingSheets();
            if (!isset($this->existingSheets[$sheetName])) return true;

            $range = $sheetName . '!A:A';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();
            
            $rowIndex = -1;
            if ($values) {
                foreach ($values as $index => $row) {
                    if (isset($row[0]) && $row[0] == $saleId) {
                        $rowIndex = $index + 1;
                        break;
                    }
                }
            }

            if ($rowIndex !== -1) {
                $updateRange = $sheetName . '!A' . $rowIndex . ':I' . $rowIndex;
                $this->service->spreadsheets_values->clear($this->spreadsheetId, $updateRange, new \Google\Service\Sheets\ClearValuesRequest());
            }
            return true;
        } catch (\Exception $e) {
            Log::error('Google Sheets Sales Remove Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Ensure the Transfers sheet exists with correct headers.
     */
    public function ensureTransfersSheet()
    {
        try {
            $sheetName = 'Transfers';
            $this->loadExistingSheets();
            
            if (!isset($this->existingSheets[$sheetName])) {
                $body = new BatchUpdateSpreadsheetRequest([
                    'requests' => [
                        'addSheet' => [
                            'properties' => ['title' => $sheetName]
                        ]
                    ]
                ]);
                $this->service->spreadsheets->batchUpdate($this->spreadsheetId, $body);
                $this->loadExistingSheets(true);
            }

            $headers = ['Transfer ID', 'Source Branch', 'Destination', 'Status', 'Date', 'Readied By', 'Approved By', 'Received By', 'Items', 'Notes'];
            $this->updateHeaders($sheetName, $headers);
            return true;
        } catch (\Exception $e) {
            Log::error('Google Sheets Ensure Transfers Sheet Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Upsert a transfer in the Transfers sheet.
     */
    public function upsertTransferInSheets($transfer)
    {
        try {
            $sheetName = 'Transfers';
            $this->ensureTransfersSheet();

            // Find row index
            $range = $sheetName . '!A:A';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();
            
            $rowIndex = -1;
            if ($values) {
                foreach ($values as $index => $row) {
                    if (isset($row[0]) && $row[0] == $transfer->id) {
                        $rowIndex = $index + 1;
                        break;
                    }
                }
            }

            // Build items summary
            $items = $transfer->items->map(function($item) {
                $summary = ($item->product->name ?? 'Unknown') . ' x ' . $item->quantity;
                if ($item->received_quantity !== null) {
                    $summary .= " [Rec: {$item->received_quantity}]";
                }
                return $summary;
            })->implode(', ');

            $destination = $transfer->destinationBranch?->branch_name ?? $transfer->supplier?->name ?? 'Unknown';

            // Build data row
            $data = [
                $transfer->id,
                $transfer->sourceBranch?->branch_name,
                $destination,
                $transfer->status,
                $transfer->created_at->format('Y-m-d H:i'),
                $transfer->readiedBy?->name,
                $transfer->approvedBy?->name,
                $transfer->receivedBy?->name,
                $items,
                $transfer->notes,
            ];

            $body = new ValueRange([
                'values' => [$this->cleanRow($data)]
            ]);
            $params = ['valueInputOption' => 'RAW'];

            if ($rowIndex !== -1) {
                $updateRange = $sheetName . '!A' . $rowIndex;
                return $this->service->spreadsheets_values->update($this->spreadsheetId, $updateRange, $body, $params);
            } else {
                return $this->service->spreadsheets_values->append($this->spreadsheetId, $sheetName . '!A1', $body, $params);
            }
        } catch (\Exception $e) {
            Log::error('Google Sheets Transfers Upsert Error: ' . $e->getMessage());
            return false;
        }
    }

    public function removeTransferFromSheets($transferId)
    {
        try {
            $sheetName = 'Transfers';
            $this->loadExistingSheets();
            if (!isset($this->existingSheets[$sheetName])) return true;

            $range = $sheetName . '!A:A';
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            $values = $response->getValues();
            
            $rowIndex = -1;
            if ($values) {
                foreach ($values as $index => $row) {
                    if (isset($row[0]) && $row[0] == $transferId) {
                        $rowIndex = $index + 1;
                        break;
                    }
                }
            }

            if ($rowIndex !== -1) {
                $updateRange = $sheetName . '!A' . $rowIndex . ':J' . $rowIndex;
                $this->service->spreadsheets_values->clear($this->spreadsheetId, $updateRange, new \Google\Service\Sheets\ClearValuesRequest());
            }
            return true;
        } catch (\Exception $e) {
            Log::error('Google Sheets Transfers Remove Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Clean a row of data for Google Sheets.
     * Converts null/empty to 'null' and formats arrays as clean JSON.
     */
    protected function cleanRow(array $row): array
    {
        $cleanRow = [];
        foreach (array_values($row) as $value) {
            if (is_array($value) || is_object($value)) {
                $value = (array)$value;
                if (empty($value)) {
                    $cleanRow[] = 'null';
                    continue;
                }
                
                // Format as human-readable string (e.g. Name: Value) instead of JSON
                $formatted = [];
                foreach ($value as $item) {
                    $item = (array)$item;
                    $name = $item['name'] ?? null;
                    $options = $item['options'] ?? $item['value'] ?? null;
                    
                    if ($name && $options) {
                        if (is_array($options)) {
                            $optStrings = [];
                            foreach ($options as $opt) {
                                $opt = (array)$opt;
                                if (isset($opt['value']) && isset($opt['quantity'])) {
                                    $optStrings[] = "{$opt['value']} ({$opt['quantity']})";
                                } elseif (isset($opt['value'])) {
                                    $optStrings[] = $opt['value'];
                                } else {
                                    $optStrings[] = implode(':', $opt);
                                }
                            }
                            $optStr = implode('/', $optStrings);
                            $formatted[] = "$name: $optStr";
                        } else {
                            $formatted[] = "$name: $options";
                        }
                    } elseif ($name) {
                        $formatted[] = $name;
                    } elseif ($options) {
                        if (is_array($options)) {
                            $optStrings = [];
                            foreach ($options as $opt) {
                                $opt = (array)$opt;
                                if (isset($opt['value']) && isset($opt['quantity'])) {
                                    $optStrings[] = "{$opt['value']} ({$opt['quantity']})";
                                } elseif (isset($opt['value'])) {
                                    $optStrings[] = $opt['value'];
                                } else {
                                    $optStrings[] = implode(':', $opt);
                                }
                            }
                            $formatted[] = implode('/', $optStrings);
                        } else {
                            $formatted[] = $options;
                        }
                    } elseif (is_scalar($item)) {
                        $formatted[] = (string)$item;
                    }
                }
                
                if (!empty($formatted)) {
                    $cleanRow[] = implode(', ', $formatted);
                } else {
                    $cleanRow[] = 'null';
                }
            } else {
                // If the value is strictly null or an empty string, we show 'null'
                if ($value === null || $value === '') {
                    $cleanRow[] = 'null';
                } else {
                    $cleanRow[] = $value;
                }
            }
        }
        return $cleanRow;
    }

    /**
     * Get the entire content of a sheet (tab).
     */
    public function getSheetContent(string $sheetName): array
    {
        try {
            $range = $sheetName . '!A:Q'; // Columns A to Q
            $response = $this->service->spreadsheets_values->get($this->spreadsheetId, $range);
            return $response->getValues() ?: [];
        } catch (\Exception $e) {
            Log::error('Google Sheets Get Sheet Content Error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Parse variations string from Google Sheets back into standard database structure.
     * Example: "Size: Medium (10)/Large (5), Color: Red/Blue"
     */
    public function parseVariationsString(?string $varString): ?array
    {
        if (empty($varString) || strtolower($varString) === 'null') {
            return null;
        }

        $result = [];
        // Support splitting by either ", " or just ","
        $parts = preg_split('/,\s*/', $varString);
        foreach ($parts as $part) {
            $nameValue = explode(':', $part, 2);
            if (count($nameValue) !== 2) {
                continue;
            }
            $name = trim($nameValue[0]);
            $optionsStr = trim($nameValue[1]);
            
            $options = [];
            $optionsParts = explode('/', $optionsStr);
            foreach ($optionsParts as $optPart) {
                $optPart = trim($optPart);
                // Check if it matches Value (Quantity) like "Medium (10)"
                if (preg_match('/^(.*?)\s*\((\d+)\)$/', $optPart, $matches)) {
                    $options[] = [
                        'value' => trim($matches[1]),
                        'quantity' => (int)$matches[2]
                    ];
                } else {
                    $options[] = [
                        'value' => $optPart,
                        'quantity' => 0
                    ];
                }
            }
            
            $result[] = [
                'name' => $name,
                'options' => $options
            ];
        }

        return !empty($result) ? $result : null;
    }

    /**
     * Delete a specific row by its index from a sheet (tab).
     */
    public function deleteRowFromSheet(string $sheetName, int $rowIndex): bool
    {
        try {
            $this->loadExistingSheets();
            if (!isset($this->existingSheets[$sheetName])) {
                return false;
            }

            $sheetId = $this->existingSheets[$sheetName];

            $body = new BatchUpdateSpreadsheetRequest([
                'requests' => [
                    'deleteDimension' => [
                        'range' => [
                            'sheetId' => $sheetId,
                            'dimension' => 'ROWS',
                            'startIndex' => $rowIndex - 1, // 0-indexed
                            'endIndex' => $rowIndex
                        ]
                    ]
                ]
            ]);

            $this->service->spreadsheets->batchUpdate($this->spreadsheetId, $body);
            return true;
        } catch (\Exception $e) {
            Log::error("Google Sheets Delete Row Error: " . $e->getMessage());
            return false;
        }
    }
}
