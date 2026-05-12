<?php

return [
    'sheets' => [
        'service_account_json' => base_path(env('GOOGLE_SHEETS_JSON')),
        'spreadsheet_id' => env('GOOGLE_SHEETS_LINK_ID'), // We will handle parsing in the service if needed
    ],
];
