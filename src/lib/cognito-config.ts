'use client';

import { Amplify } from 'aws-amplify';

const cognitoConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
      signUpVerificationMethod: 'code' as const,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [
            'http://localhost:3000/dashboard',
            'https://streamsmart.vercel.app/dashboard'
          ],
          redirectSignOut: [
            'http://localhost:3000',
            'https://streamsmart.vercel.app'
          ],
          responseType: 'code' as const
        }
      }
    }
  }
};

// Only configure Amplify on the client side
if (typeof window !== 'undefined') {
  try {
    Amplify.configure(cognitoConfig, { ssr: true });
  } catch (error) {
    console.error('Amplify configuration error:', error);
  }
}

export default cognitoConfig;
