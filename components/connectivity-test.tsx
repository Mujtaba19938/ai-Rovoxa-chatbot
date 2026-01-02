"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, Globe, Wifi, AlertTriangle } from 'lucide-react'
import { getApiUrl } from '@/lib/api'

interface TestResult {
  name: string
  status: 'success' | 'error' | 'warning' | 'pending'
  message: string
  details?: string
  timestamp?: string
}

export const ConnectivityTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runConnectivityTests = async () => {
    setIsRunning(true)
    setTests([])

    const testResults: TestResult[] = []

    // Test 1: Basic Internet Connectivity
    const testInternet = async () => {
      try {
        const response = await fetch('https://httpbin.org/get', {
          method: 'GET',
          headers: { 'User-Agent': 'AI-Orb-Chatbot-Test/1.0' }
        })
        
        if (response.ok) {
          const data = await response.json()
          return {
            name: 'Internet Connectivity',
            status: 'success' as const,
            message: 'Internet connection is working',
            details: `Response time: ${Date.now() - performance.now()}ms`,
            timestamp: new Date().toISOString()
          }
        } else {
          return {
            name: 'Internet Connectivity',
            status: 'error' as const,
            message: `HTTP ${response.status}: ${response.statusText}`,
            timestamp: new Date().toISOString()
          }
        }
      } catch (error) {
        return {
          name: 'Internet Connectivity',
          status: 'error' as const,
          message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        }
      }
    }

    // Test 2: Google API Connectivity
    const testGoogleAPI = async () => {
      try {
        const response = await fetch('https://www.googleapis.com/customsearch/v1?key=test&cx=test&q=test', {
          method: 'GET',
          headers: { 'User-Agent': 'AI-Orb-Chatbot-Test/1.0' }
        })
        
        // We expect a 400 error for invalid credentials, which means the API is reachable
        if (response.status === 400) {
          return {
            name: 'Google Search API',
            status: 'success' as const,
            message: 'Google Custom Search API is reachable',
            details: 'API endpoint is accessible (credentials validation needed)',
            timestamp: new Date().toISOString()
          }
        } else {
          return {
            name: 'Google Search API',
            status: 'warning' as const,
            message: `Unexpected response: ${response.status}`,
            details: response.statusText,
            timestamp: new Date().toISOString()
          }
        }
      } catch (error) {
        return {
          name: 'Google Search API',
          status: 'error' as const,
          message: `API unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        }
      }
    }

    // Test 3: Current Date/Time from Internet
    const testInternetTime = async () => {
      try {
        const response = await fetch('https://worldtimeapi.org/api/timezone/UTC', {
          method: 'GET',
          headers: { 'User-Agent': 'AI-Orb-Chatbot-Test/1.0' }
        })
        
        if (response.ok) {
          const data = await response.json()
          const internetTime = new Date(data.utc_datetime)
          const localTime = new Date()
          const timeDiff = Math.abs(internetTime.getTime() - localTime.getTime())
          
          return {
            name: 'Internet Time Sync',
            status: (timeDiff < 60000 ? 'success' : 'warning') as 'success' | 'warning',
            message: `Internet time: ${internetTime.toLocaleString()}`,
            details: `Local time: ${localTime.toLocaleString()}, Difference: ${Math.round(timeDiff / 1000)}s`,
            timestamp: new Date().toISOString()
          }
        } else {
          return {
            name: 'Internet Time Sync',
            status: 'error' as const,
            message: `Failed to get internet time: ${response.status}`,
            timestamp: new Date().toISOString()
          }
        }
      } catch (error) {
        return {
          name: 'Internet Time Sync',
          status: 'error' as const,
          message: `Time API unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        }
      }
    }

    // Test 4: Local Server Connectivity
    const testLocalServer = async () => {
      try {
        const response = await fetch(getApiUrl('/api/health'), {
          method: 'GET',
          headers: { 'User-Agent': 'AI-Orb-Chatbot-Test/1.0' }
        })
        
        if (response.ok) {
          return {
            name: 'Local Server',
            status: 'success' as const,
            message: 'Express server is running',
            details: `Port 5000 is accessible`,
            timestamp: new Date().toISOString()
          }
        } else {
          return {
            name: 'Local Server',
            status: 'warning' as const,
            message: `Server responded with ${response.status}`,
            details: response.statusText,
            timestamp: new Date().toISOString()
          }
        }
      } catch (error) {
        return {
          name: 'Local Server',
          status: 'error' as const,
          message: 'Express server is not running',
          details: 'Make sure to run: npm run server',
          timestamp: new Date().toISOString()
        }
      }
    }

    // Test 5: Weather API Test
    const testWeatherAPI = async () => {
      try {
        const response = await fetch('https://api.openweathermap.org/data/2.5/weather?q=London&appid=test', {
          method: 'GET',
          headers: { 'User-Agent': 'AI-Orb-Chatbot-Test/1.0' }
        })
        
        // We expect a 401 error for invalid API key, which means the API is reachable
        if (response.status === 401) {
          return {
            name: 'Weather API',
            status: 'success' as const,
            message: 'OpenWeatherMap API is reachable',
            details: 'API endpoint is accessible (API key validation needed)',
            timestamp: new Date().toISOString()
          }
        } else {
          return {
            name: 'Weather API',
            status: 'warning' as const,
            message: `Unexpected response: ${response.status}`,
            details: response.statusText,
            timestamp: new Date().toISOString()
          }
        }
      } catch (error) {
        return {
          name: 'Weather API',
          status: 'error' as const,
          message: `API unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        }
      }
    }

    // Test 6: Date Query Test
    const testDateQuery = async () => {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'What is today\'s date?' }],
            userId: 'test-user'
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          return {
            name: 'Date Query Test',
            status: 'success' as const,
            message: 'Date query processed successfully',
            details: `Response received (${data.length} characters)`,
            timestamp: new Date().toISOString()
          }
        } else {
          return {
            name: 'Date Query Test',
            status: 'error' as const,
            message: `Query failed: ${response.status}`,
            details: response.statusText,
            timestamp: new Date().toISOString()
          }
        }
      } catch (error) {
        return {
          name: 'Date Query Test',
          status: 'error' as const,
          message: `Query error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        }
      }
    }

    // Run all tests
    const testFunctions = [
      testInternet,
      testGoogleAPI,
      testInternetTime,
      testLocalServer,
      testWeatherAPI,
      testDateQuery
    ]

    for (const testFunc of testFunctions) {
      const result = await testFunc()
      testResults.push(result)
      setTests([...testResults])
      await new Promise(resolve => setTimeout(resolve, 500)) // Small delay between tests
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500">Warning</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Connectivity & Date Test Suite
        </CardTitle>
        <CardDescription>
          Comprehensive test to verify internet connectivity, API access, and date/time accuracy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runConnectivityTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 mr-2" />
              Run Connectivity Tests
            </>
          )}
        </Button>

        {tests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Test Results</h3>
            {tests.map((test, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    <span className="font-medium">{test.name}</span>
                  </div>
                  {getStatusBadge(test.status)}
                </div>
                <p className="text-sm text-muted-foreground">{test.message}</p>
                {test.details && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    {test.details}
                  </p>
                )}
                {test.timestamp && (
                  <p className="text-xs text-muted-foreground">
                    Tested at: {new Date(test.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Current System Information:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>Local Time: <strong>{new Date().toLocaleString()}</strong></div>
            <div>Timezone: <strong>{Intl.DateTimeFormat().resolvedOptions().timeZone}</strong></div>
            <div>User Agent: <strong>{navigator.userAgent.split(' ')[0]}</strong></div>
            <div>Online Status: <strong>{navigator.onLine ? 'Online' : 'Offline'}</strong></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
