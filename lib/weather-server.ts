/**
 * Weather Server Utility for Next.js API Routes
 */

// Cache for weather results
const weatherCache = new Map<string, { data: any; timestamp: number }>();
const MAX_CACHE_SIZE = 10;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getWeatherData(location: string) {
  try {
    const cacheKey = location.toLowerCase().trim();
    const cached = weatherCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('🌤️ Using cached weather data for:', location);
      return cached.data;
    }

    if (!process.env.WEATHER_API_KEY) {
      throw new Error('OpenWeatherMap API key not configured');
    }

    console.log('🌤️ Fetching weather data for:', location);

    const apiUrl = new URL('https://api.openweathermap.org/data/2.5/weather');
    apiUrl.searchParams.append('q', location);
    apiUrl.searchParams.append('appid', process.env.WEATHER_API_KEY);
    apiUrl.searchParams.append('units', 'metric');
    apiUrl.searchParams.append('lang', 'en');

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'AI-Orb-Chatbot/1.0'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid OpenWeatherMap API key');
      } else if (response.status === 404) {
        throw new Error(`Location "${location}" not found`);
      } else {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();

    const weatherResult = {
      success: true,
      location: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      description: data.weather[0].description,
      main: data.weather[0].main,
      windSpeed: data.wind?.speed || 0,
      windDirection: data.wind?.deg || 0,
      visibility: data.visibility ? Math.round(data.visibility / 1000) : null as number | null,
      sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString(),
      sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString(),
      timestamp: new Date().toISOString()
    };

    // Cache the result
    if (weatherCache.size >= MAX_CACHE_SIZE) {
      const firstKey = weatherCache.keys().next().value;
      weatherCache.delete(firstKey);
    }
    weatherCache.set(cacheKey, {
      data: weatherResult,
      timestamp: Date.now()
    });

    console.log('✅ Weather data retrieved for:', location);
    return weatherResult;

  } catch (error: any) {
    console.error('❌ Weather API error:', error.message);
    return {
      success: false,
      error: error.message,
      location: location,
      timestamp: new Date().toISOString()
    };
  }
}

export function shouldTriggerWeatherSearch(message: string): boolean {
  const weatherKeywords = [
    'weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy',
    'snow', 'wind', 'humidity', 'hot', 'cold', 'warm', 'cool',
    'storm', 'thunder', 'lightning', 'fog', 'mist', 'drizzle',
    'climate', 'season', 'degrees', 'celsius', 'fahrenheit'
  ];

  const lowerMessage = message.toLowerCase();
  return weatherKeywords.some(keyword => lowerMessage.includes(keyword));
}

export function extractLocationFromMessage(message: string): string | null {
  const patterns = [
    /weather in (.+)/i,
    /weather for (.+)/i,
    /weather at (.+)/i,
    /temperature in (.+)/i,
    /temperature for (.+)/i,
    /forecast for (.+)/i,
    /forecast in (.+)/i,
    /how is the weather in (.+)/i,
    /what's the weather in (.+)/i,
    /what is the weather in (.+)/i,
    /current weather in (.+)/i,
    /current weather for (.+)/i,
    /current weather at (.+)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

export function formatWeatherResults(weatherData: any): string {
  if (!weatherData.success) {
    return `🌤️ **Weather Error**\n\n${weatherData.error}`;
  }

  const { location, country, temperature, feelsLike, humidity, description, windSpeed, visibility, sunrise, sunset } = weatherData;

  let formatted = `🌤️ **Weather in ${location}, ${country}**\n\n`;
  formatted += `🌡️ **${temperature}°C** (feels like ${feelsLike}°C)\n`;
  formatted += `☁️ ${description.charAt(0).toUpperCase() + description.slice(1)}\n`;
  formatted += `💧 Humidity: ${humidity}%\n`;
  
  if (windSpeed > 0) {
    formatted += `💨 Wind: ${windSpeed} m/s\n`;
  }
  
  if (visibility) {
    formatted += `👁️ Visibility: ${visibility} km\n`;
  }
  
  formatted += `🌅 Sunrise: ${sunrise}\n`;
  formatted += `🌇 Sunset: ${sunset}\n`;
  formatted += `\n---\n🟢 *Live Weather Data* • Updated ${new Date(weatherData.timestamp).toLocaleTimeString()}`;

  return formatted;
}

