<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | The /api/mobile/* routes are consumed by:
    |   - NativePHP Android app (origin: http://127.0.0.1)
    |   - Local dev/test (origin: http://ims.test, http://localhost, etc.)
    |
    | These routes use Bearer token auth — NOT cookies — so
    | supports_credentials is FALSE for /api/* paths.
    | This allows Access-Control-Allow-Origin: * without the browser
    | blocking the request due to withCredentials conflicts.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    /*
     * Allow any origin for /api/* routes.
     * Safe because:
     *   1. All endpoints are protected by auth:sanctum (Bearer token)
     *   2. No credentials (cookies) are sent, so wildcard is permitted
     */
    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    /*
     * MUST be false when allowed_origins is '*'.
     * The mobile app uses Bearer tokens, not session cookies.
     */
    'supports_credentials' => false,

];
