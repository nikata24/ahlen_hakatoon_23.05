export interface Place {
  id: string;
  name: string;
  category: 'relax' | 'nightlife' | 'shopping' | 'culinary' | 'culture';
  ageSuitability: {
    youth: number;    // rating 1-5 (how suitable for youth 16-25)
    adults: number;   // rating 1-5 (how suitable for adults 26-55)
    seniors: number;  // rating 1-5 (how suitable for families/seniors)
  };
  budget: 1 | 2 | 3; // 1 = €, 2 = €€, 3 = €€€
  timeOfDay: ('morning' | 'afternoon' | 'evening' | 'night')[];
  rating: number;
  userRatingsTotal: number;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description: string;
  imageUrl: string;
  reviews: string[];
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  condition: string;
  icon: string;
  windSpeed: number;
}

export interface AirQualityData {
  aqi: number;
  pm25: number;
  pm10: number;
  status: 'Отличный' | 'Хороший' | 'Умеренный' | 'Загрязненный' | 'Опасный';
  recommendation: string;
}

export interface AgentLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'think';
}

export interface UserPreferences {
  mood: 'relax' | 'nightlife' | 'shopping' | 'culinary' | 'culture';
  ageGroup: 'youth' | 'adults' | 'seniors';
  budget: 1 | 2 | 3;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  agentPersonality: 'expert' | 'adventurer' | 'family';
}
