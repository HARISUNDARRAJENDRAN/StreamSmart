'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Download, 
  FolderArchive, 
  Chrome, 
  Settings, 
  Puzzle, 
  CheckCircle2,
  Youtube,
  PlayCircle,
  ChevronRight
} from 'lucide-react';

export default function ExtensionSetupPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="border-b border-black/10 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/landing" className="flex items-center gap-2">
              <span className="text-xl md:text-2xl font-bold text-black">StreamSmart</span>
            </Link>
            <Link href="/landing">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-black/5 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black border border-black">
              <Puzzle className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold text-white">Browser Extension</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-black tracking-tight">
              Setup StreamSmart Extension
            </h1>
            
            <p className="text-lg md:text-xl text-black/70 max-w-2xl mx-auto">
              Get the most out of YouTube with our Chrome extension. Extract transcripts, 
              analyze videos, and supercharge your learning experience.
            </p>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-12 md:py-16 border-b border-black/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="bg-gradient-to-br from-black to-black/90 rounded-3xl p-8 md:p-12 text-white shadow-2xl">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Download className="h-10 w-10 text-white" />
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Download Extension
                </h2>
                <p className="text-white/80 text-base md:text-lg mb-6">
                  Get the StreamSmart Chrome extension to start transforming your YouTube experience.
                  This is a beta version - your feedback helps us improve!
                </p>
                
                <a href="/streamsmart-extension.zip" download>
                  <Button 
                    size="lg" 
                    className="bg-white text-black hover:bg-white/90 font-semibold shadow-lg gap-2"
                  >
                    <Download className="h-5 w-5" />
                    Download Extension (ZIP)
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Installation Steps */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              Installation Guide
            </h2>
            <p className="text-lg text-black/70">
              Follow these simple steps to install the extension
            </p>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-6 md:gap-8">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">
                  1
                </div>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-3 mb-3">
                  <FolderArchive className="h-6 w-6 text-black" />
                  <h3 className="text-xl md:text-2xl font-bold text-black">
                    Unzip the Downloaded File
                  </h3>
                </div>
                <p className="text-base text-black/70 mb-4 leading-relaxed">
                  After downloading, locate the <code className="px-2 py-1 bg-black/5 rounded text-sm font-mono">streamsmart-extension.zip</code> file 
                  in your Downloads folder. Right-click on it and select "Extract All" or use your preferred unzip tool.
                </p>
                <div className="bg-black/5 border border-black/10 rounded-xl p-4">
                  <p className="text-sm text-black/80 font-medium">
                    💡 Tip: Keep the extracted folder in an easily accessible location - you'll need it for the next steps!
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 md:gap-8">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">
                  2
                </div>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-3 mb-3">
                  <Chrome className="h-6 w-6 text-black" />
                  <h3 className="text-xl md:text-2xl font-bold text-black">
                    Open Chrome Extensions
                  </h3>
                </div>
                <p className="text-base text-black/70 mb-4 leading-relaxed">
                  Launch Google Chrome and navigate to the Extensions page. You can do this by:
                </p>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-black mt-0.5 flex-shrink-0" />
                    <span className="text-black/70">Typing <code className="px-2 py-1 bg-black/5 rounded text-sm font-mono">chrome://extensions</code> in the address bar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-black mt-0.5 flex-shrink-0" />
                    <span className="text-black/70">Or clicking the three dots (⋮) → More Tools → Extensions</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 md:gap-8">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">
                  3
                </div>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-3 mb-3">
                  <Settings className="h-6 w-6 text-black" />
                  <h3 className="text-xl md:text-2xl font-bold text-black">
                    Enable Developer Mode
                  </h3>
                </div>
                <p className="text-base text-black/70 mb-4 leading-relaxed">
                  In the Extensions page, look for the "Developer mode" toggle switch in the top-right corner. 
                  Click to enable it. This allows you to install extensions from local files.
                </p>
                <div className="bg-black/5 border border-black/10 rounded-xl p-4">
                  <p className="text-sm text-black/80">
                    <span className="font-semibold">Note:</span> Developer mode is safe to enable and commonly used for testing extensions.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-6 md:gap-8">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">
                  4
                </div>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-3 mb-3">
                  <Puzzle className="h-6 w-6 text-black" />
                  <h3 className="text-xl md:text-2xl font-bold text-black">
                    Load Unpacked Extension
                  </h3>
                </div>
                <p className="text-base text-black/70 mb-4 leading-relaxed">
                  After enabling Developer mode, you'll see new buttons appear. Click on "Load unpacked" and:
                </p>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-black mt-0.5 flex-shrink-0" />
                    <span className="text-black/70">Navigate to the folder where you extracted the extension</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-black mt-0.5 flex-shrink-0" />
                    <span className="text-black/70">Select the <code className="px-2 py-1 bg-black/5 rounded text-sm font-mono">streamsmart-extension</code> folder</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-black mt-0.5 flex-shrink-0" />
                    <span className="text-black/70">Click "Select Folder" to install</span>
                  </li>
                </ul>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-900 font-medium">
                    ✅ Success! The StreamSmart extension should now appear in your extensions list.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-6 md:gap-8">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">
                  5
                </div>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-3 mb-3">
                  <Youtube className="h-6 w-6 text-black" />
                  <h3 className="text-xl md:text-2xl font-bold text-black">
                    Test on YouTube
                  </h3>
                </div>
                <p className="text-base text-black/70 mb-4 leading-relaxed">
                  Now it's time to see the magic! Open any YouTube video and:
                </p>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-black mt-0.5 flex-shrink-0" />
                    <span className="text-black/70">Look for the StreamSmart icon in your toolbar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-black mt-0.5 flex-shrink-0" />
                    <span className="text-black/70">Click the extension icon to access transcript extraction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-black mt-0.5 flex-shrink-0" />
                    <span className="text-black/70">Start learning smarter with AI-powered insights!</span>
                  </li>
                </ul>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-900">
                    <span className="font-semibold">⚠️ Important:</span> For the extension to extract transcripts, you must first enable 
                    "Show transcript" from the YouTube video description. Click the three dots (⋯) at the bottom of the 
                    description and select "Show transcript" to activate transcript support for that video.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="py-12 md:py-16 bg-black/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-black mb-3">
              Troubleshooting
            </h2>
            <p className="text-base text-black/70">
              Having issues? Here are some common solutions
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-black/10 shadow-sm">
              <h3 className="font-bold text-black mb-2">Extension Not Showing?</h3>
              <p className="text-sm text-black/70">
                Make sure Developer mode is enabled and you've selected the correct folder. 
                The folder should contain the manifest.json file.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-black/10 shadow-sm">
              <h3 className="font-bold text-black mb-2">Extension Not Working?</h3>
              <p className="text-sm text-black/70">
                Try refreshing the YouTube page after installing the extension. 
                Also ensure you're logged into your StreamSmart account.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-black/10 shadow-sm">
              <h3 className="font-bold text-black mb-2">Can't Extract Transcript?</h3>
              <p className="text-sm text-black/70 mb-3">
                Make sure the video has captions available. Look for the CC button on the video player. 
                <strong> Important:</strong> You must enable "Show transcript" from the YouTube video description at the bottom 
                (click the three dots next to "Show more") for the extension to work properly.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                <p className="text-xs text-blue-900 font-medium">
                  💡 Tip: Click the three-dot menu (⋯) at the bottom of the video description and select "Show transcript" 
                  to enable transcript extraction for that video.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-black/10 shadow-sm">
              <h3 className="font-bold text-black mb-2">Need More Help?</h3>
              <p className="text-sm text-black/70">
                Contact our support team or check the documentation in your StreamSmart dashboard 
                for more detailed guidance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
          <div className="bg-gradient-to-br from-black to-black/90 rounded-3xl p-8 md:p-12 text-white shadow-2xl">
            <PlayCircle className="h-16 w-16 mx-auto mb-6 text-white/90" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
              With the extension installed, you're all set to experience YouTube like never before. 
              Start learning smarter today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-black hover:bg-white/90 font-semibold gap-2">
                  Create Free Account
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-semibold">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 py-8 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-black/60">
            <p>© 2025 StreamSmart. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
