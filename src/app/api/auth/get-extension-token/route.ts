/**
 * Get or Generate Extension Token Endpoint
 * Returns existing token if valid, or generates a new one
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// In-memory token storage (in production, use DynamoDB or Redis)
const tokenStore = new Map<string, { token: string; createdAt: number; expiresAt: number }>();

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user already has a valid token
    const existingTokenData = tokenStore.get(userId);
    
    if (existingTokenData) {
      const now = Date.now();
      
      // If token is still valid (not expired), return it
      if (existingTokenData.expiresAt > now) {
        try {
          // Verify the token is still valid
          await jwtVerify(existingTokenData.token, JWT_SECRET);
          
          return NextResponse.json({
            success: true,
            token: existingTokenData.token,
            expiresAt: existingTokenData.expiresAt,
            isNew: false
          });
        } catch (error) {
          // Token invalid, generate new one
          console.log('[GetExtensionToken] Existing token invalid, generating new one');
        }
      }
    }

    // Generate new token
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 90 * 24 * 60 * 60; // 90 days in seconds
    const expiresAt = now + expiresIn;

    const token = await new SignJWT({ sub: userId, scope: 'extension' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(expiresAt)
      .sign(JWT_SECRET);

    // Store token
    tokenStore.set(userId, {
      token,
      createdAt: now * 1000,
      expiresAt: expiresAt * 1000
    });

    console.log(`[GetExtensionToken] Generated new token for user: ${userId}`);

    return NextResponse.json({
      success: true,
      token,
      expiresAt: expiresAt * 1000,
      isNew: true
    });

  } catch (error) {
    console.error('[GetExtensionToken] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get extension token' },
      { status: 500 }
    );
  }
}
