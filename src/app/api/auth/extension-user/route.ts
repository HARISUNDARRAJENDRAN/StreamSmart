/**
 * Extension User Info Endpoint
 * Returns the current user's ID for the Chrome extension to use
 * 
 * SECURITY: Requires authentication - looks up user from token, not from query params
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { findUserByEmail } from '@/lib/dynamodb-service';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://main.de7gjtsqdtkvr.amplifyapp.com',
  'https://streamsmart.vercel.app',
  'https://www.youtube.com',
];

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const isExtension = origin.startsWith('chrome-extension://');
  const isAllowed = isExtension || 
    ALLOWED_ORIGINS.includes(origin) || 
    process.env.NODE_ENV === 'development';
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

/**
 * GET /api/auth/extension-user
 * Returns the authenticated user's info
 * SECURITY: No longer accepts email as parameter - uses authentication instead
 */
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    // Get authenticated user
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Return authenticated user info
    return NextResponse.json(
      {
        success: true,
        userId: authResult.user.userId,
        email: authResult.user.email,
        source: authResult.user.source,
      },
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('[Extension User API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get user info',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
