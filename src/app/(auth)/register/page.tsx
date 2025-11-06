'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/CognitoAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  
  const router = useRouter();
  const { signUp, confirmSignUp, resendCode } = useAuth();

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(email, password, name);
      
      if (result.needsConfirmation) {
        setNeedsVerification(true);
      } else {
        router.push('/ai-feed');
      }
    } catch (err: any) {
      if (err.message?.includes('UsernameExistsException')) {
        setError('An account with this email already exists');
      } else if (err.message?.includes('InvalidPasswordException')) {
        setError('Password does not meet requirements');
      } else {
        setError(err.message || 'Failed to create account');
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
      await confirmSignUp(email, verificationCode);
      router.push('/login');
    } catch (err: any) {
      if (err.message?.includes('CodeMismatchException')) {
        setError('Invalid verification code');
      } else if (err.message?.includes('ExpiredCodeException')) {
        setError('Code expired. Please request a new one.');
      } else {
        setError(err.message || 'Failed to verify email');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setIsResending(true);

    try {
      await resendCode(email);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen bg-white grid lg:grid-cols-2 lg:overflow-hidden">
      {/* Left Side - Immersive Visual */}
      <div className="hidden lg:block relative h-full w-full">
        <img 
          src="/register.png" 
          alt="Register" 
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Right Side - Form */}
      <div className="flex h-full flex-col justify-center px-6 py-12 lg:px-24">
        <Link 
          href="/landing" 
          className="inline-flex items-center gap-2 text-sm font-medium text-black/70 hover:text-black mb-12 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="space-y-8 w-full">
          <div>
            <h1 className="text-4xl font-bold text-black mb-3">
              {needsVerification ? 'Verify Your Email' : 'Create Account'}
            </h1>
            <p className="text-lg text-black/60">
              {needsVerification 
                ? `We sent a code to ${email}`
                : 'Start your learning journey with StreamSmart'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {needsVerification ? (
            <form onSubmit={handleVerification} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-semibold text-black">
                  Verification Code
                </label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  maxLength={6}
                  className="h-12 rounded-xl border-black/10 focus-visible:ring-black text-center text-lg tracking-widest"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-black text-white hover:bg-black/90 font-semibold"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Email
              </Button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending}
                className="w-full text-sm font-medium text-black/60 hover:text-black transition-colors"
              >
                {isResending ? 'Resending...' : 'Resend code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-semibold text-black">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="h-12 rounded-xl border-black/10 focus-visible:ring-black"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-black">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 rounded-xl border-black/10 focus-visible:ring-black"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-black">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-12 rounded-xl border-black/10 focus-visible:ring-black"
                />
                {password && (
                  <div className="mt-3 space-y-2">
                    {passwordRequirements.map((req, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className={`h-4 w-4 rounded-full flex items-center justify-center ${req.met ? 'bg-green-500' : 'bg-black/10'}`}>
                          {req.met && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={req.met ? 'text-green-700' : 'text-black/50'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-semibold text-black">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-12 rounded-xl border-black/10 focus-visible:ring-black"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-black text-white hover:bg-black/90 font-semibold"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>

              <p className="text-sm text-center text-black/60">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-black hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 