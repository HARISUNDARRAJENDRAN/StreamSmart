import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ZapIcon, LightbulbIcon, BrainIcon, ListVideoIcon, CheckCircle2Icon, BarChart3Icon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const features = [
  {
    icon: <ListVideoIcon className="h-10 w-10 text-primary mb-4" />,
    title: 'AI-Powered Playlists',
    description: 'Describe your learning goal, and let our AI curate relevant YouTube videos into a structured playlist for you.',
    dataAiHint: 'playlist creation',
  },
  {
    icon: <BrainIcon className="h-10 w-10 text-primary mb-4" />,
    title: 'Interactive Mind Maps',
    description: 'Visualize complex topics with AI-generated mind maps that break down video content into key concepts and relationships.',
    dataAiHint: 'mind map visualization',
  },
  {
    icon: <LightbulbIcon className="h-10 w-10 text-primary mb-4" />,
    title: 'Engaging Quizzes',
    description: 'Test your understanding with AI-generated quizzes based on your playlist content, reinforcing your learning.',
    dataAiHint: 'quiz assessment',
  },
  {
    icon: <BarChart3Icon className="h-10 w-10 text-primary mb-4" />,
    title: 'Track Your Progress',
    description: 'Monitor your learning journey, see completed videos, and stay motivated with clear progress indicators.',
    dataAiHint: 'learning analytics',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-32 bg-gradient-to-br from-background via-card to-background">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <ZapIcon className="mx-auto h-16 w-16 text-primary mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Unlock Your YouTube Learning Potential with <span className="text-primary">StreamSmart</span>
          </h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-10">
            Tired of endless scrolling? StreamSmart transforms YouTube into your personalized learning powerhouse. 
            Create AI-curated playlists, visualize concepts with mind maps, and test your knowledge with dynamic quizzes.
          </p>
          <Link href="/login" passHref>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-primary/50 transition-shadow">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            Why <span className="text-primary">StreamSmart</span>?
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            StreamSmart offers a suite of intelligent tools designed to make your YouTube learning more effective, organized, and engaging.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-card shadow-xl hover:shadow-primary/30 transition-shadow duration-300 flex flex-col text-center p-6 rounded-xl">
                <CardHeader className="items-center p-0">
                  {feature.icon}
                  <CardTitle className="text-xl font-semibold mb-2">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-grow">
                  <CardDescription className="text-muted-foreground">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            Start Learning in <span className="text-primary">3 Simple Steps</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="flex flex-col items-center text-center p-6">
              <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mb-6 shadow-lg">1</div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Build Your Playlist</h3>
              <p className="text-muted-foreground">
                Manually add YouTube videos or let our AI suggest content based on your learning goals.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mb-6 shadow-lg">2</div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Learn Interactively</h3>
              <p className="text-muted-foreground">
                Engage with AI-generated mind maps, take quizzes, and chat with our AI assistant about your playlist content.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6">
              <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mb-6 shadow-lg">3</div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Track & Grow</h3>
              <p className="text-muted-foreground">
                Monitor your progress, mark videos as complete, and see your understanding deepen over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full py-20 md:py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Supercharge Your Learning?
          </h2>
          <p className="max-w-2xl mx-auto text-lg md:text-xl opacity-90 mb-10">
            Join StreamSmart today and experience a smarter, more effective way to learn from YouTube.
          </p>
          <Link href="/login" passHref>
            <Button size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90 text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-md transition-shadow">
              Sign Up Now & Learn Smarter
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
