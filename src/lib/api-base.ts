const resolveApiBaseUrl = (): string => {
  const publicUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  const internalUrl = process.env.INTERNAL_API_URL;
  
  // Ensure we always return a valid string
  const defaultUrl = 'http://localhost:8000';
  
  if (typeof window === 'undefined') {
    // Server-side
    return (internalUrl || publicUrl || defaultUrl).toString();
  }
  // Client-side
  return (publicUrl || internalUrl || defaultUrl).toString();
};

export const API_BASE_URL = resolveApiBaseUrl();
export default API_BASE_URL;
