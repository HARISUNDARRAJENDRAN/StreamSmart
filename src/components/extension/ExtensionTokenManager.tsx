/**
 * Extension Token Manager Component
 * Automatically fetches and manages extension authentication token
 * Should be included in the app layout
 */

'use client';

import { useEffect } from 'react';
import { useExtensionToken } from '@/hooks/useExtensionToken';

export function ExtensionTokenManager() {
  const { token, loading, error } = useExtensionToken();

  useEffect(() => {
    if (token && typeof window !== 'undefined') {
      console.log('[ExtensionTokenManager] Token ready for extension use');
      
      // Dispatch custom event that extension can listen to
      window.dispatchEvent(new CustomEvent('streamsmart-token-ready', {
        detail: { token }
      }));
    }
  }, [token]);

  // This component doesn't render anything
  return null;
}
