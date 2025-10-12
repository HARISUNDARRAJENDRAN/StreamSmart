import type { Metadata } from 'next';

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

