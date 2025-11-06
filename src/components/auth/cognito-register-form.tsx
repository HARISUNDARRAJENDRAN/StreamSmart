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

export function CognitoRegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  
  const router = useRouter();
  const { signUp, confirmSignUp, resendCode } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(email, password, name);
      
      if (result.needsConfirmation) {
        setNeedsVerification(true);
        setVerificationEmail(email);
      } else {
        // User is signed up and signed in
        router.push('/ai-feed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      if (err.message?.includes('UsernameExistsException')) {
        setError('An account with this email already exists');
      } else if (err.message?.includes('InvalidPasswordException')) {
        setError('Password does not meet requirements');
      } else if (err.message?.includes('InvalidParameterException')) {
        setError('Invalid registration details. Please check your information.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await confirmSignUp(verificationEmail, verificationCode);
      
      // Redirect to login after successful verification
      alert('Email verified successfully! Please sign in.');
      router.push('/login');
    } catch (err: any) {
      console.error('Verification error:', err);
      
      if (err.message?.includes('CodeMismatchException')) {
        setError('Invalid verification code');
      } else if (err.message?.includes('ExpiredCodeException')) {
        setError('Verification code has expired. Please request a new one.');
      } else {
        setError(err.message || 'Failed to verify email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setIsResending(true);

    try {
      await resendCode(verificationEmail);
      alert('Verification code resent! Check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  if (needsVerification) {
    return (
      <Card className="w-full max-w-md border border-black/10 bg-white/80 shadow-[0_35px_90px_-55px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <CardHeader className="space-y-2 text-left">
          <CardTitle className="text-3xl font-semibold text-black">Verify your email</CardTitle>
          <CardDescription className="text-sm text-black/60">
            We've sent a verification code to {verificationEmail}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleVerification}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-medium text-black/70">Verification code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                maxLength={6}
                className={inputStyles}
              />
            </div>
            
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto font-normal text-sm text-black hover:text-black/70"
              onClick={handleResendCode}
              disabled={isResending}
            >
              {isResending ? 'Resending...' : 'Resend verification code'}
            </Button>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-black text-white hover:bg-black/90"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Email
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border border-black/10 bg-white/80 shadow-[0_35px_90px_-55px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <CardHeader className="space-y-3 text-left">
        <CardTitle className="text-3xl font-semibold text-black">Create an account</CardTitle>
        <CardDescription className="text-sm text-black/65">
          Sign up to launch AI-powered playlists, adaptive quizzes, and collaborative dashboards.
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
            <Label htmlFor="name" className="text-sm font-medium text-black/70">Full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className={inputStyles}
            />
          </div>
          
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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              className={inputStyles}
            />
            <p className="text-xs text-muted-foreground">
              Password must be at least 8 characters long
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-black/70">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={inputStyles}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full bg-black text-white hover:bg-black/90"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
          <p className="text-sm text-center text-black/60">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-black hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
