'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ZapIcon, LightbulbIcon, BrainIcon, ListVideoIcon, CircleCheck, BarChart3Icon, BookOpenIcon, UsersIcon, Star, ArrowRight, PlayCircle, Sparkles, Users, Award, TrendingUp, Shield, Clock, Mail, Linkedin, ExternalLink, Target, Brain, Share2, Zap, MessageSquare, Bot, Trophy, Medal } from 'lucide-react';
import SplitText from '@/components/ui/split-text';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Particles from '@tsparticles/react';
import { Engine } from '@tsparticles/engine';
import { loadLinksPreset } from '@tsparticles/preset-links';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';

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

// About section specific animations
const aboutSectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.8,
      staggerChildren: 0.2,
    },
  },
};

const aboutItemVariants = {
  hidden: { y: 50, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const aboutColumnVariants = {
  hidden: { y: 40, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: "easeOut",
    },
  },
};

// Features section specific animations
const featuresSectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.8,
      staggerChildren: 0.15,
    },
  },
};

const featuresCardVariants = {
  hidden: { y: 60, opacity: 0, scale: 0.9 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.23, 1, 0.32, 1], // Custom easing curve for smooth animation
    },
  },
};

const featuresHeaderVariants = {
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

// How It Works section specific animations
const howItWorksSectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.8,
      staggerChildren: 0.2,
    },
  },
};

const howItWorksStepVariants = {
  hidden: { y: 80, opacity: 0, scale: 0.8 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.23, 1, 0.32, 1],
    },
  },
};

const howItWorksHeaderVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

// Contact section specific animations
const contactSectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.8,
      staggerChildren: 0.2,
    },
  },
};

const contactItemVariants = {
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

// Hero section specific animations
const heroSectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.8,
      staggerChildren: 0.15,
    },
  },
};

const heroItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

export default function LandingPage() {
  const [pushTransitionComplete, setPushTransitionComplete] = useState(false);
  const [canNavbarAppear, setCanNavbarAppear] = useState(false);
  const [showNavbar, setShowNavbar] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  // Intersection observers for different sections
  const aboutRef = useIntersectionObserver<HTMLElement>({ threshold: 0.1 });
  const featuresRef = useIntersectionObserver<HTMLElement>({ threshold: 0.1 });
  const testimonialsRef = useIntersectionObserver<HTMLElement>({ threshold: 0.1 });
  const contactRef = useIntersectionObserver<HTMLElement>({ threshold: 0.1 });
  const howItWorksRef = useIntersectionObserver<HTMLElement>({ threshold: 0.1 });

  const aboutInView = aboutRef.inView;
  const featuresInView = featuresRef.inView;
  const testimonialsInView = testimonialsRef.inView;
  const contactInView = contactRef.inView;
  const howItWorksInView = howItWorksRef.inView;

  // Simulate splash screen completion
  useEffect(() => {
    const timer = setTimeout(() => {
      setPushTransitionComplete(true);
    }, 1500); // Duration of the splash screen push up
    return () => clearTimeout(timer);
  }, []);

  // Effect to determine if the navbar *can* appear (after splash and initial delay)
  useEffect(() => {
    if (pushTransitionComplete) {
      const timer = setTimeout(() => {
        setCanNavbarAppear(true);
      }, 300); // Original delay for first appearance
      return () => clearTimeout(timer);
    } else {
      setCanNavbarAppear(false); // Reset if splash isn't complete
    }
  }, [pushTransitionComplete]);

  // Effect to handle scroll-based visibility *after* navbar is allowed to appear
  useEffect(() => {
    const handleScrollBasedNavbar = () => {
      if (!canNavbarAppear) {
        setShowNavbar(false); // Navbar stays hidden if it's not yet time for its first appearance
        return;
      }

      // Navbar is eligible to appear; now check scroll position
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > 50) { // Scrolled down a bit
        setShowNavbar(false); // Hide navbar
      } else { // At the very top (or close to it)
        setShowNavbar(true); // Show navbar
      }
    };

    handleScrollBasedNavbar(); // Call once to set initial state based on current conditions

    window.addEventListener('scroll', handleScrollBasedNavbar);
    return () => {
      window.removeEventListener('scroll', handleScrollBasedNavbar);
    };
  }, [canNavbarAppear]); // This effect depends on whether the navbar is ready for scroll-based logic

  // Side navigation scroll detection (for dots) - remains separate
  useEffect(() => {
    const handleSideNavScroll = () => {
      const sections = document.querySelectorAll('section[data-section]');
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;

      sections.forEach((section, index) => {
        const sectionTop = (section as HTMLElement).offsetTop;
        const sectionHeight = (section as HTMLElement).offsetHeight;
        
        if (scrollTop >= sectionTop - windowHeight / 2 && 
            scrollTop < sectionTop + sectionHeight - windowHeight / 2) {
          setCurrentSection(index);
        }
      });
    };

    window.addEventListener('scroll', handleSideNavScroll);
    return () => window.removeEventListener('scroll', handleSideNavScroll);
  }, []);

  // Add scroll-snap to html/body and handle splash screen
  useEffect(() => {
    document.documentElement.style.scrollSnapType = 'y mandatory';
    document.documentElement.style.scrollBehavior = 'smooth';
    document.body.style.scrollSnapType = 'y mandatory';
    document.body.style.scrollBehavior = 'smooth';
    
    // Handle splash screen animation
    const timer = setTimeout(() => {
      setPushTransitionComplete(true);
      // Show navbar after push transition
      setTimeout(() => {
        setShowNavbar(true);
      }, 800); // Delay for navbar reveal
    }, 500);
    
    return () => {
      clearTimeout(timer);
      document.documentElement.style.scrollSnapType = '';
      document.documentElement.style.scrollBehavior = '';
      document.body.style.scrollSnapType = '';
      document.body.style.scrollBehavior = '';
    };
  }, []);
  
  const sections = [
    { id: 'hero', name: 'Hero' },
    { id: 'features', name: 'Features' },
    { id: 'about', name: 'About' },
    { id: 'testimonials', name: 'Testimonials' },
    { id: 'how-it-works', name: 'How It Works' },
    { id: 'contact', name: 'Contact' }
  ];

  // Particles initialization
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadLinksPreset(engine);
  }, []);

  // Knowledge Graph particles configuration
  const particlesOptions = {
    preset: "links",
    background: {
      color: {
        value: "transparent",
      },
    },
    particles: {
      color: {
        value: ["#8B5CF6", "#A855F7", "#C084FC", "#DDD6FE"], // Purple accent variations
      },
      links: {
        color: "#8B5CF6",
        distance: 150,
        enable: true,
        opacity: 0.3,
        width: 1,
        triangles: {
          enable: false,
        },
      },
      move: {
        direction: "none" as const,
        enable: true,
        outModes: {
          default: "bounce" as const,
        },
        random: true,
        speed: 0.5,
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 2000,
        },
        value: 60,
      },
      opacity: {
        value: 0.6,
        random: true,
        animation: {
          enable: true,
          speed: 0.5,
          minimumValue: 0.3,
        },
      },
      size: {
        value: { min: 1, max: 3 },
        animation: {
          enable: true,
          speed: 2,
          minimumValue: 1,
        },
      },
    },
    detectRetina: true,
    interactivity: {
      events: {
        onHover: {
          enable: true,
          mode: "grab",
        },
        resize: {
          enable: true,
        },
      },
      modes: {
        grab: {
          distance: 200,
          links: {
            opacity: 0.8,
          },
        },
      },
    },
  };

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[data-section]');
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;

      sections.forEach((section, index) => {
        const sectionTop = (section as HTMLElement).offsetTop;
        const sectionHeight = (section as HTMLElement).offsetHeight;
        
        if (scrollTop >= sectionTop - windowHeight / 2 && 
            scrollTop < sectionTop + sectionHeight - windowHeight / 2) {
          setCurrentSection(index);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigate to section
  const navigateToSection = (sectionIndex: number) => {
    const targetSection = document.querySelector(`section[data-section="${sectionIndex}"]`) as HTMLElement;
    
    if (targetSection) {
      window.scrollTo({
        top: targetSection.offsetTop,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div 
      className="relative bg-white"
      style={{
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth'
      }}
    >
      {/* Splash Screen Overlay */}
      <motion.div
        className="fixed inset-0 z-[100]"
        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)' }}
        initial={{ y: 0 }}
        animate={{ 
          y: pushTransitionComplete ? '-100%' : 0 
        }}
        transition={{ 
          duration: 1.2, 
          ease: [0.25, 0.1, 0.25, 1],
          delay: 0.5 
        }}
      />

      {/* Top Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ 
          opacity: showNavbar ? 1 : 0,
          y: showNavbar ? 0 : -20
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="container mx-auto flex items-center justify-between">
          {/* Left side - Logo */}
          <Link href="/" className="text-white font-bold text-2xl font-poppins">
            <span style={{ color: '#D90429' }}>S</span>treamSmart
          </Link>
          
          {/* Right side - Navigation & Buttons */}
        <div className="flex items-center gap-6">
          <Link 
            href="#about" 
              className="text-white font-medium relative group transition-all duration-300 hover:text-white/90 text-sm"
          >
            About
              <span className="absolute left-0 bottom-[-2px] w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link 
            href="#features" 
              className="text-white font-medium relative group transition-all duration-300 hover:text-white/90 text-sm"
          >
            Features
              <span className="absolute left-0 bottom-[-2px] w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link 
            href="/demo" 
              className="text-white font-medium relative group transition-all duration-300 hover:text-white/90 text-sm"
          >
            Demo
              <span className="absolute left-0 bottom-[-2px] w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="/signup">
              <Button 
                variant="default"
                className="bg-[#D90429] text-white font-medium px-5 py-2 text-sm transition-all duration-300 hover:bg-[#C80021] font-poppins rounded-md"
              >
                Get Started Free
              </Button>
          </Link>
          <Link href="/login">
            <Button 
                variant="outline"
                className="text-white border-white/50 font-medium px-5 py-2 text-sm transition-all duration-300 hover:bg-white/10 hover:text-white font-poppins rounded-md"
            >
                Login
            </Button>
          </Link>
          </div>
        </div>
      </motion.nav>

      {/* Side Navigation */}
      <nav className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50 hidden lg:block">
        <div className="flex flex-col space-y-4">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => navigateToSection(index)}
              className={`group relative w-3 h-3 rounded-full transition-all duration-300 ${
                currentSection === index 
                  ? 'bg-primary scale-125' 
                  : 'bg-muted-foreground/30 hover:bg-primary/60'
              }`}
              aria-label={`Navigate to ${section.name}`}
            >
              <span className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-card border border-border rounded-md px-2 py-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                {section.name}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative">
        {/* Hero Section */}
        <section 
          id="hero"
          data-section="0"
          className="relative h-screen flex items-center justify-center overflow-hidden"
          style={{ 
            scrollSnapAlign: 'start',
          }}
        >
          {/* Dynamic Animated Background */}
          <div className="absolute inset-0 w-full h-full">
            {/* Base gradient with smooth transitions */}
            <div 
              className="absolute inset-0 w-full h-full animate-gradient-shift"
              style={{
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 25%, #2a0a0a 50%, #1a1a1a 75%, #0f0f0f 100%)',
                backgroundSize: '200% 200%'
              }}
            />
            
            {/* Radial glow effects */}
            <div 
              className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full animate-pulse-glow"
              style={{
                background: 'radial-gradient(circle, rgba(217, 4, 41, 0.15) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />
            <div 
              className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full animate-pulse-glow"
              style={{
                background: 'radial-gradient(circle, rgba(169, 29, 58, 0.12) 0%, transparent 70%)',
                filter: 'blur(35px)',
                animationDelay: '2s'
              }}
            />
            
            {/* Floating particles */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full animate-float-particles"
                style={{
                  left: `${15 + i * 12}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${6 + (i % 3)}s`
                }}
              />
            ))}
            
            {/* Seamless light streaks */}
            <div 
              className="absolute inset-0 w-full h-full opacity-40"
              style={{
                background: `
                  linear-gradient(45deg, transparent 0%, rgba(255, 255, 255, 0.03) 20%, transparent 40%),
                  linear-gradient(-45deg, transparent 60%, rgba(217, 4, 41, 0.08) 80%, transparent 100%)
                `,
                animation: 'shimmer 12s ease-in-out infinite'
              }}
            />
            
            {/* Edge vignette for depth */}
            <div 
              className="absolute inset-0 w-full h-full"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.3) 100%)'
              }}
            />
          </div>
          {/* Split Screen Content */}
          <div className="relative h-full w-full flex">
            
            {/* Left Half - Preview */}
            <motion.div 
              className="relative z-10 w-full lg:w-1/2 flex items-center justify-center px-6 lg:pl-16 xl:pl-32 py-12"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: pushTransitionComplete ? 1 : 0, x: pushTransitionComplete ? 0 : -50 }}
              transition={{ duration: 0.8, delay: 2.0, ease: "easeOut" }}
            >
              <div className="flex flex-col items-center text-center space-y-4 w-full max-w-lg">
                
                {/* StreamSmart Preview text */}
                <p 
                  className="text-base md:text-lg text-white/70 font-medium"
                          style={{
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                          }}
                        >
                  StreamSmart Preview
                </p>

                {/* Video Preview Container - Simplified */}
                <div 
                  className="relative w-full aspect-[16/10] rounded-xl overflow-hidden group"
                      style={{
                    background: '#1C1C1E',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                  {/* Simple Play button icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="w-16 h-16 text-white/40 group-hover:text-white/60 transition-colors duration-300" />
                      </div>
                  
                  {/* Corner brackets - Matched to target image */}
                  <div className="absolute top-3 left-3 w-5 h-5 border-l-2 border-t-2 border-white/20 rounded-tl-sm" />
                  <div className="absolute top-3 right-3 w-5 h-5 border-r-2 border-t-2 border-white/20 rounded-tr-sm" />
                  <div className="absolute bottom-3 left-3 w-5 h-5 border-l-2 border-b-2 border-white/20 rounded-bl-sm" />
                  <div className="absolute bottom-3 right-3 w-5 h-5 border-r-2 border-b-2 border-white/20 rounded-br-sm" />
          </div>
          </div>
            </motion.div>

            {/* Right Half - Content */}
            <motion.div 
              className="relative z-10 w-full lg:w-1/2 flex items-center justify-center px-6 lg:pr-16 xl:pr-32 py-12"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: pushTransitionComplete ? 1 : 0, x: pushTransitionComplete ? 0 : 50 }}
              transition={{ duration: 0.8, delay: 1.8, ease: "easeOut" }}
            >
              <div className="flex flex-col items-center text-center space-y-6 max-w-xl">
                
                {/* Main Heading with Split Text Animation */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: pushTransitionComplete ? 1 : 0 }}
                  transition={{ delay: 2.0, duration: 0.8 }}
                  className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight uppercase font-poppins text-white"
                  style={{
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                  }}
                >
                  <SplitText
                    text="STREAMSMART"
                    trigger={pushTransitionComplete}
                    delay={2.2}
                    duration={0.8}
                    stagger={0.08}
                    ease="power3.out"
                    from={{ opacity: 0, y: 60, rotationX: 90 }}
                    to={{ opacity: 1, y: 0, rotationX: 0 }}
                    className="inline-block"
                    onLetterAnimationComplete={() => {
                      console.log('STREAMSMART animation completed!');
                    }}
                  />
                </motion.div>

                {/* Subtitle with red underline */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: pushTransitionComplete ? 1 : 0, y: pushTransitionComplete ? 0 : 10 }}
                  transition={{ delay: 2.2, duration: 0.8, ease: "easeOut" }}
                  className="flex flex-col items-center"
                >
                  <p
                    className="text-base md:text-lg text-white/90 font-normal tracking-wide"
                    style={{
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontWeight: 400,
                    }}
                  >
                    Your Simplified <span style={{ color: '#D90429', fontWeight: 500 }}>Youtube Learning</span>
                  </p>
                  
                  {/* Seamless glowing line with center peak brightness */}
                  <div className="relative mt-1 w-48 h-[2px]">
                    {/* Base line with sharp ends */}
                    <div
                      className="w-full h-full relative"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, #A91D3A 15%, #D90429 50%, #A91D3A 85%, transparent 100%)',
                      }}
                    >
                      {/* Brightness gradient overlay - peaks at center */}
                      <div 
                        className="absolute inset-0 w-full h-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 23, 68, 0.3) 20%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 23, 68, 0.3) 80%, transparent 100%)',
                        }}
                      />
                      
                      {/* Center glow effect - seamless integration */}
                      <div 
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-glow"
                        style={{
                          width: '20px',
                          height: '6px',
                          background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.9) 0%, rgba(255, 23, 68, 0.6) 40%, transparent 70%)',
                          filter: 'blur(0.5px)',
                        }}
                      />
                      
                      {/* Shimmer effect */}
                      <div 
                        className="absolute inset-0 w-full h-full opacity-60 animate-shimmer"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, transparent 40%, rgba(255, 255, 255, 0.6) 50%, transparent 60%, transparent 100%)',
                        }}
                      />
                    </div>
                    
                    {/* Extended glow for sharp ends effect */}
                    <div 
                      className="absolute inset-0 w-full h-full"
                      style={{
                        background: 'linear-gradient(90deg, rgba(217, 4, 41, 0.1) 0%, transparent 25%, transparent 75%, rgba(217, 4, 41, 0.1) 100%)',
                        filter: 'blur(1px)',
                      }}
                    />
                  </div>
                </motion.div>

                {/* Main Description */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: pushTransitionComplete ? 1 : 0, y: pushTransitionComplete ? 0 : 10 }}
                  transition={{ delay: 2.4, duration: 0.8, ease: "easeOut" }}
                  className="text-lg md:text-xl text-white/80 leading-relaxed mt-4 max-w-md"
                  style={{
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontWeight: 400,
                    lineHeight: '1.7'
                  }}
                >
                  Turn disorganized YouTube videos into smart, structured learning journeys — powered by{' '}
                  <span 
                    style={{
                      color: '#D90429',
                      fontWeight: 600 
                    }}
                  >
                    AI
                  </span>
                  {' '}and personalized tracking.
                </motion.p>

                {/* Simplified CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: pushTransitionComplete ? 1 : 0, y: pushTransitionComplete ? 0 : 20 }}
                  transition={{ delay: 2.6, duration: 0.8, ease: "easeOut" }}
                  className="mt-6"
                >
                  <Link href="/register">
                    <Button
                      variant="default"
                      className="group bg-white text-[#D90429] font-poppins font-semibold px-7 py-3 text-base transition-all duration-300 hover:bg-gray-100 shadow-md hover:shadow-lg rounded-lg flex items-center gap-2.5"
                        >
                      <Target className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                      <span>Start Learning Now</span>
                          <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <motion.section 
          id="features"
          ref={featuresRef}
          data-section="1"
          className="min-h-screen py-20 relative overflow-hidden bg-white"
          style={{ 
            scrollSnapAlign: 'start'
          }}
          initial="hidden"
          animate={featuresInView ? "visible" : "hidden"}
          variants={featuresSectionVariants}
        >
          {/* Geometric Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 w-32 h-32 bg-red-50 rounded-full opacity-30"></div>
            <div className="absolute top-40 right-20 w-24 h-24 bg-black/5 rounded-lg rotate-45"></div>
            <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-red-100 rounded-full opacity-20"></div>
            <div className="absolute bottom-20 right-10 w-20 h-20 bg-black/10 rounded-lg -rotate-12"></div>
          </div>

          <div className="container mx-auto px-6 max-w-7xl relative z-10">
            {/* Header */}
            <motion.div
              variants={featuresHeaderVariants}
              className="text-left mb-16 md:mb-20 ml-8"
            >
              <h2 className="text-5xl md:text-6xl font-bold mb-4 leading-tight text-black">
                Smart Learning{' '}
                <span className="text-red-600">
                  Made Visual
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl leading-relaxed">
                Experience the future of education through intuitive design and intelligent features
              </p>
            </motion.div>

            {/* Creative Visual Features Layout */}
            <div className="space-y-12">
              
              {/* AI Mind Maps - Large Feature Card */}
                  <motion.div
                    variants={featuresCardVariants}
                custom={0}
                className="group cursor-pointer"
                whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  >
                <div className="grid grid-cols-12 gap-8 items-center bg-white border-2 border-gray-200 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="col-span-12 md:col-span-7 order-2 md:order-1">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mr-4">
                        <Brain className="h-6 w-6 text-red-600" />
                      </div>
                      <h3 className="text-3xl font-bold text-black">AI Mind Maps</h3>
                    </div>
                    <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                      Transform any video into interactive visual knowledge maps. Our AI analyzes content and creates structured learning paths that make complex topics easy to understand.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">Visual Learning</span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">AI Powered</span>
                      <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">Interactive</span>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-5 order-1 md:order-2">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-8 h-64 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute top-4 left-4 w-8 h-8 bg-red-200 rounded-full"></div>
                      <div className="absolute top-8 right-8 w-6 h-6 bg-red-300 rounded-full"></div>
                      <div className="absolute bottom-6 left-8 w-4 h-4 bg-red-400 rounded-full"></div>
                      <Share2 className="h-16 w-16 text-red-600" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Smart Recommendations & Video Chat */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Smart Recommendations */}
                <motion.div
                  variants={featuresCardVariants}
                  custom={1}
                  className="group cursor-pointer"
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 h-full shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="text-right mb-6">
                      <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center ml-auto">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-black mb-4 text-right">Smart Recommendations</h3>
                    <p className="text-gray-600 leading-relaxed text-right mb-6">
                      Netflix-level AI that learns your preferences and suggests perfect educational content tailored to your learning style.
                    </p>
                    <div className="bg-gray-50 rounded-xl p-6 h-32 flex items-center justify-center">
                      <Target className="h-12 w-12 text-red-600" />
                    </div>
                  </div>
                </motion.div>

                {/* Video Chat */}
                <motion.div
                  variants={featuresCardVariants}
                  custom={2}
                  className="group cursor-pointer"
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 h-full shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="mb-6">
                      <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-white" />
                            </div>
                          </div>
                    <h3 className="text-2xl font-bold text-black mb-4">Video Chat</h3>
                    <p className="text-gray-600 leading-relaxed mb-6">
                      Ask questions about any video and get instant, contextual answers. Like having a personal tutor for every YouTube lesson.
                    </p>
                    <div className="bg-black rounded-xl p-6 h-32 flex items-center justify-center">
                      <Bot className="h-12 w-12 text-red-600" />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Progress Tracking & Achievements */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Progress Tracking */}
                <motion.div
                  variants={featuresCardVariants}
                  custom={3}
                  className="group cursor-pointer lg:col-span-2"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="bg-gradient-to-r from-black to-gray-900 rounded-3xl p-8 h-full shadow-lg hover:shadow-xl transition-all duration-300 text-white">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Progress Tracking</h3>
                        <p className="text-gray-300">
                          Visual analytics that show your learning journey and help you stay motivated.
                        </p>
                      </div>
                      <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center">
                        <TrendingUp className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-8">
                      <div className="bg-white/10 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-red-400">87%</div>
                        <div className="text-sm text-gray-300">Completion</div>
                      </div>
                      <div className="bg-white/10 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-red-400">24</div>
                        <div className="text-sm text-gray-300">Videos</div>
                      </div>
                      <div className="bg-white/10 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-red-400">12h</div>
                        <div className="text-sm text-gray-300">Watched</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                {/* Achievements */}
                <motion.div
                  variants={featuresCardVariants}
                  custom={4}
                  className="group cursor-pointer"
                  whileHover={{ y: -8, rotate: 2 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 h-full shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 rounded-bl-3xl"></div>
                    <div className="mb-6">
                      <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center">
                        <Award className="h-6 w-6 text-yellow-800" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-black mb-4">Achievements</h3>
                    <p className="text-gray-600 leading-relaxed mb-6">
                      Gamified learning with badges, streaks, and milestones.
                    </p>
                    <div className="flex justify-center space-x-2">
                      <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                        <Star className="h-4 w-4 text-yellow-800" />
                      </div>
                      <div className="w-8 h-8 bg-red-400 rounded-full flex items-center justify-center">
                        <Trophy className="h-4 w-4 text-red-800" />
                      </div>
                      <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                        <Medal className="h-4 w-4 text-blue-800" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
          
          {/* Background decorative elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div 
              className="absolute -top-1/4 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.07]"
              style={{ background: 'radial-gradient(circle, rgba(217, 4, 41, 1) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute -bottom-1/4 -right-1/4 w-80 h-80 rounded-full blur-3xl opacity-[0.06]"
              style={{ background: 'radial-gradient(circle, rgba(169, 29, 58, 1) 0%, transparent 70%)' }}
            ></div>
          </div>
        </motion.section>

        {/* About Section */}
        <motion.section 
          id="about"
          ref={aboutRef}
          data-section="2"
          className="min-h-screen py-20 relative overflow-hidden bg-white"
          style={{ 
            scrollSnapAlign: 'start'
          }}
          initial="hidden"
          animate={aboutInView ? "visible" : "hidden"}
          variants={aboutSectionVariants}
        >
          <div className="container mx-auto px-6 max-w-7xl flex items-center justify-center min-h-screen">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
              
              {/* Left side - Content */}
              <motion.div variants={aboutItemVariants} className="space-y-8">
                <h2 className="text-5xl md:text-6xl font-bold leading-tight text-black">
                  Why Choose{' '}
                  <span className="text-red-600">
                    StreamSmart?
                </span>
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  We're not just another learning platform. We're revolutionizing how you discover, organize, and learn from educational content.
                </p>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 py-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">50K+</div>
                    <div className="text-sm text-gray-500">Active Learners</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-black">1M+</div>
                    <div className="text-sm text-gray-500">Videos Organized</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">98%</div>
                    <div className="text-sm text-gray-500">Satisfaction Rate</div>
                  </div>
                </div>
              </motion.div>
              
                            {/* Right side - Visual Cards */}
              <motion.div variants={aboutItemVariants} className="space-y-6">
                
                {/* AI Technology Card */}
                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-2xl p-6 border-2 border-red-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-black">AI-Powered</h3>
                      <p className="text-sm text-gray-600">Advanced machine learning algorithms</p>
                  </div>
                  </div>
                </div>

                {/* Community Card */}
                <div className="bg-black rounded-2xl p-6 text-white">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Global Community</h3>
                      <p className="text-sm text-gray-300">Learn with peers worldwide</p>
                  </div>
                  </div>
                </div>

                {/* Personalized Card */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
                      <Target className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-black">Personalized</h3>
                      <p className="text-sm text-gray-600">Tailored to your learning style</p>
                    </div>
                  </div>
                  </div>
              </motion.div>
            </div>
          </div>
          
          {/* Geometric Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 w-32 h-32 bg-red-50 rounded-full opacity-30"></div>
            <div className="absolute top-40 right-20 w-24 h-24 bg-black/5 rounded-lg rotate-45"></div>
            <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-red-100 rounded-full opacity-20"></div>
            <div className="absolute bottom-20 right-10 w-20 h-20 bg-black/10 rounded-lg -rotate-12"></div>
          </div>
          
          {/* Decorative background elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div 
              className="absolute top-20 right-20 w-64 h-64 rounded-full blur-3xl opacity-20"
              style={{ background: 'radial-gradient(circle, rgba(217, 4, 41, 0.3) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute bottom-20 left-20 w-80 h-80 rounded-full blur-3xl opacity-15"
              style={{ background: 'radial-gradient(circle, rgba(217, 4, 41, 0.2) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-10"
              style={{ background: 'radial-gradient(circle, rgba(217, 4, 41, 0.15) 0%, transparent 70%)' }}
            ></div>
            
            {/* Subtle grid pattern overlay */}
            <div 
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(217, 4, 41, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(217, 4, 41, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px'
              }}
            ></div>
          </div>
        </motion.section>

        {/* Testimonials Section */}
        <section 
          data-section="3"
          className="min-h-screen py-20 flex items-center justify-center relative overflow-hidden bg-white"
          style={{ 
            scrollSnapAlign: 'start'
          }}
        >
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
              className="text-center mb-12"
            >
              <Badge 
                variant="outline" 
                className="mb-4 px-4 py-2 border-black/20 text-black/80 bg-black/5 backdrop-blur-sm"
              >
                What our users say
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-black font-poppins">
                Loved by learners{' '}
                <span 
                  className="bg-gradient-to-r from-[#D90429] to-[#A91D3A] bg-clip-text text-transparent"
                >
                  worldwide
                </span>
              </h2>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
            >
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  variants={itemVariants}
                  className="group"
                >
                  <div 
                    className="p-6 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <div className="space-y-4">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="italic font-poppins" style={{ color: 'rgba(0, 0, 0, 0.8)' }}>
                        &quot;{testimonial.content}&quot;
                      </p>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white"
                          style={{
                            background: 'linear-gradient(135deg, #D90429 0%, #A91D3A 100%)',
                            boxShadow: '0 4px 15px rgba(217, 4, 41, 0.3)'
                          }}
                        >
                          {testimonial.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-black font-poppins">{testimonial.name}</div>
                          <div className="text-sm font-poppins" style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                            {testimonial.role}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
          
          {/* Decorative background elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div 
              className="absolute top-20 left-20 w-64 h-64 rounded-full blur-3xl opacity-15"
              style={{ background: 'radial-gradient(circle, rgba(217, 4, 41, 0.2) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute bottom-20 right-20 w-80 h-80 rounded-full blur-3xl opacity-10"
              style={{ background: 'radial-gradient(circle, rgba(217, 4, 41, 0.15) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-12"
              style={{ background: 'radial-gradient(circle, rgba(217, 4, 41, 0.18) 0%, transparent 70%)' }}
            ></div>
          </div>
        </section>

        {/* How It Works Section */}
        <motion.section 
          id="how-it-works"
          ref={howItWorksRef}
          data-section="4"
          className="h-screen flex items-center justify-center relative overflow-hidden"
          style={{ 
            scrollSnapAlign: 'start',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #f1f3f4 100%)'
          }}
          initial="hidden"
          animate={howItWorksInView ? "visible" : "hidden"}
          variants={howItWorksSectionVariants}
        >
          <div className="container mx-auto px-6 max-w-7xl relative z-10">
            
            {/* Header */}
            <motion.div
              variants={howItWorksHeaderVariants}
              className="text-center mb-20"
            >
              <Badge 
                variant="outline" 
                className="mb-6 px-4 py-2 text-sm font-medium border-black/20 text-black/80 bg-black/5 backdrop-blur-sm"
              >
                How it works
              </Badge>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight text-black font-poppins">
                Start learning in{' '}
                <span 
                  className="bg-gradient-to-r from-[#D90429] to-[#A91D3A] bg-clip-text text-transparent"
                >
                  3 simple steps
                </span>
              </h2>
            </motion.div>

            {/* Three Steps */}
            <motion.div
              variants={howItWorksSectionVariants}
              className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto"
            >
              {[
                {
                  stepNumber: "01",
                  icon: <ListVideoIcon className="h-10 w-10" />,
                  title: "Create Your Playlist",
                  description: "Add YouTube videos manually or let our AI suggest the perfect content based on your learning goals and interests."
                },
                {
                  stepNumber: "02",
                  icon: <BrainIcon className="h-10 w-10" />,
                  title: "Learn Interactively",
                  description: "Engage with AI-generated mind maps, take personalized quizzes, and chat with our AI tutor about your content."
                },
                {
                  stepNumber: "03",
                  icon: <BarChart3Icon className="h-10 w-10" />,
                  title: "Track & Master",
                  description: "Monitor your progress with detailed analytics, celebrate milestones, and watch your understanding grow over time."
                }
              ].map((step, index) => (
                <motion.div
                  key={step.title}
                  variants={howItWorksStepVariants}
                  className="relative group cursor-pointer"
                  whileHover={{ 
                    y: -10,
                    transition: { duration: 0.3, ease: "easeOut" }
                  }}
                >
                  {/* Large Stylized Number */}
                  <div 
                    className="absolute -top-8 -left-4 text-8xl md:text-9xl font-bold opacity-10 transition-all duration-500 group-hover:opacity-20"
                    style={{
                      color: '#A91D3A',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontWeight: 900,
                      textShadow: '0 0 20px rgba(169, 29, 58, 0.2)'
                    }}
                  >
                    {step.stepNumber}
                  </div>
                  
                  {/* Content Card */}
                  <div 
                    className="relative h-full p-8 transition-all duration-500 rounded-3xl group-hover:shadow-2xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    {/* Crimson glow overlay for hover effect */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(169, 29, 58, 0.08) 0%, rgba(199, 54, 80, 0.04) 100%)'
                      }}
                    ></div>
                    
                    {/* Hover border glow */}
                    <div 
                      className="absolute inset-0 rounded-3xl border opacity-0 group-hover:opacity-100 transition-all duration-500"
                      style={{
                        borderColor: '#A91D3A',
                        boxShadow: '0 0 25px rgba(169, 29, 58, 0.2)'
                      }}
                    ></div>
                    
                    {/* Icon */}
                    <div className="relative z-10 mb-8">
                      <div 
                        className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto transition-all duration-400 group-hover:scale-110"
                        style={{
                          background: 'rgba(217, 4, 41, 0.15)',
                          border: '1px solid rgba(217, 4, 41, 0.3)'
                        }}
                      >
                        <div 
                          className="transition-all duration-300"
                          style={{
                            color: '#D90429',
                            filter: 'drop-shadow(0 0 8px rgba(217, 4, 41, 0.4))'
                          }}
                        >
                          {React.cloneElement(step.icon, {
                            className: "h-10 w-10 group-hover:drop-shadow-[0_0_15px_rgba(217,4,41,0.6)] transition-all duration-300"
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 text-center">
                      <h3 
                        className="text-2xl md:text-3xl font-bold mb-6 transition-colors duration-300 font-poppins"
                        style={{ color: '#000000' }}
                      >
                        {step.title}
                      </h3>
                      <p 
                        className="leading-relaxed text-lg font-poppins"
                        style={{ color: 'rgba(0, 0, 0, 0.7)' }}
                      >
                        {step.description}
                      </p>
                    </div>
                    
                    {/* Numbered badge in top right */}
                    <div 
                      className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 font-poppins"
                      style={{
                        background: '#D90429',
                        color: '#ffffff',
                        boxShadow: '0 4px 15px rgba(217, 4, 41, 0.4)'
                      }}
                    >
                      {index + 1}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
          
          {/* Enhanced decorative background elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div 
              className="absolute top-20 left-20 w-36 h-36 rounded-full blur-3xl opacity-20"
              style={{ background: 'radial-gradient(circle, rgba(169, 29, 58, 0.3) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute bottom-24 right-24 w-44 h-44 rounded-full blur-3xl opacity-15"
              style={{ background: 'radial-gradient(circle, rgba(199, 54, 80, 0.25) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-2xl opacity-10"
              style={{ background: 'radial-gradient(circle, rgba(169, 29, 58, 0.4) 0%, transparent 70%)' }}
            ></div>
            
            {/* Connecting line animation between steps (desktop only) */}
            <div className="hidden lg:block absolute top-1/2 left-1/4 right-1/4 transform -translate-y-1/2">
              <div 
                className="h-px opacity-20 animate-pulse"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, #A91D3A 50%, transparent 100%)',
                  animationDuration: '3s'
                }}
              ></div>
            </div>
          </div>

          {/* Floating number particles */}
          <div className="absolute inset-0 pointer-events-none">
            {['01', '02', '03'].map((num, i) => (
              <div
                key={i}
                className="absolute text-6xl font-bold opacity-5 animate-pulse"
                style={{
                  color: '#A91D3A',
                  left: `${20 + i * 30}%`,
                  top: `${10 + Math.sin(i) * 20}%`,
                  animationDelay: `${i * 1.5}s`,
                  animationDuration: `${4 + i}s`,
                  transform: `rotate(${i * 15 - 15}deg)`
                }}
              >
                {num}
              </div>
            ))}
          </div>
        </motion.section>

        {/* Contact & Footer Section */}
        <motion.section 
          id="contact"
          ref={contactRef}
          data-section="5"
          className="h-screen flex items-center justify-center relative overflow-hidden"
          style={{ 
            scrollSnapAlign: 'start',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #f1f3f4 100%)'
          }}
          initial="hidden"
          animate={contactInView ? "visible" : "hidden"}
          variants={contactSectionVariants}
        >
          <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
            
            {/* Main Content */}
            <motion.div variants={contactItemVariants} className="mb-16">
              <h2 
                className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight"
                style={{ color: '#000000' }}
              >
                Get in{' '}
                <span 
                  className="bg-gradient-to-r from-[#A91D3A] to-[#C73650] bg-clip-text text-transparent"
                  style={{
                    textShadow: '0 0 30px rgba(169, 29, 58, 0.3)'
                  }}
                >
                  Touch
                </span>
              </h2>
              <p 
                className="text-xl md:text-2xl mb-12 leading-relaxed"
                style={{ color: '#333333' }}
              >
                Have questions or want to connect? Reach out!
              </p>
            </motion.div>
            
            {/* Contact Information */}
            <motion.div 
              variants={contactItemVariants} 
              className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-16"
            >
              {/* Email */}
              <a 
                href="mailto:hsundar080506@gmail.com"
                className="group flex items-center gap-4 p-6 rounded-2xl transition-all duration-300 hover:scale-105"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                }}
              >
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: 'rgba(169, 29, 58, 0.15)',
                    border: '1px solid rgba(169, 29, 58, 0.3)'
                  }}
                >
                  <Mail 
                    className="h-7 w-7 transition-all duration-300"
                    style={{
                      color: '#A91D3A',
                      filter: 'drop-shadow(0 0 8px rgba(169, 29, 58, 0.4))'
                    }}
                  />
                </div>
                <div className="text-left">
                  <div 
                    className="text-sm font-medium mb-1"
                    style={{ color: '#666666' }}
                  >
                    Email
                  </div>
                  <div 
                    className="text-lg font-semibold group-hover:text-[#A91D3A] transition-colors duration-300"
                    style={{ color: '#000000' }}
                  >
                    hsundar080506@gmail.com
                  </div>
                </div>
                <ExternalLink 
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ color: '#A91D3A' }}
                />
              </a>
              
              {/* LinkedIn */}
              <a 
                href="https://www.linkedin.com/in/hari-sundar-237570286/" 
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-6 rounded-2xl transition-all duration-300 hover:scale-105"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                }}
              >
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: 'rgba(169, 29, 58, 0.15)',
                    border: '1px solid rgba(169, 29, 58, 0.3)'
                  }}
                >
                  <Linkedin 
                    className="h-7 w-7 transition-all duration-300"
                    style={{
                      color: '#A91D3A',
                      filter: 'drop-shadow(0 0 8px rgba(169, 29, 58, 0.4))'
                    }}
                  />
                </div>
                <div className="text-left">
                  <div 
                    className="text-sm font-medium mb-1"
                    style={{ color: '#666666' }}
                  >
                    LinkedIn
                  </div>
                  <div 
                    className="text-lg font-semibold group-hover:text-[#A91D3A] transition-colors duration-300"
                    style={{ color: '#000000' }}
                  >
                    LinkedIn Profile
                  </div>
                </div>
                <ExternalLink 
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ color: '#A91D3A' }}
                />
              </a>
            </motion.div>
            
            {/* Copyright */}
            <motion.div 
              variants={contactItemVariants}
              className="pt-12 border-t border-black/10"
            >
              <p 
                className="text-sm"
                style={{ color: '#666666' }}
              >
                © 2025 StreamSmart. All rights reserved.
              </p>
            </motion.div>
          </div>
          
          {/* Subtle decorative background elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div 
              className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-3xl opacity-10"
              style={{ background: 'radial-gradient(circle, rgba(169, 29, 58, 0.3) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full blur-3xl opacity-8"
              style={{ background: 'radial-gradient(circle, rgba(199, 54, 80, 0.25) 0%, transparent 70%)' }}
            ></div>
            
            {/* Minimal grid pattern */}
            <div 
              className="absolute inset-0 opacity-[0.01]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(169, 29, 58, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(169, 29, 58, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '80px 80px'
              }}
            ></div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}