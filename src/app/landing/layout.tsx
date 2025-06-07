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
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
}
