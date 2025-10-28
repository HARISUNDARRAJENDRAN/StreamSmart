import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicPaths = [
  '/',
  '/login',
  '/register',
  '/about',
  '/landing',
];

// Protected route prefixes
const protectedPrefixes = [
  '/dashboard',
  '/settings',
  '/playlists',
  '/progress',
  '/achievements',
  '/productivity',
  '/search',
  '/genre',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow all API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Check if the path is public
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
  
  // If it's a public path, allow it
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Check if it's a protected path
  const isProtectedPath = protectedPrefixes.some(prefix => 
    pathname.startsWith(prefix)
  );
  
  // For protected paths, we rely on client-side auth checking
  // Cognito tokens are managed by AWS Amplify on the client side
  if (isProtectedPath) {
    // Let the request through - auth will be handled by CognitoAuthContext
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
