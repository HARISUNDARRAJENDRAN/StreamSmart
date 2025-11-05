'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { Copy, CheckCircle, AlertCircle, Chrome } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ExtensionSettingsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [extensionConfigured, setExtensionConfigured] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  
  // Auto-redirect to playlists
  useEffect(() => {
    if (user?.id) {
      router.push('/playlists');
    }
  }, [user?.id, router]);
  
  // Auto-fetch token on mount (backup - won't show UI but ensures token is ready)
  useEffect(() => {
    if (user?.id) {
      fetchExistingToken();
    }
  }, [user?.id]);
  
  const fetchExistingToken = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/auth/get-extension-token?userId=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.token) {
        setAuthToken(data.token);
        setTokenReady(true);
        setExtensionConfigured(true);
      }
    } catch (error) {
      console.error('Failed to fetch token:', error);
    }
  };

  const copyUserId = async () => {
    if (!user?.id) return;
    
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "User ID copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const generateAuthToken = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in first",
        variant: "destructive",
      });
      return;
    }

    setGeneratingToken(true);
    
    try {
      const response = await fetch('/api/auth/generate-extension-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        setAuthToken(data.token);
        toast({
          title: "Token Generated!",
          description: "Copy and paste the token into your extension",
        });
      } else {
        throw new Error(data.error || 'Failed to generate token');
      }
    } catch (error) {
      console.error('Token generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate authentication token",
        variant: "destructive",
      });
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyAuthToken = async () => {
    if (!authToken) return;
    
    try {
      await navigator.clipboard.writeText(authToken);
      toast({
        title: "Copied!",
        description: "Authentication token copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const configureExtension = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Try to use Chrome Extension API if available
      const chromeAPI = (window as any).chrome;
      if (typeof chromeAPI !== 'undefined' && chromeAPI.runtime) {
        // Send message to extension
        chromeAPI.runtime.sendMessage(
          'YOUR_EXTENSION_ID', // This should be replaced with actual extension ID
          { type: 'SET_USER_ID', userId: user.id },
          (response: any) => {
            if (response?.success) {
              setExtensionConfigured(true);
              toast({
                title: "Success!",
                description: "Extension configured successfully",
              });
            }
          }
        );
      } else {
        // Fallback: Show manual instructions
        toast({
          title: "Manual Configuration Required",
          description: "Please follow the instructions below",
        });
      }
    } catch (error) {
      console.error('Error configuring extension:', error);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Chrome className="h-6 w-6" />
              Chrome Extension Settings
            </CardTitle>
            <CardDescription>
              Please log in to configure the Chrome extension
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <p>You must be logged in to configure the extension.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Chrome Extension Setup</h1>
        <p className="text-muted-foreground">
          Connect your Chrome extension to sync YouTube videos with your StreamSmart account
        </p>
      </div>

      {/* Success Banner - Automatic Authentication */}
      <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-lg border border-green-200">
        <CheckCircle className="h-5 w-5" />
        <div className="flex-1">
          <p className="font-semibold">Extension Automatically Configured! ✨</p>
          <p className="text-sm">Your Chrome extension is already authenticated. Just install it and start using it on YouTube!</p>
        </div>
      </div>

      {/* Quick Start Guide */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            � How to Use the Extension
          </CardTitle>
          <CardDescription>
            Follow these simple steps to start extracting YouTube transcripts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Install the Extension</p>
                <p className="text-sm text-muted-foreground">Load the extension from <code className="bg-background px-1 rounded">chrome://extensions/</code></p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Go to any YouTube Video</p>
                <p className="text-sm text-muted-foreground">Navigate to a YouTube video you want to save</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Click "Open in StreamSmart"</p>
                <p className="text-sm text-muted-foreground">The button appears below the video - click it to extract the transcript</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <p className="font-medium">Automatic Redirect to Playlists</p>
                <p className="text-sm text-muted-foreground">You'll be automatically redirected to your StreamSmart playlists!</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced: Authentication Token Card (Collapsed by default) */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            � Authentication Details (Advanced)
          </CardTitle>
          <CardDescription>
            Your extension is automatically authenticated. This section is for advanced users only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tokenReady && authToken ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-900">Token Active</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Your extension token is automatically synced. No manual configuration needed!
                  </p>
                </div>
              </div>
              
              <details className="cursor-pointer">
                <summary className="text-sm font-medium mb-2">View Token (for manual configuration)</summary>
                <div className="space-y-2 mt-2">
                  <div className="flex gap-2">
                    <code className="flex-1 bg-background px-3 py-3 rounded-md font-mono text-xs break-all border">
                      {authToken}
                    </code>
                    <Button onClick={copyAuthToken} variant="outline" size="sm" className="gap-2 shrink-0">
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-900">
                      <strong>Security Notice:</strong> This token provides access to your account. Never share it publicly. It expires in 90 days.
                    </p>
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading authentication token...</p>
          )}
        </CardContent>
      </Card>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Account Information</CardTitle>
          <CardDescription>
            This information will be used to sync videos to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <p className="text-lg font-semibold">{user.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-lg">{user.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">User ID</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 bg-muted px-3 py-2 rounded-md font-mono text-sm">
                {user.id}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyUserId}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Follow these steps to configure the extension
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Automatic Method */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">
                1
              </span>
              Automatic Setup (Recommended)
            </h3>
            <div className="ml-8 space-y-3">
              <p className="text-muted-foreground">
                Click the button below to automatically configure your extension:
              </p>
              <Button onClick={configureExtension} size="lg" className="gap-2">
                <Chrome className="h-5 w-5" />
                Configure Extension Now
              </Button>
            </div>
          </div>

          {/* Manual Method */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm">
                2
              </span>
              Manual Setup
            </h3>
            <div className="ml-8 space-y-4">
              <p className="text-muted-foreground">
                If automatic setup doesn't work, follow these manual steps:
              </p>
              
              <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                <div className="flex gap-3">
                  <span className="font-mono text-sm text-muted-foreground">1.</span>
                  <div>
                    <p>Open Chrome and go to:</p>
                    <code className="block bg-background px-3 py-2 rounded-md mt-1 text-sm">
                      chrome://extensions/
                    </code>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-mono text-sm text-muted-foreground">2.</span>
                  <p>Find the <strong>StreamSmart</strong> extension</p>
                </div>

                <div className="flex gap-3">
                  <span className="font-mono text-sm text-muted-foreground">3.</span>
                  <p>Click on <strong>"Inspect views: service worker"</strong></p>
                </div>

                <div className="flex gap-3">
                  <span className="font-mono text-sm text-muted-foreground">4.</span>
                  <div className="flex-1">
                    <p>In the console that opens, paste this command:</p>
                    <div className="bg-background p-3 rounded-md mt-2 font-mono text-sm overflow-x-auto">
                      <code>chrome.storage.sync.set({'{'} userId: '{user.id}' {'}'});</code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`chrome.storage.sync.set({ userId: '${user.id}' });`);
                        toast({
                          title: "Copied!",
                          description: "Command copied to clipboard",
                        });
                      }}
                      className="mt-2 gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Command
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-mono text-sm text-muted-foreground">5.</span>
                  <p>Press <kbd className="px-2 py-1 bg-background rounded border">Enter</kbd></p>
                </div>

                <div className="flex gap-3">
                  <span className="font-mono text-sm text-muted-foreground">6.</span>
                  <p>Done! Your extension is now linked to your account.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Test Instructions */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-3">✅ Test Your Setup</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
              <li>Go to any YouTube video</li>
              <li>Click the "Open in StreamSmart" button that appears below the video</li>
              <li>The transcript will be extracted and added to your playlists</li>
              <li>Return to <a href="/playlists" className="text-primary hover:underline">your playlists</a> to see the video</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-blue-900">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <p className="mb-2">If you're having trouble configuring the extension:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Make sure you're logged into StreamSmart</li>
            <li>Refresh the extension page after configuration</li>
            <li>Check that the extension has the necessary permissions</li>
            <li>Try reloading the extension from chrome://extensions/</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
