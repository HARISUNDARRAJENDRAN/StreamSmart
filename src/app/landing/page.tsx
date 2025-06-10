'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ZapIcon, LightbulbIcon, BrainIcon, ListVideoIcon, CircleCheck, BarChart3Icon, BookOpenIcon, UsersIcon, Star, ArrowRight, PlayCircle, Sparkles, Users, Award, TrendingUp, Shield, Clock, Mail, Linkedin, ExternalLink, Target } from 'lucide-react';
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
      className="relative"
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
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)'
          }}
        >
          {/* Split Screen Content */}
          <div className="relative h-full w-full flex">
            
            {/* Left Half - Content */}
            <motion.div 
              className="relative z-10 w-full lg:w-1/2 flex items-center justify-center px-6 lg:pl-16 xl:pl-32 py-12"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: pushTransitionComplete ? 1 : 0, x: pushTransitionComplete ? 0 : -50 }}
              transition={{ duration: 0.8, delay: 1.8, ease: "easeOut" }}
            >
              <div className="flex flex-col items-center text-center space-y-6 max-w-xl">
                
                {/* Main Heading */}
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: pushTransitionComplete ? 1 : 0 }}
                  transition={{ delay: 2.0, duration: 0.8 }}
                  className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight uppercase font-poppins text-white"
                  style={{
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                  }}
                >
                  <span style={{ color: '#D90429' }}>S</span>TREAMSMART
                </motion.h1>

                {/* Subtitle with red underline */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: pushTransitionComplete ? 1 : 0, y: pushTransitionComplete ? 0 : 10 }}
                  transition={{ delay: 2.2, duration: 0.8, ease: "easeOut" }}
                  className="flex flex-col items-center"
                >
                  <p
                    className="text-base md:text-lg text-white/90 font-normal lowercase tracking-wide"
                    style={{
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontWeight: 400,
                    }}
                  >
                    your simplified <span style={{ color: '#D90429', fontWeight: 500 }}>youtube learning</span>
                  </p>
                  
                  {/* Static red line */}
                  <div
                    className="mt-1 w-48 h-[2px]"
                    style={{
                      background: '#D90429'
                      }}
                    />
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
                  <Link href="/signup">
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

            {/* Right Half - Preview */}
            <motion.div 
              className="relative z-10 w-full lg:w-1/2 flex items-center justify-center px-6 lg:pr-16 xl:pr-32 py-12"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: pushTransitionComplete ? 1 : 0, x: pushTransitionComplete ? 0 : 50 }}
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
          </div>
        </section>

        {/* Features Section */}
        <motion.section 
          id="features"
          ref={featuresRef}
          data-section="1"
          className="min-h-screen py-20 flex items-center justify-center relative overflow-hidden"
          style={{ 
            scrollSnapAlign: 'start',
            background: 'linear-gradient(135deg, #121212 0%, #1a1a1a 50%, #0f0f0f 100%)'
          }}
          initial="hidden"
          animate={featuresInView ? "visible" : "hidden"}
          variants={featuresSectionVariants}
        >
          <div className="container mx-auto px-6 max-w-7xl relative z-10">
            {/* Header */}
            <motion.div
              variants={featuresHeaderVariants}
              className="text-center mb-16 md:mb-20"
            >
              <Badge 
                variant="outline" 
                className="mb-4 px-4 py-2 text-sm font-medium border-white/20 text-white/80 bg-white/5 backdrop-blur-sm"
              >
                Core Capabilities
              </Badge>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white font-poppins">
                Unlock Your Learning Potential with{' '}
                <span 
                  className="bg-gradient-to-r from-[#D90429] to-[#A91D3A] bg-clip-text text-transparent"
                >
                  StreamSmart
                </span>
              </h2>
              <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed font-poppins">
                Discover a smarter way to learn from YouTube. Our AI-driven features transform scattered videos into structured knowledge.
              </p>
            </motion.div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    variants={featuresCardVariants}
                  custom={index}
                  className="group cursor-pointer h-full"
                  whileHover={{ y: -8, scale: 1.03 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <div 
                    className="h-full p-8 rounded-2xl transition-all duration-300 relative overflow-hidden flex flex-col"
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(15px)',
                      boxShadow: '0 10px 35px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      {/* Hover glow effect */}
                      <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 rounded-2xl"
                        style={{
                        background: 'linear-gradient(135deg, rgba(217, 4, 41, 0.08) 0%, rgba(169, 29, 58, 0.04) 100%)',
                        }}
                      />
                    <div className="relative z-10 flex flex-col flex-grow">
                        {/* Icon */}
                      <div className="mb-6">
                          <div 
                          className="w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]"
                            style={{
                              background: 'rgba(217, 4, 41, 0.15)',
                            border: '1px solid rgba(217, 4, 41, 0.3)'
                            }}
                          >
                              {React.cloneElement(feature.icon as React.ReactElement, {
                            className: "h-8 w-8 transition-all duration-300",
                            style: { color: '#D90429' }
                              })}
                            </div>
                          </div>
                        {/* Content */}
                      <div className="flex flex-col flex-grow">
                        <h3 className="text-2xl font-bold mb-3 font-poppins text-white">
                            {feature.title}
                          </h3>
                        <p className="leading-relaxed text-base font-poppins text-white/70 flex-grow">
                            {feature.description}
                          </p>
                        {feature.dataAiHint && (
                          <p className="text-xs mt-4 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            AI Focus: {feature.dataAiHint}
                          </p>
                        )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
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
          className="min-h-screen py-20 flex items-center justify-center relative overflow-hidden"
          style={{ 
            scrollSnapAlign: 'start',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)'
          }}
          initial="hidden"
          animate={aboutInView ? "visible" : "hidden"}
          variants={aboutSectionVariants}
        >
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center">
              
              {/* Badge */}
              <motion.div variants={aboutItemVariants} className="mb-6">
                <Badge 
                  variant="outline" 
                  className="px-4 py-2 text-sm font-medium border-white/20 text-white/80 bg-white/5 backdrop-blur-sm"
                >
                  About StreamSmart
                </Badge>
              </motion.div>
              
              {/* Main heading */}
              <motion.h2 
                className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight text-white font-poppins"
                variants={aboutItemVariants}
              >
                Empowering the next generation of{' '}
                <span 
                  className="bg-gradient-to-r from-[#D90429] to-[#A91D3A] bg-clip-text text-transparent"
                >
                  digital learners
                </span>
              </motion.h2>
              
              {/* Description paragraphs */}
              <motion.div 
                className="space-y-6 text-lg md:text-xl leading-relaxed mb-12 max-w-4xl mx-auto font-poppins"
                variants={aboutItemVariants}
                style={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                <p>
                  StreamSmart was born from a simple observation: YouTube contains the world&apos;s largest collection of educational content, but it&apos;s scattered, unorganized, and overwhelming. We knew there had to be a better way.
                </p>
                <p>
                  Our mission is to transform YouTube into a structured, personalized learning platform using the power of artificial intelligence. We help learners discover, organize, and master knowledge efficiently through AI-powered playlists, interactive mind maps, and intelligent progress tracking.
                </p>
              </motion.div>
              
              {/* Three-column layout */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
                variants={aboutItemVariants}
              >
                <motion.div 
                  className="text-center group"
                  variants={aboutColumnVariants}
                  whileHover={{ y: -10, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <div 
                    className="rounded-2xl p-8 h-full shadow-lg group-hover:shadow-xl transition-all duration-300"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300"
                      style={{
                        background: 'rgba(217, 4, 41, 0.15)',
                        border: '1px solid rgba(217, 4, 41, 0.3)'
                      }}
                    >
                      <Award className="h-8 w-8" style={{ color: '#D90429' }} />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-white font-poppins">Our Mission</h3>
                    <p className="text-base leading-relaxed font-poppins" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Making quality education accessible and organized for everyone, everywhere. We believe learning should be structured, engaging, and tailored to individual needs.
                    </p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="text-center group"
                  variants={aboutColumnVariants}
                  whileHover={{ y: -10, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <div 
                    className="rounded-2xl p-8 h-full shadow-lg group-hover:shadow-xl transition-all duration-300"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300"
                      style={{
                        background: 'rgba(217, 4, 41, 0.15)',
                        border: '1px solid rgba(217, 4, 41, 0.3)'
                      }}
                    >
                      <Users className="h-8 w-8" style={{ color: '#D90429' }} />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-white font-poppins">Our Community</h3>
                    <p className="text-base leading-relaxed font-poppins" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      A passionate group of educators, technologists, and lifelong learners united by the vision of transforming how we learn from digital content.
                    </p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="text-center group"
                  variants={aboutColumnVariants}
                  whileHover={{ y: -10, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <div 
                    className="rounded-2xl p-8 h-full shadow-lg group-hover:shadow-xl transition-all duration-300"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300"
                      style={{
                        background: 'rgba(217, 4, 41, 0.15)',
                        border: '1px solid rgba(217, 4, 41, 0.3)'
                      }}
                    >
                      <TrendingUp className="h-8 w-8" style={{ color: '#D90429' }} />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-white font-poppins">Our Impact</h3>
                    <p className="text-base leading-relaxed font-poppins" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Helping thousands of learners achieve their educational goals faster through AI-powered organization and personalized learning paths.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
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
          className="min-h-screen py-20 flex items-center justify-center relative overflow-hidden"
          style={{ 
            scrollSnapAlign: 'start',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)'
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
                className="mb-4 px-4 py-2 border-white/20 text-white/80 bg-white/5 backdrop-blur-sm"
              >
                What our users say
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white font-poppins">
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
                      <p className="italic font-poppins" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
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
                          <div className="font-semibold text-white font-poppins">{testimonial.name}</div>
                          <div className="text-sm font-poppins" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
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
            background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #121212 100%)'
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
                className="mb-6 px-4 py-2 text-sm font-medium border-white/20 text-white/80 bg-white/5 backdrop-blur-sm"
              >
                How it works
              </Badge>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight text-white font-poppins">
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
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
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
                        style={{ color: '#ffffff' }}
                      >
                        {step.title}
                      </h3>
                      <p 
                        className="leading-relaxed text-lg font-poppins"
                        style={{ color: 'rgba(255, 255, 255, 0.7)' }}
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
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)'
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
                style={{ color: '#E0E0E0' }}
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
                style={{ color: '#B0B0B0' }}
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
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
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
                    style={{ color: '#B0B0B0' }}
                  >
                    Email
                  </div>
                  <div 
                    className="text-lg font-semibold group-hover:text-[#A91D3A] transition-colors duration-300"
                    style={{ color: '#E0E0E0' }}
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
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
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
                    style={{ color: '#B0B0B0' }}
                  >
                    LinkedIn
                  </div>
                  <div 
                    className="text-lg font-semibold group-hover:text-[#A91D3A] transition-colors duration-300"
                    style={{ color: '#E0E0E0' }}
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
              className="pt-12 border-t border-white/10"
            >
              <p 
                className="text-sm"
                style={{ color: '#888888' }}
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