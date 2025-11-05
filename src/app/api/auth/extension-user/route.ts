/**
 * Extension User Info Endpoint
 * Returns the current user's ID for the Chrome extension to use
 * 
 * The extension can call this with the user's email/identifier
 * to get their userId for API calls
 */

import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/auth/extension-user?email=user@example.com
 * Returns the userId for the given email
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email parameter required',
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // TODO: Look up user by email in DynamoDB
    // For now, return demo-user-id
    
    return NextResponse.json(
      {
        success: true,
        userId: 'demo-user-id',
        email: email,
        message: 'User lookup not yet implemented. Using demo user.',
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
