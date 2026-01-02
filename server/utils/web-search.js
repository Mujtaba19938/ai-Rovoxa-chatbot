import fetch from 'node-fetch';

// Cache for search results (stores last 5 searches)
const searchCache = new Map();
const MAX_CACHE_SIZE = 5;

/**
 * Get web search results using Google Custom Search API
 * @param {string} query - The search query
 * @returns {Promise<Object>} - Search results with title, snippet, and link
 */
export const getWebResults = async (query) => {
  try {
    // Check cache first
    const cacheKey = query.toLowerCase().trim();
    if (searchCache.has(cacheKey)) {
      console.log('🔍 Using cached search results for:', query);
      return searchCache.get(cacheKey);
    }

    // Validate environment variables
    console.log('🔍 Checking Google API credentials:', {
      hasGoogleKey: !!process.env.GOOGLE_API_KEY,
      hasSearchEngineId: !!process.env.SEARCH_ENGINE_ID,
      googleKeyLength: process.env.GOOGLE_API_KEY?.length || 0,
      searchEngineIdLength: process.env.SEARCH_ENGINE_ID?.length || 0
    });
    
    if (!process.env.GOOGLE_API_KEY || !process.env.SEARCH_ENGINE_ID) {
      throw new Error('Google Custom Search API credentials not configured');
    }

    console.log('🌐 Fetching web results for:', query);

    // Construct the API URL
    const apiUrl = new URL('https://www.googleapis.com/customsearch/v1');
    apiUrl.searchParams.append('key', process.env.GOOGLE_API_KEY);
    apiUrl.searchParams.append('cx', process.env.SEARCH_ENGINE_ID);
    apiUrl.searchParams.append('q', query);
    apiUrl.searchParams.append('num', '3'); // Get top 3 results
    apiUrl.searchParams.append('safe', 'active'); // Safe search

    // Make the API request
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'AI-Orb-Chatbot/1.0'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Google Custom Search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check if we have search results
    if (!data.items || data.items.length === 0) {
      console.log('📭 No search results found for:', query);
      return {
        success: false,
        message: 'No search results found',
        results: [],
        query: query
      };
    }

    // Format the results
    const formattedResults = data.items.map((item, index) => ({
      rank: index + 1,
      title: item.title || 'No title',
      snippet: item.snippet || 'No description available',
      link: item.link || '#',
      displayLink: item.displayLink || new URL(item.link || '').hostname
    }));

    const searchResult = {
      success: true,
      results: formattedResults,
      query: query,
      totalResults: data.searchInformation?.totalResults || '0',
      searchTime: data.searchInformation?.searchTime || '0'
    };

    // Cache the result
    if (searchCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }
    searchCache.set(cacheKey, searchResult);

    console.log('✅ Found', formattedResults.length, 'search results for:', query);
    return searchResult;

  } catch (error) {
    console.error('❌ Web search error:', error.message);
    return {
      success: false,
      error: error.message,
      results: [],
      query: query
    };
  }
};

/**
 * Check if a message contains keywords that suggest web search is needed
 * @param {string} message - The user message
 * @returns {boolean} - Whether web search should be triggered
 */
export const shouldTriggerWebSearch = (message) => {
  const searchKeywords = [
    'latest', 'today', 'current', 'news', 'weather', 'recent',
    'now', 'happening', 'breaking', 'update', 'trending',
    'what is', 'who is', 'when did', 'where is', 'how to',
    'best', 'top', 'new', 'recent', '2024', '2025'
  ];

  const lowerMessage = message.toLowerCase();
  return searchKeywords.some(keyword => lowerMessage.includes(keyword));
};

/**
 * Format search results for display in chat
 * @param {Object} searchResult - The search result object
 * @returns {string} - Formatted string for display
 */
export const formatSearchResults = (searchResult) => {
  if (!searchResult.success || !searchResult.results.length) {
    return `🔍 **Search Results**\n\nNo results found for "${searchResult.query}". Please try a different search term.`;
  }

  let formatted = `🔎 **Here's what I found:**\n\n`;
  
  searchResult.results.forEach((result, index) => {
    formatted += `${result.rank}. **[${result.title}](${result.link})**\n`;
    formatted += `   - ${result.snippet}\n\n`;
  });

  // Add live data badge
  formatted += `\n---\n🟢 *Live Data* • ${searchResult.totalResults} total results found`;

  return formatted;
};

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics
 */
export const getCacheStats = () => {
  return {
    size: searchCache.size,
    maxSize: MAX_CACHE_SIZE,
    queries: Array.from(searchCache.keys())
  };
};

/**
 * Clear the search cache
 */
export const clearSearchCache = () => {
  searchCache.clear();
  console.log('🗑️ Search cache cleared');
};
