'use client';

import { useState, useEffect } from 'react';
import TestTrackingService from '@/components/TestTrackingService';

export default function APIDebugger() {
  const [results, setResults] = useState<any[]>([]);
  const [serverInfo, setServerInfo] = useState<any>({});

  useEffect(() => {
    // Gather environment information
    setServerInfo({
      currentURL: window.location.href,
      origin: window.location.origin,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  }, []);

  const addResult = (test: string, status: string | number, data: any, url?: string) => {
    setResults(prev => [...prev, {
      test,
      status,
      data,
      url,
      timestamp: new Date().toISOString()
    }]);
  };

  const testSimpleAPI = async () => {
    try {
      const url = '/api/test';
      const response = await fetch(url, { method: 'GET' });
      const data = await response.json();
      addResult('Simple API Test', response.status, data, `${window.location.origin}${url}`);
    } catch (error) {
      addResult('Simple API Test', 'ERROR', error instanceof Error ? error.message : String(error));
    }
  };

  const testHoverAPI = async () => {
    try {
      const url = '/api/tracking/hover';
      const body = {
        userId: 'debug-user-' + Date.now(),
        action: 'hover_start',
        hoverData: {
          targetId: 'test-video-1',
          targetType: 'video',
          containerType: 'recommendation_grid',
          position: 1,
          pageContext: '/debug',
          sessionId: 'debug-session-' + Date.now(),
          device: 'desktop',
          viewport: { width: window.innerWidth, height: window.innerHeight },
          scrollPosition: 0,
          elementPosition: { x: 100, y: 200 },
          elementSize: { width: 300, height: 200 },
          entryDirection: 'center',
          isFirstTimeSeeing: true,
          timeOnCurrentPage: 30,
          totalPageInteractions: 5,
        }
      };

      console.log('🧪 Testing Hover API with body:', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        data = { error: 'Failed to parse response as JSON', rawResponse: await response.text() };
      }

      addResult('Hover API Test', response.status, data, `${window.location.origin}${url}`);
    } catch (error) {
      addResult('Hover API Test', 'ERROR', error instanceof Error ? error.message : String(error));
    }
  };

  const testNavigationAPI = async () => {
    try {
      const url = '/api/tracking/navigation';
      const body = {
        userId: 'debug-user-' + Date.now(),
        action: 'page_visit',
        navigationData: {
          pageUrl: window.location.href,
          pagePath: '/debug',
          pageTitle: 'Debug Page',
          pageType: 'other',
          sessionId: 'debug-session-' + Date.now(),
          device: 'desktop',
          viewport: { width: window.innerWidth, height: window.innerHeight },
          referrerUrl: document.referrer,
          referrerType: 'direct',
          entryPoint: 'debug',
          userAgent: navigator.userAgent,
          pageLoadTime: 1000
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      addResult('Navigation API Test', response.status, data, `${window.location.origin}${url}`);
    } catch (error) {
      addResult('Navigation API Test', 'ERROR', error instanceof Error ? error.message : String(error));
    }
  };

  const testImplicitTracker = async () => {
    try {
      // Import and test the service
      const { implicitTracker } = await import('@/services/implicitTrackingService');
      
      // Set user ID
      implicitTracker.setUserId('debug-user-' + Date.now());
      
      // Try to make a call (this will trigger trackPageVisit)
      addResult('Implicit Tracker Init', 'SUCCESS', {
        sessionId: implicitTracker.getSessionId(),
        interactions: implicitTracker.getCurrentPageInteractions(),
        scrollDepth: implicitTracker.getCurrentScrollDepth()
      });
    } catch (error) {
      addResult('Implicit Tracker Test', 'ERROR', error instanceof Error ? error.message : String(error));
    }
  };

  const testAbsoluteURL = async () => {
    try {
      const absoluteURL = `${window.location.origin}/api/tracking/navigation`;
      const body = {
        userId: 'absolute-test-' + Date.now(),
        action: 'page_visit',
        navigationData: {
          pageUrl: window.location.href,
          pagePath: '/absolute-test',
          pageTitle: 'Absolute URL Test',
          pageType: 'other',
          sessionId: 'absolute-session-' + Date.now(),
          device: 'desktop',
          viewport: { width: window.innerWidth, height: window.innerHeight },
          referrerUrl: '',
          referrerType: 'direct',
          entryPoint: 'test',
          userAgent: navigator.userAgent,
          pageLoadTime: 500
        }
      };

      const response = await fetch(absoluteURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      addResult('Absolute URL Test', response.status, data, absoluteURL);
    } catch (error) {
      addResult('Absolute URL Test', 'ERROR', error instanceof Error ? error.message : String(error));
    }
  };

  const clearResults = () => setResults([]);

  return (
    <div className="p-6 bg-white border rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🔍 API Connectivity Debugger</h2>
      
      {/* Server Information */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">Environment Info:</h3>
        <div className="text-sm space-y-1">
          <div><strong>Current URL:</strong> {serverInfo.currentURL}</div>
          <div><strong>Origin:</strong> {serverInfo.origin}</div>
          <div><strong>User Agent:</strong> {serverInfo.userAgent?.substring(0, 100)}...</div>
          <div><strong>Timestamp:</strong> {serverInfo.timestamp}</div>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <button 
          onClick={testSimpleAPI}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          🧪 Test Simple API
        </button>
        <button 
          onClick={testHoverAPI}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          🎯 Test Hover API
        </button>
        <button 
          onClick={testNavigationAPI}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          🧭 Test Navigation API
        </button>
        <button 
          onClick={testAbsoluteURL}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          🌐 Test Absolute URL
        </button>
        <button 
          onClick={testImplicitTracker}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          🎯 Test Implicit Tracker
        </button>
        <button 
          onClick={clearResults}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          🗑️ Clear Results
        </button>
      </div>

      {/* Results */}
      <div className="bg-gray-50 border rounded p-4 max-h-96 overflow-y-auto">
        <h3 className="font-semibold mb-3">📊 Test Results:</h3>
        {results.length === 0 ? (
          <p className="text-gray-500 italic">No tests run yet. Click buttons above to start testing.</p>
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`p-3 rounded border-l-4 ${
                  result.status === 'ERROR' || (typeof result.status === 'number' && result.status >= 400)
                    ? 'bg-red-50 border-red-400' 
                    : result.status === 'SUCCESS' || result.status === 200
                    ? 'bg-green-50 border-green-400'
                    : 'bg-yellow-50 border-yellow-400'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-800">{result.test}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    result.status === 'ERROR' || (typeof result.status === 'number' && result.status >= 400)
                      ? 'bg-red-200 text-red-800' 
                      : result.status === 'SUCCESS' || result.status === 200
                      ? 'bg-green-200 text-green-800'
                      : 'bg-yellow-200 text-yellow-800'
                  }`}>
                    {result.status}
                  </span>
                </div>
                {result.url && (
                  <div className="text-xs text-gray-600 mb-2">
                    <strong>URL:</strong> {result.url}
                  </div>
                )}
                <div className="text-xs text-gray-500 mb-2">
                  <strong>Time:</strong> {new Date(result.timestamp).toLocaleTimeString()}
                </div>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      <TestTrackingService />
    </div>
  );
} 