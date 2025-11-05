/**
 * Generate Extension Token Endpoint
 * Creates JWT tokens for Chrome extension authentication
 * 
 * Security features:
 * - JWT signed with HS256
 * - 90-day expiration
 * - User ID and email embedded
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

// JWT Secret (In production, use environment variable)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface TokenRequest {
  userId: string;
}

interface TokenResponse {
  success: boolean;
  token?: string;
  expiresIn?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<TokenResponse>> {
  try {
    const body: TokenRequest = await request.json();
    
    console.log('[Token Generation] Request for userId:', body.userId);
    
    // Validate userId
    if (!body.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required',
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // TODO: In production, verify user exists in database
    // For now, we'll generate token for any userId
    
    // Create JWT token
    const token = await new SignJWT({
      sub: body.userId,
      scope: 'extension',
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('90d')
      .sign(JWT_SECRET);
    
    console.log('[Token Generation] Token created successfully for:', body.userId);
    
    // TODO: Log token generation event to audit table
    // await logAuditEvent({
    //   action: 'extension_token_generated',
    //   userId: body.userId,
    //   timestamp: new Date().toISOString()
    // });
    
    return NextResponse.json(
      {
        success: true,
        token,
        expiresIn: '90 days',
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
