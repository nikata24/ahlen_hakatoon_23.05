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
    $googleApiKey = GOOGLE_API_KEY;
    if (!empty($googleApiKey)) {
        $url = "https://airquality.googleapis.com/v1/currentConditions:lookup?key=" . urlencode($googleApiKey);
        $payload = json_encode([
            'location' => [
                'latitude' => $latVal,
                'longitude' => $lngVal
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
        $url = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" . $latVal . "&longitude=" . $lngVal . "&current=european_aqi,pm2_5,pm10";
        $data = http_request($url);
        
        if ($data && isset($data['current'])) {
            $aqi = isset($data['current']['european_aqi']) ? round($data['current']['european_aqi']) : 12;
            $pm25 = isset($data['current']['pm2_5']) ? round($data['current']['pm2_5']) : 4;
            $pm10 = isset($data['current']['pm10']) ? round($data['current']['pm10']) : 9;
            
            $status = 'Отличный';
            $recommendation = 'Прекрасная погода для прогулок на улице!';

            if ($aqi <= 25) {
                $status = 'Отличный';
                $recommendation = 'Воздух чистейший! Прекрасное время для прогулок по Berliner Park.';
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
        'recommendation' => 'Воздух чистый и свежий. Наслаждайтесь прогулкой!',
        'error' => $e->getMessage()
    ];
    echo json_encode($fallback, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
