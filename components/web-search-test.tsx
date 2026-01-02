"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, ExternalLink, Clock, Globe } from "lucide-react"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api"

interface SearchResult {
  rank: number
  title: string
  snippet: string
  link: string
  displayLink: string
}

interface SearchResponse {
  success: boolean
  query: string
  results: SearchResult[]
  totalResults: string
  searchTime: string
  formatted: string
  error?: string
}

export const WebSearchTest: React.FC = () => {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query")
      return
    }

    setIsLoading(true)
    setResults(null)

    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        toast.error("Please log in to use web search")
        return
      }

      const response = await fetch(getApiUrl('/api/search'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: query.trim() })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResults(data)
        toast.success(`Found ${data.results.length} results`)
      } else {
        toast.error(data.error || "Search failed")
        setResults({ ...data, success: false })
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error("Failed to perform search")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Web Search Test</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Try: 'Latest AI technology news' or 'Weather in New York'"
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={isLoading || !query.trim()}
              className="px-6"
            >
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Fetching latest info...</span>
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Search Results</h3>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <Globe className="h-3 w-3" />
                    <span>Live Data</span>
                  </Badge>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{results.searchTime}s</span>
                  </Badge>
                </div>
              </div>

              {results.success ? (
                <div className="space-y-3">
                  {results.results.map((result) => (
                    <Card key={result.rank} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-primary hover:underline">
                              <a 
                                href={result.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1"
                              >
                                <span>{result.title}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              #{result.rank}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {result.snippet}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {result.displayLink}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <div className="text-center text-sm text-muted-foreground">
                    Found {results.totalResults} total results for "{results.query}"
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {results.error || "No results found"}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample Queries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "Latest AI technology news",
              "Weather in New York",
              "Best programming languages in 2025",
              "Current stock market trends",
              "Today's top news headlines",
              "Recent developments in AI"
            ].map((sampleQuery) => (
              <Button
                key={sampleQuery}
                variant="outline"
                size="sm"
                onClick={() => setQuery(sampleQuery)}
                className="justify-start text-left h-auto p-2"
              >
                {sampleQuery}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
