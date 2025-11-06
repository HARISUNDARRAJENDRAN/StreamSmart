'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/CognitoAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
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
      if (err.message?.includes('UserNotConfirmedException')) {
        setError('Please verify your email before signing in.');
      } else if (err.message?.includes('NotAuthorizedException')) {
        setError('Invalid email or password');
      } else if (err.message?.includes('UserNotFoundException')) {
        setError('No account found with this email');
      } else {
        setError(err.message || 'Failed to sign in');
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
        await resetPassword(email);
        setResetStep('confirm');
        setError('');
      } else {
        await confirmResetPassword(email, resetCode, newPassword);
        setShowResetPassword(false);
        setResetStep('request');
        setResetCode('');
        setNewPassword('');
        setError('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Left Side - Image Panel (Desktop Only) */}
      <div className="hidden lg:block lg:w-1/2 relative h-full">
        <img 
          src="/login.jpeg" 
          alt="Login" 
          className="h-full w-full object-cover"
        />
      </div>

      {/* Right Side - Form (Centered on Mobile) */}
      <div className="flex w-full lg:w-1/2 min-h-screen lg:h-full items-center justify-center px-6 sm:px-8 py-12 sm:py-16 lg:px-16">
        <div className="w-full max-w-md">
          <Link 
            href="/landing" 
            className="inline-flex items-center gap-2 text-sm font-medium text-black/60 hover:text-black mb-8 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to home
          </Link>

          <div className="space-y-6 w-full">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-3xl lg:text-4xl font-bold text-black mb-2 tracking-tight">
              {showResetPassword ? 'Reset Password' : 'Welcome back'}
            </h1>
            <p className="text-base sm:text-base lg:text-lg text-black/60">
              {showResetPassword 
                ? resetStep === 'request'
                  ? 'Enter your email to receive a reset code'
                  : 'Enter the code and your new password'
                : 'Sign in to continue your learning journey'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showResetPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {resetStep === 'request' ? (
                <div className="space-y-1.5">
                  <label htmlFor="reset-email" className="text-sm font-semibold text-black block">
                    Email
                  </label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 sm:h-13 rounded-lg border-black/20 focus-visible:ring-2 focus-visible:ring-black bg-white shadow-sm text-base"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="reset-code" className="text-sm font-semibold text-black block">
                      Verification Code
                    </label>
                    <Input
                      id="reset-code"
                      type="text"
                      placeholder="Enter code from email"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                      className="h-12 sm:h-13 rounded-lg border-black/20 focus-visible:ring-2 focus-visible:ring-black bg-white shadow-sm text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="new-password" className="text-sm font-semibold text-black block">
                      New Password
                    </label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="h-12 sm:h-13 rounded-lg border-black/20 focus-visible:ring-2 focus-visible:ring-black bg-white shadow-sm text-base"
                    />
                  </div>
                </>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 sm:h-13 rounded-lg bg-black text-white hover:bg-black/90 font-semibold text-base shadow-md hover:shadow-lg transition-all mt-6"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {resetStep === 'request' ? 'Send Reset Code' : 'Reset Password'}
              </Button>

              <Button 
                type="button"
                variant="ghost"
                className="w-full font-medium text-sm text-black/60 hover:text-black"
                onClick={() => {
                  setShowResetPassword(false);
                  setResetStep('request');
                  setError('');
                }}
              >
                Back to Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-black block">
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
                  className="h-12 sm:h-13 rounded-lg border-black/20 focus-visible:ring-2 focus-visible:ring-black bg-white shadow-sm text-base"
                />
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-semibold text-black block">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-12 sm:h-13 rounded-lg border-black/20 focus-visible:ring-2 focus-visible:ring-black bg-white shadow-sm text-base"
                />
              </div>

              <div className="flex justify-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-sm font-medium text-black/60 hover:text-black transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 sm:h-13 rounded-lg bg-black text-white hover:bg-black/90 font-semibold text-base shadow-md hover:shadow-lg transition-all"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>

              <p className="text-sm text-center text-black/60 pt-2">
                Don't have an account?{' '}
                <Link href="/register" className="font-semibold text-black hover:underline">
                  Sign up
                </Link>
              </p>
            </form>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
