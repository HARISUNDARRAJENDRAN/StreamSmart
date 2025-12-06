/**
 * Server-side Authentication Utilities
 * Used for validating tokens and extracting user info in API routes
 */

import { jwtVerify, createRemoteJWKSet } from 'jose';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// JWT Secret for extension tokens
const JWT_SECRET = process.env.JWT_SECRET ? new TextEncoder().encode(process.env.JWT_SECRET) : null;

// Cognito configuration
const COGNITO_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-2';
const COGNITO_USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '';
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';

// JWKS URL for Cognito
const JWKS_URL = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

// Cache for JWKS
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwksCache && COGNITO_USER_POOL_ID) {
    jwksCache = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwksCache;
}

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  cognitoSub?: string;
  source: 'cognito' | 'extension' | 'session';
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Verify Cognito ID token
 */
async function verifyCognitoToken(token: string): Promise<AuthResult> {
  try {
    const jwks = getJWKS();
    if (!jwks) {
      return { authenticated: false, error: 'Cognito not configured' };
    }

    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
      audience: COGNITO_CLIENT_ID,
    });

    return {
      authenticated: true,
      user: {
        userId: payload.sub as string,
        email: payload.email as string | undefined,
        cognitoSub: payload.sub as string,
        source: 'cognito',
      },
    };
  } catch (error) {
    console.error('[Auth] Cognito token verification failed:', error);
    return { authenticated: false, error: 'Invalid Cognito token' };
  }
}

/**
 * Verify extension JWT token
 */
async function verifyExtensionToken(token: string): Promise<AuthResult> {
  try {
    if (!JWT_SECRET) {
      return { authenticated: false, error: 'JWT_SECRET not configured' };
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Verify this is an extension token
    if (payload.scope !== 'extension') {
      return { authenticated: false, error: 'Invalid token scope' };
    }

    return {
      authenticated: true,
      user: {
        userId: payload.sub as string,
        source: 'extension',
      },
    };
  } catch (error) {
    console.error('[Auth] Extension token verification failed:', error);
    return { authenticated: false, error: 'Invalid extension token' };
  }
}

/**
 * Verify session cookie
 */
async function verifySessionCookie(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const userSessionCookie = cookieStore.get('userSession');

    if (!userSessionCookie) {
      return { authenticated: false, error: 'No session cookie' };
    }

    const session = JSON.parse(userSessionCookie.value);
    
    if (!session.userId) {
      return { authenticated: false, error: 'Invalid session data' };
    }

    return {
      authenticated: true,
      user: {
        userId: session.userId,
        email: session.email,
        source: 'session',
      },
    };
  } catch (error) {
    console.error('[Auth] Session verification failed:', error);
    return { authenticated: false, error: 'Invalid session' };
  }
}

/**
 * Get authenticated user from request
 * Tries multiple authentication methods in order:
 * 1. Authorization header (Bearer token - Cognito or Extension)
 * 2. Cognito cookies
 * 3. Session cookie
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  // 1. Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // Try Cognito token first
    const cognitoResult = await verifyCognitoToken(token);
    if (cognitoResult.authenticated) {
      return cognitoResult;
    }
    
    // Try extension token
    const extensionResult = await verifyExtensionToken(token);
    if (extensionResult.authenticated) {
      return extensionResult;
    }
  }

  // 2. Check Cognito cookies
  try {
    const cookieStore = await cookies();
    
    // Look for Cognito ID token in cookies
    const allCookies = cookieStore.getAll();
    const idTokenCookie = allCookies.find(c => 
      c.name.includes('idToken') || 
      c.name.includes('CognitoIdentityServiceProvider')
    );
    
    if (idTokenCookie?.value) {
      const cognitoResult = await verifyCognitoToken(idTokenCookie.value);
      if (cognitoResult.authenticated) {
        return cognitoResult;
      }
    }
  } catch (error) {
    // Cookie access failed, continue to next method
  }

  // 3. Check session cookie
  const sessionResult = await verifySessionCookie();
  if (sessionResult.authenticated) {
    return sessionResult;
  }

  return { authenticated: false, error: 'No valid authentication found' };
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const result = await getAuthenticatedUser(request);
  
  if (!result.authenticated || !result.user) {
    throw new Error(result.error || 'Authentication required');
  }
  
  return result.user;
}

/**
 * Check if user is authorized to access a specific resource
 */
export function isAuthorizedForResource(
  authenticatedUser: AuthenticatedUser,
  resourceUserId: string
): boolean {
  // User can only access their own resources
  return authenticatedUser.userId === resourceUserId;
}

/**
 * Verify extension token (exported for extension-specific endpoints)
 */
export async function verifyExtensionJWT(token: string): Promise<AuthResult> {
  return verifyExtensionToken(token);
}

