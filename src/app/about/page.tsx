import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <section className="w-full py-20 md:py-32 flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-center mb-6">
          Transform Your YouTube Learning with <span className="text-primary">AI</span>
        </h1>
        <p className="max-w-2xl text-center text-lg md:text-2xl text-muted-foreground mb-10">
          Tired of endless scrolling? StreamSmart transforms YouTube into your personalized learning powerhouse. Create AI-generated playlists, visualize concepts with mind maps, and test your knowledge with dynamic quizzes.
        </p>
        <Link href="/login" passHref>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-primary/60 transition-all duration-300 hover:scale-105"
          >
            Get Started for Free
          </Button>
        </Link>
      </section>
    </div>
  );
} 