'use client';

import { useState } from 'react';

export default function TestTrackingService() {
  const [result, setResult] = useState<string>('');

  const testNavigation = async () => {
    setResult('Testing...');
    
    try {
      // Get the current origin dynamically
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/api/tracking/navigation`;
      
      console.log('🎯 Testing Navigation API');
      console.log('Base URL:', baseUrl);
      console.log('Full URL:', url);
      console.log('Window location:', window.location);

      const body = {
        userId: 'test-user-' + Date.now(),
        action: 'page_visit',
        navigationData: {
          pageUrl: window.location.href,
          pagePath: window.location.pathname,
          pageTitle: document.title || 'Test Page',
          pageType: 'other',
          sessionId: 'test-session-' + Date.now(),
          device: 'desktop',
          viewport: { width: window.innerWidth, height: window.innerHeight },
          referrerUrl: document.referrer || '',
          referrerType: 'direct',
          entryPoint: 'test',
          userAgent: navigator.userAgent,
          pageLoadTime: 1000
        }
      };

      console.log('Request body:', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('Success data:', data);
        setResult(`✅ SUCCESS (${response.status}): ${JSON.stringify(data, null, 2)}`);
      } else {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        setResult(`❌ ERROR (${response.status}): ${errorText}`);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setResult(`💥 NETWORK ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testHover = async () => {
    setResult('Testing...');
    
    try {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/api/tracking/hover`;
      
      console.log('🎯 Testing Hover API');
      console.log('Base URL:', baseUrl);
      console.log('Full URL:', url);

      const body = {
        userId: 'test-user-' + Date.now(),
        action: 'hover_start',
        hoverData: {
          targetId: 'test-video-1',
          targetType: 'video',
          containerType: 'test',
          position: 1,
          pageContext: window.location.pathname,
          sessionId: 'test-session-' + Date.now(),
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

      console.log('Request body:', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Success data:', data);
        setResult(`✅ SUCCESS (${response.status}): ${JSON.stringify(data, null, 2)}`);
      } else {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        setResult(`❌ ERROR (${response.status}): ${errorText}`);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setResult(`💥 NETWORK ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testImplicitService = async () => {
    setResult('Testing...');
    
    try {
      console.log('🎯 Testing ImplicitTrackingService');
      
      // Import the service
      const { implicitTracker } = await import('@/services/implicitTrackingService');
      
      // Set a test user ID
      implicitTracker.setUserId('test-user-' + Date.now());
      
      console.log('Service initialized with session:', implicitTracker.getSessionId());
      
      // The service automatically calls trackPageVisit when initialized
      // Let's just verify it's working
      setResult(`✅ IMPLICIT SERVICE: Session ID: ${implicitTracker.getSessionId()}`);
      
    } catch (error) {
      console.error('Service error:', error);
      setResult(`💥 SERVICE ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="p-6 bg-white border rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">🧪 Minimal Tracking Test</h3>
      <p className="text-sm text-gray-600 mb-4">
        Current URL: {typeof window !== 'undefined' ? window.location.href : 'Unknown'}
      </p>
      
      <div className="space-x-2 mb-4">
        <button 
          onClick={testNavigation}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Navigation API
        </button>
        <button 
          onClick={testHover}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Hover API
        </button>
        <button 
          onClick={testImplicitService}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Test Implicit Service
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded border min-h-[100px]">
        <h4 className="font-semibold mb-2">Result:</h4>
        <pre className="text-xs whitespace-pre-wrap">{result || 'No test run yet...'}</pre>
      </div>
    </div>
  );
} 