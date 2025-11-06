'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/CognitoAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const inputStyles =
  'bg-white/80 border border-black/10 text-black placeholder:text-black/45 backdrop-blur-sm focus-visible:ring-black/20 focus-visible:border-black transition-colors';

export function CognitoLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  
  const router = useRouter();
  const { signIn, resetPassword, confirmResetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push('/ai-feed');
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.message?.includes('UserNotConfirmedException')) {
        setError('Please verify your email before signing in. Check your inbox for the verification code.');
      } else if (err.message?.includes('NotAuthorizedException')) {
        setError('Invalid email or password');
      } else if (err.message?.includes('UserNotFoundException')) {
        setError('No account found with this email address');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (resetStep === 'request') {
        await resetPassword(resetEmail || email);
        setResetStep('confirm');
        setError('');
        alert('Password reset code sent to your email');
      } else {
        await confirmResetPassword(resetEmail || email, resetCode, newPassword);
        setShowResetPassword(false);
        setResetStep('request');
        setResetCode('');
        setNewPassword('');
        setError('');
        alert('Password reset successful! Please sign in with your new password.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (showResetPassword) {
    return (
  <Card className="w-full max-w-md border border-black/10 bg-white/80 shadow-[0_35px_90px_-55px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <CardHeader className="space-y-2 text-left">
          <CardTitle className="text-3xl font-semibold text-black">Reset password</CardTitle>
          <CardDescription className="text-sm text-black/60">
            {resetStep === 'request' 
              ? 'Enter your email to receive a password reset code'
              : 'Enter the code sent to your email and your new password'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleResetPassword}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {resetStep === 'request' ? (
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-medium text-black/70">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your@email.com"
                  value={resetEmail || email}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className={inputStyles}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reset-code" className="text-sm font-medium text-black/70">Verification code</Label>
                  <Input
                    id="reset-code"
                    type="text"
                    placeholder="Enter code from email"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                    className={inputStyles}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium text-black/70">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className={inputStyles}
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              type="submit" 
              className="w-full bg-black text-white hover:bg-black/90"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {resetStep === 'request' ? 'Send Reset Code' : 'Reset Password'}
            </Button>
            <Button 
              type="button"
              variant="ghost"
              className="w-full text-black hover:bg-black/5"
              onClick={() => {
                setShowResetPassword(false);
                setResetStep('request');
                setResetCode('');
                setNewPassword('');
                setError('');
              }}
            >
              Back to Sign In
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
  <Card className="w-full max-w-md border border-black/10 bg-white/80 shadow-[0_35px_90px_-55px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <CardHeader className="space-y-3 text-left">
        <CardTitle className="text-3xl font-semibold text-black">Sign in</CardTitle>
        <CardDescription className="text-sm text-black/65">
          Enter your email and password to access your StreamSmart workspace.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-black/70">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputStyles}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-black/70">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={inputStyles}
            />
          </div>
          
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto font-normal text-sm text-black hover:text-black/70"
            onClick={() => setShowResetPassword(true)}
          >
            Forgot your password?
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full bg-black text-white hover:bg-black/90"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
          <p className="text-sm text-center text-black/60">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-black hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
