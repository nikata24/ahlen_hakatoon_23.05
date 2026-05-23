import type { Place, WeatherData, AirQualityData } from './types';

// PHP backend server URL
const BACKEND_BASE_URL = 'http://localhost:8000';

/**
 * Dummy function for Google Maps SDK load to ensure backwards compatibility if needed.
 */
export function loadGoogleMapsSDK(): Promise<void> {
  console.log('loadGoogleMapsSDK called. Obsolete - all Google API calls are secured on the PHP backend.');
  return Promise.resolve();
}

/**
 * Fetch weather from PHP backend
 */
export async function fetchWeather(): Promise<WeatherData> {
  console.group('🌐 [API Request] fetchWeather -> PHP Backend');
  const url = `${BACKEND_BASE_URL}/weather.php`;
  console.log(`Sending GET request to: ${url}`);
  console.log('Parameters: None (Key secured on backend)');

  try {
    const start = performance.now();
    const response = await fetch(url);
    const duration = (performance.now() - start).toFixed(1);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: WeatherData = await response.json();
    console.log(`Response received in ${duration}ms:`, data);
    console.groupEnd();
    return data;
  } catch (error) {
    console.error('Request failed:', error);
    console.groupEnd();
    // Return frontend safety fallback
    return {
      temp: 18,
      feelsLike: 17,
      humidity: 62,
      condition: 'Переменная облачность (Локальный резерв)',
      icon: 'https://openweathermap.org/img/wn/02d@2x.png',
      windSpeed: 12,
    };
  }
}

/**
 * Fetch air quality from PHP backend
 */
export async function fetchAirQuality(): Promise<AirQualityData> {
  console.group('🌐 [API Request] fetchAirQuality -> PHP Backend');
  const url = `${BACKEND_BASE_URL}/airquality.php`;
  console.log(`Sending GET request to: ${url}`);
  console.log('Parameters: None (Key secured on backend)');

  try {
    const start = performance.now();
    const response = await fetch(url);
    const duration = (performance.now() - start).toFixed(1);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: AirQualityData = await response.json();
    console.log(`Response received in ${duration}ms:`, data);
    console.groupEnd();
    return data;
  } catch (error) {
    console.error('Request failed:', error);
    console.groupEnd();
    // Return frontend safety fallback
    return {
      aqi: 12,
      pm25: 4,
      pm10: 9,
      status: 'Отличный',
      recommendation: 'Воздух чистый (Локальный резерв). Наслаждайтесь прогулкой по Алену!',
    };
  }
}

/**
 * Fetch places from PHP backend (replacing Google client-side service)
 */
export async function searchPlacesViaGoogle(query: string): Promise<Place[]> {
  console.group('🌐 [API Request] searchPlaces (searchPlacesViaGoogle) -> PHP Backend');
  const url = `${BACKEND_BASE_URL}/places.php?query=${encodeURIComponent(query)}`;
  console.log(`Sending GET request to: ${url}`);
  console.log('Parameters:', { query, key: 'Secured on backend' });

  try {
    const start = performance.now();
    const response = await fetch(url);
    const duration = (performance.now() - start).toFixed(1);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: Place[] = await response.json();
    console.log(`Response received in ${duration}ms. Found ${data.length} places:`, data);
    console.groupEnd();
    return data;
  } catch (error) {
    console.error('Request failed:', error);
    console.groupEnd();
    throw error; // Let main.ts catch and use local AHLEN_PLACES
  }
}
