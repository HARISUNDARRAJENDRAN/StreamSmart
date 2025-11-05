/**
 * Get Current User Endpoint
 * Returns the currently authenticated user's information
 * Used by Chrome extension to get the real user ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.youtube.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    // Get cookies to check for user session
    const cookieStore = await cookies();
    
    // Check for Amplify Cognito tokens
    const cognitoIdToken = cookieStore.get('CognitoIdentityServiceProvider.idToken');
    const cognitoAccessToken = cookieStore.get('CognitoIdentityServiceProvider.accessToken');
    
    // Check for custom user session cookie
    const userSessionCookie = cookieStore.get('userSession');
    
    if (userSessionCookie) {
      try {
        const session = JSON.parse(userSessionCookie.value);
        return NextResponse.json(
          {
            success: true,
            authenticated: true,
            user: {
              id: session.userId,
              email: session.email,
              name: session.name,
            },
          },
          { headers: corsHeaders }
        );
      } catch (e) {
        console.error('Failed to parse user session:', e);
      }
    }
    
    // If no session found, check localStorage via client-side (this won't work server-side)
    // Return unauthenticated response
    return NextResponse.json(
      {
        success: true,
        authenticated: false,
        message: 'No active session found. Please log in to StreamSmart.',
      },
      { status: 401, headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('[Auth Me API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get user session',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
