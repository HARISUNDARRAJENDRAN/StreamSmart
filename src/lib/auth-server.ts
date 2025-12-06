import { NextRequest } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-2';
const USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

if (!USER_POOL_ID || !CLIENT_ID) {
  console.warn('Cognito environment variables are missing. Server-side auth verification will fail.');
}

const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

export interface AuthTokenPayload {
  sub: string;
  email?: string;
  username?: string;
  'cognito:username'?: string;
  [key: string]: any;
}

export async function verifyAuth(request: NextRequest): Promise<AuthTokenPayload | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: CLIENT_ID, // Verify the token is intended for this client
    });

    return payload as AuthTokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Helper to extract the user ID from the verified token.
 * Prefers 'sub' which is the unique persistent ID in Cognito.
 */
export function getUserIdFromToken(payload: AuthTokenPayload): string {
  return payload.sub;
}


