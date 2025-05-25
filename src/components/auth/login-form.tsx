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
    <Card className="w-full max-w-md shadow-2xl bg-card">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-primary">StreamSmart</CardTitle>
        <CardDescription>Sign in to your personalized learning hub</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <MailIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <KeyRoundIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
            {isLoading ? <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Signing In...</> : 'Sign In'}
          </Button>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={handleGoogleSignIn} disabled={isLoading}>
            <ChromeIcon className="mr-2 h-4 w-4" />
            Google
          </Button>
          <Button variant="outline" onClick={handleDemoLogin} disabled={isLoading}>
            Demo
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
