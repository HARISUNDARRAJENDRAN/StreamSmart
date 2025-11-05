/**
 * Validate Extension Token Endpoint
 * Verifies JWT tokens from Chrome extension
 * 
 * Returns user information if token is valid
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Fail loudly if JWT_SECRET is not configured
if (!process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable must be set');
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface ValidationResponse {
  success: boolean;
  valid?: boolean;
  userId?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ValidationResponse>> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: 'Missing or invalid Authorization header',
        },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    console.log('[Token Validation] Validating token...');
    
    try {
      // Verify JWT
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      console.log('[Token Validation] Token valid for userId:', payload.sub);
      
      // Check scope
      if (payload.scope !== 'extension') {
        return NextResponse.json(
          {
            success: false,
            valid: false,
            error: 'Invalid token scope',
          },
          { status: 403, headers: corsHeaders }
        );
      }
      
      // TODO: Check token revocation list in Redis
      // const isRevoked = await checkTokenRevocation(token);
      // if (isRevoked) { return error response }
      
      return NextResponse.json(
        {
          success: true,
          valid: true,
          userId: payload.sub as string,
        },
        { headers: corsHeaders }
      );
      
    } catch (jwtError) {
      console.error('[Token Validation] JWT verification failed:', jwtError);
      
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: 'Invalid or expired token',
        },
        { status: 401, headers: corsHeaders }
      );
    }
    
  } catch (error) {
    console.error('[Token Validation] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: 'Validation failed',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
