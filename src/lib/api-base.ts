const resolveApiBaseUrl = (): string => {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL;
  const internalUrl = process.env.INTERNAL_API_URL;
  if (typeof window === 'undefined') {
    return internalUrl || publicUrl || 'http://localhost:8000';
  }
  return publicUrl || internalUrl || 'http://localhost:8000';
};

export const API_BASE_URL = resolveApiBaseUrl();
export default API_BASE_URL;
