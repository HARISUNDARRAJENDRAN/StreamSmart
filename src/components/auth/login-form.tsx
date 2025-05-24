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

export function LoginForm() {
  const router = useRouter();
  const { login, isAuthenticated } = useUser();
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
      // Simulate authentication - in a real app, this would call your backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create user data from email/password login
      const userData = {
        id: `user_${Date.now()}`,
        name: email.split('@')[0], // Use email username as name
        email: email,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`,
      };

      login(userData);
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in to StreamSmart.",
      });
      
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    try {
      // Simulate Google OAuth - in a real app, this would use Firebase Auth
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock Google user data
      const userData = {
        id: `google_${Date.now()}`,
        name: 'Google User',
        email: 'user@gmail.com',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GoogleUser',
      };

      login(userData);
      
      toast({
        title: "Welcome!",
        description: "Successfully signed in with Google.",
      });
      
      router.push('/dashboard');
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
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Demo user data
      const userData = {
        id: 'demo_user',
        name: 'Demo User',
        email: 'demo@streamsmart.com',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoUser',
      };

      login(userData);
      
      toast({
        title: "Demo Mode",
        description: "Welcome to StreamSmart! You're using demo mode.",
      });
      
      router.push('/dashboard');
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
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
          {isLoading ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <ChromeIcon className="mr-2 h-5 w-5" /> }
          {isLoading ? 'Processing...' : 'Sign in with Google'}
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Try demo
            </span>
          </div>
        </div>
        
        <Button variant="secondary" className="w-full" onClick={handleDemoLogin} disabled={isLoading}>
          {isLoading ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : '🚀'}
          {isLoading ? 'Loading Demo...' : 'Try Demo Mode'}
        </Button>
      </CardContent>
      <CardFooter className="text-center text-sm">
        <p className="text-muted-foreground">
          Don't have an account?{' '}
          <a href="#" className="font-medium text-primary hover:underline">
            Sign up
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
