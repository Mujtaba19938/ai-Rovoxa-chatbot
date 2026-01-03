/**
 * Web Search Server Utility for Next.js API Routes
 */

// Cache for search results (stores last 5 searches)
const searchCache = new Map<string, any>();
const MAX_CACHE_SIZE = 5;

export async function getWebResults(query: string) {
  try {
    // Check cache first
    const cacheKey = query.toLowerCase().trim();
    if (searchCache.has(cacheKey)) {
      console.log('🔍 Using cached search results for:', query);
      return searchCache.get(cacheKey);
    }

    if (!process.env.GOOGLE_API_KEY || !process.env.SEARCH_ENGINE_ID) {
      throw new Error('Google Custom Search API credentials not configured');
    }

    console.log('🌐 Fetching web results for:', query);

    const apiUrl = new URL('https://www.googleapis.com/customsearch/v1');
    apiUrl.searchParams.append('key', process.env.GOOGLE_API_KEY);
    apiUrl.searchParams.append('cx', process.env.SEARCH_ENGINE_ID);
    apiUrl.searchParams.append('q', query);
    apiUrl.searchParams.append('num', '3');
    apiUrl.searchParams.append('safe', 'active');

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'AI-Orb-Chatbot/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Google Custom Search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        message: 'No search results found',
        results: [],
        query: query
      };
    }

    const formattedResults = data.items.map((item: any, index: number) => ({
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
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }
    searchCache.set(cacheKey, searchResult);

    console.log('✅ Found', formattedResults.length, 'search results for:', query);
    return searchResult;

  } catch (error: any) {
    console.error('❌ Web search error:', error.message);
    return {
      success: false,
      error: error.message,
      results: [],
      query: query
    };
  }
}

export function shouldTriggerWebSearch(message: string): boolean {
  const searchKeywords = [
    'latest', 'today', 'current', 'news', 'weather', 'recent',
    'now', 'happening', 'breaking', 'update', 'trending',
    'what is', 'who is', 'when did', 'where is', 'how to',
    'best', 'top', 'new', 'recent', '2024', '2025'
  ];

  const lowerMessage = message.toLowerCase();
  return searchKeywords.some(keyword => lowerMessage.includes(keyword));
}

export function formatSearchResults(searchResult: any): string {
  if (!searchResult.success || !searchResult.results.length) {
    return `🔍 **Search Results**\n\nNo results found for "${searchResult.query}". Please try a different search term.`;
  }

  let formatted = `🔎 **Here's what I found:**\n\n`;
  
  searchResult.results.forEach((result: any) => {
    formatted += `${result.rank}. **[${result.title}](${result.link})**\n`;
    formatted += `   - ${result.snippet}\n\n`;
  });

  formatted += `\n---\n🟢 *Live Data* • ${searchResult.totalResults} total results found`;
  return formatted;
}

