<?php
declare(strict_types=1);

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS requests
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Coordinates of Ahlen, Germany by default
define('DEFAULT_LAT', 51.7622);
define('DEFAULT_LNG', 7.8931);

// Secure API keys defined on backend
define('GOOGLE_API_KEY', 'AIzaSyBNE7LV77JLp30-zpPxrlotR0oKmTDLQCE');
define('OPENWEATHER_API_KEY', ''); // Fallback to keyless Open-Meteo if empty

/**
 * Perform HTTP request and decode JSON response.
 *
 * @param string $url
 * @param string $method
 * @param string|null $body
 * @return array|null
 */
function http_request(string $url, string $method = 'GET', ?string $body = null): ?array {
    $options = [
        'http' => [
            'method' => $method,
            'header' => "User-Agent: AhlenerAgent/1.0\r\nAccept: application/json\r\n",
            'timeout' => 5
        ]
    ];
    if ($body !== null) {
        $options['http']['header'] .= "Content-Type: application/json\r\n";
        $options['http']['content'] = $body;
    }
    $context = stream_context_create($options);
    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        return null;
    }
    return json_decode($response, true);
}

/**
 * Safe lowercase function to handle cases where mbstring extension is disabled.
 *
 * @param string $str
 * @return string
 */
function safe_strtolower(string $str): string {
    if (function_exists('mb_strtolower')) {
        return mb_strtolower($str, 'UTF-8');
    }
    // Cyrillic and Latin lowercase mapping
    $upper = ['А','Б','В','Г','Д','Е','Ё','Ж','З','И','Й','К','Л','М','Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Щ','Ъ','Ы','Ь','Э','Ю','Я'];
    $lower = ['а','б','в','г','д','е','ё','ж','з','и','й','к','л','м','н','о','п','р','с','т','у','ф','х','ц','ч','ш','щ','ъ','ы','ь','э','ю','я'];
    $str = str_replace($upper, $lower, $str);
    return strtolower($str);
}
