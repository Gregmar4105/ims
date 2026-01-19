<?php

$host = '10.0.1.51:8006';
$token = 'PVEAPIToken=larable-api@main@pam!main=3bf30359-c7e6-4391-8ec9-f2c1bb06ba04';

echo "Checking permissions for $host...\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://{$host}/api2/json/access/permissions");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: $token"]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
$json = json_decode($response, true);

if (isset($json['data'])) {
    echo "Permissions found:\n";
    print_r($json['data']);
} else {
    echo "Raw Response: $response\n";
}
