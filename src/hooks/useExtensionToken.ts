/**
 * Hook to manage extension authentication token
 * Automatically gets/generates token when user logs in
 */

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';

interface ExtensionToken {
  token: string;
  expiresAt: number;
  isNew: boolean;
}

export function useExtensionToken() {
  const { user } = useUser();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchToken();
    } else {
      setToken(null);
      setError(null);
    }
  }, [user?.id]);

  const fetchToken = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/get-extension-token?userId=${user.id}`);
      const data = await response.json();

      if (data.success && data.token) {
        setToken(data.token);
        
        // Store in localStorage for extension access
        if (typeof window !== 'undefined') {
          localStorage.setItem('streamsmart_extension_token', data.token);
          localStorage.setItem('streamsmart_user_id', user.id);
        }
      } else {
        throw new Error(data.error || 'Failed to get token');
      }
    } catch (err: any) {
      console.error('Error fetching extension token:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    await fetchToken();
  };

  return {
    token,
    loading,
    error,
    refreshToken
  };
}
