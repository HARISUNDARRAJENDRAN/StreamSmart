// Minimal test tracking service to isolate issues
class TestTrackingService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    console.log('TestTrackingService initialized with baseUrl:', this.baseUrl);
  }

  async testNavigationAPI(userId: string) {
    const url = `${this.baseUrl}/api/tracking/navigation`;
    
    console.log('Making test call to:', url);
    
    const body = {
      userId,
      action: 'page_visit',
      navigationData: {
        pageUrl: `${this.baseUrl}/test`,
        pagePath: '/test',
        pageTitle: 'Test Page',
        pageType: 'other',
        sessionId: 'test-session-' + Date.now(),
        device: 'desktop',
        viewport: { width: 1920, height: 1080 },
        referrerUrl: '',
        referrerType: 'direct',
        entryPoint: 'test',
        userAgent: navigator.userAgent,
        pageLoadTime: 1000
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Success result:', result);
      return result;
    } catch (error) {
      console.error('Test service error:', error);
      throw error;
    }
  }
}

export const testTracker = new TestTrackingService(); 