import { useCallback, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { 
  implicitTracker,
  trackViewing,
  trackSearch,
  trackNavigation,
  type ViewingTrackingData,
  type SearchTrackingData
} from '@/services/implicitTrackingService';

export function useImplicitTracking() {
  const { user } = useUser();

  // Initialize tracking when user is available
  useEffect(() => {
    if (user) {
      implicitTracker.setUserId(user.id);
    }
  }, [user]);

  // Viewing tracking functions
  const startViewing = useCallback(async (data: Omit<ViewingTrackingData, 'userId'>) => {
    if (!user) return;
    
    return await trackViewing.start({
      ...data,
      userId: user.id,
    });
  }, [user]);

  const updateViewing = useCallback(async (data: {
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
  }) => {
    if (!user) return;
    
    return await trackViewing.update(data);
  }, [user]);

  const endViewing = useCallback(async (data: {
    itemId: string;
    totalViewDuration: number;
    completionPercentage: number;
  }) => {
    if (!user) return;
    
    return await trackViewing.end(data);
  }, [user]);

  // Search tracking functions
  const trackSearchQuery = useCallback(async (data: Omit<SearchTrackingData, 'userId'>) => {
    if (!user) return;
    
    return await trackSearch.search({
      ...data,
      userId: user.id,
    });
  }, [user]);

  const trackSearchClick = useCallback(async (data: {
    itemId: string;
    itemType: 'video' | 'playlist' | 'creator';
    position: number;
  }) => {
    if (!user) return;
    
    return await trackSearch.clickResult(data);
  }, [user]);

  const trackSearchRefine = useCallback(async (data: {
    refinementType: 'filter' | 'sort' | 'category' | 'duration';
    refinementValue: string;
  }) => {
    if (!user) return;
    
    return await trackSearch.refine(data);
  }, [user]);

  const endSearch = useCallback(async (data?: { resultsScrollDepth?: number; abandoned?: boolean }) => {
    if (!user) return;
    
    return await trackSearch.end(data);
  }, [user]);

  // Navigation tracking functions
  const trackClick = useCallback(async (data: {
    elementType: string;
    elementId?: string;
    elementText?: string;
    coordinates?: { x: number; y: number };
  }) => {
    if (!user) return;
    
    return await trackNavigation.click(data);
  }, [user]);

  const trackContentInteraction = useCallback(async (data: {
    interactionType: 'hover' | 'click' | 'bookmark' | 'share' | 'like' | 'dislike';
    targetId: string;
    targetType: 'video' | 'playlist' | 'creator' | 'category';
    duration?: number;
  }) => {
    if (!user) return;
    
    return await trackNavigation.content(data);
  }, [user]);

  const trackCategoryExplore = useCallback(async (data: {
    categoryId: string;
    categoryName: string;
    timeSpent: number;
    itemsViewed: number;
  }) => {
    if (!user) return;
    
    return await trackNavigation.category(data);
  }, [user]);

  // Utility functions
  const getSessionId = useCallback(() => {
    return implicitTracker.getSessionId();
  }, []);

  const getPageInteractions = useCallback(() => {
    return implicitTracker.getCurrentPageInteractions();
  }, []);

  const getScrollDepth = useCallback(() => {
    return implicitTracker.getCurrentScrollDepth();
  }, []);

  return {
    // User info
    userId: user?.id,
    isTrackingEnabled: !!user,
    
    // Viewing tracking
    startViewing,
    updateViewing,
    endViewing,
    
    // Search tracking
    trackSearchQuery,
    trackSearchClick,
    trackSearchRefine,
    endSearch,
    
    // Navigation tracking
    trackClick,
    trackContentInteraction,
    trackCategoryExplore,
    
    // Utilities
    getSessionId,
    getPageInteractions,
    getScrollDepth,
  };
} 