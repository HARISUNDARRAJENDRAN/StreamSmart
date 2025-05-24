import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MailIcon, LinkedinIcon, ZapIcon } from 'lucide-react'; // Added ZapIcon for logo

export const metadata: Metadata = {
  title: 'StreamSmart - AI-Powered YouTube Learning',
  description: 'Transform your YouTube viewing into a structured and effective learning experience with AI-driven playlists, mind maps, and quizzes.',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2">
            <ZapIcon className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">StreamSmart</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/about" passHref>
              <Button variant="ghost">About</Button>
            </Link>
            <Link href="#features" passHref>
              <Button variant="ghost">Features</Button>
            </Link>
            <Link href="/demo" passHref>
              <Button variant="ghost">Demo</Button>
            </Link>
            <Link href="/login" passHref>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Login / Sign Up</Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer id="contact" className="border-t bg-card text-card-foreground">
        <div className="container mx-auto py-8 px-4 md:px-6 text-center">
          <h3 className="text-2xl font-semibold mb-4 text-primary">Get in Touch</h3>
          <p className="text-muted-foreground mb-6">
            Have questions or want to connect? Reach out!
          </p>
          <div className="flex justify-center items-center space-x-6 mb-6">
            <a
              href="mailto:hsundar080506@gmail.com"
              className="flex items-center text-foreground hover:text-primary transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MailIcon className="mr-2 h-5 w-5" />
              hsundar080506@gmail.com
            </a>
            <a
              href="https://www.linkedin.com/in/hari-sundar-237570286/"
              className="flex items-center text-foreground hover:text-primary transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkedinIcon className="mr-2 h-5 w-5" />
              LinkedIn Profile
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} StreamSmart. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
