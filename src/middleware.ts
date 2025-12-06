import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify, createRemoteJWKSet, JWTPayload } from 'jose';

// Cognito configuration
const COGNITO_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-2';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '';
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
const JWT_SECRET = process.env.JWT_SECRET ? new TextEncoder().encode(process.env.JWT_SECRET) : null;

// JWKS URL for Cognito
const JWKS_URL = COGNITO_USER_POOL_ID 
  ? `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`
  : '';

// Cache for JWKS
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwksCache && JWKS_URL) {
    jwksCache = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwksCache;
}

// Public routes that don't require authentication
const publicPaths = [
  '/',
  '/login',
  '/register',
  '/about',
  '/landing',
  '/extension-setup',
];

// Protected route prefixes that REQUIRE authentication
const protectedPrefixes = [
  '/settings',
  '/playlists',
  '/progress',
  '/achievements',
  '/productivity',
  '/ai-feed',
  '/genre',
];

// API routes that require authentication (not including public API routes)
const protectedApiPrefixes = [
  '/api/playlists',
  '/api/user',
  '/api/activities',
  '/api/auth/generate-extension-token',
];

// Public API routes (don't require auth)
const publicApiPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/cognito/sync',
  '/api/auth/me',
  '/api/auth/validate-extension-token',
  '/api/videos',
  '/api/generate-suggestions',
  '/api/multimodal-analysis',
];

/**
 * Verify Cognito token from cookies or Authorization header
 */
async function verifyCognitoToken(token: string): Promise<JWTPayload | null> {
  try {
    const jwks = getJWKS();
    if (!jwks) return null;

    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
    });

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify extension JWT token
 */
async function verifyExtensionToken(token: string): Promise<JWTPayload | null> {
  try {
    if (!JWT_SECRET) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    if (payload.scope !== 'extension') return null;

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract and verify authentication from request
 */
async function getAuthPayload(request: NextRequest): Promise<JWTPayload | null> {
  // 1. Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // Try Cognito first
    const cognitoPayload = await verifyCognitoToken(token);
    if (cognitoPayload) return cognitoPayload;
    
    // Try extension token
    const extensionPayload = await verifyExtensionToken(token);
    if (extensionPayload) return extensionPayload;
  }

  // 2. Check Cognito cookies
  const cookies = request.cookies;
  
  // Look for Cognito ID token
  for (const [name, cookie] of cookies) {
    if (name.includes('idToken') || name.includes('.idToken')) {
      const payload = await verifyCognitoToken(cookie.value);
      if (payload) return payload;
    }
  }

  // 3. Check for access token cookie
  for (const [name, cookie] of cookies) {
    if (name.includes('accessToken') || name.includes('.accessToken')) {
      const payload = await verifyCognitoToken(cookie.value);
      if (payload) return payload;
    }
  }

  // 4. Check session cookie (for legacy/demo support)
  const sessionCookie = cookies.get('userSession');
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value);
      if (session.userId) {
        // Return a pseudo-payload for session-based auth
        return { sub: session.userId, email: session.email } as JWTPayload;
      }
    } catch {
      // Invalid session cookie
    }
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next();
  }
  
  // Check if path is public
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
  
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Check if it's an API route
  if (pathname.startsWith('/api/')) {
    // Check if it's a public API route
    const isPublicApi = publicApiPaths.some(path => 
      pathname === path || pathname.startsWith(`${path}/`)
    );

    if (isPublicApi) {
      return NextResponse.next();
    }

    // Check if it requires authentication
    const requiresAuth = protectedApiPrefixes.some(prefix => 
      pathname.startsWith(prefix)
    );

    if (requiresAuth) {
      const authPayload = await getAuthPayload(request);
      
      if (!authPayload) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }

      // Add user info to headers for downstream use
      const response = NextResponse.next();
      response.headers.set('x-user-id', authPayload.sub as string || '');
      response.headers.set('x-user-email', authPayload.email as string || '');
      return response;
    }

    return NextResponse.next();
  }

  // Check if it's a protected page route
  const isProtectedPath = protectedPrefixes.some(prefix => 
    pathname.startsWith(prefix)
  );
  
  if (isProtectedPath) {
    const authPayload = await getAuthPayload(request);
    
    if (!authPayload) {
      // Redirect to login for page routes
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // User is authenticated, allow access
    const response = NextResponse.next();
    response.headers.set('x-user-id', authPayload.sub as string || '');
    return response;
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
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
