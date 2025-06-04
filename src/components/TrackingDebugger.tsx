'use client';

import { useState, useEffect } from 'react';
import { implicitTracker } from '@/services/implicitTrackingService';

export default function TrackingDebugger() {
  const [userId, setUserId] = useState('test-user-123');
  const [results, setResults] = useState<any[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setCurrentUrl(window.location.origin);
  }, []);

  const testSimpleAPI = async () => {
    try {
      const response = await fetch('/api/test', {
        method: 'GET',
      });

      const result = await response.json();
      setResults(prev => [...prev, { 
        api: 'test', 
        status: response.status, 
        result,
        url: `${window.location.origin}/api/test`
      }]);
    } catch (error) {
      setResults(prev => [...prev, { 
        api: 'test', 
        status: 'error', 
        result: error instanceof Error ? error.message : String(error),
        url: `${window.location.origin}/api/test`
      }]);
    }
  };

  const testHoverAPI = async () => {
    try {
      const response = await fetch('/api/tracking/hover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          action: 'hover_start',
          hoverData: {
            targetId: 'test-video-1',
            targetType: 'video',
            containerType: 'recommendation_grid',
            position: 1,
            pageContext: '/dashboard',
            sessionId: 'test-session-123',
            device: 'desktop',
            viewport: { width: 1920, height: 1080 },
            scrollPosition: 0,
            elementPosition: { x: 100, y: 200 },
            elementSize: { width: 300, height: 200 },
            entryDirection: 'center',
            isFirstTimeSeeing: true,
            timeOnCurrentPage: 30,
            totalPageInteractions: 5,
          }
        })
      });

      const result = await response.json();
      setResults(prev => [...prev, { 
        api: 'hover', 
        status: response.status, 
        result,
        url: `${window.location.origin}/api/tracking/hover`
      }]);
    } catch (error) {
      setResults(prev => [...prev, { 
        api: 'hover', 
        status: 'error', 
        result: error instanceof Error ? error.message : String(error),
        url: `${window.location.origin}/api/tracking/hover`
      }]);
    }
  };

  const testNavigationAPI = async () => {
    try {
      const response = await fetch('/api/tracking/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          action: 'page_visit',
          navigationData: {
            userId: userId,
            pageUrl: window.location.href,
            pagePath: '/dashboard',
            pageTitle: 'Dashboard',
            pageType: 'home',
            sessionId: 'test-session-123',
            device: 'desktop',
            viewport: { width: 1920, height: 1080 },
            referrerUrl: '',
            referrerType: 'direct',
            entryPoint: 'direct',
            userAgent: navigator.userAgent,
            pageLoadTime: 1000,
          }
        })
      });

      const result = await response.json();
      setResults(prev => [...prev, { 
        api: 'navigation', 
        status: response.status, 
        result,
        url: `${window.location.origin}/api/tracking/navigation`
      }]);
    } catch (error) {
      setResults(prev => [...prev, { 
        api: 'navigation', 
        status: 'error', 
        result: error instanceof Error ? error.message : String(error),
        url: `${window.location.origin}/api/tracking/navigation`
      }]);
    }
  };

  const initializeTracking = () => {
    implicitTracker.setUserId(userId);
    setResults(prev => [...prev, { 
      api: 'init', 
      status: 'success', 
      result: `Tracking initialized for user: ${userId}`,
      url: 'N/A'
    }]);
  };

  const clearResults = () => setResults([]);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Tracking API Debugger</h2>
      
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>Current Origin:</strong> {currentUrl || 'Loading...'}
        </p>
        <p className="text-xs text-blue-600 mt-1">
          All API calls will be made to this origin. If your server is on a different port, 
          this will help identify the issue.
        </p>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">User ID:</label>
        <input 
          type="text" 
          value={userId} 
          onChange={(e) => setUserId(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="space-x-2 mb-4">
        <button 
          onClick={testSimpleAPI}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Test Simple API
        </button>
        <button 
          onClick={initializeTracking}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Initialize Tracking
        </button>
        <button 
          onClick={testHoverAPI}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Hover API
        </button>
        <button 
          onClick={testNavigationAPI}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Test Navigation API
        </button>
        <button 
          onClick={clearResults}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear Results
        </button>
      </div>

      <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
        <h3 className="font-semibold mb-2">Results:</h3>
        {results.length === 0 ? (
          <p className="text-gray-500">No results yet</p>
        ) : (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`p-2 rounded text-sm ${
                  result.status === 'error' || result.status >= 400 
                    ? 'bg-red-100 border-red-300' 
                    : 'bg-green-100 border-green-300'
                } border`}
              >
                <div className="font-medium">
                  {result.api} API - Status: {result.status}
                </div>
                {result.url && (
                  <div className="text-xs text-gray-600 mt-1">
                    URL: {result.url}
                  </div>
                )}
                <pre className="mt-1 text-xs overflow-x-auto">
                  {JSON.stringify(result.result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 