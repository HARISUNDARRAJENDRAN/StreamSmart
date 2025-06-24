'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ChromeIcon, KeyRoundIcon, MailIcon, Loader2Icon } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export function LoginForm() {
  const router = useRouter();
  const { loginWithAPI, isAuthenticated } = useUser();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await loginWithAPI(email, password, 'email');
      
      if (result.success) {
        toast({
          title: "Welcome back!",
          description: "Successfully signed in to StreamSmart.",
        });
        router.push('/dashboard');
      } else {
        toast({
          title: "Login Failed",
          description: result.error || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    try {
      // Simulate Google OAuth - in a real app, this would use actual Google OAuth
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await loginWithAPI(
        'user@gmail.com', 
        undefined, 
        'google',
        {
          googleId: `google_${Date.now()}`,
          name: 'Google User',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GoogleUser',
        }
      );
      
      if (result.success) {
        toast({
          title: "Welcome!",
          description: "Successfully signed in with Google.",
        });
        router.push('/dashboard');
      } else {
        toast({
          title: "Google Sign-In Failed",
          description: result.error || "Could not sign in with Google. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Google Sign-In Failed",
        description: "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    
    try {
      const result = await loginWithAPI('demo@streamsmart.com', undefined, 'demo');
      
      if (result.success) {
        toast({
          title: "Demo Mode",
          description: "Welcome to StreamSmart! You're using demo mode.",
        });
        router.push('/dashboard');
      } else {
        toast({
          title: "Demo Login Failed",
          description: result.error || "Could not start demo. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Demo Login Failed",
        description: "Could not start demo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl bg-gradient-to-br from-black to-gray-900 border-gray-800">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-white">
          Stream<span className="text-red-600">Smart</span>
        </CardTitle>
        <CardDescription className="text-gray-300">Sign in to your personalized learning hub</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <div className="relative">
              <MailIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 bg-white/10 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500"
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Password</Label>
            <div className="relative">
              <KeyRoundIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 bg-white/10 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500"
                disabled={isLoading}
              />
            </div>
          </div>
          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold" disabled={isLoading}>
            {isLoading ? <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Signing In...</> : 'Sign In'}
          </Button>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black px-2 text-gray-400">Or continue with</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={handleGoogleSignIn} disabled={isLoading} className="border-gray-600 text-gray-300 hover:bg-white/10 hover:text-white">
            <ChromeIcon className="mr-2 h-4 w-4" />
            Google
          </Button>
          <Button variant="outline" onClick={handleDemoLogin} disabled={isLoading} className="border-gray-600 text-gray-300 hover:bg-white/10 hover:text-white">
            Demo
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-center">
        <p className="text-sm text-gray-400">
          Don't have an account?{' '}
          <Link href="/register" className="font-medium text-red-400 hover:text-red-300 hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
