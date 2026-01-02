import fetch from 'node-fetch';

// Cache for weather results (stores last 10 weather requests)
const weatherCache = new Map();
const MAX_CACHE_SIZE = 10;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get weather information using OpenWeatherMap API
 * @param {string} location - The location to get weather for
 * @returns {Promise<Object>} - Weather data with temperature, description, etc.
 */
export const getWeatherData = async (location) => {
  try {
    // Check cache first
    const cacheKey = location.toLowerCase().trim();
    const cached = weatherCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('🌤️ Using cached weather data for:', location);
      return cached.data;
    }

    // Validate environment variables
    console.log('🌤️ Checking Weather API credentials:', {
      hasWeatherKey: !!process.env.WEATHER_API_KEY,
      weatherKeyLength: process.env.WEATHER_API_KEY?.length || 0
    });
    
    if (!process.env.WEATHER_API_KEY) {
      throw new Error('OpenWeatherMap API key not configured');
    }

    console.log('🌤️ Fetching weather data for:', location);

    // Construct the API URL
    const apiUrl = new URL('https://api.openweathermap.org/data/2.5/weather');
    apiUrl.searchParams.append('q', location);
    apiUrl.searchParams.append('appid', process.env.WEATHER_API_KEY);
    apiUrl.searchParams.append('units', 'metric'); // Use Celsius
    apiUrl.searchParams.append('lang', 'en');

    // Make the API request
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'AI-Orb-Chatbot/1.0'
      },
      timeout: 10000 // 10 second timeout
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

    // Format the weather data
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
      visibility: data.visibility ? Math.round(data.visibility / 1000) : null, // Convert to km
      sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString(),
      sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString(),
      timestamp: new Date().toISOString()
    };

    // Cache the result
    if (weatherCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = weatherCache.keys().next().value;
      weatherCache.delete(firstKey);
    }
    weatherCache.set(cacheKey, {
      data: weatherResult,
      timestamp: Date.now()
    });

    console.log('✅ Weather data retrieved for:', location);
    return weatherResult;

  } catch (error) {
    console.error('❌ Weather API error:', error.message);
    return {
      success: false,
      error: error.message,
      location: location,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Check if a message contains weather-related keywords
 * @param {string} message - The user message
 * @returns {boolean} - Whether weather search should be triggered
 */
export const shouldTriggerWeatherSearch = (message) => {
  const weatherKeywords = [
    'weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy',
    'snow', 'wind', 'humidity', 'hot', 'cold', 'warm', 'cool',
    'storm', 'thunder', 'lightning', 'fog', 'mist', 'drizzle',
    'climate', 'season', 'degrees', 'celsius', 'fahrenheit'
  ];

  const lowerMessage = message.toLowerCase();
  return weatherKeywords.some(keyword => lowerMessage.includes(keyword));
};

/**
 * Extract location from weather-related message
 * @param {string} message - The user message
 * @returns {string|null} - Extracted location or null
 */
export const extractLocationFromMessage = (message) => {
  // Common patterns for weather queries
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
    /current weather at (.+)/i,
    /weather conditions in (.+)/i,
    /weather conditions for (.+)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no specific location found, check for common city names or return null
  const commonCities = [
    'london', 'paris', 'new york', 'tokyo', 'sydney', 'mumbai', 'dubai',
    'singapore', 'hong kong', 'berlin', 'rome', 'madrid', 'amsterdam',
    'toronto', 'vancouver', 'melbourne', 'bangkok', 'seoul', 'moscow',
    'karachi', 'lahore', 'islamabad', 'delhi', 'bangalore', 'chennai',
    'kolkata', 'hyderabad', 'pune', 'ahmedabad', 'jaipur', 'lucknow',
    'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam',
    'pimpri', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra',
    'nashik', 'faridabad', 'meerut', 'rajkot', 'kalyan', 'vasai',
    'varanasi', 'srinagar', 'aurangabad', 'navi mumbai', 'solapur',
    'vijayawada', 'kolhapur', 'amritsar', 'noida', 'ranchi', 'howrah',
    'coimbatore', 'raipur', 'jabalpur', 'gwalior', 'jodhpur', 'madurai',
    'guwahati', 'chandigarh', 'hubli', 'mysore', 'gurgaon', 'aligarh',
    'jalandhar', 'tiruchirapalli', 'bhubaneswar', 'salem', 'warangal',
    'guntur', 'bhiwandi', 'saharanpur', 'gorakhpur', 'bikaner',
    'amravati', 'noida', 'jamshedpur', 'bhilai', 'cuttack', 'firozabad',
    'kochi', 'bhavnagar', 'dehradun', 'durgapur', 'asansol', 'rourkela',
    'nanded', 'kolhapur', 'ajmer', 'akola', 'gulbarga', 'jamnagar',
    'ujjain', 'loni', 'siliguri', 'jhansi', 'ulhasnagar', 'jammu',
    'sangli', 'miraj', 'mangalore', 'erode', 'belgaum', 'ambattur',
    'tirunelveli', 'malegaon', 'gaya', 'jalgaon', 'udaipur', 'maheshtala'
  ];

  const lowerMessage = message.toLowerCase();
  for (const city of commonCities) {
    if (lowerMessage.includes(city)) {
      return city;
    }
  }

  return null;
};

/**
 * Format weather data for display in chat
 * @param {Object} weatherData - The weather data object
 * @returns {string} - Formatted string for display
 */
export const formatWeatherResults = (weatherData) => {
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
  
  // Add live data badge
  formatted += `\n---\n🟢 *Live Weather Data* • Updated ${new Date(weatherData.timestamp).toLocaleTimeString()}`;

  return formatted;
};

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics
 */
export const getWeatherCacheStats = () => {
  return {
    size: weatherCache.size,
    maxSize: MAX_CACHE_SIZE,
    locations: Array.from(weatherCache.keys())
  };
};

/**
 * Clear the weather cache
 */
export const clearWeatherCache = () => {
  weatherCache.clear();
  console.log('🗑️ Weather cache cleared');
};
