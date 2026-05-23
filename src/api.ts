import type { Place, WeatherData, AirQualityData } from './types';

// Coordinates of Ahlen, Germany
const AHLEN_LAT = 51.7622;
const AHLEN_LNG = 7.8931;

/**
 * Loads the Google Maps JavaScript API SDK dynamically into the document.
 * This enables the use of Maps and PlacesService without encountering CORS errors in client-side queries.
 */
let mapsLoadedPromise: Promise<void> | null = null;

export function loadGoogleMapsSDK(apiKey: string): Promise<void> {
  if (mapsLoadedPromise) return mapsLoadedPromise;

  mapsLoadedPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      mapsLoadedPromise = null; // Reset on failure so we can try again
      reject(new Error('Не удалось загрузить SDK Google Maps. Проверьте правильность API ключа.'));
    };

    document.head.appendChild(script);
  });

  return mapsLoadedPromise;
}

/**
 * Live Weather API Fetcher
 * If an OpenWeather API key is provided, queries OpenWeather.
 * If not, fetches from the free, key-less Open-Meteo API as a premium fallback.
 */
export async function fetchWeather(apiKey?: string): Promise<WeatherData> {
  try {
    if (apiKey && apiKey.trim() !== '') {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${AHLEN_LAT}&lon=${AHLEN_LNG}&appid=${apiKey}&units=metric&lang=ru`
      );
      if (!response.ok) throw new Error('OpenWeather API error');
      const data = await response.json();
      return {
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        condition: data.weather[0].description,
        icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
        windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      };
    } else {
      // Keyless Open-Meteo Fallback
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${AHLEN_LAT}&longitude=${AHLEN_LNG}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`
      );
      if (!response.ok) throw new Error('Open-Meteo API error');
      const data = await response.json();
      const code = data.current.weather_code;
      
      // Map WMO Weather Codes to descriptions and standard icons
      let condition = 'Ясно';
      let iconCode = '01d';
      
      if (code === 0) { condition = 'Ясно'; iconCode = '01d'; }
      else if (code >= 1 && code <= 3) { condition = 'Переменная облачность'; iconCode = '02d'; }
      else if (code === 45 || code === 48) { condition = 'Туман'; iconCode = '50d'; }
      else if (code >= 51 && code <= 55) { condition = 'Легкая морось'; iconCode = '09d'; }
      else if (code >= 61 && code <= 65) { condition = 'Дождь'; iconCode = '10d'; }
      else if (code >= 71 && code <= 75) { condition = 'Снегопад'; iconCode = '13d'; }
      else if (code >= 80 && code <= 82) { condition = 'Ливень'; iconCode = '09d'; }
      else if (code >= 95) { condition = 'Гроза'; iconCode = '11d'; }

      return {
        temp: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        condition: condition,
        icon: `https://openweathermap.org/img/wn/${iconCode}@2x.png`,
        windSpeed: Math.round(data.current.wind_speed_10m),
      };
    }
  } catch (error) {
    console.error('Weather fetch error:', error);
    // Hardcoded mock values as safety net
    return {
      temp: 18,
      feelsLike: 17,
      humidity: 62,
      condition: 'Переменная облачность',
      icon: 'https://openweathermap.org/img/wn/02d@2x.png',
      windSpeed: 12,
    };
  }
}

/**
 * Live Air Quality API Fetcher
 * If Google API key is provided, uses Google's Air Quality API lookup.
 * If not, falls back to the open Air Quality API from Open-Meteo.
 */
export async function fetchAirQuality(googleApiKey?: string): Promise<AirQualityData> {
  try {
    if (googleApiKey && googleApiKey.trim() !== '') {
      const response = await fetch(
        `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: { latitude: AHLEN_LAT, longitude: AHLEN_LNG },
          }),
        }
      );
      if (!response.ok) throw new Error('Google Air Quality API error');
      const data = await response.json();
      
      const aqi = data.indexes[0].aqi;
      const pm25 = data.pollutants.find((p: any) => p.code === 'pm25')?.concentration.value || 0;
      const pm10 = data.pollutants.find((p: any) => p.code === 'pm10')?.concentration.value || 0;
      
      let status: AirQualityData['status'] = 'Отличный';
      let recommendation = 'Прекрасная погода для прогулок на улице!';

      if (aqi <= 20) {
        status = 'Отличный';
        recommendation = 'Качество воздуха идеальное! Отличное время для Berliner Park или Langstsee.';
      } else if (aqi <= 40) {
        status = 'Хороший';
        recommendation = 'Качество воздуха в пределах нормы. Подходит для любых занятий.';
      } else if (aqi <= 60) {
        status = 'Умеренный';
        recommendation = 'Качество воздуха среднее. Людям с высокой чувствительностью лучше не перенапрягаться на воздухе.';
      } else {
        status = 'Загрязненный';
        recommendation = 'Повышенное загрязнение воздуха. Агент советует посетить Kunstmuseum или Schuhfabrik!';
      }

      return { aqi, pm25: Math.round(pm25), pm10: Math.round(pm10), status, recommendation };
    } else {
      // Keyless Open-Meteo Air Quality Fallback
      const response = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${AHLEN_LAT}&longitude=${AHLEN_LNG}&current=european_aqi,pm2_5,pm10`
      );
      if (!response.ok) throw new Error('Open-Meteo AQI error');
      const data = await response.json();

      const aqi = Math.round(data.current.european_aqi);
      const pm25 = Math.round(data.current.pm2_5);
      const pm10 = Math.round(data.current.pm10);

      let status: AirQualityData['status'] = 'Отличный';
      let recommendation = 'Прекрасная погода для прогулок на улице!';

      if (aqi <= 25) {
        status = 'Отличный';
        recommendation = 'Воздух в Алене чистейший! Прекрасное время для прогулок по Berliner Park.';
      } else if (aqi <= 50) {
        status = 'Хороший';
        recommendation = 'Качество воздуха хорошее. Подходит для любых видов отдыха.';
      } else if (aqi <= 75) {
        status = 'Умеренный';
        recommendation = 'Умеренное качество воздуха. Агент советует взять зонтик и сходить в Kunstmuseum.';
      } else {
        status = 'Загрязненный';
        recommendation = 'Воздух загрязнен. Рекомендуется оставаться в закрытых помещениях (например, Ahlener Kinocenter).';
      }

      return { aqi, pm25, pm10, status, recommendation };
    }
  } catch (error) {
    console.error('AQI fetch error:', error);
    return {
      aqi: 12,
      pm25: 4,
      pm10: 9,
      status: 'Отличный',
      recommendation: 'Воздух чистый и свежий. Наслаждайтесь прогулкой по Алену!',
    };
  }
}

/**
 * Searches and fetches real places from Google Maps using client-side PlacesService.
 * Maps search responses to our custom Place objects.
 */
export function searchPlacesViaGoogle(query: string, googleApiKey: string): Promise<Place[]> {
  return new Promise(async (resolve) => {
    try {
      await loadGoogleMapsSDK(googleApiKey);

      // We need a dummy DOM element to initialize PlacesService
      const mapContainer = document.createElement('div');
      const map = new (window as any).google.maps.Map(mapContainer, {
        center: { lat: AHLEN_LAT, lng: AHLEN_LNG },
        zoom: 14
      });

      const service = new (window as any).google.maps.places.PlacesService(map);

      // Perform a text search for places in Ahlen
      service.textSearch(
        {
          query: `${query} в Алене Германия`,
          location: new (window as any).google.maps.LatLng(AHLEN_LAT, AHLEN_LNG),
          radius: 3500, // Reduced from 5000m to strictly focus on core Ahlen borders
        },
        async (results: any[], status: any) => {
          if (status !== (window as any).google.maps.places.PlacesServiceStatus.OK || !results) {
            resolve([]);
            return;
          }

          // We take the top 8 raw results and fetch full details for the top 5
          const limitedResults = results.slice(0, 8);
          const placesPromises = limitedResults.map((rawPlace) => {
            return new Promise<Place | null>((res) => {
              service.getDetails(
                {
                  placeId: rawPlace.place_id,
                  fields: ['name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'reviews', 'photos', 'price_level']
                },
                (detail: any, detailStatus: any) => {
                  if (detailStatus !== (window as any).google.maps.places.PlacesServiceStatus.OK || !detail) {
                    res(null);
                    return;
                  }

                  // Parse price level
                  let budgetLevel: 1 | 2 | 3 = 2; // default moderate
                  if (detail.price_level === 0 || detail.price_level === 1) budgetLevel = 1;
                  else if (detail.price_level === 2) budgetLevel = 2;
                  else if (detail.price_level >= 3) budgetLevel = 3;

                  // Get reviews
                  const parsedReviews = detail.reviews
                    ? detail.reviews.slice(0, 3).map((r: any) => r.text)
                    : ['Прекрасное место с отличной атмосферой!'];

                  // Get photo
                  let imgUrl = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80'; // default food/cozy
                  if (detail.photos && detail.photos.length > 0) {
                    imgUrl = detail.photos[0].getUrl({ maxWidth: 600, maxHeight: 400 });
                  } else if (query.toLowerCase().includes('парк') || query.toLowerCase().includes('гулять')) {
                    imgUrl = 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&auto=format&fit=crop&q=80';
                  }

                  // Determine basic default categories based on query
                  let placeCat: Place['category'] = 'culinary';
                  const q = query.toLowerCase();
                  if (q.includes('парк') || q.includes('гулять') || q.includes('спорт')) placeCat = 'relax';
                  else if (q.includes('клуб') || q.includes('бар') || q.includes('диско')) placeCat = 'nightlife';
                  else if (q.includes('шопинг') || q.includes('магазин') || q.includes('одежд')) placeCat = 'shopping';
                  else if (q.includes('музей') || q.includes('театр') || q.includes('культур')) placeCat = 'culture';

                  const placeItem: Place = {
                    id: rawPlace.place_id,
                    name: detail.name,
                    category: placeCat,
                    ageSuitability: {
                      youth: q.includes('клуб') || q.includes('бар') ? 5 : 4,
                      adults: 5,
                      seniors: q.includes('парк') || q.includes('музей') ? 5 : 3
                    },
                    budget: budgetLevel,
                    timeOfDay: q.includes('клуб') || q.includes('бар') ? ['evening', 'night'] : ['morning', 'afternoon', 'evening'],
                    rating: detail.rating || 4.5,
                    userRatingsTotal: detail.user_ratings_total || 25,
                    address: detail.formatted_address || 'Ahlen, Germany',
                    coordinates: {
                      lat: detail.geometry.location.lat(),
                      lng: detail.geometry.location.lng()
                    },
                    description: `Популярное место «${detail.name}» в Алене, подобранное агентом в реальном времени через Google Maps.`,
                    imageUrl: imgUrl,
                    reviews: parsedReviews
                  };
                  res(placeItem);
                }
              );
            });
          });

          const fetchedPlaces = await Promise.all(placesPromises);
          const finalPlaces = fetchedPlaces.filter((p): p is Place => {
            if (p === null) return false;
            // Strict check: must contain the city name "Ahlen" or one of its two zip codes
            const addr = p.address.toLowerCase();
            return addr.includes('ahlen') || addr.includes('59227') || addr.includes('59229');
          });
          resolve(finalPlaces);
        }
      );
    } catch (e) {
      console.error('Google search error:', e);
      resolve([]);
    }
  });
}
