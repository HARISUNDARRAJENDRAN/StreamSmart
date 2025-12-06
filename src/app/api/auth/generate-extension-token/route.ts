/**
 * Generate Extension Token Endpoint
 * Creates JWT tokens for Chrome extension authentication
 * 
 * Security features:
 * - REQUIRES AUTHENTICATION - only generates tokens for authenticated users
 * - JWT signed with HS256
 * - 30-day expiration (reduced from 90 days for security)
 * - User ID and email embedded
 * - Verifies user exists in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { findUserById } from '@/lib/dynamodb-service';

// Fail loudly if JWT_SECRET is not configured
if (!process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable must be set');
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Allowed origins for CORS (restrict in production)
const ALLOWED_ORIGINS = [
  'https://main.de7gjtsqdtkvr.amplifyapp.com',
  'https://streamsmart.vercel.app',
  'chrome-extension://', // Allow Chrome extensions
];

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.some(allowed => 
    origin.startsWith(allowed) || process.env.NODE_ENV === 'development'
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

interface TokenResponse {
  success: boolean;
  token?: string;
  expiresIn?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<TokenResponse>> {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    // SECURITY: Require authentication before generating token
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult.authenticated || !authResult.user) {
      console.log('[Token Generation] Unauthorized request - no valid auth');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please log in first.',
        },
        { status: 401, headers: corsHeaders }
      );
    }

    const authenticatedUserId = authResult.user.userId;
    console.log('[Token Generation] Authenticated request for userId:', authenticatedUserId);
    
    // SECURITY: Verify user exists in database
    try {
      const user = await findUserById(authenticatedUserId);
      if (!user) {
        console.log('[Token Generation] User not found in database:', authenticatedUserId);
        return NextResponse.json(
          {
            success: false,
            error: 'User not found',
          },
          { status: 404, headers: corsHeaders }
        );
      }
    } catch (dbError) {
      console.error('[Token Generation] Database error:', dbError);
      // Continue anyway for Cognito-only users
    }
    
    // Create JWT token with reduced expiration (30 days instead of 90)
    const token = await new SignJWT({
      sub: authenticatedUserId,
      email: authResult.user.email,
      scope: 'extension',
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d') // Reduced from 90 days for security
      .sign(JWT_SECRET);
    
    console.log('[Token Generation] Token created successfully for:', authenticatedUserId);
    
    return NextResponse.json(
      {
        success: true,
        token,
        expiresIn: '30 days',
      },
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('[Token Generation] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate token',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
