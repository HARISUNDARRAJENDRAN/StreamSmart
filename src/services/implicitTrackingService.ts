// Implicit User Data Tracking Service
// Handles all implicit user behavior tracking for the recommendation engine

export interface ViewingTrackingData {
  userId: string;
  itemId: string;
  itemType: 'video' | 'playlist';
  source: string;
  device: string;
  sessionId: string;
  actualDuration?: number;
  captionsEnabled?: boolean;
  referrer?: string;
}

export interface ViewingSessionUpdateData {
  itemId: string;
  totalViewDuration: number;
  completionPercentage: number;
  pauseCount?: number;
  seekCount?: number;
  skipCount?: number;
  replayCount?: number;
  playbackSpeed?: number;
  qualityChanges?: number;
  bufferingEvents?: number;
  fullScreenUsed?: boolean;
  volumeAdjustments?: number;
  captionsEnabled?: boolean;
}

export interface SearchTrackingData {
  userId: string;
  searchQuery: string;
  searchType?: 'content' | 'creator' | 'category' | 'advanced';
  source?: string;
  sessionId: string;
  device?: string;
  userAgent?: string;
  previousQuery?: string;
  resultsFound?: number;
  resultsDisplayed?: number;
}

export interface NavigationTrackingData {
  userId: string;
  pageUrl: string;
  pagePath: string;
  pageTitle?: string;
  pageType?: 'home' | 'browse' | 'category' | 'playlist' | 'video' | 'search' | 'profile' | 'settings' | 'other';
  sessionId: string;
  device?: string;
  viewport?: { width: number; height: number };
  referrerUrl?: string;
  referrerType?: 'internal' | 'external' | 'direct' | 'search_engine';
  entryPoint?: string;
  userAgent?: string;
  previousPage?: string;
  pageLoadTime?: number;
  navigationSpeed?: number;
}

export interface RecommendationData {
  algorithm: string;
  confidence: number;
  category: string;
  tags: string[];
  isPersonalized: boolean;
  source: string;
  position: number;
}

export interface HoverTrackingData {
  userId: string;
  targetId: string;
  targetType: 'video' | 'playlist' | 'recommendation_card' | 'thumbnail' | 'creator' | 'category' | 'play_button';
  containerType?: string;
  position?: number;
  pageContext?: string;
  sectionId?: string;
  sessionId: string;
  device?: string;
  viewport?: { width: number; height: number };
  scrollPosition?: number;
  elementPosition?: { x: number; y: number };
  elementSize?: { width: number; height: number };
  entryDirection?: string;
  recommendationData?: RecommendationData;
  isFirstTimeSeeing?: boolean;
  previousInteractions?: number;
  timeOnCurrentPage?: number;
  totalPageInteractions?: number;
}

export interface ClickTrackingData {
  elementType: string;
  elementId?: string;
  elementText?: string;
  coordinates?: { x: number; y: number };
}

export interface ContentInteractionData {
  interactionType: 'hover' | 'click' | 'bookmark' | 'share' | 'like' | 'dislike';
  targetId: string;
  targetType: 'video' | 'playlist' | 'creator' | 'category';
  duration?: number;
}

export interface CategoryExplorationData {
  categoryId: string;
  categoryName: string;
  timeSpent: number;
  itemsViewed: number;
}

export interface ViewingSessionEndData {
  itemId: string;
  totalViewDuration: number;
  completionPercentage: number;
}

export interface SearchResultClickData {
  itemId: string;
  itemType: 'video' | 'playlist' | 'creator';
  position: number;
}

export interface SearchRefinementData {
  refinementType: 'filter' | 'sort' | 'category' | 'duration';
  refinementValue: string;
}

export interface SearchEndData {
  resultsScrollDepth?: number;
  abandoned?: boolean;
}

class ImplicitTrackingService {
  private sessionId: string;
  private userId: string | null = null;
  private activeViewingSession: string | null = null;
  private activeSearchSession: string | null = null;
  private activePageVisit: string | null = null;
  private activeHovers: Map<string, any> = new Map();
  private activeMoveListeners: Map<string, (event: MouseEvent) => void> = new Map();
  private pageStartTime: number = Date.now();
  private pageInteractionCount: number = 0;
  private scrollDepth: number = 0;
  private scrollEvents: number = 0;
  private baseUrl: string = '';
  private isClient: boolean = false;

  constructor() {
    // Only initialize on client side
    this.isClient = typeof window !== 'undefined';
    this.sessionId = this.generateSessionId();
    this.baseUrl = this.getBaseUrl();
    
    if (this.isClient) {
      this.initializeTracking();
    }
  }

  private getBaseUrl(): string {
    // Use window.location.origin to get the correct protocol, hostname, and port
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    // Fallback for server-side rendering
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private getDeviceType(): string {
    if (!this.isClient) return 'unknown';
    
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|touch|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      return /ipad/i.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  private getViewportSize() {
    if (!this.isClient) return { width: 1920, height: 1080 };
    
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  private async apiCall(endpoint: string, data: any) {
    try {
      // Construct full URL using dynamic base URL
      const fullUrl = `${this.baseUrl}${endpoint}`;
      
      // Enhanced debug logging
      console.log(`🌐 API Call Debug Info:`, {
        endpoint,
        fullUrl,
        baseUrl: this.baseUrl,
        windowLocation: typeof window !== 'undefined' ? {
          href: window.location.href,
          origin: window.location.origin,
          hostname: window.location.hostname,
          port: window.location.port,
          protocol: window.location.protocol
        } : 'Server-side',
        userId: data.userId, 
        action: data.action,
        dataKeys: Object.keys(data),
        timestamp: new Date().toISOString()
      });

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Tracking API error (${fullUrl}):`, {
          status: response.status,
          statusText: response.statusText,
          responseBody: errorText,
          requestData: data,
          fullUrl: fullUrl,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: new Date().toISOString()
        });
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`✅ API call successful (${fullUrl}):`, {
        result,
        status: response.status,
        timestamp: new Date().toISOString()
      });
      return result;
    } catch (error) {
      console.error(`💥 Tracking error (${endpoint}):`, {
        error: error instanceof Error ? error.message : String(error),
        fullUrl: `${this.baseUrl}${endpoint}`,
        baseUrl: this.baseUrl,
        endpoint,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw error; // Re-throw to let calling code handle it
    }
  }

  // Initialize tracking for the session
  setUserId(userId: string) {
    this.userId = userId;
    // Automatically track page visit when user is set
    this.trackPageVisit();
  }

  private initializeTracking() {
    // Only initialize if we're on the client side
    if (!this.isClient) {
      console.log('🚫 Skipping tracking initialization - not on client side');
      return;
    }

    // Track page navigation
    this.trackPageVisit();

    // Track scroll behavior
    this.initializeScrollTracking();

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageLeave();
      } else {
        this.handlePageResume();
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.handlePageLeave();
    });

    // Track mouse movement for hover analysis
    this.initializeHoverTracking();
  }

  // === VIEWING HISTORY TRACKING ===

  async startViewingSession(data: ViewingTrackingData) {
    if (!this.userId) return;

    const result = await this.apiCall('/api/tracking/viewing-history', {
      userId: this.userId,
      itemId: data.itemId,
      itemType: data.itemType,
      action: 'start',
      viewingData: {
        source: data.source,
        device: this.getDeviceType(),
        sessionId: this.sessionId,
        actualDuration: data.actualDuration,
        captionsEnabled: data.captionsEnabled,
        referrer: data.referrer || document.referrer,
      },
    });

    if (result?.success) {
      this.activeViewingSession = result.viewingRecord.id;
    }
  }

  async updateViewingSession(data: ViewingSessionUpdateData) {
    if (!this.userId || !this.activeViewingSession) return;

    await this.apiCall('/api/tracking/viewing-history', {
      userId: this.userId,
      itemId: data.itemId,
      action: 'update',
      viewingData: data,
    });
  }

  async endViewingSession(data: ViewingSessionEndData) {
    if (!this.userId || !this.activeViewingSession) return;

    await this.apiCall('/api/tracking/viewing-history', {
      userId: this.userId,
      itemId: data.itemId,
      action: 'complete',
      viewingData: data,
    });

    this.activeViewingSession = null;
  }

  // === SEARCH HISTORY TRACKING ===

  async trackSearch(data: SearchTrackingData) {
    if (!this.userId) return;

    const result = await this.apiCall('/api/tracking/search-history', {
      userId: this.userId,
      action: 'search',
      searchData: {
        searchQuery: data.searchQuery,
        searchType: data.searchType || 'content',
        source: data.source || 'header_search',
        sessionId: this.sessionId,
        device: this.getDeviceType(),
        userAgent: this.isClient ? navigator.userAgent : 'server',
        previousQuery: data.previousQuery,
        resultsFound: data.resultsFound || 0,
        resultsDisplayed: data.resultsDisplayed || 0,
      },
    });

    if (result?.success) {
      this.activeSearchSession = result.searchRecord.id;
    }
  }

  async trackSearchResultClick(data: SearchResultClickData) {
    if (!this.userId || !this.activeSearchSession) return;

    await this.apiCall('/api/tracking/search-history', {
      userId: this.userId,
      action: 'click_result',
      searchData: {
        sessionId: this.sessionId,
        itemId: data.itemId,
        itemType: data.itemType,
        position: data.position,
      },
    });
  }

  async trackSearchRefinement(data: SearchRefinementData) {
    if (!this.userId || !this.activeSearchSession) return;

    await this.apiCall('/api/tracking/search-history', {
      userId: this.userId,
      action: 'refine',
      searchData: {
        sessionId: this.sessionId,
        refinementType: data.refinementType,
        refinementValue: data.refinementValue,
      },
    });
  }

  async endSearchSession(data?: SearchEndData) {
    if (!this.userId || !this.activeSearchSession) return;

    await this.apiCall('/api/tracking/search-history', {
      userId: this.userId,
      action: data?.abandoned ? 'abandon' : 'complete',
      searchData: {
        sessionId: this.sessionId,
        resultsScrollDepth: data?.resultsScrollDepth || this.scrollDepth,
      },
    });

    this.activeSearchSession = null;
  }

  // === NAVIGATION TRACKING ===

  private async trackPageVisit() {
    if (!this.userId) {
      console.warn('Cannot track page visit: userId not set');
      return;
    }

    if (!this.isClient) {
      console.warn('Cannot track page visit: not on client side');
      return;
    }

    const navigationData: NavigationTrackingData = {
      userId: this.userId,
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      pageTitle: document.title,
      pageType: this.determinePageType(window.location.pathname),
      sessionId: this.sessionId,
      device: this.getDeviceType(),
      viewport: this.getViewportSize(),
      referrerUrl: document.referrer,
      referrerType: this.determineReferrerType(document.referrer),
      entryPoint: this.determineEntryPoint(),
      userAgent: navigator.userAgent,
      pageLoadTime: performance.now(),
    };

    try {
      const result = await this.apiCall('/api/tracking/navigation', {
        userId: this.userId,
        action: 'page_visit',
        navigationData,
      });

      if (result?.success) {
        this.activePageVisit = result.navigationRecord.id;
      }
    } catch (error) {
      console.error('Failed to track page visit:', error);
    }

    this.pageStartTime = Date.now();
    this.pageInteractionCount = 0;
    this.scrollDepth = 0;
    this.scrollEvents = 0;
  }

  private determinePageType(pathname: string): 'home' | 'browse' | 'category' | 'playlist' | 'video' | 'search' | 'profile' | 'settings' | 'other' {
    if (pathname === '/' || pathname === '/dashboard') return 'home';
    if (pathname.startsWith('/browse')) return 'browse';
    if (pathname.startsWith('/category')) return 'category';
    if (pathname.startsWith('/playlist')) return 'playlist';
    if (pathname.startsWith('/video')) return 'video';
    if (pathname.startsWith('/search')) return 'search';
    if (pathname.startsWith('/profile')) return 'profile';
    if (pathname.startsWith('/settings')) return 'settings';
    return 'other';
  }

  private determineReferrerType(referrer: string): 'internal' | 'external' | 'direct' | 'search_engine' {
    if (!referrer || !this.isClient) return 'direct';
    if (referrer.includes(window.location.hostname)) return 'internal';
    if (referrer.includes('google.com') || referrer.includes('bing.com') || referrer.includes('yahoo.com')) {
      return 'search_engine';
    }
    return 'external';
  }

  private determineEntryPoint(): string {
    if (!this.isClient) return 'direct';
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('utm_source')) return 'marketing';
    if (urlParams.get('ref')) return 'referral';
    if (document.referrer.includes('google.com')) return 'search';
    return 'direct';
  }

  private async handlePageLeave() {
    if (!this.userId || !this.activePageVisit || !this.isClient) return;

    const navigationData = {
      userId: this.userId,
      action: 'page_leave',
      navigationData: {
        sessionId: this.sessionId,
        pagePath: window.location.pathname,
        scrollDepth: this.scrollDepth,
        isBouncePage: this.pageInteractionCount === 0,
        exitAction: document.hidden ? 'close_tab' : 'navigation',
      },
    };

    // Use sendBeacon for better reliability on page unload
    if (navigator.sendBeacon) {
      try {
        const success = navigator.sendBeacon(
          `${this.baseUrl}/api/tracking/navigation`,
          JSON.stringify(navigationData)
        );
        if (!success) {
          console.warn('sendBeacon failed, falling back to fetch');
          // Fallback to regular API call
          await this.apiCall('/api/tracking/navigation', navigationData);
        }
      } catch (error) {
        console.error('Failed to track page leave:', error);
      }
    } else {
      // Fallback for browsers that don't support sendBeacon
      try {
        await this.apiCall('/api/tracking/navigation', navigationData);
      } catch (error) {
        console.error('Failed to track page leave:', error);
      }
    }

    this.activePageVisit = null;
  }

  private handlePageResume() {
    // Re-track page visit if user returns to the tab
    this.trackPageVisit();
  }

  async trackClick(data: ClickTrackingData) {
    if (!this.userId) return;

    this.pageInteractionCount++;

    await this.apiCall('/api/tracking/navigation', {
      userId: this.userId,
      action: 'click',
      navigationData: {
        sessionId: this.sessionId,
        elementType: data.elementType,
        elementId: data.elementId,
        elementText: data.elementText,
        coordinates: data.coordinates,
      },
    });
  }

  async trackContentInteraction(data: ContentInteractionData) {
    if (!this.userId) return;

    await this.apiCall('/api/tracking/navigation', {
      userId: this.userId,
      action: 'content_interaction',
      navigationData: {
        sessionId: this.sessionId,
        interactionType: data.interactionType,
        targetId: data.targetId,
        targetType: data.targetType,
        duration: data.duration,
      },
    });
  }

  async trackCategoryExploration(data: CategoryExplorationData) {
    if (!this.userId) return;

    await this.apiCall('/api/tracking/navigation', {
      userId: this.userId,
      action: 'category_explore',
      navigationData: {
        sessionId: this.sessionId,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        timeSpent: data.timeSpent,
        itemsViewed: data.itemsViewed,
      },
    });
  }

  // === SCROLL TRACKING ===

  private initializeScrollTracking() {
    if (!this.isClient) return;
    
    let scrollTimeout: NodeJS.Timeout;

    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      const scrollPercent = Math.round((scrollTop + windowHeight) / documentHeight * 100);
      this.scrollDepth = Math.max(this.scrollDepth, scrollPercent);
      this.scrollEvents++;

      // Debounce scroll tracking
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.apiCall('/api/tracking/navigation', {
          userId: this.userId,
          action: 'scroll',
          navigationData: {
            sessionId: this.sessionId,
            scrollDepth: this.scrollDepth,
          },
        });
      }, 500);
    });
  }

  // === HOVER INTERACTION TRACKING ===

  private initializeHoverTracking() {
    if (!this.isClient) return;
    
    // We'll track hover on elements with data-track-hover attribute
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const trackableElement = target.closest('[data-track-hover]');
      
      if (trackableElement && this.userId) {
        this.startHoverTracking(trackableElement as HTMLElement, event);
      }
    });

    document.addEventListener('mouseout', (event) => {
      const target = event.target as HTMLElement;
      const trackableElement = target.closest('[data-track-hover]');
      
      if (trackableElement && this.userId) {
        this.endHoverTracking(trackableElement as HTMLElement, event);
      }
    });
  }

  private async startHoverTracking(element: HTMLElement, event: MouseEvent) {
    const targetId = element.getAttribute('data-track-hover');
    const targetType = element.getAttribute('data-hover-type') || 'recommendation_card';
    
    if (!targetId || this.activeHovers.has(targetId)) return;
    
    if (!this.userId) {
      console.warn('Cannot start hover tracking: userId not set');
      return;
    }

    const rect = element.getBoundingClientRect();
    
    // Ensure all values meet MongoDB schema constraints (min: 0)
    const safeElementPosition = {
      x: Math.max(0, Math.round(rect.left)),
      y: Math.max(0, Math.round(rect.top))
    };
    
    const safeElementSize = {
      width: Math.max(0, Math.round(rect.width)),
      height: Math.max(0, Math.round(rect.height))
    };
    
    const viewport = this.getViewportSize();
    const safeViewport = {
      width: Math.max(1, viewport.width),
      height: Math.max(1, viewport.height)
    };
    
    console.log('🎯 Hover tracking data validation:', {
      targetId,
      elementPosition: safeElementPosition,
      elementSize: safeElementSize,
      viewport: safeViewport,
      originalRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    });

    const hoverData: HoverTrackingData = {
      userId: this.userId!,
      targetId,
      targetType: targetType as any,
      containerType: element.getAttribute('data-container-type') || 'unknown',
      position: Math.max(1, parseInt(element.getAttribute('data-position') || '1')),
      pageContext: window.location.pathname,
      sectionId: element.getAttribute('data-section-id') || undefined,
      sessionId: this.sessionId,
      device: this.getDeviceType(),
      viewport: safeViewport,
      scrollPosition: Math.max(0, window.pageYOffset),
      elementPosition: safeElementPosition,
      elementSize: safeElementSize,
      entryDirection: this.getMouseEntryDirection(event, rect),
      isFirstTimeSeeing: !element.hasAttribute('data-seen-before'),
      timeOnCurrentPage: Math.max(0, Math.round((Date.now() - this.pageStartTime) / 1000)),
      totalPageInteractions: Math.max(0, this.pageInteractionCount),
    };

    // Mark as seen
    element.setAttribute('data-seen-before', 'true');

    try {
      const result = await this.apiCall('/api/tracking/hover', {
        userId: this.userId,
        action: 'hover_start',
        hoverData,
      });

      if (result?.success) {
        const hoverInfo = {
          hoverId: result.hoverRecord.id,
          startTime: Date.now(),
          element,
          mousePositions: [{ x: event.clientX, y: event.clientY, time: Date.now() }],
        };

        this.activeHovers.set(targetId, hoverInfo);

        // Add mouse movement tracking during hover
        const moveListener = (moveEvent: MouseEvent) => {
          if (this.activeHovers.has(targetId)) {
            hoverInfo.mousePositions.push({
              x: moveEvent.clientX,
              y: moveEvent.clientY,
              time: Date.now()
            });
          }
        };

        // Store the listener for cleanup
        this.activeMoveListeners.set(targetId, moveListener);
        
        // Add the listener
        document.addEventListener('mousemove', moveListener);
      }
    } catch (error) {
      console.error('Failed to start hover tracking:', error);
    }
  }

  private async endHoverTracking(element: HTMLElement, event: MouseEvent) {
    const targetId = element.getAttribute('data-track-hover');
    if (!targetId || !this.activeHovers.has(targetId)) return;

    const hoverInfo = this.activeHovers.get(targetId);
    const endTime = Date.now();
    const duration = endTime - hoverInfo.startTime;

    // Clean up mouse movement listener
    if (this.activeMoveListeners.has(targetId)) {
      const moveListener = this.activeMoveListeners.get(targetId);
      if (moveListener) {
        document.removeEventListener('mousemove', moveListener);
      }
      this.activeMoveListeners.delete(targetId);
    }

    // Calculate mouse movement data
    const mousePositions = hoverInfo.mousePositions;
    let totalDistance = 0;
    for (let i = 1; i < mousePositions.length; i++) {
      const prev = mousePositions[i - 1];
      const curr = mousePositions[i];
      totalDistance += Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
    }

    const rect = element.getBoundingClientRect();
    
    try {
      await this.apiCall('/api/tracking/hover', {
        userId: this.userId,
        action: 'hover_end',
        hoverData: {
          targetId,
          sessionId: this.sessionId,
          mouseMovement: {
            exitDirection: this.getMouseExitDirection(event, rect),
            movementPattern: this.analyzeMovementPattern(mousePositions, duration),
            totalMovementDistance: totalDistance,
          },
          hoverOutcome: {
            resultedInClick: false, // Will be updated if click follows
            resultedInScroll: false,
            resultedInNavigation: false,
          },
        },
      });
    } catch (error) {
      console.error('Failed to end hover tracking:', error);
    }

    this.activeHovers.delete(targetId);
  }

  private getMouseEntryDirection(event: MouseEvent, rect: DOMRect): string {
    const relX = event.clientX - rect.left;
    const relY = event.clientY - rect.top;
    
    if (relY < rect.height * 0.2) return 'top';
    if (relY > rect.height * 0.8) return 'bottom';
    if (relX < rect.width * 0.2) return 'left';
    if (relX > rect.width * 0.8) return 'right';
    return 'center';
  }

  private getMouseExitDirection(event: MouseEvent, rect: DOMRect): string {
    const relX = event.clientX - rect.left;
    const relY = event.clientY - rect.top;
    
    if (relY < 0) return 'top';
    if (relY > rect.height) return 'bottom';
    if (relX < 0) return 'left';
    if (relX > rect.width) return 'right';
    return 'center';
  }

  private analyzeMovementPattern(positions: any[], duration: number): string {
    if (positions.length < 3) return 'direct';
    if (duration < 200) return 'rapid';
    
    let totalMovement = 0;
    let directionChanges = 0;
    
    for (let i = 2; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      const prevPrev = positions[i - 2];
      
      totalMovement += Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      
      // Check for direction change
      const prevVector = { x: prev.x - prevPrev.x, y: prev.y - prevPrev.y };
      const currVector = { x: curr.x - prev.x, y: curr.y - prev.y };
      
      const dotProduct = prevVector.x * currVector.x + prevVector.y * currVector.y;
      if (dotProduct < 0) directionChanges++;
    }
    
    const movementRatio = totalMovement / duration;
    const changeRatio = directionChanges / positions.length;
    
    if (changeRatio > 0.3) return 'exploratory';
    if (movementRatio < 0.1) return 'hesitant';
    return 'direct';
  }

  // === PUBLIC UTILITY METHODS ===

  getSessionId(): string {
    return this.sessionId;
  }

  getCurrentPageInteractions(): number {
    return this.pageInteractionCount;
  }

  getCurrentScrollDepth(): number {
    return this.scrollDepth;
  }

  // Clean up resources
  destroy() {
    this.handlePageLeave();
    this.activeHovers.clear();
    
    // Clean up all active mouse move listeners
    this.activeMoveListeners.forEach((listener) => {
      document.removeEventListener('mousemove', listener);
    });
    this.activeMoveListeners.clear();
  }
}

// Export singleton instance
export const implicitTracker = new ImplicitTrackingService();

// Convenience functions for easy usage
export const trackViewing = {
  start: (data: ViewingTrackingData) => implicitTracker.startViewingSession(data),
  update: (data: ViewingSessionUpdateData) => implicitTracker.updateViewingSession(data),
  end: (data: ViewingSessionEndData) => implicitTracker.endViewingSession(data),
};

export const trackSearch = {
  search: (data: SearchTrackingData) => implicitTracker.trackSearch(data),
  clickResult: (data: SearchResultClickData) => implicitTracker.trackSearchResultClick(data),
  refine: (data: SearchRefinementData) => implicitTracker.trackSearchRefinement(data),
  end: (data?: SearchEndData) => implicitTracker.endSearchSession(data),
};

export const trackNavigation = {
  click: (data: ClickTrackingData) => implicitTracker.trackClick(data),
  content: (data: ContentInteractionData) => implicitTracker.trackContentInteraction(data),
  category: (data: CategoryExplorationData) => implicitTracker.trackCategoryExploration(data),
};

export default implicitTracker; 