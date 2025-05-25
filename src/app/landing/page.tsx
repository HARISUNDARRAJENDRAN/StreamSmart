'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ZapIcon, LightbulbIcon, BrainIcon, ListVideoIcon, CircleCheck, BarChart3Icon, BookOpenIcon, UsersIcon, Star, ArrowRight, PlayCircle, Sparkles, Users, Award, TrendingUp, Shield, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

const features = [
  {
    icon: <BrainIcon className="h-8 w-8 text-primary" />,
    title: 'AI-Powered Learning',
    description: 'Transform any topic into structured learning paths with AI-generated playlists, mind maps, and personalized recommendations.',
    dataAiHint: 'AI learning technology',
  },
  {
    icon: <ListVideoIcon className="h-8 w-8 text-primary" />,
    title: 'Smart Playlists',
    description: 'Automatically curate and organize YouTube videos into coherent learning sequences tailored to your goals.',
    dataAiHint: 'playlist organization',
  },
  {
    icon: <LightbulbIcon className="h-8 w-8 text-primary" />,
    title: 'Interactive Quizzes',
    description: 'Test your knowledge with AI-generated quizzes that adapt to your learning progress and reinforce key concepts.',
    dataAiHint: 'interactive assessment',
  },
  {
    icon: <BarChart3Icon className="h-8 w-8 text-primary" />,
    title: 'Progress Analytics',
    description: 'Track your learning journey with detailed analytics, completion rates, and personalized insights.',
    dataAiHint: 'learning analytics dashboard',
  },
  {
    icon: <UsersIcon className="h-8 w-8 text-primary" />,
    title: 'Community Learning',
    description: 'Connect with fellow learners, share playlists, and learn together in collaborative study groups.',
    dataAiHint: 'collaborative learning community',
  },
  {
    icon: <Shield className="h-8 w-8 text-primary" />,
    title: 'Quality Assurance',
    description: 'AI-powered content curation ensures you only learn from high-quality, verified educational content.',
    dataAiHint: 'content quality verification',
  },
];

const testimonials = [
  {
    name: "Naveen Sekhar",
    role: "CyberSecurity Student",
    content: "Fantastic work! The way you've integrated AI to turn YouTube videos into interactive lessons with mind maps and quizzes is super impressive. The platform feels fresh and genuinely useful for learners. I loved the interface it's clean and engaging and since it's still in the testing stage, it's totally understandable and expected. It's clear you've put a lot of thought and effort into this. Big kudos on building something impactful.",
    avatar: "NS"
  },
  {
    name: "Anandavalli",
    role: "MBBS UG Student",
    content: "I've increased my learning efficiency by 300%. The personalized quizzes ensure I actually retain what I watch.",
    avatar: "AV"
  },
  {
    name: "Dhanushya Sai",
    role: "Data Science Student",
    content: "Overall Impressive work!",
    avatar: "DS"
  }
];

const stats = [
  { number: "10+", label: "Active Learners", icon: Users },
  { number: "50+", label: "Videos Organized", icon: PlayCircle },
  { number: "93%", label: "User Satisfaction", icon: Star },
  { number: "5x", label: "Faster Learning", icon: TrendingUp },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

const fadeInUpVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full py-24 md:py-32 lg:py-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center text-center space-y-8">

            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeInUpVariants}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
            >
              Transform Your YouTube Learning with{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Power
              </span>
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeInUpVariants}
              transition={{ delay: 0.2 }}
              className="max-w-3xl text-xl md:text-2xl text-muted-foreground leading-relaxed"
            >
              Stop endless scrolling. Start structured learning. StreamSmart transforms YouTube into your personalized education platform with AI-generated playlists, mind maps, and intelligent progress tracking.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUpVariants}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-primary/60 transition-all duration-300 hover:scale-105 group"
                >
                  Get Started for Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 rounded-xl border-2 hover:bg-accent/10 transition-all duration-300 hover:scale-105"
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Try Demo
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUpVariants}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-1 text-sm text-muted-foreground"
            >
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="ml-2">4.65/5 from 30+ reviews</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-accent/5">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="text-center"
              >
                <div className="flex items-center justify-center mb-2">
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-foreground">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 px-4 py-2">
              Powerful Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Everything you need to{' '}
              <span className="text-primary">learn smarter</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              StreamSmart combines cutting-edge AI with intuitive design to deliver the ultimate YouTube learning experience.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="group"
              >
                <Card className="h-full p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-md bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-muted-foreground leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 md:py-28 bg-gradient-to-br from-accent/5 to-primary/5">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUpVariants}
            className="max-w-4xl mx-auto text-center"
          >
            <Badge variant="outline" className="mb-6 px-4 py-2">
              About StreamSmart
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              Empowering the next generation of{' '}
              <span className="text-primary">digital learners</span>
            </h2>
            <div className="space-y-8 text-lg text-muted-foreground leading-relaxed">
              <p>
                StreamSmart was born from a simple observation: YouTube contains the world&apos;s largest collection of educational content, but it&apos;s scattered, unorganized, and overwhelming. We knew there had to be a better way.
              </p>
              <p>
                Our mission is to transform YouTube into a structured, personalized learning platform using the power of artificial intelligence. We help learners discover, organize, and master knowledge efficiently through AI-powered playlists, interactive mind maps, and intelligent progress tracking.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="text-center">
                  <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">Our Mission</h3>
                  <p className="text-sm">Making quality education accessible and organized for everyone, everywhere.</p>
                </div>
                <div className="text-center">
                  <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">Our Community</h3>
                  <p className="text-sm">A passionate group of educators, technologists, and lifelong learners.</p>
                </div>
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">Our Impact</h3>
                  <p className="text-sm">Helping thousands of learners achieve their educational goals faster.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 px-4 py-2">
              What our users say
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Loved by learners{' '}
              <span className="text-primary">worldwide</span>
            </h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                variants={itemVariants}
                className="group"
              >
                <Card className="p-6 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="space-y-4">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground italic">&quot;{testimonial.content}&quot;</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUpVariants}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 px-4 py-2">
              How it works
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Start learning in{' '}
              <span className="text-primary">3 simple steps</span>
            </h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12"
          >
            {[
              {
                step: "1",
                icon: <ListVideoIcon className="h-12 w-12 text-primary" />,
                title: "Create Your Playlist",
                description: "Add YouTube videos manually or let our AI suggest the perfect content based on your learning goals and interests."
              },
              {
                step: "2",
                icon: <BrainIcon className="h-12 w-12 text-primary" />,
                title: "Learn Interactively",
                description: "Engage with AI-generated mind maps, take personalized quizzes, and chat with our AI tutor about your content."
              },
              {
                step: "3",
                icon: <BarChart3Icon className="h-12 w-12 text-primary" />,
                title: "Track & Master",
                description: "Monitor your progress with detailed analytics, celebrate milestones, and watch your understanding grow over time."
              }
            ].map((step, index) => (
              <motion.div
                key={step.title}
                variants={itemVariants}
                className="relative text-center p-8 group"
              >
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                  {step.step}
                </div>
                <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 mt-6">
                  <div className="bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 md:py-32 bg-gradient-to-r from-primary to-accent text-primary-foreground relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUpVariants}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Ready to revolutionize your learning?
            </h2>
            <p className="text-xl md:text-2xl opacity-90 mb-10 leading-relaxed">
              Join 50,000+ learners who have already transformed their YouTube experience. Start building your personalized learning journey today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
                >
                  Start Learning for Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <Clock className="mr-2 h-5 w-5" />
                  Try Demo Mode
                </Button>
              </Link>
            </div>
            <p className="text-sm opacity-75 mt-6">
              ✅ Free forever plan available • ✅ 50+ AI-generated playlists • ✅ Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}