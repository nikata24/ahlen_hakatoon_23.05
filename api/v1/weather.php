<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

// Retrieve and validate coordinates
$lat = isset($_GET['lat']) ? $_GET['lat'] : null;
$lng = isset($_GET['lng']) ? $_GET['lng'] : null;

// Parse defaults if not provided
$latVal = $lat !== null ? (float)$lat : DEFAULT_LAT;
$lngVal = $lng !== null ? (float)$lng : DEFAULT_LNG;

// Perform input validation
if ($lat !== null && !is_numeric($lat)) {
    http_response_code(400);
    echo json_encode(['error' => 'Parameter lat must be a numeric value.'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
if ($lng !== null && !is_numeric($lng)) {
    http_response_code(400);
    echo json_encode(['error' => 'Parameter lng must be a numeric value.'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($latVal < -90.0 || $latVal > 90.0) {
    http_response_code(400);
    echo json_encode(['error' => 'Latitude must be between -90 and 90.'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}
if ($lngVal < -180.0 || $lngVal > 180.0) {
    http_response_code(400);
    echo json_encode(['error' => 'Longitude must be between -180 and 180.'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

try {
    $apiKey = OPENWEATHER_API_KEY;
    if (!empty($apiKey)) {
        $url = "https://api.openweathermap.org/data/2.5/weather?lat=" . $latVal . "&lon=" . $lngVal . "&appid=" . urlencode($apiKey) . "&units=metric&lang=ru";
        $data = http_request($url);
        
        if ($data && isset($data['main'])) {
            $result = [
                'temp' => isset($data['main']['temp']) ? round($data['main']['temp']) : 18,
                'feelsLike' => isset($data['main']['feels_like']) ? round($data['main']['feels_like']) : 17,
                'humidity' => isset($data['main']['humidity']) ? $data['main']['humidity'] : 62,
                'condition' => isset($data['weather'][0]['description']) ? $data['weather'][0]['description'] : 'Переменная облачность',
                'icon' => isset($data['weather'][0]['icon']) ? "https://openweathermap.org/img/wn/" . $data['weather'][0]['icon'] . "@2x.png" : "https://openweathermap.org/img/wn/02d@2x.png",
                'windSpeed' => isset($data['wind']['speed']) ? round($data['wind']['speed'] * 3.6) : 12,
            ];
            echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit;
        }
        throw new Exception("OpenWeatherMap fetch failed or returned invalid data");
    } else {
        // Fallback to keyless Open-Meteo
        $url = "https://api.open-meteo.com/v1/forecast?latitude=" . $latVal . "&longitude=" . $lngVal . "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m";
        $data = http_request($url);
        
        if ($data && isset($data['current'])) {
            $code = isset($data['current']['weather_code']) ? $data['current']['weather_code'] : 0;
            
            $condition = 'Ясно';
            $iconCode = '01d';
            
            if ($code === 0) { $condition = 'Ясно'; $iconCode = '01d'; }
            elseif ($code >= 1 && $code <= 3) { $condition = 'Переменная облачность'; $iconCode = '02d'; }
            elseif ($code === 45 || $code === 48) { $condition = 'Туман'; $iconCode = '50d'; }
            elseif ($code >= 51 && $code <= 55) { $condition = 'Легкая морось'; $iconCode = '09d'; }
            elseif ($code >= 61 && $code <= 65) { $condition = 'Дождь'; $iconCode = '10d'; }
            elseif ($code >= 71 && $code <= 75) { $condition = 'Снегопад'; $iconCode = '13d'; }
            elseif ($code >= 80 && $code <= 82) { $condition = 'Ливень'; $iconCode = '09d'; }
            elseif ($code >= 95) { $condition = 'Гроза'; $iconCode = '11d'; }

            $result = [
                'temp' => isset($data['current']['temperature_2m']) ? round($data['current']['temperature_2m']) : 18,
                'feelsLike' => isset($data['current']['apparent_temperature']) ? round($data['current']['apparent_temperature']) : 17,
                'humidity' => isset($data['current']['relative_humidity_2m']) ? $data['current']['relative_humidity_2m'] : 62,
                'condition' => $condition,
                'icon' => "https://openweathermap.org/img/wn/" . $iconCode . "@2x.png",
                'windSpeed' => isset($data['current']['wind_speed_10m']) ? round($data['current']['wind_speed_10m']) : 12,
            ];
            echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit;
        }
        throw new Exception("Open-Meteo fetch failed or returned invalid data");
    }
} catch (Exception $e) {
    // Hardcoded mock values as safety net
    $fallback = [
        'temp' => 18,
        'feelsLike' => 17,
        'humidity' => 62,
        'condition' => 'Переменная облачность',
        'icon' => 'https://openweathermap.org/img/wn/02d@2x.png',
        'windSpeed' => 12,
        'error' => $e->getMessage()
    ];
    echo json_encode($fallback, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
