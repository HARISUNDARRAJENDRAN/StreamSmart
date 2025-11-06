'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { AnimatedTestimonials } from '@/components/ui/animated-testimonials';
import { LayeredText } from '@/components/ui/layered-text';
import { DottedSurface } from '@/components/ui/dotted-surface';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronRight,
  Check,
  Mail,
  Sparkles,
  ChevronDown,
  Twitter,
  Linkedin,
  Github,
  Layers,
  Brain,
  GraduationCap,
  Headphones,
  BarChart3,
  Link2,
  Youtube,
  Instagram,
  MessageCircle
} from 'lucide-react';

const LandingPage = () => {
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    // Force animations to restart by incrementing key when component mounts
    setAnimationKey(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F5] overflow-x-hidden w-full">
      <Navbar />
      <HeroSection />
      <FounderNoteSection />
      <BenefitsSection key={`benefits-${animationKey}`} />
      <FeaturesSection key={`features-${animationKey}`} />
      <ProcessSection key={`process-${animationKey}`} />
      <ReviewsSection />
      <PricingSection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default LandingPage;

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/40 backdrop-blur-xl border-b border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl md:text-2xl font-bold text-black">StreamSmart</span>
            </Link>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8 lg:gap-12">
              <Link href="#benefits" className="text-sm lg:text-base font-semibold text-black/80 hover:text-black transition-colors">
                Benefits
              </Link>
              <Link href="#features" className="text-sm lg:text-base font-semibold text-black/80 hover:text-black transition-colors">
                Features
              </Link>
              <Link href="#process" className="text-sm lg:text-base font-semibold text-black/80 hover:text-black transition-colors">
                How it flows
              </Link>
              <Link href="#pricing" className="text-sm lg:text-base font-semibold text-black/80 hover:text-black transition-colors">
                Pricing
              </Link>
            </div>
            
            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-sm lg:text-base font-semibold text-black hover:bg-black/5">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-black text-white hover:bg-black/90 text-sm lg:text-base font-semibold">
                  Register
                </Button>
              </Link>
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-black/5 transition-colors touch-target"
            >
              <span className={`bg-black block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${isMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-0.5'}`} />
              <span className={`bg-black block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm my-0.5 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`bg-black block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${isMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-0.5'}`} />
            </button>
          </div>
        </div>
      </nav>
      
      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} />
          <nav className="fixed right-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl p-6 overflow-y-auto">
            <div className="flex flex-col gap-6">
              <div className="flex justify-end">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-10 h-10 rounded-lg hover:bg-black/5 flex items-center justify-center"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                <Link href="#benefits" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-black/80 hover:text-black transition-colors py-2">
                  Benefits
                </Link>
                <Link href="#features" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-black/80 hover:text-black transition-colors py-2">
                  Features
                </Link>
                <Link href="#process" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-black/80 hover:text-black transition-colors py-2">
                  How it flows
                </Link>
                <Link href="#pricing" onClick={() => setIsMenuOpen(false)} className="text-lg font-semibold text-black/80 hover:text-black transition-colors py-2">
                  Pricing
                </Link>
              </div>
              
              <div className="flex flex-col gap-3 pt-4 border-t">
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full text-base font-semibold">
                    Login
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-black text-white hover:bg-black/90 text-base font-semibold">
                    Register
                  </Button>
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
};

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#F5F5F5] pt-20 md:pt-24">
    <DottedSurface className="absolute inset-0" />
    
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        aria-hidden="true"
        className={cn(
          'absolute -top-10 left-1/2 size-full -translate-x-1/2 rounded-full',
          'bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.05),transparent_50%)]',
          'blur-[40px]',
        )}
      />
    </div>
    
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-[360px] py-12 sm:py-16 md:py-[80px] pb-16 sm:pb-20 md:pb-[100px] relative z-10">
      <div className="max-w-[995px] mx-auto flex flex-col items-center gap-6 md:gap-8 mt-3">
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-[40px] sm:text-[60px] md:text-[80px] lg:text-[100px] font-bold leading-[48px] sm:leading-[72px] md:leading-[96px] lg:leading-[120px] tracking-[-2px] sm:tracking-[-4px] md:tracking-[-6px] text-black text-center md:whitespace-nowrap mt-3">
              Youtube. Smarter.
            </h1>
          </div>
        </div>

        <div className="max-w-[580px] w-full px-4 sm:px-6 md:px-0">
          <p className="text-center text-black/80 text-[14px] sm:text-[16px] md:text-[18px] leading-[20px] sm:leading-[24px] md:leading-[28px] font-medium">
            Transform every YouTube session into a guided, AI-driven learning experience that adapts to your pace.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 flex-wrap w-full px-4 sm:px-0">
          <Link href="/register" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-[12px] bg-black text-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] sm:shadow-[0_2.289px_4.119px_-2.5px_rgba(61,61,61,0.64),0_10px_18px_-3.75px_rgba(61,61,61,0.25)] hover:bg-black/90 transition-all hover:scale-105 touch-target">
              <span className="text-[14px] sm:text-[15px] font-semibold">Start Learning Free</span>
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-[12px] bg-white/60 backdrop-blur-sm border-black/10 text-black shadow-[0_2px_4px_rgba(0,0,0,0.08)] sm:shadow-[0_0.707px_0.707px_-0.583px_rgba(158,158,158,0.69)] hover:bg-white/80 transition-all hover:scale-105 touch-target">
            <span className="text-[14px] sm:text-[15px] font-semibold">Explore Features</span>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

const FounderNoteSection = () => (
  <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-[#F5F5F5]">
    <div className="mx-auto max-w-[980px] px-4 sm:px-6 lg:px-8 xl:px-0">
      <div className="flex flex-col items-center gap-6 sm:gap-9 text-center">
        <p className="text-[16px] sm:text-[20px] md:text-[24px] lg:text-[28px] leading-[24px] sm:leading-[30px] md:leading-[36px] lg:leading-[42px] font-medium text-black/65">
          “We created <span className="font-semibold text-black">StreamSmart</span> after building learning sprints from scattered YouTube queues.
          Today, our AI <span className="font-semibold text-black">curates the right playlist, coaches through every transcript</span>, and closes the loop with actionable analytics.
          Your team focuses on mastery while we orchestrate the flow end to end.”
        </p>

        <div className="flex flex-col items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-black/5 blur-[18px]" aria-hidden />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-white text-sm font-semibold tracking-wide shadow-[0_12px_26px_-16px_rgba(15,23,42,0.35)]">
              HS
            </div>
          </div>
          <span className="text-sm font-semibold text-black">Harisundar Rajendran</span>
          <span className="text-xs text-black/60">Founder, StreamSmart</span>
        </div>
      </div>
    </div>
  </section>
);

const BenefitsSection = () => {
  const benefits = [
    {
      title: 'Smart Playlist Curation',
      description: 'AI-powered video recommendations tailored to your learning goals and pace',
      videoSrc: '/vid1.mp4'
    },
    {
      title: 'AI Learning Assistant',
      description: 'Get instant answers and insights from video transcripts while you watch',
      videoSrc: '/vid2.mp4'
    },
    {
      title: 'Track Your Progress',
      description: 'Monitor learning streaks, achievements, and stay motivated with real-time analytics',
      videoSrc: '/vid3.mp4'
    }
  ];

  const tags = [
    'AI-Powered Learning',
    'Smart Playlists',
    'Real-Time Insights',
    'Progress Tracking',
    'Interactive Transcripts',
    'Personalized Learning',
    'Achievement System',
    'Learning Analytics'
  ];

  return (
    <section id="benefits" className="py-12 sm:py-16 md:py-20 lg:py-[110px] bg-[#F5F5F5]">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 sm:gap-10 md:gap-14 px-4 sm:px-6 lg:px-8 xl:px-0">
        <div className="flex flex-col items-center gap-4 sm:gap-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white to-white/95 px-3 sm:px-4 py-2 sm:py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-105">
            <Sparkles className="h-3 sm:h-4 w-3 sm:w-4 text-black" />
            <span className="text-[10px] sm:text-xs font-semibold tracking-[0.18em] text-black uppercase">Why StreamSmart</span>
          </div>
          <h2 className="text-[28px] sm:text-[38px] md:text-[48px] lg:text-[58px] font-semibold leading-[32px] sm:leading-[42px] md:leading-[54px] lg:leading-[64px] tracking-[-0.04em] text-black px-4">Benefits your learners feel on day one</h2>
          <p className="max-w-[620px] text-sm sm:text-base text-black/80 px-4">We designed every workflow to make learning feel cinematic—so teams stay motivated and leaders see measurable progress.</p>
        </div>

        <div className="mx-auto w-full max-w-[1320px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className="group relative flex w-full flex-col gap-4 sm:gap-5 rounded-[20px] sm:rounded-[32px] border border-black/5 bg-white p-4 sm:p-6 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.15)] sm:shadow-[0_32px_60px_-38px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.2)] sm:hover:shadow-[0_40px_80px_-40px_rgba(0,0,0,0.3)] overflow-hidden"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="relative overflow-hidden rounded-[16px] sm:rounded-[24px] border border-black/5 aspect-video sm:h-[340px]">
                <video
                  src={benefit.videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.45)_100%)]" />
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-[18px] sm:text-[20px] md:text-[24px] font-semibold leading-[24px] sm:leading-[26px] md:leading-[30px] text-black">{benefit.title}</h3>
                <p className="text-[13px] sm:text-[14px] md:text-[15px] text-black/70 leading-[20px] sm:leading-[21px] md:leading-[22px]">{benefit.description}</p>
              </div>

              <div className="pointer-events-none absolute inset-x-6 bottom-6 h-[1px] bg-gradient-to-r from-transparent via-black/15 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
            </div>
          ))}
        </div>

        <div className="relative w-full overflow-hidden mt-8">
          <div className="flex animate-scroll-left">
            {[...tags, ...tags].map((tag, index) => (
              <div
                key={`${tag}-${index}`}
                className="inline-flex items-center justify-center w-[218px] h-[50px] rounded-full bg-white px-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:-translate-y-1 flex-shrink-0 mx-2"
              >
                <span className="text-sm font-medium text-black/80 whitespace-nowrap">{tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }
        .animate-scroll-left:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

type FeatureItem = {
  title: string;
  description: string;
  label: string;
  points: string[];
  icon: LucideIcon;
};

const FeaturesSection = () => {
  const features: FeatureItem[] = [
    {
      title: "AI Playlist Generator",
      description: "Tell StreamSmart what you want to learn and it lines up the right videos in seconds.",
      label: "Plan",
      points: [
        "Picks the best videos instantly",
        "Orders lessons from beginner to expert",
        "Keeps updating as you improve"
      ],
      icon: Layers
    },
    {
      title: "Mind Maps & Notes",
      description: "See every video broken into a simple map with the moments that matter most.",
      label: "Understand",
      points: [
        "Glanceable visual guides",
        "Highlights the exact time to revisit",
        "Share notes with friends or teammates"
      ],
  icon: Brain
    },
    {
      title: "Adaptive Quiz Engine",
      description: "Check your understanding with quick quizzes that match what you just watched.",
      label: "Practice",
      points: [
        "Questions get smarter as you do",
        "Instant feedback and tips",
        "Download results for later"
      ],
      icon: GraduationCap
    },
    {
      title: "RAG Tutor & Voice",
      description: "Ask questions by voice or chat and get clear answers without pausing your flow.",
      label: "Support",
      points: [
        "Chat or talk to a friendly tutor",
        "Answers pulled from videos you watched",
        "Helpful follow-up suggestions"
      ],
      icon: Headphones
    },
    {
      title: "Progress Intelligence",
      description: "Track your learning streaks, wins, and goals in one simple dashboard.",
      label: "Track",
      points: [
        "See progress for you or your group",
        "Earn badges and streak reminders",
        "Weekly updates to your inbox"
      ],
      icon: BarChart3
    },
    {
      title: "One-Tap Summaries",
      description: "Turn any lesson into a quick recap so you remember the big ideas fast.",
      label: "Recap",
      points: [
        "Instant bullet summaries for every video",
        "Save highlights to revisit later",
        "Share takeaways with your study group",
        "Works right inside the StreamSmart extension"
      ],
      icon: Link2
    }
  ];

  const featureStats = [
    { value: "10k+", label: "Videos indexed" },
    { value: "94%", label: "Quiz completion" },
    { value: "<30s", label: "Answer latency" }
  ];

  return (
    <section id="features" className="py-12 sm:py-16 md:py-20 lg:py-[110px] bg-[#F5F5F5]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 sm:gap-10 md:gap-14 px-4 sm:px-6 lg:px-8 xl:px-0">
        <div className="flex flex-col items-center gap-4 sm:gap-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white to-white/95 px-3 sm:px-4 py-2 sm:py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-105">
            <Brain className="h-3 sm:h-4 w-3 sm:w-4 text-black" />
            <span className="text-[10px] sm:text-xs font-semibold tracking-[0.18em] text-black uppercase">Features</span>
          </div>
          <h2 className="text-[28px] sm:text-[38px] md:text-[48px] lg:text-[58px] font-semibold leading-[32px] sm:leading-[42px] md:leading-[54px] lg:leading-[64px] tracking-[-0.04em] text-black px-4">A Full Learning Studio In One Workspace</h2>
          <p className="max-w-[620px] text-sm sm:text-base text-black/80 px-4">Every tool—curation, comprehension, coaching, and analytics—works together so learners stay in flow while leaders stay informed.</p>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_1.5fr]">
          <div className="relative flex h-full flex-col gap-6 sm:gap-8 md:gap-10 overflow-hidden rounded-[20px] sm:rounded-[28px] md:rounded-[36px] bg-black p-6 sm:p-8 md:p-10 text-white shadow-[0_32px_50px_-30px_rgba(0,0,0,0.5)] sm:shadow-[0_45px_70px_-40px_rgba(0,0,0,0.65)]">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.95)_100%)]" aria-hidden />

            <div className="relative z-20 flex flex-col gap-3 sm:gap-4">
              <span className="w-fit rounded-full bg-white/10 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Unified stack</span>
              <h3 className="text-[22px] sm:text-[26px] md:text-[30px] lg:text-[34px] font-semibold leading-[28px] sm:leading-[32px] md:leading-[36px] lg:leading-[40px] tracking-[-0.04em]">StreamSmart connects the entire learning lifecycle.</h3>
              <p className="text-xs sm:text-sm text-white/80">Blend YouTube, LMS archives, and live coaching into one guided journey. StreamSmart orchestrates content, context, and coaching without breaking the learner experience.</p>
            </div>

            <div className="relative z-20 flex justify-center">
              <div className="w-full aspect-[4/5] sm:h-[300px] md:h-[360px] sm:max-w-[380px] overflow-hidden rounded-[20px] sm:rounded-[30px] shadow-[0_40px_65px_-38px_rgba(0,0,0,0.65)]">
                <video
                  src="/vid4.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <div className="relative z-20 grid w-full gap-4 sm:grid-cols-3">
              {featureStats.map((stat, index) => (
                <div
                  key={index}
                  className="group flex flex-col items-center justify-center gap-2 overflow-hidden rounded-[18px] border border-white/10 bg-white/8 px-5 py-6 text-center animate-rise-fade"
                  style={{ animationDelay: `${index * 140}ms` }}
                >
                  <span className="block text-[28px] font-semibold leading-8 text-white transition-transform duration-500 group-hover:scale-105">
                    {stat.value}
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-white/60">{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute -right-14 bottom-10 h-32 w-32 rounded-full bg-white/5 blur-xl" aria-hidden />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative flex h-full flex-col gap-5 rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_24px_40px_-28px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_60px_-30px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-black via-black/85 to-black/40 text-white shadow-[0_25px_45px_-22px_rgba(0,0,0,0.45)]">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-[#F0F0F3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/60">{feature.label}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="text-[20px] font-semibold leading-[26px] tracking-[-0.02em] text-black">{feature.title}</h3>
                  <p className="text-sm text-black/70">{feature.description}</p>
                </div>
                <ul className="flex flex-col gap-2">
                  {feature.points.map((point, pointIndex) => (
                    <li key={pointIndex} className="flex items-start gap-2 text-sm text-black/70">
                      <Check className="mt-[2px] h-4 w-4 text-black/70" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

const ProcessSection = () => {
  const steps = [
    {
      number: "01",
      title: "Kick off with a quick vibe check",
      description: "Drop your goals, time, and current level. StreamSmart turns that into a learning mood board instantly.",
      highlights: ["Pick topics and target skills", "Set a weekly pace that sticks", "Upload CSVs or playlists you love"],
      mediaLabel: "Mood board placeholder"
    },
    {
      number: "02",
      title: "Watch the learning canvas come alive",
      description: "Playlists, mind maps, and mini-quizzes snap into place so you can binge with a purpose.",
      highlights: ["Streamlined playlists ready to play", "Mind maps that reveal the storyline", "Quick checks to lock in what you learn"],
      mediaLabel: "Canvas preview placeholder"
    },
    {
      number: "03",
      title: "Stay in flow, celebrate the streaks",
      description: "Progress dashboards glow, the AI tutor answers anything, and streaks keep the momentum.",
      highlights: ["Daily nudges and streak boosts", "Chat for timestamped answers", "Shareable wins for your crew"],
      mediaLabel: "Progress pulse placeholder"
    }
  ];

  return (
    <section id="process" className="py-12 sm:py-16 md:py-20 lg:py-[120px] bg-[#F5F5F5]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 xl:px-0">
        <div className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] md:rounded-[40px] lg:rounded-[48px] bg-gradient-to-br from-black via-black/95 to-black/70 px-4 sm:px-6 md:px-8 lg:px-16 py-10 sm:py-12 md:py-14 lg:py-16 text-white shadow-[0_32px_80px_-40px_rgba(0,0,0,0.5)] sm:shadow-[0_50px_120px_-60px_rgba(0,0,0,0.7)]">
          <div className="pointer-events-none absolute -top-40 -right-32 h-[420px] w-[420px] rounded-full bg-white/5 blur-[140px]" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 left-10 h-[320px] w-[320px] rounded-full bg-white/5 blur-[160px]" aria-hidden />

          <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white/20 to-white/10 px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.24em] text-white shadow-[0_2px_8px_rgba(255,255,255,0.08)] hover:shadow-[0_4px_12px_rgba(255,255,255,0.12)] transition-all duration-200 hover:scale-105 backdrop-blur-sm">
              <Layers className="h-3 sm:h-4 w-3 sm:w-4" />
              <span>How it flows</span>
            </div>
            <h2 className="text-[28px] sm:text-[36px] md:text-[44px] lg:text-[54px] font-semibold leading-[32px] sm:leading-[40px] md:leading-[50px] lg:leading-[60px] tracking-[-0.04em] px-4">A cinematic learning loop in three scenes</h2>
            <p className="max-w-[640px] text-sm sm:text-base text-white/70 px-4">We blend motion, goals, and feedback so each step feels like a creative sprint—not another study chore.</p>
          </div>

          <div className="relative z-10 mt-8 sm:mt-10 md:mt-12 lg:mt-14 grid gap-4 sm:gap-6 md:gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="group relative flex flex-col gap-4 sm:gap-6 rounded-[20px] sm:rounded-[24px] md:rounded-[32px] border border-white/10 bg-white/10 p-4 sm:p-5 md:p-6 backdrop-blur-lg transition-transform duration-500 hover:-translate-y-1 sm:hover:-translate-y-2 hover:bg-white/20"
              >
                <div className="relative flex h-[180px] sm:h-[200px] md:h-[220px] items-center justify-center overflow-hidden rounded-[16px] sm:rounded-[20px] md:rounded-[24px] border border-white/20 bg-white/5">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.65)_100%)]" />
                  <span className="absolute left-3 sm:left-4 md:left-5 top-3 sm:top-4 md:top-5 inline-flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-full bg-white/15 text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-white">
                    {step.number}
                  </span>
                  <span className="relative z-10 rounded-full bg-white/10 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium uppercase tracking-[0.18em] text-white/80">
                    {step.mediaLabel}
                  </span>
                </div>

                <div className="flex flex-col gap-2 sm:gap-3">
                  <h3 className="text-[18px] sm:text-[20px] md:text-[22px] font-semibold leading-6 sm:leading-7 text-white">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-white/70">{step.description}</p>
                </div>

                <ul className="flex flex-col gap-2 text-sm text-white/70">
                  {step.highlights.map((highlight, highlightIndex) => (
                    <li key={highlightIndex} className="flex items-start gap-2">
                      <Check className="mt-[2px] h-4 w-4 text-white/70" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>

                <div className="pointer-events-none absolute inset-x-6 bottom-6 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ReviewsSection = () => {
  const testimonials = [
    {
      name: "Brendan H.",
      designation: "Head of Learning · StratIQ",
      quote: "Mind maps and quizzes keep our team accountable between coaching sessions. StreamSmart finally made YouTube binge-watching productive."
    },
    {
      name: "Lena M.",
      designation: "Curriculum Lead · NovaTech",
      quote: "Playlist intelligence plus transcript search means we can launch a new micro-course in hours instead of weeks."
    },
    {
      name: "Eli R.",
      designation: "Product Manager · GridFrame",
      quote: "The RAG chatbot is the study buddy we wanted. It surfaces the exact timestamp and answer from complex videos every time."
    },
    {
      name: "Priya D.",
      designation: "Enablement Lead · VertexAI",
      quote: "We turned scattered watchlists into guided journeys. Learners stick around because the experience feels handcrafted for them."
    }
  ];

  return (
    <section id="reviews" className="py-12 sm:py-16 md:py-20 lg:py-[120px] bg-[#F5F5F5]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 xl:px-0">
        <div className="flex flex-col items-center gap-4 sm:gap-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white to-white/95 px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.24em] text-black shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-105">
            <Sparkles className="h-3 sm:h-4 w-3 sm:w-4 text-black" />
            <span>Social Proof</span>
          </div>
          <h2 className="text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] font-semibold leading-[32px] sm:leading-[40px] md:leading-[50px] lg:leading-[58px] tracking-[-0.04em] text-black px-4">Learners who stream with intent</h2>
          <p className="max-w-[620px] text-sm sm:text-base text-black/70 px-4">From enablement teams to solo creators, StreamSmart turns passive viewing into a creative learning loop that people actually finish.</p>
        </div>

        <div className="mt-12">
          <AnimatedTestimonials
            testimonials={testimonials}
            variant="light"
            autoplay
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
};

const ComparisonSection = () => {
  const streamSmartFeatures = [
  "AI-generated learning playlists",
  "Gemini-powered mind maps",
  "Transcript-aware RAG chatbot",
  "Progress and streak analytics",
  "Achievement badges and goals",
  "Adaptive quizzes and assessments",
  "Voice chat for hands-free study",
  "Real-time feedback and support"
  ];
  const othersFeatures = [
    "Manual video sorting",
    "No structured knowledge capture",
    "Guesswork-based comprehension",
    "Limited tracking of progress",
    "No personalized feedback",
    "Separate tools for transcripts",
    "Difficult to stay accountable"
  ];

  return (
    <section className="py-[100px] bg-[#F5F5F5]">
      <div className="container mx-auto px-6 md:px-[360px]">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-11">
          <div className="max-w-[700px] mx-auto flex flex-col items-center gap-[15px]">
            <div className="inline-flex h-8 items-center gap-2 rounded-full bg-[#F5F5F5] px-3 shadow-[0_0.707px_0.707px_-0.542px_rgba(0,0,0,0.10),0_1.807px_1.807px_-1.083px_rgba(0,0,0,0.09),0_3.622px_3.622px_-1.625px_rgba(0,0,0,0.09),0_6.866px_6.866px_-2.167px_rgba(0,0,0,0.09),0_13.647px_13.647px_-2.708px_rgba(0,0,0,0.08),0_30px_30px_-3.25px_rgba(0,0,0,0.05),inset_0_3px_1px_0_#FFF]">
              <span className="text-[12px] font-medium leading-[14.4px] text-black">COMPARISON</span>
            </div>
            <h2 className="text-[52px] font-medium leading-[67.2px] tracking-[-0.56px] text-center bg-gradient-to-b from-black to-white bg-clip-text text-transparent">StreamSmart vs Watching Alone</h2>
            <p className="text-base text-black text-center max-w-[500px]">Understand the upgrade from casual viewing to a structured learning platform.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-[760px] mx-auto">
            <div className="flex flex-col gap-6 p-6 rounded-[16px] bg-[#F5F5F5] shadow-[0_0.707px_0.707px_-0.667px_rgba(0,0,0,0.08),0_1.807px_1.807px_-1.333px_rgba(0,0,0,0.08),0_3.622px_3.622px_-2px_rgba(0,0,0,0.07),0_6.866px_6.866px_-2.667px_rgba(0,0,0,0.07),0_13.647px_13.647px_-3.333px_rgba(0,0,0,0.05),0_30px_30px_-4px_rgba(0,0,0,0.02),inset_0_3px_1px_0_#FFF]">
              <h3 className="text-4xl font-medium text-black text-center">StreamSmart</h3>
              <div className="h-[2px] bg-black/40 opacity-40 rounded-lg" />
              <ul className="flex flex-col gap-4">
                {streamSmartFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-black opacity-80">
                    <Check className="w-4 h-4 shrink-0 mt-1 opacity-50" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full px-6 py-3 rounded-[10px] bg-black text-white shadow-[0_2.289px_4.119px_-2.5px_rgba(61,61,61,0.64),0_10px_18px_-3.75px_rgba(61,61,61,0.25),0_0.707px_0.707px_-0.583px_rgba(0,0,0,0.35),0_1.807px_1.807px_-1.167px_rgba(0,0,0,0.34),0_3.622px_3.622px_-1.75px_rgba(0,0,0,0.33),0_6.866px_6.866px_-2.333px_rgba(0,0,0,0.30),0_13.647px_13.647px_-2.917px_rgba(0,0,0,0.26),0_30px_30px_-3.5px_rgba(0,0,0,0.15)] hover:bg-black/90">
                  <span className="text-sm font-medium">Start Learning</span>
                </Button>
              </Link>
            </div>

            <div className="flex flex-col gap-6 p-6 rounded-[16px] bg-[#F5F5F5] shadow-[0_0.707px_0.707px_-0.667px_rgba(0,0,0,0.08),0_1.807px_1.807px_-1.333px_rgba(0,0,0,0.08),0_3.622px_3.622px_-2px_rgba(0,0,0,0.07),0_6.866px_6.866px_-2.667px_rgba(0,0,0,0.07),0_13.647px_13.647px_-3.333px_rgba(0,0,0,0.05),0_30px_30px_-4px_rgba(0,0,0,0.02),inset_0_3px_1px_0_#FFF]">
              <h3 className="text-[33px] font-medium text-black text-center">Traditional Viewing</h3>
              <div className="h-[2px] bg-black/40 opacity-40 rounded-lg" />
              <ul className="flex flex-col gap-4">
                {othersFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-black opacity-80">
                    <Check className="w-4 h-4 shrink-0 mt-1 opacity-50" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TeamSection = () => {
  const team = [
    { name: "Hari Sundar Rajendran", role: "Product & Platform" },
    { name: "Aditi Rao", role: "Applied AI" },
    { name: "Marco Chen", role: "Learning Experience" }
  ];

  return (
    <section className="py-[100px] bg-[#F5F5F5]">
      <div className="container mx-auto px-6 md:px-[360px]">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-11">
          <div className="max-w-[700px] mx-auto flex flex-col items-center gap-[15px]">
            <div className="inline-flex h-8 items-center gap-2 rounded-full bg-[#F5F5F5] px-3 shadow-[0_0.707px_0.707px_-0.542px_rgba(0,0,0,0.10),0_1.807px_1.807px_-1.083px_rgba(0,0,0,0.09),0_3.622px_3.622px_-1.625px_rgba(0,0,0,0.09),0_6.866px_6.866px_-2.167px_rgba(0,0,0,0.09),0_13.647px_13.647px_-2.708px_rgba(0,0,0,0.08),0_30px_30px_-3.25px_rgba(0,0,0,0.05),inset_0_3px_1px_0_#FFF]">
              <span className="text-[11px] font-medium leading-[14.4px] text-black">TEAM</span>
            </div>
            <h2 className="text-[52px] font-medium leading-[67.2px] tracking-[-0.56px] text-center bg-gradient-to-b from-black to-white bg-clip-text text-transparent">Guides Behind StreamSmart</h2>
            <p className="text-base text-black text-center max-w-[500px] opacity-80">We blend product, AI research, and instructional design to keep learners motivated.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {team.map((member, index) => (
              <div key={index} className="flex flex-col gap-6 p-8 rounded-[16px] bg-[#F5F5F5] shadow-[0_0.707px_0.707px_-0.667px_rgba(0,0,0,0.08),0_1.807px_1.807px_-1.333px_rgba(0,0,0,0.08),0_3.622px_3.622px_-2px_rgba(0,0,0,0.07),0_6.866px_6.866px_-2.667px_rgba(0,0,0,0.07),0_13.647px_13.647px_-3.333px_rgba(0,0,0,0.05),0_30px_30px_-4px_rgba(0,0,0,0.02),inset_0_3px_1px_0_#FFF]">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center gap-[7px]">
                    <h3 className="text-[19px] font-medium leading-6 tracking-[-0.2px] text-black">{member.name}</h3>
                    <span className="text-sm text-black opacity-80">{member.role}</span>
                  </div>
                  <div className="flex gap-2.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 rounded-lg bg-[#F5F5F5] shadow-[0_0.707px_0.707px_-0.667px_rgba(0,0,0,0.08),0_1.807px_1.807px_-1.333px_rgba(0,0,0,0.08),0_3.622px_3.622px_-2px_rgba(0,0,0,0.07),0_6.866px_6.866px_-2.667px_rgba(0,0,0,0.07),0_13.647px_13.647px_-3.333px_rgba(0,0,0,0.05),0_30px_30px_-4px_rgba(0,0,0,0.02),inset_0_3px_1px_0_#FFF]">
                        <div className="w-4 h-4" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h-[280px] rounded-lg bg-white/0 shadow-[0_0.707px_0.707px_-0.667px_rgba(0,0,0,0.08),0_1.807px_1.807px_-1.333px_rgba(0,0,0,0.08),0_3.622px_3.622px_-2px_rgba(0,0,0,0.07),0_6.866px_6.866px_-2.667px_rgba(0,0,0,0.07),0_13.647px_13.647px_-3.333px_rgba(0,0,0,0.05),0_30px_30px_-4px_rgba(0,0,0,0.02)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ProjectsSection = () => {
  const stats = [
    { value: "38%", label: "Time saved preparing playlists" },
  { value: "96%", label: "Learners rating sessions >=4/5" }
  ];

  return (
    <section className="py-[100px] bg-[#F5F5F5]">
      <div className="container mx-auto px-6 md:px-[360px]">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-11">
          <div className="max-w-[700px] mx-auto flex flex-col items-center gap-[15px]">
            <div className="inline-flex h-8 items-center gap-2 rounded-full bg-[#F5F5F5] px-3 shadow-[0_0.707px_0.707px_-0.542px_rgba(0,0,0,0.10),0_1.807px_1.807px_-1.083px_rgba(0,0,0,0.09),0_3.622px_3.622px_-1.625px_rgba(0,0,0,0.09),0_6.866px_6.866px_-2.167px_rgba(0,0,0,0.09),0_13.647px_13.647px_-2.708px_rgba(0,0,0,0.08),0_30px_30px_-3.25px_rgba(0,0,0,0.05),inset_0_3px_1px_0_#FFF]">
              <span className="text-[11px] font-medium leading-[14.4px] text-black">OUTCOMES</span>
            </div>
            <h2 className="text-[53px] font-medium leading-[67.2px] tracking-[-0.56px] text-center bg-gradient-to-b from-black to-white bg-clip-text text-transparent">Proven Learning Impact</h2>
            <p className="text-base text-black text-center max-w-[500px] opacity-80">See how StreamSmart unlocks measurable results for cohorts, creators, and enterprises.</p>
          </div>

          <div className="flex flex-col gap-5 p-5 rounded-[20px] bg-[#F5F5F5] shadow-[0_0.707px_0.707px_-0.667px_rgba(0,0,0,0.08),0_1.807px_1.807px_-1.333px_rgba(0,0,0,0.08),0_3.622px_3.622px_-2px_rgba(0,0,0,0.07),0_6.866px_6.866px_-2.667px_rgba(0,0,0,0.07),0_13.647px_13.647px_-3.333px_rgba(0,0,0,0.05),0_30px_30px_-4px_rgba(0,0,0,0.02),inset_0_3px_1px_0_#FFF]">
            <div className="flex gap-4 flex-wrap">
              {["Upskill Sprint", "NovaLearn Bootcamp", "Creator Studio"].map((project, index) => (
                <div key={index} className={`flex-1 min-w-[200px] py-3 px-3 rounded-lg text-center ${index === 1 ? 'bg-[#F5F5F5] shadow-[0_0.707px_0.707px_-0.667px_rgba(0,0,0,0.08),0_1.807px_1.807px_-1.333px_rgba(0,0,0,0.08),0_3.622px_3.622px_-2px_rgba(0,0,0,0.07),0_6.866px_6.866px_-2.667px_rgba(0,0,0,0.07),0_13.647px_13.647px_-3.333px_rgba(0,0,0,0.05),0_30px_30px_-4px_rgba(0,0,0,0.02),inset_0_3px_1px_0_#FFF]' : 'bg-[#F5F5F5] opacity-50 shadow-[0_0.707px_0.707px_-0.667px_rgba(0,0,0,0.08),0_1.807px_1.807px_-1.333px_rgba(0,0,0,0.08),0_3.622px_3.622px_-2px_rgba(0,0,0,0.07),0_6.866px_6.866px_-2.667px_rgba(0,0,0,0.07),0_13.647px_13.647px_-3.333px_rgba(0,0,0,0.05),0_30px_30px_-4px_rgba(0,0,0,0.02),inset_0_3px_1px_0_#FFF]'}`}>
                  <span className="text-[11px] font-medium leading-[14.4px] text-black">{project}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-[14px]">
              <div className="flex-1 p-3 rounded-[16px] bg-white/0 shadow-[0_0.707px_0.707px_-0.667px_rgba(0,0,0,0.08),0_1.807px_1.807px_-1.333px_rgba(0,0,0,0.08),0_3.622px_3.622px_-2px_rgba(0,0,0,0.07),0_6.866px_6.866px_-2.667px_rgba(0,0,0,0.07),0_13.647px_13.647px_-3.333px_rgba(0,0,0,0.05),0_30px_30px_-4px_rgba(0,0,0,0.02)]">
                <div className="h-[448px] rounded-[16px] bg-gradient-to-br from-gray-200 to-gray-300" />
              </div>

              <div className="flex-1 flex flex-col gap-2.5 p-2.5">
                <div className="flex flex-col gap-2.5">
                  <span className="text-sm font-medium text-black">02</span>
                  <h3 className="text-[19px] font-medium leading-6 tracking-[-0.2px] text-black">NovaLearn — AI-Curated Data Science Bootcamp</h3>
                  <p className="text-base text-black opacity-80">Replaced manual curation with auto-generated playlists, quizzes, and mind maps for weekly cohorts.</p>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="flex flex-col items-center gap-2 p-5 rounded-xl bg-[#F5F5F5] shadow-[0_0.707px_0.707px_-0.667px_rgba(0,0,0,0.08),0_1.807px_1.807px_-1.333px_rgba(0,0,0,0.08),0_3.622px_3.622px_-2px_rgba(0,0,0,0.07),0_6.866px_6.866px_-2.667px_rgba(0,0,0,0.07),0_13.647px_13.647px_-3.333px_rgba(0,0,0,0.05),0_30px_30px_-4px_rgba(0,0,0,0.02),inset_0_3px_1px_0_#FFF]">
                      <div className="flex items-center gap-1">
                        <span className="text-[28px] font-normal leading-7 text-black">{stat.value.split('%')[0]}</span>
                        <span className="text-2xl font-medium leading-9 text-black">%</span>
                      </div>
                      <span className="text-base text-black text-center opacity-80">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const PricingSection = () => {
  type BillingCycle = 'monthly' | 'quarterly' | 'annually';
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  type Plan = {
    name: string;
    highlight: string;
    pricing: Record<BillingCycle, string>;
    description: string;
    features: string[];
    popular?: boolean;
    isFree?: boolean;
  };

  const plans: Plan[] = [
                        {
                          name: "Free",
                          highlight: "Perfect for sampling core workflows.",
                          pricing: {
                            monthly: "$0",
                            quarterly: "$0",
                            annually: "$0"
                          },
                          description: "Try StreamSmart without limits on time. Great for solo learners who want to explore the basics.",
                          features: [
                            "3 playlists total",
                            "15 videos per playlist",
                            "5 AI quizzes per month",
                            "3 mind maps per month",
                            "25 RAG queries per month"
                          ],
                          isFree: true
                        },
                        {
                          name: "Learner",
                          highlight: "Most popular for dedicated learners.",
                          pricing: {
                            monthly: "$4.99",
                            quarterly: "$13.99",
                            annually: "$49"
                          },
                          description: "Unlock unlimited curation plus boosted AI support to stay on track every sprint.",
                          features: [
                            "Unlimited playlists & videos",
                            "50 AI quizzes per month",
                            "15 mind maps per month",
                            "150 RAG queries per month",
                            "50 min voice chat per month"
                          ],
                          popular: true
                        },
                        {
                          name: "Pro",
                          highlight: "Best for teams and creators scaling impact.",
                          pricing: {
                            monthly: "$12.99",
                            quarterly: "$36.99",
                            annually: "$129"
                          },
                          description: "Everything in Learner with deeper AI limits, API hooks, and multi-video context for advanced use cases.",
                          features: [
                            "Everything in Learner",
                            "Unlimited AI quizzes & mind maps",
                            "500 RAG queries per month",
                            "200 min voice chat per month",
                            "API access",
                            "Multi-video context"
                          ]
                        }
                      ];

                      const parsePrice = (value: string) => parseFloat(value.replace('$', '')) || 0;

                      const getSavingsAmount = (plan: Plan, cycle: BillingCycle) => {
                        if (plan.isFree) return 0;
                        const monthly = parsePrice(plan.pricing.monthly);

                        if (cycle === 'quarterly') {
                          const quarterly = parsePrice(plan.pricing.quarterly);
                          return Math.max(0, monthly * 3 - quarterly);
                        }

                        if (cycle === 'annually') {
                          const annually = parsePrice(plan.pricing.annually);
                          return Math.max(0, monthly * 12 - annually);
                        }

                        return 0;
                      };

                      const getSavingsLabel = (plan: Plan, cycle: BillingCycle) => {
                        const savings = getSavingsAmount(plan, cycle);
                        if (savings <= 0.01) return null;
                        return `Save $${savings.toFixed(2)}`;
                      };

                      const savingsByCycle = {
                        quarterly: plans.reduce((acc, plan) => Math.max(acc, getSavingsAmount(plan, 'quarterly')), 0),
                        annually: plans.reduce((acc, plan) => Math.max(acc, getSavingsAmount(plan, 'annually')), 0)
                      };

                      const billingOptions: { value: BillingCycle; label: string; badge?: string; subtext: string }[] = [
                        { value: 'monthly', label: 'Monthly', subtext: 'Cancel anytime. Billed each month.' },
                        { value: 'quarterly', label: 'Quarterly', badge: savingsByCycle.quarterly > 0 ? `Save up to $${savingsByCycle.quarterly.toFixed(2)}` : undefined, subtext: 'Billed every 3 months for a lower effective rate.' },
                        { value: 'annually', label: 'Annually', badge: savingsByCycle.annually > 0 ? `Save up to $${savingsByCycle.annually.toFixed(2)}` : undefined, subtext: 'Best value with one yearly payment.' }
                      ];

                      const getPeriodLabel = (cycle: BillingCycle) => {
                        switch (cycle) {
                          case 'monthly':
                            return '/month';
                          case 'quarterly':
                            return '/quarter';
                          case 'annually':
                            return '/year';
                        }
                      };

                      const getBillingNote = (plan: Plan, cycle: BillingCycle) => {
                        if (plan.isFree) {
                          return 'No card required · Keep learning for free';
                        }

                        if (cycle === 'monthly') {
                          return 'Billed monthly · Cancel anytime';
                        }

                        if (cycle === 'quarterly') {
                          const savings = getSavingsLabel(plan, 'quarterly');
                          return savings ? `Billed ${plan.pricing.quarterly} every 3 months · ${savings}` : `Billed ${plan.pricing.quarterly} every 3 months`;
                        }

                        const savings = getSavingsLabel(plan, 'annually');
                        return savings ? `Billed ${plan.pricing.annually} per year · ${savings}` : `Billed ${plan.pricing.annually} per year`;
                      };

  const activeBillingOption = billingOptions.find((option) => option.value === billingCycle);

  return (
    <section id="pricing" className="py-16 sm:py-20 md:py-[120px] bg-[#F5F5F5]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 md:gap-12 px-4 sm:px-6 lg:px-8 xl:px-0">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white to-white/95 px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] sm:tracking-[0.24em] text-black shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-105">
            <BarChart3 className="h-3 sm:h-4 w-3 sm:w-4 text-black" />
            <span>Pricing</span>
          </div>
          <div className="flex flex-col items-center gap-2 px-4 sm:px-0">
            <h2 className="text-[28px] sm:text-[38px] md:text-[54px] font-semibold leading-[32px] sm:leading-[44px] md:leading-[64px] tracking-[-0.04em] text-black">Flexible Plans For Every Learner</h2>
            <p className="max-w-[520px] text-sm sm:text-base text-black/75">Start free, upgrade as you grow, and only pay when you are ready for unlimited AI momentum.</p>
          </div>

          <div className="relative inline-flex flex-col sm:flex-row items-center gap-1 rounded-full bg-white/70 p-1 shadow-[0_22px_55px_-30px_rgba(0,0,0,0.35)] backdrop-blur">
            {billingOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setBillingCycle(option.value)}
                className={`relative flex items-center gap-2 rounded-full px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm transition-all ${
                  billingCycle === option.value
                    ? 'bg-black text-white shadow-[0_12px_24px_-16px_rgba(0,0,0,0.55)]'
                    : 'text-black/60 hover:text-black'
                }`}
              >
                <span>{option.label}</span>
                {option.badge && billingCycle === option.value && (
                  <span className="hidden sm:inline-block rounded-full bg-white/10 px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">
                    {option.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeBillingOption && (
            <p className="text-xs sm:text-sm text-black/60 px-4 sm:px-0">{activeBillingOption.subtext}</p>
          )}
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {plans.map((plan) => {
            const savingsLabel = getSavingsLabel(plan, billingCycle);
            const billingNote = getBillingNote(plan, billingCycle);

            return (
              <div
                key={plan.name}
                className={`relative flex h-full flex-col gap-6 rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_32px_60px_-38px_rgba(0,0,0,0.28)] transition-transform duration-300 hover:-translate-y-1.5 ${
                  plan.popular ? 'ring-2 ring-black/15' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute inset-x-8 -top-1 h-[3px] rounded-full bg-gradient-to-r from-black via-black/70 to-black" aria-hidden />
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold tracking-[0.14em] text-black/50 uppercase">{plan.name}</span>
                    {plan.popular && (
                      <span className="rounded-full bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">Popular</span>
                    )}
                  </div>
                  <p className="text-sm text-black/60">{plan.highlight}</p>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[46px] font-semibold leading-[52px] tracking-[-0.04em] text-black">{plan.pricing[billingCycle]}</span>
                    <span className="text-sm text-black/60">{getPeriodLabel(billingCycle)}</span>
                  </div>
                  {savingsLabel && (
                    <span className="text-sm font-medium text-emerald-600">{savingsLabel}</span>
                  )}
                  <span className="text-xs uppercase tracking-[0.18em] text-black/50">{billingNote}</span>
                </div>

                <p className="text-sm text-black/70">{plan.description}</p>

                <div className="h-[1px] rounded-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />

                <ul className="flex flex-col gap-3 text-sm text-black/70">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-[2px] h-4 w-4 text-black/50" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/register" className="mt-auto">
                  <Button
                    className={`w-full rounded-[12px] px-6 py-3 text-sm font-medium ${
                      plan.popular
                        ? 'bg-black text-white shadow-[0_18px_32px_-20px_rgba(0,0,0,0.55)] hover:bg-black/90'
                        : plan.isFree
                          ? 'bg-[#F5F5F5] text-black shadow-[0_8px_24px_-18px_rgba(0,0,0,0.45)] hover:bg-[#F5F5F5]/90'
                          : 'bg-white text-black shadow-[0_12px_30px_-18px_rgba(0,0,0,0.45)] hover:bg-white/90'
                    }`}
                  >
                    {plan.isFree ? 'Get Started' : 'Start Learning'}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-black/70 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.25)]">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>We reinvest 2% of every plan into new AI study resources.</span>
        </div>
      </div>
    </section>
  );
};

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How does StreamSmart work?',
      answer: 'StreamSmart uses AI to curate personalized video playlists based on your learning goals. Our AI assistant analyzes video transcripts to provide instant answers and insights while you watch.'
    },
    {
      question: 'Can I use my own videos?',
      answer: 'Yes! StreamSmart supports YouTube videos, private archives, and CSV uploads. You can blend multiple sources into a single cohesive learning experience.'
    },
    {
      question: 'What makes StreamSmart different from other learning platforms?',
      answer: 'StreamSmart combines AI-powered curation, real-time transcript analysis, and gamification to create an engaging learning experience. Our platform adapts to your pace and provides instant coaching support.'
    },
    {
      question: 'Do I need a credit card for the free plan?',
      answer: 'No credit card required! Our free plan lets you explore StreamSmart\'s core features and get a feel for AI-powered learning before upgrading.'
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Absolutely! You can cancel your subscription at any time from your account settings. You\'ll continue to have access until the end of your billing period.'
    },
    {
      question: 'How accurate is the AI learning assistant?',
      answer: 'Our AI assistant uses advanced language models and transcript analysis to provide highly accurate, citation-rich answers. All responses include timestamps for easy verification.'
    }
  ];

  return (
    <section id="faq" className="py-[110px] bg-[#F5F5F5]">
      <div className="mx-auto max-w-[900px] px-6">
        <div className="flex flex-col items-center gap-5 text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white to-white/95 px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200 hover:scale-105">
            <MessageCircle className="h-4 w-4 text-black" />
            <span className="text-xs font-semibold tracking-[0.18em] text-black uppercase">FAQ</span>
          </div>
          <h2 className="text-[58px] font-semibold leading-[64px] tracking-[-0.04em] text-black">Frequently Asked Questions</h2>
          <p className="max-w-[620px] text-base text-black/80">Everything you need to know about StreamSmart and how it can transform your learning experience.</p>
        </div>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-[24px] border border-black/5 bg-white p-6 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)] transition-all duration-300 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.2)]"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <h3 className="text-[20px] font-semibold text-black">{faq.question}</h3>
                <ChevronDown
                  className={`h-5 w-5 text-black/60 transition-transform duration-300 flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ${
                  openIndex === index ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <p className="text-[15px] text-black/70 leading-[24px]">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  const footerLines = [
    { top: "\u00A0", bottom: "LEARN" },
    { top: "LEARN", bottom: "INFINITE" },
    { top: "INFINITE", bottom: "PROGRESS" },
    { top: "PROGRESS", bottom: "TRANSFORM" },
    { top: "TRANSFORM", bottom: "EXCEL" },
    { top: "EXCEL", bottom: "INSPIRE" },
    { top: "INSPIRE", bottom: "\u00A0" },
  ];

  return (
    <footer className="bg-gradient-to-b from-black via-black/95 to-black/90 text-white">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-20 items-start">
          {/* Left side - Layered Text */}
          <div className="flex items-start justify-center lg:justify-start">
            <div className="text-white">
              <LayeredText
                lines={footerLines}
                fontSize="56px"
                fontSizeMd="28px"
                lineHeight={50}
                lineHeightMd={28}
                className="py-0 !text-white"
              />
            </div>
          </div>

          {/* Right side - Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-4">PRODUCT</h4>
              <ul className="flex flex-col gap-2.5">
                <li><Link href="#benefits" className="text-[14px] text-white/70 hover:text-white transition-colors">Benefits</Link></li>
                <li><Link href="#features" className="text-[14px] text-white/70 hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="text-[14px] text-white/70 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/changelog" className="text-[14px] text-white/70 hover:text-white transition-colors">Changelog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-4">COMPANY</h4>
              <ul className="flex flex-col gap-2.5">
                <li><Link href="/about" className="text-[14px] text-white/70 hover:text-white transition-colors">About</Link></li>
                <li><Link href="/blog" className="text-[14px] text-white/70 hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/careers" className="text-[14px] text-white/70 hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/contact" className="text-[14px] text-white/70 hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-4">LEGAL</h4>
              <ul className="flex flex-col gap-2.5">
                <li><Link href="/privacy" className="text-[14px] text-white/70 hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="text-[14px] text-white/70 hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/security" className="text-[14px] text-white/70 hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-white/40">
              © 2025 StreamSmart. All rights reserved.
            </p>
            
            <div className="flex items-center gap-4">
              <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">
                <Twitter className="h-[16px] w-[16px]" />
              </Link>
              <Link href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">
                <Linkedin className="h-[16px] w-[16px]" />
              </Link>
              <Link href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">
                <Youtube className="h-[16px] w-[16px]" />
              </Link>
              <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">
                <Instagram className="h-[16px] w-[16px]" />
              </Link>
              <Link href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">
                <Github className="h-[16px] w-[16px]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
