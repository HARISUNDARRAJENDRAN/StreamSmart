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

// Custom hook for Intersection Observer
const useIntersectionObserver = (threshold = 0.3) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return [ref, isInView] as const;
};



export default function LandingPage() {
  const [currentSection, setCurrentSection] = useState(0);
  const [showNavbar, setShowNavbar] = useState(false);
  const [pushTransitionComplete, setPushTransitionComplete] = useState(false);
  
  // Intersection observers for different sections
  const [aboutRef, aboutInView] = useIntersectionObserver(0.2);
  const [featuresRef, featuresInView] = useIntersectionObserver(0.15);
  const [howItWorksRef, howItWorksInView] = useIntersectionObserver(0.2);
  const [contactRef, contactInView] = useIntersectionObserver(0.3);

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
    { id: 'problem', name: 'Problem' },
    { id: 'stats', name: 'Stats' },
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
        className="fixed top-0 right-0 z-50 p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ 
          opacity: showNavbar ? 1 : 0,
          y: showNavbar ? 0 : -20
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center gap-6">
          <Link 
            href="#about" 
            className="text-white font-medium relative group transition-all duration-300 hover:text-white/90"
          >
            About
            <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link 
            href="#features" 
            className="text-white font-medium relative group transition-all duration-300 hover:text-white/90"
          >
            Features
            <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link 
            href="/demo" 
            className="text-white font-medium relative group transition-all duration-300 hover:text-white/90"
          >
            Demo
            <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link href="/login">
            <Button 
              className="bg-white font-medium px-6 py-2 transition-all duration-300 hover:scale-105 font-poppins"
              style={{ 
                color: '#D90429',
                borderRadius: '6px',
                boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.2)'
              }}
            >
              Login/signup
            </Button>
          </Link>
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
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)' // Dark gradient to match the website theme
          }}
        >
          {/* Dark Theme Background Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Subtle gradient orbs for depth */}
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

            {/* Floating Video Frame Elements with dark theme */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.1, scale: 1 }}
              transition={{ delay: 5.0, duration: 2.0, ease: "easeOut" }}
              className="absolute top-20 left-16 w-24 h-16 rounded-lg border border-white/10"
              style={{
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-0 h-0 border-l-[8px] border-l-red-500/60 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.08, scale: 1 }}
              transition={{ delay: 5.5, duration: 2.0, ease: "easeOut" }}
              className="absolute bottom-32 right-20 w-32 h-20 rounded-lg border border-white/8"
              style={{
                background: 'rgba(255,255,255,0.015)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-0 h-0 border-l-[10px] border-l-red-500/50 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1"></div>
              </div>
            </motion.div>

            {/* Animated Progress Bars with red accents */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 0.15, scaleX: 1 }}
              transition={{ delay: 5.8, duration: 1.5, ease: "easeOut" }}
              className="absolute bottom-40 left-24 w-32 h-1 bg-white/10 rounded-full origin-left"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 0.65 }}
                transition={{ delay: 7.0, duration: 2.0, ease: "easeOut" }}
                className="h-full rounded-full origin-left"
                style={{ background: '#D90429' }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 0.12, scaleX: 1 }}
              transition={{ delay: 6.2, duration: 1.5, ease: "easeOut" }}
              className="absolute top-36 right-32 w-24 h-1 bg-white/8 rounded-full origin-left"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 0.45 }}
                transition={{ delay: 7.5, duration: 2.0, ease: "easeOut" }}
                className="h-full rounded-full origin-left"
                style={{ background: '#D90429' }}
              />
            </motion.div>

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

          {/* Split Screen Content */}
          <div className="relative h-full w-full flex">
            
            {/* Left Half - Content */}
            <motion.div 
              className="relative z-10 w-full lg:w-1/2 flex items-center justify-center px-6 lg:px-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: pushTransitionComplete ? 1 : 0 }}
              transition={{ duration: 0.8, delay: 1.8 }}
            >
              <div 
                className="flex flex-col items-center text-center space-y-8 max-w-2xl"
              >
                
                {/* Main Heading */}
                <motion.h1
                  initial={{ opacity: 0, x: '-100%' }}
                  animate={{ 
                    opacity: pushTransitionComplete ? 1 : 0,
                    x: pushTransitionComplete ? '0%' : '-100%'
                  }}
                  transition={{ 
                    delay: 2.0, 
                    duration: 1.0, 
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight uppercase font-poppins"
                  style={{
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    textShadow: '3px 3px 10px rgba(0, 0, 0, 0.25)',
                    color: 'white'
                  }}
                >
                  STREAMSMART
                </motion.h1>

                {/* Subtitle - centered right below STREAMSMART */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: pushTransitionComplete ? 1 : 0,
                    y: pushTransitionComplete ? 0 : 20
                  }}
                  transition={{ delay: 2.3, duration: 0.8, ease: "easeOut" }}
                  className="flex flex-col items-center mt-1"
                >
                  <motion.p
                    className="text-sm md:text-base lg:text-lg text-white font-normal lowercase tracking-wide"
                    style={{
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontWeight: 300,
                      letterSpacing: '0.05em',
                      textShadow: '0 2px 10px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    Your Simplified <span style={{ color: '#D90429' }}>Youtube learning</span>
                  </motion.p>
                  
                  {/* Shining red line */}
                  <motion.div
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ 
                      scaleX: pushTransitionComplete ? 1 : 0,
                      opacity: pushTransitionComplete ? 1 : 0
                    }}
                    transition={{ delay: 2.7, duration: 1.0, ease: "easeOut" }}
                    className="relative mt-3 w-32 h-0.5 overflow-hidden"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, #D90429 20%, #FF0040 50%, #D90429 80%, transparent 100%)',
                      borderRadius: '2px'
                    }}
                  >
                    {/* Animated shine effect */}
                    <motion.div
                      className="absolute inset-0 w-full h-full"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, transparent 30%, rgba(255, 255, 255, 0.8) 50%, transparent 70%, transparent 100%)',
                        borderRadius: '2px'
                      }}
                      animate={{
                        x: ['-100%', '100%']
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 3.2
                      }}
                    />
                    
                    {/* Center glow effect */}
                    <motion.div
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, rgba(255, 0, 64, 0.8) 0%, transparent 70%)',
                        filter: 'blur(2px)'
                      }}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>
                </motion.div>

                {/* Main Description */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: pushTransitionComplete ? 1 : 0,
                    y: pushTransitionComplete ? 0 : 20
                  }}
                  transition={{ delay: 3.0, duration: 0.8, ease: "easeOut" }}
                  className="max-w-3xl text-2xl md:text-3xl lg:text-4xl text-white leading-relaxed mt-10 font-normal"
                  style={{
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontWeight: 400,
                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
                    lineHeight: '1.6'
                  }}
                >
                  Transform scattered YouTube content into structured learning paths with{' '}
                  <span 
                    className="bg-gradient-to-r from-[#D90429] via-[#FF0040] to-[#A91D3A] bg-clip-text text-transparent font-semibold"
                    style={{
                      fontWeight: 600,
                      textShadow: 'none'
                    }}
                  >
                    AI-powered organization
                  </span>
                  {' '}and intelligent progress tracking.
                </motion.p>

                {/* Premium CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ 
                    opacity: pushTransitionComplete ? 1 : 0,
                    y: pushTransitionComplete ? 0 : 30
                  }}
                  transition={{ delay: 4.0, duration: 0.8, ease: "easeOut" }}
                  className="mt-16"
                >
                  <Link href="/signup">
                    <motion.button
                      className="group relative overflow-hidden font-semibold px-12 py-4 text-lg flex items-center gap-3 border-0 cursor-pointer"
                      style={{ 
                        borderRadius: '16px',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        color: '#D90429',
                        boxShadow: `
                          0 8px 32px rgba(0, 0, 0, 0.15),
                          inset 0 1px 0 rgba(255, 255, 255, 0.8),
                          0 0 0 1px rgba(217, 4, 41, 0.1)
                        `
                      }}
                      whileHover={{ 
                        scale: 1.05,
                        y: -2
                      }}
                      whileTap={{ 
                        scale: 0.98,
                        y: 0
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 20 
                      }}
                    >
                      {/* Gradient overlay on hover */}
                      <motion.div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100"
                        style={{
                          background: 'linear-gradient(135deg, #D90429, #FF0040, #A91D3A)',
                          borderRadius: '16px'
                        }}
                        initial={{ opacity: 0 }}
                        whileHover={{ 
                          opacity: 1,
                          transition: { duration: 0.3 }
                        }}
                      />
                      
                      {/* Animated glow effect */}
                      <motion.div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100"
                        style={{
                          background: 'linear-gradient(135deg, #D90429, #FF0040)',
                          filter: 'blur(20px)',
                          borderRadius: '16px'
                        }}
                        animate={{
                          scale: [1, 1.1, 1],
                          opacity: [0, 0.3, 0]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />

                      {/* Button content */}
                      <div className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors duration-300">
                        {/* Icon that morphs from target to play */}
                        <motion.div
                          className="relative w-6 h-6"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6, ease: "easeInOut" }}
                        >
                          <Target 
                            className="absolute inset-0 w-6 h-6 transition-all duration-300 group-hover:opacity-0 group-hover:scale-50" 
                          />
                          <PlayCircle 
                            className="absolute inset-0 w-6 h-6 transition-all duration-300 opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100" 
                          />
                        </motion.div>
                        
                        <span className="font-semibold">Start Learning Now</span>
                        
                        {/* Arrow that transforms */}
                        <motion.div
                          className="relative"
                          whileHover={{ x: 4 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                        </motion.div>
                      </div>

                      {/* Shimmer effect */}
                      <motion.div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100"
                        style={{
                          background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                          transform: 'translateX(-100%)'
                        }}
                        animate={{
                          transform: ['translateX(-100%)', 'translateX(100%)']
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.5
                        }}
                      />
                    </motion.button>
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            {/* Curvy Divider */}
            <div className="absolute left-1/2 top-0 bottom-0 w-32 z-20 hidden lg:block">
              <svg
                className="w-full h-full"
                viewBox="0 0 128 1080"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 0 Q64 270 0 540 Q64 810 0 1080"
                  stroke="rgba(217, 4, 41, 0.3)"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M0 0 Q64 270 0 540 Q64 810 0 1080 L128 1080 L128 0 Z"
                  fill="url(#curveGradient)"
                  opacity="0.1"
                />
                <defs>
                  <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D90429" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#D90429" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Right Half - Demo Video */}
            <motion.div 
              className="relative w-full lg:w-1/2 flex flex-col items-center justify-center overflow-hidden"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: pushTransitionComplete ? 1 : 0,
                scale: pushTransitionComplete ? 1 : 0.8
              }}
              transition={{ duration: 1.2, delay: 2.5 }}
            >
              {/* "Watch how it works" Label */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: pushTransitionComplete ? 1 : 0,
                  y: pushTransitionComplete ? 0 : 20
                }}
                transition={{ delay: 3.0, duration: 0.8 }}
                className="mb-6 text-center"
              >
                <p 
                  className="text-white/80 text-lg font-medium tracking-wide"
                  style={{
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontWeight: 500
                  }}
                >
                  Watch how it works
                </p>
                <div 
                  className="w-16 h-0.5 mx-auto mt-2"
                  style={{
                    background: 'linear-gradient(90deg, transparent, #D90429, transparent)'
                  }}
                />
              </motion.div>

              {/* Video Container with Enhanced Glassmorphism */}
              <div 
                className="relative w-full max-w-2xl mx-8 rounded-3xl overflow-hidden group cursor-pointer transition-all duration-500 hover:scale-[1.02]"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(25px)',
                  border: '2px solid transparent',
                  backgroundImage: `
                    linear-gradient(rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.03)),
                    linear-gradient(135deg, 
                      rgba(217, 4, 41, 0.3) 0%, 
                      rgba(255, 255, 255, 0.1) 25%, 
                      rgba(217, 4, 41, 0.2) 50%, 
                      rgba(255, 255, 255, 0.1) 75%, 
                      rgba(217, 4, 41, 0.3) 100%
                    )
                  `,
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'content-box, border-box',
                  boxShadow: `
                    0 25px 50px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1),
                    0 0 40px rgba(217, 4, 41, 0.1)
                  `
                }}
              >
                {/* Video Content */}
                <div className="aspect-video bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
                  {/* Subtle grid pattern overlay */}
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(217, 4, 41, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(217, 4, 41, 0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: '20px 20px'
                    }}
                  />
                  
                  {/* Main content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-6">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="relative"
                      >
                        <div 
                          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                          style={{
                            background: 'linear-gradient(135deg, #D90429, #FF0040, #A91D3A)',
                            boxShadow: '0 0 30px rgba(217, 4, 41, 0.4)'
                          }}
                        >
                          <PlayCircle className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#D90429] to-[#A91D3A] opacity-20 animate-pulse" />
                      </motion.div>
                      
                      <div className="space-y-2">
                        <p 
                          className="text-white text-xl font-medium"
                          style={{
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                          }}
                        >
                          Demo Video
                        </p>
                        <p 
                          className="text-gray-400 text-sm"
                          style={{
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                          }}
                        >
                          See StreamSmart in action
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Animated corner highlights */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-red-400/30 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-red-400/30 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-red-400/30 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-red-400/30 rounded-br-lg" />
                </div>
                
                {/* Enhanced floating elements */}
                <motion.div
                  className="absolute -top-4 -right-4 w-8 h-8 rounded-full opacity-70"
                  style={{
                    background: 'linear-gradient(135deg, #D90429, #FF0040)',
                    boxShadow: '0 0 20px rgba(217, 4, 41, 0.5)'
                  }}
                  animate={{ 
                    y: [0, -12, 0],
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute -bottom-3 -left-3 w-6 h-6 bg-white/20 rounded-full backdrop-blur-sm"
                  animate={{ 
                    y: [0, 8, 0],
                    x: [0, 4, 0],
                    opacity: [0.2, 0.6, 0.2]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1.5
                  }}
                />
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section 
          data-section="1"
          className="min-h-screen flex items-center justify-center relative overflow-hidden"
          style={{ 
            scrollSnapAlign: 'start',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)'
          }}
        >
          <div className="container mx-auto px-6 max-w-7xl relative z-10 py-20">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
              className="text-center mb-20"
            >
              <motion.h2 
                variants={itemVariants}
                className="text-5xl md:text-7xl font-bold mb-8 text-white font-poppins"
              >
                Are you{' '}
                <span 
                  className="bg-gradient-to-r from-[#D90429] to-[#A91D3A] bg-clip-text text-transparent"
                >
                  overwhelmed
                </span>
                {' '}by YouTube learning?
              </motion.h2>
              <motion.p 
                variants={itemVariants}
                className="text-xl md:text-2xl text-white/70 max-w-4xl mx-auto leading-relaxed font-poppins"
              >
                You're not alone. Most learners struggle with the same challenges.
              </motion.p>
            </motion.div>

            {/* Problem Points */}
            <motion.div 
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
            >
              {[
                {
                  icon: <Clock className="h-8 w-8" />,
                  problem: "Wasting Hours",
                  description: "Searching for the next logical video in your learning journey"
                },
                {
                  icon: <ListVideoIcon className="h-8 w-8" />,
                  problem: "Disorganized Playlists",
                  description: "Scattered content with no clear learning progression"
                },
                {
                  icon: <BarChart3Icon className="h-8 w-8" />,
                  problem: "No Progress Tracking",
                  description: "Unable to measure your learning progress and retention"
                }
              ].map((item, index) => (
                <motion.div
                  key={item.problem}
                  variants={itemVariants}
                  className="relative p-8 rounded-2xl group"
                  style={{
                    background: 'rgba(217, 4, 41, 0.08)',
                    border: '1px solid rgba(217, 4, 41, 0.2)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <div className="text-center">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                      style={{
                        background: 'rgba(217, 4, 41, 0.15)',
                        border: '1px solid rgba(217, 4, 41, 0.3)'
                      }}
                    >
                      <div style={{ color: '#D90429' }}>
                        {item.icon}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4 font-poppins">{item.problem}</h3>
                    <p className="text-white/70 leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Solution */}
            <motion.div 
              variants={containerVariants}
              className="text-center"
            >
              <motion.h3 
                variants={itemVariants}
                className="text-4xl md:text-6xl font-bold mb-8 text-white font-poppins"
              >
                Meet{' '}
                <span 
                  className="bg-gradient-to-r from-[#D90429] to-[#A91D3A] bg-clip-text text-transparent"
                >
                  StreamSmart
                </span>
              </motion.h3>
              <motion.p 
                variants={itemVariants}
                className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed font-poppins mb-12"
              >
                Your AI-powered learning companion that transforms chaotic YouTube content into structured, trackable learning paths.
              </motion.p>
              
              <motion.div variants={itemVariants}>
                <Link href="/signup">
                  <Button 
                    className="group bg-gradient-to-r from-[#D90429] to-[#A91D3A] text-white font-poppins font-semibold px-12 py-4 text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl flex items-center gap-3 mx-auto"
                    style={{ 
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(217, 4, 41, 0.4)',
                    }}
                  >
                    <Sparkles className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                    Try StreamSmart Free
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Background decorative elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div 
              className="absolute top-20 left-20 w-40 h-40 rounded-full blur-3xl opacity-10"
              style={{ background: 'radial-gradient(circle, rgba(217, 4, 41, 0.3) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute bottom-20 right-20 w-60 h-60 rounded-full blur-3xl opacity-8"
              style={{ background: 'radial-gradient(circle, rgba(169, 29, 58, 0.25) 0%, transparent 70%)' }}
            ></div>
          </div>
        </section>

        {/* Stats Section */}
        <section 
          data-section="2"
          className="min-h-screen flex items-center justify-center relative"
          style={{ 
            scrollSnapAlign: 'start',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 50%, #1a1a1a 100%)'
          }}
        >
          <div className="container mx-auto px-6 max-w-7xl relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
              className="text-center mb-16"
            >
              <motion.h2 
                variants={itemVariants}
                className="text-5xl md:text-7xl font-bold mb-8 text-white font-poppins"
              >
                Trusted by learners{' '}
                <span 
                  className="bg-gradient-to-r from-[#D90429] to-[#A91D3A] bg-clip-text text-transparent"
                >
                  worldwide
                </span>
              </motion.h2>
              <motion.p 
                variants={itemVariants}
                className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed font-poppins"
              >
                Join thousands of learners who have transformed their YouTube learning experience
              </motion.p>
            </motion.div>

            <motion.div 
              variants={containerVariants}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  className="text-center group p-8 rounded-2xl transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: 'rgba(217, 4, 41, 0.15)',
                      border: '1px solid rgba(217, 4, 41, 0.3)'
                    }}
                  >
                    <stat.icon 
                      className="h-8 w-8 transition-all duration-300"
                      style={{ color: '#D90429' }}
                    />
                  </div>
                  <div 
                    className="text-4xl md:text-5xl font-bold mb-3 font-poppins"
                    style={{ color: '#ffffff' }}
                  >
                    {stat.number}
                  </div>
                  <div 
                    className="text-lg font-medium font-poppins"
                    style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                  >
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Background decorative elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div 
              className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full blur-3xl opacity-8"
              style={{ background: 'radial-gradient(circle, rgba(217, 4, 41, 0.2) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute bottom-1/4 left-1/4 w-40 h-40 rounded-full blur-3xl opacity-6"
              style={{ background: 'radial-gradient(circle, rgba(169, 29, 58, 0.15) 0%, transparent 70%)' }}
            ></div>
          </div>
        </section>

        {/* Features Section */}
        <motion.section 
          id="features"
          ref={featuresRef}
          data-section="2"
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
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight text-white font-poppins">
                Everything you need to{' '}
                <span 
                  className="bg-gradient-to-r from-[#D90429] to-[#A91D3A] bg-clip-text text-transparent"
                >
                  learn smarter
                </span>
              </h2>
              <p className="text-xl text-white/70 max-w-4xl mx-auto leading-relaxed font-poppins">
                StreamSmart combines cutting-edge AI with intuitive design to deliver the ultimate YouTube learning experience.
              </p>
            </motion.div>

            {/* Modern Framer-Style Grid */}
            <div className="max-w-7xl mx-auto">
              {/* First Row - Hero Feature */}
              <motion.div
                variants={featuresCardVariants}
                className="mb-12"
              >
                <div className="group cursor-pointer">
                  <motion.div
                    whileHover={{ 
                      scale: 1.01,
                      y: -6,
                      transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
                    }}
                    className="p-12 rounded-3xl transition-all duration-500 relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(217, 4, 41, 0.08) 0%, rgba(169, 29, 58, 0.04) 100%)',
                      border: '1px solid rgba(217, 4, 41, 0.15)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {/* Gradient overlay on hover */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(217, 4, 41, 0.12) 0%, rgba(169, 29, 58, 0.06) 100%)'
                      }}
                    />
                    
                    <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                      {/* Icon */}
                      <div 
                        className="w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-400 group-hover:scale-110 group-hover:rotate-6"
                        style={{
                          background: 'linear-gradient(135deg, rgba(217, 4, 41, 0.2) 0%, rgba(169, 29, 58, 0.15) 100%)',
                          border: '2px solid rgba(217, 4, 41, 0.4)',
                          boxShadow: '0 10px 30px rgba(217, 4, 41, 0.2)'
                        }}
                      >
                        <BrainIcon 
                          className="h-12 w-12 transition-all duration-300"
                          style={{ color: '#D90429' }}
                        />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 text-center lg:text-left">
                        <h3 className="text-4xl lg:text-5xl font-bold mb-6 font-poppins text-white leading-tight">
                          AI-Powered Learning
                        </h3>
                        <p className="text-xl lg:text-2xl font-poppins leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          Transform any topic into structured learning paths with AI-generated playlists, mind maps, and personalized recommendations.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Second Row - 2x2 Grid */}
              <motion.div
                variants={featuresSectionVariants}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12"
              >
                {features.slice(1, 3).map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    variants={featuresCardVariants}
                    custom={index + 1}
                    className="group cursor-pointer"
                    whileHover={{ 
                      scale: 1.02,
                      y: -8,
                      transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] }
                    }}
                  >
                    <div 
                      className="h-full p-10 transition-all duration-400 rounded-2xl relative overflow-hidden"
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(15px)',
                        minHeight: '320px',
                        boxShadow: '0 15px 45px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      {/* Hover glow effect */}
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                        style={{
                          background: 'linear-gradient(135deg, rgba(217, 4, 41, 0.06) 0%, rgba(169, 29, 58, 0.03) 100%)',
                          boxShadow: 'inset 0 0 30px rgba(217, 4, 41, 0.1)'
                        }}
                      />
                      
                      <div className="relative z-10">
                        {/* Icon */}
                        <div className="mb-8">
                          <div 
                            className="w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-400 group-hover:scale-110 group-hover:-rotate-3"
                            style={{
                              background: 'rgba(217, 4, 41, 0.15)',
                              border: '1px solid rgba(217, 4, 41, 0.3)',
                              boxShadow: '0 8px 25px rgba(217, 4, 41, 0.15)'
                            }}
                          >
                            <div style={{ color: '#D90429' }}>
                              {React.cloneElement(feature.icon as React.ReactElement, {
                                className: "h-10 w-10 transition-all duration-300"
                              })}
                            </div>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div>
                          <h3 className="text-3xl font-bold mb-6 font-poppins text-white leading-tight">
                            {feature.title}
                          </h3>
                          <p className="leading-relaxed text-lg font-poppins" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Third Row - 3 Column Grid */}
              <motion.div
                variants={featuresSectionVariants}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {features.slice(3).map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    variants={featuresCardVariants}
                    custom={index + 3}
                    className="group cursor-pointer"
                    whileHover={{ 
                      scale: 1.03,
                      y: -6,
                      transition: { duration: 0.3, ease: "easeOut" }
                    }}
                  >
                    <div 
                      className="h-full p-8 transition-all duration-300 rounded-2xl relative"
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(10px)',
                        minHeight: '280px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)'
                      }}
                    >
                      {/* Subtle hover effect */}
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                        style={{
                          background: 'rgba(217, 4, 41, 0.04)',
                          border: '1px solid rgba(217, 4, 41, 0.1)'
                        }}
                      />
                      
                      <div className="relative z-10">
                        {/* Icon */}
                        <div className="mb-6">
                          <div 
                            className="w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                            style={{
                              background: 'rgba(217, 4, 41, 0.12)',
                              border: '1px solid rgba(217, 4, 41, 0.25)'
                            }}
                          >
                            <div style={{ color: '#D90429' }}>
                              {React.cloneElement(feature.icon as React.ReactElement, {
                                className: "h-8 w-8 transition-all duration-300"
                              })}
                            </div>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div>
                          <h3 className="text-2xl font-bold mb-4 font-poppins text-white">
                            {feature.title}
                          </h3>
                          <p className="leading-relaxed text-base font-poppins" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
          
          {/* Enhanced decorative background elements with crimson theme */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div 
              className="absolute top-16 right-20 w-32 h-32 rounded-full blur-3xl opacity-30"
              style={{ background: 'radial-gradient(circle, rgba(169, 29, 58, 0.4) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute bottom-20 left-16 w-40 h-40 rounded-full blur-3xl opacity-20"
              style={{ background: 'radial-gradient(circle, rgba(199, 54, 80, 0.3) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute top-1/3 left-1/4 w-24 h-24 rounded-full blur-2xl opacity-25"
              style={{ background: 'radial-gradient(circle, rgba(169, 29, 58, 0.35) 0%, transparent 70%)' }}
            ></div>
            <div 
              className="absolute bottom-1/3 right-1/3 w-28 h-28 rounded-full blur-2xl opacity-20"
              style={{ background: 'radial-gradient(circle, rgba(199, 54, 80, 0.25) 0%, transparent 70%)' }}
            ></div>
            
            {/* Subtle grid pattern overlay */}
            <div 
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(169, 29, 58, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(169, 29, 58, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
              }}
            ></div>
          </div>

          {/* Floating particles effect */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full animate-pulse"
                style={{
                  background: '#A91D3A',
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                  opacity: 0.3 + Math.random() * 0.4
                }}
              />
            ))}
          </div>
        </motion.section>

        {/* About Section */}
        <motion.section 
          id="about"
          ref={aboutRef}
          data-section="3"
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
          data-section="4"
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
          data-section="5"
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
          data-section="6"
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