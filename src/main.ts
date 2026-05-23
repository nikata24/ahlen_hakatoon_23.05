import './style.css';
import type { Place, WeatherData, AirQualityData, UserPreferences, AgentLog } from './types';
import { AHLEN_PLACES } from './data';
import { fetchWeather, fetchAirQuality, searchPlacesViaGoogle } from './api';

// ==========================================================================
// APPLICATION STATE
// ==========================================================================
let currentPlaces: Place[] = [];
let weatherInfo: WeatherData | null = null;
let airQualityInfo: AirQualityData | null = null;
// All API Keys are secured and stored strictly on the PHP backend.

// Leaflet Map Instance
let mapInstance: any = null;
let markerLayerGroup: any = null;

// Coordinates of Ahlen, Germany
const AHLEN_LAT = 51.7622;
const AHLEN_LNG = 7.8931;

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
const preferencesForm = document.getElementById('preferences-form') as HTMLFormElement;
const agentMonitor = document.getElementById('agent-monitor') as HTMLDivElement;
const terminalBody = document.getElementById('terminal-body') as HTMLDivElement;
const resultsSection = document.getElementById('results-section') as HTMLDivElement;
const placesList = document.getElementById('places-list') as HTMLDivElement;
// Settings cog and keys input are removed to secure API keys on the backend.
const recenterMapBtn = document.getElementById('recenter-map-btn') as HTMLButtonElement;

// ==========================================================================
// EVENT LISTENERS INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Form Submit
  if (preferencesForm) {
    preferencesForm.addEventListener('submit', handlePreferencesSubmit);
  }

  // Recenter Map
  if (recenterMapBtn) {
    recenterMapBtn.addEventListener('click', recenterMap);
  }
});

// ==========================================================================
// PREFERENCES SUBMISSION & SCORING RUNNER
// ==========================================================================
async function handlePreferencesSubmit(e: Event) {
  e.preventDefault();

  const moodSelect = document.getElementById('pref-mood') as HTMLSelectElement;
  const ageSelect = document.getElementById('pref-age') as HTMLSelectElement;
  const budgetSelect = document.getElementById('pref-budget') as HTMLSelectElement;
  const timeSelect = document.getElementById('pref-time') as HTMLSelectElement;
  
  const personalityRadio = document.querySelector('input[name="agent-personality"]:checked') as HTMLInputElement;

  const preferences: UserPreferences = {
    mood: moodSelect.value as UserPreferences['mood'],
    ageGroup: ageSelect.value as UserPreferences['ageGroup'],
    budget: parseInt(budgetSelect.value) as 1 | 2 | 3,
    timeOfDay: timeSelect.value as UserPreferences['timeOfDay'],
    agentPersonality: (personalityRadio ? personalityRadio.value : 'expert') as UserPreferences['agentPersonality']
  };

  // 1. Show console and reset outputs
  agentMonitor.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  terminalBody.innerHTML = '';
  agentMonitor.scrollIntoView({ behavior: 'smooth' });

  // 2. Run simulation logs
  const logsQueue: AgentLog[] = [];
  const addLog = (message: string, type: AgentLog['type']) => {
    logsQueue.push({
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    });
  };

  const agentName = getAgentName(preferences.agentPersonality);
  addLog(`[Агент: ${agentName}] Инициализировано подключение к ядру поиска.`, 'info');
  addLog(`[Агент] Параметры анализа: настроение=[${preferences.mood}], возраст=[${preferences.ageGroup}], бюджет=[${preferences.budget}], время=[${preferences.timeOfDay}].`, 'think');

  // Load weather and AQI
  addLog(`[Бэкенд-Запрос] Отправка GET на http://localhost:8000/weather.php...`, 'think');
  addLog(`[Бэкенд-Запрос] Отправка GET на http://localhost:8000/airquality.php...`, 'think');
  
  try {
    weatherInfo = await fetchWeather();
    addLog(`[Бэкенд-Ответ] Погода: ${weatherInfo.temp}°C, влажность ${weatherInfo.humidity}%, ${weatherInfo.condition}.`, 'success');
    
    airQualityInfo = await fetchAirQuality();
    addLog(`[Бэкенд-Ответ] Качество воздуха (AQI): индекс ${airQualityInfo.aqi} (${airQualityInfo.status}).`, 'success');
  } catch (err) {
    addLog(`[Агент] Предупреждение: Не удалось связаться с бэкендом. Применяю резервные параметры.`, 'warn');
  }

  // Live Google Places API or Local DB?
  let rawPlaces: Place[] = [];
  const query = getQueryForCategory(preferences.mood);
  
  addLog(`[Бэкенд-Запрос] Отправка GET на http://localhost:8000/places.php?query=${encodeURIComponent(query)}...`, 'think');
  
  try {
    rawPlaces = await searchPlacesViaGoogle(query);
    addLog(`[Бэкенд-Ответ] Бэкенд успешно вернул ${rawPlaces.length} заведений!`, 'success');
    
    if (rawPlaces.length > 0) {
      if (rawPlaces[0].id.startsWith('ChI')) {
        addLog(`[Агент] Источник данных: Живой поиск Google Places API (в реальном времени)!`, 'success');
      } else {
        addLog(`[Агент] Источник данных: Локальная база данных (api/places_db.json).`, 'info');
      }
    }
  } catch (err) {
    addLog(`[Агент] Сбой бэкенда. Использую резервный массив в браузере.`, 'warn');
    rawPlaces = AHLEN_PLACES;
  }

  // 3. Score candidates using Agent Decision Engine
  addLog(`[Агент] Запуск Движка Принятия Решений (Agent Decision Engine). Ранжирование заведений...`, 'think');
  
  const selectedWeather = weatherInfo || { temp: 18, condition: 'Ясно' } as any;
  const selectedAQI = airQualityInfo || { aqi: 10, status: 'Отличный' } as any;
  
  const scoredPlaces = scorePlaces(preferences, rawPlaces, selectedWeather, selectedAQI, addLog);
  currentPlaces = scoredPlaces.slice(0, 5);

  addLog(`[Агент] Ранжирование завершено. Отобрано ТОП-5 идеальных кандидатов.`, 'success');
  addLog(`[Агент] Отрисовка интерактивной карты Алена с метками...`, 'think');

  // 4. Output logs to screen sequentially (typewriter effect)
  await streamLogsToScreen(logsQueue);

  // 5. Render results
  renderWeatherAndAQI();
  renderPlaceCards();
  initOrUpdateMap(currentPlaces);

  // Show results dashboard
  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// ==========================================================================
// SCORING ALGORITHM - AGENT DECISION ENGINE
// ==========================================================================
function scorePlaces(
  pref: UserPreferences,
  places: Place[],
  weather: WeatherData,
  aqi: AirQualityData,
  logger: (msg: string, type: AgentLog['type']) => void
): Place[] {
  
  // Create a copy to prevent mutation
  const placesWithScores = places.map(p => {
    let score = 0;
    const explanations: string[] = [];

    // --- 1. HARD CONSTRAINTS (TIME & BUDGET LIMITS) ---
    // If venue is closed during selected time of day
    if (!p.timeOfDay.includes(pref.timeOfDay)) {
      score -= 50; // Heavily penalize
      explanations.push(`Не подходит по времени (${pref.timeOfDay})`);
    }

    // Exclude or penalize if budget exceeds preference
    if (p.budget > pref.budget) {
      score -= 40;
      explanations.push(`Превышает бюджет (${p.budget} > ${pref.budget})`);
    } else if (p.budget === pref.budget) {
      score += 5;
      explanations.push(`Бюджет идеальный (+5)`);
    } else {
      score += 2; // cheaper is fine
      explanations.push(`Дешевле лимита (+2)`);
    }

    // --- 2. CATEGORY / MOOD MATCH ---
    if (p.category === pref.mood) {
      score += 15;
      explanations.push(`Совпадение настроения: [${p.category}] (+15)`);
    } else {
      // Small helper for related category matches
      if (pref.mood === 'nightlife' && p.category === 'culinary') {
        score += 5;
        explanations.push(`Ресторан подходит под вечернюю тусовку (+5)`);
      } else if (pref.mood === 'relax' && p.category === 'culture') {
        score += 3;
        explanations.push(`Культурный объект подходит для спокойного дня (+3)`);
      }
    }

    // --- 3. AGE SUITABILITY MATCH ---
    let ageScore = 0;
    if (pref.ageGroup === 'youth') ageScore = p.ageSuitability.youth;
    else if (pref.ageGroup === 'adults') ageScore = p.ageSuitability.adults;
    else ageScore = p.ageSuitability.seniors;

    score += ageScore * 2.5;
    explanations.push(`Соответствие возрастной группе: ${ageScore}/5 звезд (+${(ageScore * 2.5).toFixed(1)})`);

    // --- 4. RATING STIMULUS ---
    score += (p.rating - 3) * 3;
    explanations.push(`Google Maps Рейтинг: ${p.rating}⭐ (+${((p.rating - 3) * 3).toFixed(1)})`);

    // --- 5. DYNAMIC WEATHER INFLUENCE ---
    const isOutdoor = p.category === 'relax' || p.name.toLowerCase().includes('парк') || p.name.toLowerCase().includes('озеро') || p.name.toLowerCase().includes('площадь');
    const isRainy = weather.condition.toLowerCase().includes('дождь') || weather.condition.toLowerCase().includes('ливень') || weather.condition.toLowerCase().includes('гроза') || weather.condition.toLowerCase().includes('морось');

    if (isOutdoor) {
      if (isRainy) {
        score -= 20;
        explanations.push(`Штраф за открытое небо в дождь (-20)`);
      } else if (weather.temp < 11) {
        score -= 10;
        explanations.push(`Штраф за уличную локацию в холод (-10)`);
      } else if (weather.temp > 18 && !isRainy) {
        score += 8;
        explanations.push(`Бонус за прекрасную теплую погоду на улице (+8)`);
      }
    } else {
      // Indoor bonus if bad weather
      if (isRainy || weather.temp < 10) {
        score += 10;
        explanations.push(`Бонус за уют в закрытом помещении во время осадков/холода (+10)`);
      }
    }

    // --- 6. AIR QUALITY INFLUENCE ---
    if (isOutdoor && aqi.aqi > 50) {
      score -= 8;
      explanations.push(`Штраф за прогулку при повышенном PM загрязнении воздуха (-8)`);
    }

    return {
      place: p,
      score,
      explanations
    };
  });

  // Log top deductions/boosts for agent terminal simulation
  const topPlace = placesWithScores.sort((a, b) => b.score - a.score)[0];
  if (topPlace) {
    logger(`[Движок] Лидер отбора: "${topPlace.place.name}" (Баллы: ${topPlace.score.toFixed(1)}).`, 'success');
    
    // Log the weather modifier specifically
    const isRainy = weather.condition.toLowerCase().includes('дождь') || weather.condition.toLowerCase().includes('ливень') || weather.condition.toLowerCase().includes('гроза');
    if (isRainy) {
      logger(`[Движок] Агент: В Алене идет дождь! Пенализирую уличные прогулки, рекомендую закрытые помещения.`, 'warn');
    } else if (weather.temp > 17) {
      logger(`[Движок] Агент: Погода отличная (+${weather.temp}°C). Повышаю рейтинги парков и рекреационных зон!`, 'success');
    }
  }

  return placesWithScores.map(item => item.place);
}

// ==========================================================================
// TERMINAL LOG WRITER (TYPEWRITER SIMULATOR)
// ==========================================================================
function streamLogsToScreen(logs: AgentLog[]): Promise<void> {
  return new Promise((resolve) => {
    let index = 0;
    
    function printNextLog() {
      if (index >= logs.length) {
        resolve();
        return;
      }

      const log = logs[index];
      const logLine = document.createElement('div');
      logLine.className = `log-line ${log.type}`;
      
      const timeSpan = document.createElement('span');
      timeSpan.style.color = '#475569';
      timeSpan.style.marginRight = '8px';
      timeSpan.textContent = `[${log.timestamp}]`;

      const msgSpan = document.createElement('span');
      msgSpan.textContent = log.message;

      logLine.appendChild(timeSpan);
      logLine.appendChild(msgSpan);
      terminalBody.appendChild(logLine);
      
      // Auto scroll
      terminalBody.scrollTop = terminalBody.scrollHeight;

      index++;
      setTimeout(printNextLog, 300 + Math.random() * 200); // 300-500ms delay per log
    }

    printNextLog();
  });
}

// ==========================================================================
// RENDER WEATHER & AQI WIDGETS
// ==========================================================================
function renderWeatherAndAQI() {
  const tempSpan = document.getElementById('weather-temp') as HTMLSpanElement;
  const descSpan = document.getElementById('weather-condition') as HTMLSpanElement;
  const feelsSpan = document.getElementById('weather-feels') as HTMLSpanElement;
  const humiditySpan = document.getElementById('weather-humidity') as HTMLSpanElement;
  const windSpan = document.getElementById('weather-wind') as HTMLSpanElement;
  const weatherIcon = document.getElementById('weather-icon') as HTMLImageElement;

  if (weatherInfo) {
    tempSpan.textContent = `${weatherInfo.temp}°C`;
    descSpan.textContent = weatherInfo.condition;
    feelsSpan.textContent = `${weatherInfo.feelsLike}°C`;
    humiditySpan.textContent = `${weatherInfo.humidity}%`;
    windSpan.textContent = `${weatherInfo.windSpeed} км/ч`;
    weatherIcon.src = weatherInfo.icon;
  }

  const aqiIndexSpan = document.getElementById('aqi-index') as HTMLSpanElement;
  const pm25Span = document.getElementById('aqi-pm25') as HTMLSpanElement;
  const pm10Span = document.getElementById('aqi-pm10') as HTMLSpanElement;
  const aqiBadge = document.getElementById('aqi-status-badge') as HTMLSpanElement;
  const aqiRecommendation = document.getElementById('aqi-recommendation') as HTMLParagraphElement;

  if (airQualityInfo) {
    aqiIndexSpan.textContent = String(airQualityInfo.aqi);
    pm25Span.textContent = `${airQualityInfo.pm25} мкг/м³`;
    pm10Span.textContent = `${airQualityInfo.pm10} мкг/м³`;
    aqiBadge.textContent = airQualityInfo.status;
    
    // Class toggling
    aqiBadge.className = 'aqi-status-badge';
    if (airQualityInfo.status === 'Отличный') aqiBadge.classList.add('good');
    else if (airQualityInfo.status === 'Хороший' || airQualityInfo.status === 'Умеренный') aqiBadge.classList.add('fair');
    else aqiBadge.classList.add('poor');

    aqiRecommendation.textContent = airQualityInfo.recommendation;
  }
}

// ==========================================================================
// OPENING HOURS HELPER
// ==========================================================================
/**
 * Computes open/closed status and today's schedule from a place's openingHours.
 * Uses the browser's local time (Europe/Berlin for Ahlen).
 * Returns { isOpen: boolean|null, todayText: string }
 */
function getOpenStatus(place: Place): { isOpen: boolean | null; todayText: string } {
  if (!place.openingHours) return { isOpen: null, todayText: '' };

  const oh = place.openingHours;

  // Use periods for precise calculation when available
  const now = new Date();
  // Day of week: 0=Sun, 1=Mon ... 6=Sat (same as Google)
  const day = now.getDay();
  const hhmm = now.getHours() * 100 + now.getMinutes();

  let isOpen: boolean | null = null;

  if (oh.periods && oh.periods.length > 0) {
    isOpen = false; // default closed unless a period matches
    for (const period of oh.periods) {
      const openDay = period.open.day;
      const openTime = parseInt(period.open.time, 10);

      if (!period.close) {
        // 24h open (no close means always open)
        isOpen = true;
        break;
      }

      const closeDay = period.close.day;
      const closeTime = parseInt(period.close.time, 10);

      if (openDay === closeDay) {
        // Same-day period
        if (day === openDay && hhmm >= openTime && hhmm < closeTime) {
          isOpen = true;
          break;
        }
      } else {
        // Overnight period (e.g., bar opens Fri 18:00, closes Sat 03:00)
        if (day === openDay && hhmm >= openTime) { isOpen = true; break; }
        if (day === closeDay && hhmm < closeTime)  { isOpen = true; break; }
      }
    }
  } else if (oh.open_now !== null) {
    isOpen = oh.open_now;
  }

  // Find today's text from weekday_text (Google uses Mon=0 in weekday_text, but JS day: 0=Sun)
  // Google weekday_text: index 0=Monday … 6=Sunday
  const googleDayIndex = (day === 0) ? 6 : day - 1;
  const todayText = (oh.weekday_text && oh.weekday_text[googleDayIndex])
    ? oh.weekday_text[googleDayIndex]
    : '';

  return { isOpen, todayText };
}

// ==========================================================================
// RENDER PLACE CARDS
// ==========================================================================
function renderPlaceCards() {
  placesList.innerHTML = '';

  if (currentPlaces.length === 0) {
    placesList.innerHTML = `<div class="glass-card" style="padding: 20px; text-align: center;">Не найдено заведений, соответствующих выбранным жестким критериям. Попробуйте увеличить бюджет или изменить время суток!</div>`;
    return;
  }

  currentPlaces.forEach((place, index) => {
    const card = document.createElement('article');
    card.className = 'place-card glass-card';
    card.style.animationDelay = `${index * 150}ms`; // staggered entry

    // Build star rating stars
    const fullStars = Math.floor(place.rating);
    const halfStar = place.rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) starsHtml += '★';
    if (halfStar) starsHtml += '½'; // or simple unicode stars
    for (let i = 0; i < emptyStars; i++) starsHtml += '☆';

    // Categories translation helper
    const categoryNames = {
      relax: '🌳 Природа & Отдых',
      nightlife: '🍹 Ночная жизнь',
      shopping: '🛍️ Шопинг',
      culinary: '🍕 Рестораны & Еда',
      culture: '🎭 Культура & Арт'
    };

    // Budgets translation helper
    const budgetIcons = ['€', '€€', '€€€'];
    const budgetLabel = budgetIcons[place.budget - 1];

    // Opening hours: compute open/closed status right now
    const { isOpen, todayText } = getOpenStatus(place);
    let openBadgeHtml = '';
    if (isOpen === true) {
      openBadgeHtml = `<span class="pill open-now-pill open">🟢 Открыто сейчас</span>`;
    } else if (isOpen === false) {
      openBadgeHtml = `<span class="pill open-now-pill closed">🔴 Закрыто</span>`;
    }
    // Today's schedule label (strip the day name prefix, keep just the time part)
    const todayScheduleHtml = todayText
      ? `<div class="place-hours-today">
           <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
           <span>${todayText}</span>
         </div>`
      : '';

    // Opening hours accordion (full week schedule)
    const hoursAccordionHtml = (place.openingHours && place.openingHours.weekday_text && place.openingHours.weekday_text.length > 0)
      ? `<div class="hours-accordion" id="hours-accordion-${place.id}">
           <div class="hours-header" onclick="document.getElementById('hours-accordion-${place.id}').classList.toggle('open')">
             <span>Часы работы</span>
             <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
           </div>
           <div class="hours-content">
             ${place.openingHours.weekday_text.map(line => `<div class="hours-row"><span>${line}</span></div>`).join('')}
           </div>
         </div>`
      : '';

    card.innerHTML = `
      <div class="place-num-badge">${index + 1}</div>
      <div class="place-image-wrapper">
        <img src="${place.imageUrl}" alt="${place.name}" loading="lazy" />
      </div>
      <div class="place-details-wrapper">
        <div class="place-details-header">
          <div>
            <h3 class="place-name">${place.name}</h3>
            <div class="place-stars-container">
              <div class="star-rating" title="Рейтинг ${place.rating} из 5">${starsHtml}</div>
              <span class="rating-number">${place.rating}</span>
              <span class="rating-count">(${place.userRatingsTotal} отзывов)</span>
            </div>
          </div>
          
          <div class="place-meta-pills">
            <span class="pill category-pill">${categoryNames[place.category]}</span>
            <span class="pill budget-pill">${budgetLabel}</span>
            ${openBadgeHtml}
          </div>
        </div>

        <p class="place-description">${place.description}</p>

        <div class="place-address">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${place.address}</span>
        </div>

        ${todayScheduleHtml}

        <div class="place-footer">
          ${hoursAccordionHtml}
          <div class="reviews-accordion" id="reviews-accordion-${place.id}">
            <div class="reviews-header" onclick="document.getElementById('reviews-accordion-${place.id}').classList.toggle('open')">
              <span>Отзывы посетителей</span>
              <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="reviews-content">
              ${place.reviews.map(review => `<p>"${review}"</p>`).join('')}
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
          <a class="directions-btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ', ' + place.address)}" target="_blank" rel="noopener">
            <span>Построить маршрут</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </a>
        </div>
      </div>
    `;

    placesList.appendChild(card);
  });
}

// ==========================================================================
// INTERACTIVE MAP CONTROLLER (LEAFLET IN DARK MODE)
// ==========================================================================
function initOrUpdateMap(places: Place[]) {
  const L = (window as any).L;
  if (!L) return;

  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) return;

  // Initialize Map if not exist
  if (!mapInstance) {
    // Standard CartoDB Dark Matter tiles (absolutely beautiful dark futuristic look!)
    mapInstance = L.map('map-container', {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([AHLEN_LAT, AHLEN_LNG], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/attributions">CartoDB</a>',
      maxZoom: 19
    }).addTo(mapInstance);

    markerLayerGroup = L.layerGroup().addTo(mapInstance);
  } else {
    // Clear old markers
    markerLayerGroup.clearLayers();
  }

  const bounds: any[] = [];

  places.forEach((place, index) => {
    const latLng = [place.coordinates.lat, place.coordinates.lng];
    bounds.push(latLng);

    // Create a gorgeous custom numbered pin using CSS!
    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `<div style="
        background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
        color: #040207;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        box-shadow: 0 0 12px rgba(0, 242, 254, 0.6);
        border: 2px solid #fff;
        font-family: 'Outfit', sans-serif;
      ">${index + 1}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const popupContent = `
      <div class="map-popup-card">
        <span class="popup-title">${place.name}</span>
        <span class="popup-desc">${place.description.slice(0, 75)}...</span>
        <span class="popup-rating">⭐ ${place.rating} (${place.userRatingsTotal} отз.)</span>
      </div>
    `;

    L.marker(latLng, { icon: customIcon })
      .bindPopup(popupContent)
      .addTo(markerLayerGroup);
  });

  // Fit boundaries nicely
  if (bounds.length > 0) {
    mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  } else {
    mapInstance.setView([AHLEN_LAT, AHLEN_LNG], 13);
  }

  // Trigger leaflet redraw because of dynamic layout mounts
  setTimeout(() => {
    mapInstance.invalidateSize();
  }, 100);
}

function recenterMap() {
  if (mapInstance && currentPlaces.length > 0) {
    const bounds = currentPlaces.map(p => [p.coordinates.lat, p.coordinates.lng]);
    mapInstance.fitBounds(bounds, { padding: [45, 45] });
  } else if (mapInstance) {
    mapInstance.setView([AHLEN_LAT, AHLEN_LNG], 13);
  }
}

// ==========================================================================
// SETTINGS HANDLERS (LOCAL STORAGE MANAGEMENT)
// ==========================================================================
// Settings handlers are removed to secure API keys on the backend.

// ==========================================================================
// TEXT TRANSLATION HELPERS & API UTILS
// ==========================================================================
function getAgentName(personality: UserPreferences['agentPersonality']): string {
  switch (personality) {
    case 'expert': return 'Местный Эксперт (der Lokale)';
    case 'adventurer': return 'Искатель Приключений (der Abenteurer)';
    case 'family': return 'Семейный Планировщик (der Familienmensch)';
  }
}

function getQueryForCategory(category: UserPreferences['mood']): string {
  switch (category) {
    case 'relax': return 'парк озеро достопримечательность зона отдыха спорт';
    case 'nightlife': return 'бар паб ночной клуб дискотека';
    case 'shopping': return 'пешеходная зона торговый центр магазины одежда';
    case 'culinary': return 'ресторан кафе пиццерия бистро';
    case 'culture': return 'музей галерея театр историческое место';
  }
}
