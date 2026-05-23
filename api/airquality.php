<?php
// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Coordinates of Ahlen, Germany
const AHLEN_LAT = 51.7622;
const AHLEN_LNG = 7.8931;

// Google Maps API Key defined securely on the backend
$googleApiKey = 'AIzaSyBNE7LV77JLp30-zpPxrlotR0oKmTDLQCE';

// Helper to perform HTTP request
function http_request($url, $method = 'GET', $body = null) {
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

try {
    if (!empty($googleApiKey)) {
        $url = "https://airquality.googleapis.com/v1/currentConditions:lookup?key=" . urlencode($googleApiKey);
        $payload = json_encode([
            'location' => [
                'latitude' => AHLEN_LAT,
                'longitude' => AHLEN_LNG
            ]
        ]);
        
        $data = http_request($url, 'POST', $payload);
        
        if ($data && isset($data['indexes'])) {
            $aqi = isset($data['indexes'][0]['aqi']) ? $data['indexes'][0]['aqi'] : 15;
            
            $pm25 = 0;
            $pm10 = 0;
            if (isset($data['pollutants'])) {
                foreach ($data['pollutants'] as $pollutant) {
                    if (isset($pollutant['code'])) {
                        if ($pollutant['code'] === 'pm25') {
                            $pm25 = $pollutant['concentration']['value'];
                        } elseif ($pollutant['code'] === 'pm10') {
                            $pm10 = $pollutant['concentration']['value'];
                        }
                    }
                }
            }
            
            $status = 'Отличный';
            $recommendation = 'Прекрасная погода для прогулок на улице!';

            if ($aqi <= 20) {
                $status = 'Отличный';
                $recommendation = 'Качество воздуха идеальное! Отличное время для Berliner Park или Langstsee.';
            } elseif ($aqi <= 40) {
                $status = 'Хороший';
                $recommendation = 'Качество воздуха в пределах нормы. Подходит для любых занятий.';
            } elseif ($aqi <= 60) {
                $status = 'Умеренный';
                $recommendation = 'Качество воздуха среднее. Людям с высокой чувствительностью лучше не перенапрягаться на воздухе.';
            } else {
                $status = 'Загрязненный';
                $recommendation = 'Повышенное загрязнение воздуха. Агент советует посетить Kunstmuseum или Schuhfabrik!';
            }
            
            $result = [
                'aqi' => (int)$aqi,
                'pm25' => (int)round($pm25),
                'pm10' => (int)round($pm10),
                'status' => $status,
                'recommendation' => $recommendation
            ];
            echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit;
        }
        throw new Exception("Google Air Quality API fetch failed or returned invalid data");
    } else {
        // Fallback to keyless Open-Meteo Air Quality
        $url = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" . AHLEN_LAT . "&longitude=" . AHLEN_LNG . "&current=european_aqi,pm2_5,pm10";
        $data = http_request($url);
        
        if ($data && isset($data['current'])) {
            $aqi = isset($data['current']['european_aqi']) ? round($data['current']['european_aqi']) : 12;
            $pm25 = isset($data['current']['pm2_5']) ? round($data['current']['pm2_5']) : 4;
            $pm10 = isset($data['current']['pm10']) ? round($data['current']['pm10']) : 9;
            
            $status = 'Отличный';
            $recommendation = 'Прекрасная погода для прогулок на улице!';

            if ($aqi <= 25) {
                $status = 'Отличный';
                $recommendation = 'Воздух в Алене чистейший! Прекрасное время для прогулок по Berliner Park.';
            } elseif ($aqi <= 50) {
                $status = 'Хороший';
                $recommendation = 'Качество воздуха хорошее. Подходит для любых видов отдыха.';
            } elseif ($aqi <= 75) {
                $status = 'Умеренный';
                $recommendation = 'Умеренное качество воздуха. Агент советует взять зонтик и сходить в Kunstmuseum.';
            } else {
                $status = 'Загрязненный';
                $recommendation = 'Воздух загрязнен. Рекомендуется оставаться в закрытых помещениях (например, Ahlener Kinocenter).';
            }
            
            $result = [
                'aqi' => (int)$aqi,
                'pm25' => (int)$pm25,
                'pm10' => (int)$pm10,
                'status' => $status,
                'recommendation' => $recommendation
            ];
            echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit;
        }
        throw new Exception("Open-Meteo Air Quality fetch failed or returned invalid data");
    }
} catch (Exception $e) {
    // Hardcoded mock values as safety net
    $fallback = [
        'aqi' => 12,
        'pm25' => 4,
        'pm10' => 9,
        'status' => 'Отличный',
        'recommendation' => 'Воздух чистый и свежий. Наслаждайтесь прогулкой по Алену!',
        'error' => $e->getMessage()
    ];
    echo json_encode($fallback, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
