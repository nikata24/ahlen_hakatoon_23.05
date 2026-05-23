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

$query = isset($_GET['query']) ? trim($_GET['query']) : '';
// Google Maps API Key defined securely on the backend
$googleApiKey = 'AIzaSyBNE7LV77JLp30-zpPxrlotR0oKmTDLQCE';

// Safe lowercase function to handle cases where mbstring extension is disabled
function safe_strtolower($str) {
    if (function_exists('mb_strtolower')) {
        return mb_strtolower($str, 'UTF-8');
    }
    // Basic Cyrillic and Latin lowercase mapping
    $upper = ['А','Б','В','Г','Д','Е','Ё','Ж','З','И','Й','К','Л','М','Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Щ','Ъ','Ы','Ь','Э','Ю','Я'];
    $lower = ['а','б','в','г','д','е','ё','ж','з','и','й','к','л','м','н','о','п','р','с','т','у','ф','х','ц','ч','ш','щ','ъ','ы','ь','э','ю','я'];
    $str = str_replace($upper, $lower, $str);
    return strtolower($str);
}

$q = safe_strtolower($query);

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

// Category matching map for local DB fallback
$matched_category = '';
if (strpos($q, 'парк') !== false || strpos($q, 'гулять') !== false || strpos($q, 'спорт') !== false || strpos($q, 'relax') !== false) {
    $matched_category = 'relax';
} elseif (strpos($q, 'клуб') !== false || strpos($q, 'бар') !== false || strpos($q, 'диско') !== false || strpos($q, 'nightlife') !== false) {
    $matched_category = 'nightlife';
} elseif (strpos($q, 'шопинг') !== false || strpos($q, 'магазин') !== false || strpos($q, 'одежд') !== false || strpos($q, 'shopping') !== false) {
    $matched_category = 'shopping';
} elseif (strpos($q, 'музей') !== false || strpos($q, 'театр') !== false || strpos($q, 'культур') !== false || strpos($q, 'culture') !== false) {
    $matched_category = 'culture';
} elseif (strpos($q, 'ресторан') !== false || strpos($q, 'еда') !== false || strpos($q, 'кафе') !== false || strpos($q, 'пицца') !== false || strpos($q, 'culinary') !== false) {
    $matched_category = 'culinary';
}

try {
    if (!empty($googleApiKey)) {
        // Take the first word of the query to prevent Google Places API from returning ZERO_RESULTS on long synonym queries
        $search_query = $query;
        $words = preg_split('/\s+/u', $query);
        if (count($words) > 0 && !empty($words[0])) {
            $search_query = $words[0];
        }

        // Google Places text search URL using unambiguous German/English spelling "in Ahlen Germany"
        $url = "https://maps.googleapis.com/maps/api/place/textsearch/json?query=" . urlencode($search_query . " in Ahlen Germany") . "&location=" . AHLEN_LAT . "," . AHLEN_LNG . "&radius=3500&key=" . urlencode($googleApiKey);
        $text_data = http_request($url);
        
        if ($text_data && isset($text_data['results'])) {
            $limited = array_slice($text_data['results'], 0, 8);
            $places = [];
            
            foreach ($limited as $rawPlace) {
                $place_id = $rawPlace['place_id'];
                // Get detailed details for each place — including opening_hours
                $details_url = "https://maps.googleapis.com/maps/api/place/details/json?place_id=" . urlencode($place_id) . "&fields=name,formatted_address,geometry,rating,user_ratings_total,reviews,photos,price_level,opening_hours&key=" . urlencode($googleApiKey) . "&language=ru";
                $detail_data = http_request($details_url);
                
                if ($detail_data && isset($detail_data['result'])) {
                    $detail = $detail_data['result'];
                    
                    // Budget mapping
                    $price_level = isset($detail['price_level']) ? $detail['price_level'] : 2;
                    $budget = 2;
                    if ($price_level === 0 || $price_level === 1) {
                        $budget = 1;
                    } elseif ($price_level === 2) {
                        $budget = 2;
                    } elseif ($price_level >= 3) {
                        $budget = 3;
                    }
                    
                    // Review text mapping
                    $reviews = [];
                    if (isset($detail['reviews'])) {
                        $reviews_slice = array_slice($detail['reviews'], 0, 3);
                        foreach ($reviews_slice as $r) {
                            if (isset($r['text'])) {
                                $reviews[] = $r['text'];
                            }
                        }
                    }
                    if (empty($reviews)) {
                        $reviews[] = 'Прекрасное место с отличной атмосферой!';
                    }
                    
                    // Photo URL mapping
                    $imgUrl = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80';
                    if (isset($detail['photos']) && count($detail['photos']) > 0) {
                        $photo_ref = $detail['photos'][0]['photo_reference'];
                        $imgUrl = "https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&maxheight=400&photo_reference=" . urlencode($photo_ref) . "&key=" . urlencode($googleApiKey);
                    } elseif (strpos($q, 'парк') !== false || strpos($q, 'гулять') !== false) {
                        $imgUrl = 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&auto=format&fit=crop&q=80';
                    }
                    
                    // Determine category
                    $placeCat = 'culinary';
                    if (strpos($q, 'парк') !== false || strpos($q, 'гулять') !== false || strpos($q, 'спорт') !== false) {
                        $placeCat = 'relax';
                    } elseif (strpos($q, 'клуб') !== false || strpos($q, 'бар') !== false || strpos($q, 'диско') !== false) {
                        $placeCat = 'nightlife';
                    } elseif (strpos($q, 'шопинг') !== false || strpos($q, 'магазин') !== false || strpos($q, 'одежд') !== false) {
                        $placeCat = 'shopping';
                    } elseif (strpos($q, 'музей') !== false || strpos($q, 'театр') !== false || strpos($q, 'культур') !== false) {
                        $placeCat = 'culture';
                    }

                    // ---- Opening Hours mapping ----
                    $openingHours = null;
                    if (isset($detail['opening_hours'])) {
                        $oh = $detail['opening_hours'];
                        $open_now = isset($oh['open_now']) ? (bool)$oh['open_now'] : null;
                        $weekday_text = isset($oh['weekday_text']) ? $oh['weekday_text'] : [];
                        $periods = isset($oh['periods']) ? $oh['periods'] : [];
                        $openingHours = [
                            'open_now'     => $open_now,
                            'weekday_text' => $weekday_text,
                            'periods'      => $periods
                        ];
                    }
                    
                    $placeItem = [
                        'id' => $place_id,
                        'name' => isset($detail['name']) ? $detail['name'] : '',
                        'category' => $placeCat,
                        'ageSuitability' => [
                            'youth' => (strpos($q, 'клуб') !== false || strpos($q, 'бар') !== false) ? 5 : 4,
                            'adults' => 5,
                            'seniors' => (strpos($q, 'парк') !== false || strpos($q, 'музей') !== false) ? 5 : 3
                        ],
                        'budget' => $budget,
                        'timeOfDay' => (strpos($q, 'клуб') !== false || strpos($q, 'бар') !== false) ? ['evening', 'night'] : ['morning', 'afternoon', 'evening'],
                        'rating' => isset($detail['rating']) ? (float)$detail['rating'] : 4.5,
                        'userRatingsTotal' => isset($detail['user_ratings_total']) ? (int)$detail['user_ratings_total'] : 25,
                        'address' => isset($detail['formatted_address']) ? $detail['formatted_address'] : 'Ahlen, Germany',
                        'coordinates' => [
                            'lat' => isset($detail['geometry']['location']['lat']) ? (float)$detail['geometry']['location']['lat'] : AHLEN_LAT,
                            'lng' => isset($detail['geometry']['location']['lng']) ? (float)$detail['geometry']['location']['lng'] : AHLEN_LNG
                        ],
                        'description' => "Популярное место «" . (isset($detail['name']) ? $detail['name'] : '') . "» в Алене, подобранное агентом в реальном времени через Google Maps.",
                        'imageUrl' => $imgUrl,
                        'reviews' => $reviews,
                        'openingHours' => $openingHours
                    ];
                    
                    // Verify that the address contains "Ahlen", "59227", or "59229"
                    $addr = safe_strtolower($placeItem['address']);
                    if (strpos($addr, 'ahlen') !== false || strpos($addr, '59227') !== false || strpos($addr, '59229') !== false) {
                        $places[] = $placeItem;
                    }
                }
            }
            
            if (count($places) > 0) {
                echo json_encode($places, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                exit;
            }
        }
        throw new Exception("Google Places search failed or returned empty results");
    } else {
        throw new Exception("No Google API Key provided");
    }
} catch (Exception $e) {
    // Fallback to local places database
    $db_path = __DIR__ . '/places_db.json';
    $db_content = @file_get_contents($db_path);
    if ($db_content === false) {
        // Fallback to empty list or basic mock
        echo json_encode([], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    $all_places = json_decode($db_content, true);
    if (!$all_places) {
        echo json_encode([], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    $filtered = [];
    foreach ($all_places as $place) {
        $matches = false;
        if (empty($query)) {
            $matches = true;
        } else {
            $name = safe_strtolower($place['name']);
            $desc = safe_strtolower($place['description']);
            $cat = safe_strtolower($place['category']);
            
            if (strpos($name, $q) !== false) {
                $matches = true;
            } elseif (strpos($desc, $q) !== false) {
                $matches = true;
            } elseif (!empty($matched_category) && $cat === $matched_category) {
                $matches = true;
            }
        }
        if ($matches) {
            $filtered[] = $place;
        }
    }
    
    echo json_encode($filtered, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
