'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ZapIcon, LightbulbIcon, BrainIcon, ListVideoIcon, CircleCheck, BarChart3Icon, BookOpenIcon, UsersIcon, Star, ArrowRight, PlayCircle, Sparkles, Users, Award, TrendingUp, Shield, Clock, Mail, Linkedin, ExternalLink, Target, Brain, Share2, Zap, MessageSquare, Bot, Trophy, Medal, Code, Layers, Globe, Cpu } from 'lucide-react';
import SplitText from '@/components/ui/split-text';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';

// Dark theme color palette
const colors = {
  background: {
    base: '#0A0A0B',
    surface: '#111113',
    elevated: '#1C1C1E',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B3B3B3',
    tertiary: '#8A8A8A',
  },
  purple: {
    primary: '#8B5CF6',
    secondary: '#A855F7',
    subtle: '#C084FC',
    glow: 'rgba(139, 92, 246, 0.2)',
    dark: '#7C3AED',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #0A0A0B 0%, #1A1A2E 50%, #16213E 100%)',
    card: 'linear-gradient(145deg, #111113 0%, #1C1C1E 100%)',
    purple: 'linear-gradient(90deg, #8B5CF6 0%, #A855F7 100%)',
    purpleRadial: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
  }
};

// Enhanced animation variants
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

const heroVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.8,
      staggerChildren: 0.2,
    },
  },
};

const heroItemVariants = {
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

// Particle component for background effects
const ParticleSystem = ({ count = 50, className = "" }) => {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full animate-float-gentle"
          style={{
            background: colors.purple.subtle,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${4 + Math.random() * 6}s`,
            opacity: 0.3 + Math.random() * 0.4,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
    </div>
  );
};

// Floating geometric shapes component
const FloatingShapes = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Purple geometric shapes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute opacity-20"
          style={{
            left: `${15 + i * 12}%`,
            top: `${20 + (i % 4) * 20}%`,
            background: colors.purple.subtle,
            filter: 'blur(1px)',
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 180, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        >
          {i % 2 === 0 ? (
            <div className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-6 h-6 rotate-45 rounded-sm" />
          )}
        </motion.div>
      ))}
    </div>
  );
};

const features = [
  {
    icon: <Brain className="h-8 w-8" />,
    title: 'AI-Powered Learning',
    description: 'Transform any topic into structured learning paths with AI-generated playlists, mind maps, and personalized recommendations.',
    gradient: 'from-purple-500/20 to-blue-500/20',
  },
  {
    icon: <Code className="h-8 w-8" />,
    title: 'Smart Code Analysis',
    description: 'Automatically analyze programming tutorials and create interactive coding exercises tailored to your skill level.',
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  {
    icon: <Layers className="h-8 w-8" />,
    title: 'Visual Mind Maps',
    description: 'Convert complex topics into beautiful, interactive mind maps that make learning intuitive and memorable.',
    gradient: 'from-purple-500/20 to-cyan-500/20',
  },
  {
    icon: <BarChart3Icon className="h-8 w-8" />,
    title: 'Progress Analytics',
    description: 'Track your learning journey with detailed analytics, completion rates, and personalized insights.',
    gradient: 'from-purple-500/20 to-green-500/20',
  },
  {
    icon: <Globe className="h-8 w-8" />,
    title: 'Global Community',
    description: 'Connect with learners worldwide, share knowledge, and collaborate on learning projects.',
    gradient: 'from-purple-500/20 to-orange-500/20',
  },
  {
    icon: <Cpu className="h-8 w-8" />,
    title: 'Neural Processing',
    description: 'Advanced AI models understand context and provide relevant, personalized learning recommendations.',
    gradient: 'from-purple-500/20 to-red-500/20',
  },
];

const testimonials = [
  {
    name: "Naveen Sekhar",
    role: "CyberSecurity Student",
    content: "Fantastic work! The way you've integrated AI to turn YouTube videos into interactive lessons with mind maps and quizzes is super impressive. The platform feels fresh and genuinely useful for learners.",
    avatar: "NS",
    rating: 5
  },
  {
    name: "Anandavalli",
    role: "MBBS UG Student", 
    content: "I've increased my learning efficiency by 300%. The personalized quizzes ensure I actually retain what I watch.",
    avatar: "AV",
    rating: 5
  },
  {
    name: "Dhanushya Sai",
    role: "Data Science Student",
    content: "Overall impressive work! The AI recommendations are spot-on and save me hours of searching for quality content.",
    avatar: "DS",
    rating: 5
  }
];

const stats = [
  { number: "50+", label: "Active Learners", icon: Users },
  { number: "1K+", label: "Videos Organized", icon: PlayCircle },
  { number: "98%", label: "User Satisfaction", icon: Star },
  { number: "5x", label: "Faster Learning", icon: TrendingUp },
];

export default function LandingPage() {
  const [pushTransitionComplete, setPushTransitionComplete] = useState(false);
  const [canNavbarAppear, setCanNavbarAppear] = useState(false);
  const [showNavbar, setShowNavbar] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

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

  // Initialize page
  useEffect(() => {
    setIsLoaded(true);
    const timer = setTimeout(() => {
      setPushTransitionComplete(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Navbar visibility logic
  useEffect(() => {
    if (pushTransitionComplete) {
      const timer = setTimeout(() => {
        setCanNavbarAppear(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setCanNavbarAppear(false);
    }
  }, [pushTransitionComplete]);

  useEffect(() => {
    const handleScrollBasedNavbar = () => {
      if (!canNavbarAppear) {
        setShowNavbar(false);
        return;
      }
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowNavbar(scrollTop <= 50);
    };

    handleScrollBasedNavbar();
    window.addEventListener('scroll', handleScrollBasedNavbar);
    return () => window.removeEventListener('scroll', handleScrollBasedNavbar);
  }, [canNavbarAppear]);

  // Section navigation
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
  
  const sections = [
    { id: 'hero', name: 'Hero' },
    { id: 'features', name: 'Features' },
    { id: 'about', name: 'About' },
    { id: 'testimonials', name: 'Testimonials' },
    { id: 'how-it-works', name: 'How It Works' },
    { id: 'contact', name: 'Contact' }
  ];

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
      className="relative min-h-screen"
      style={{
        background: colors.background.base,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth'
      }}
    >
      {/* Splash screen removed for a seamless entry experience */}

      {/* Enhanced Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ 
          opacity: showNavbar ? 1 : 0,
          y: showNavbar ? 0 : -20
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          background: showNavbar ? 'rgba(10, 10, 11, 0.9)' : 'transparent',
          backdropFilter: showNavbar ? 'blur(20px)' : 'none',
          borderBottom: showNavbar ? `1px solid ${colors.background.elevated}` : 'none'
        }}
      >
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="text-white font-bold text-2xl flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: colors.gradients.purple }}
            >
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span style={{ color: colors.text.primary }}>StreamSmart</span>
          </Link>
          
        <div className="flex items-center gap-6">
            {['About', 'Features', 'Demo'].map((item) => (
          <Link 
                key={item}
                href={`#${item.toLowerCase()}`}
                className="relative group transition-all duration-300 text-sm font-medium"
                style={{ color: colors.text.secondary }}
              >
                {item}
                <span 
                  className="absolute left-0 bottom-[-2px] w-0 h-0.5 transition-all duration-300 group-hover:w-full"
                  style={{ background: colors.purple.primary }}
                />
          </Link>
            ))}
            <Link href="/register">
              <Button 
                className="font-medium px-6 py-2 text-sm transition-all duration-300 rounded-lg relative overflow-hidden group"
                style={{
                  background: colors.gradients.purple,
                  color: colors.text.primary,
                  border: 'none'
                }}
              >
                <span className="relative z-10">Get Started Free</span>
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                  }}
                />
              </Button>
          </Link>
          <Link href="/login">
            <Button 
                variant="outline"
                className="font-medium px-6 py-2 text-sm transition-all duration-300 rounded-lg border"
                style={{
                  color: colors.text.primary,
                  borderColor: colors.purple.primary,
                  background: 'transparent'
                }}
            >
                Login
            </Button>
          </Link>
          </div>
        </div>
      </motion.nav>

      {/* Side Navigation Dots */}
      <nav className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50 hidden lg:block">
        <div className="flex flex-col space-y-4">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => navigateToSection(index)}
              className={`group relative w-3 h-3 rounded-full transition-all duration-300 ${
                currentSection === index 
                  ? 'scale-125' 
                  : 'hover:scale-110'
              }`}
              style={{
                background: currentSection === index 
                  ? colors.purple.primary 
                  : colors.purple.glow,
                boxShadow: currentSection === index 
                  ? `0 0 15px ${colors.purple.glow}` 
                  : 'none'
              }}
              aria-label={`Navigate to ${section.name}`}
            >
              <span 
                className="absolute right-6 top-1/2 transform -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none"
                style={{
                  background: colors.background.surface,
                  color: colors.text.primary,
                  border: `1px solid ${colors.background.elevated}`,
                }}
              >
                {section.name}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative">
        {/* Hero Section - Completely Redesigned with Video Background */}
        <section 
          id="hero"
          data-section="0"
          className="relative h-screen flex items-center justify-center overflow-hidden"
          style={{ 
            scrollSnapAlign: 'start',
            background: colors.background.base,
          }}
        >
          {/* Video Background */}
          <div className="absolute inset-0 w-full h-full z-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/StreamSmart.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            {/* Dark Overlay */}
            <div 
              className="absolute inset-0 w-full h-full"
              style={{ background: 'rgba(0, 0, 0, 0.6)' }}
            />
          </div>
            
          {/* Hero Content - Centered */}
          <div className="relative z-10 h-full w-full flex flex-col items-center justify-center text-center">
            <div className="container mx-auto px-6 max-w-4xl">
              <motion.div 
                className="flex flex-col items-center justify-center space-y-8"
                style={{ position: 'relative', top: '50px' }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: pushTransitionComplete ? 1 : 0, y: pushTransitionComplete ? 0 : 50 }}
                transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
              >
                {/* Main Headline with Typewriter Effect */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: pushTransitionComplete ? 1 : 0 }}
                  transition={{ delay: 1.4, duration: 0.8 }}
                >
                  <h1 
                    className="font-extrabold leading-tight mb-4"
                  style={{
                      fontSize: '70px',
                      color: colors.text.primary,
                      letterSpacing: '-0.02em',
                      textShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }}
                  >
                    Turn Every Video into{' '}
                    <span 
                      style={{
                        background: colors.gradients.purple,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}
                    >
                      Knowledge
                    </span>
                  </h1>
                </motion.div>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: pushTransitionComplete ? 1 : 0, y: pushTransitionComplete ? 0 : 10 }}
                  transition={{ delay: 2.0, duration: 0.8, ease: "easeOut" }}
                  className="text-lg md:text-xl leading-relaxed max-w-2xl"
                    style={{
                    color: colors.text.secondary,
                    fontSize: '18px',
                    lineHeight: '1.7',
                    position: 'relative',
                    top: '-15px'
                  }}
                >
                  StreamSmart transforms passive watching into active, goal-driven learning with AI-curated 
                  learning paths, smart summaries, and personalized playlists.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: pushTransitionComplete ? 1 : 0, y: pushTransitionComplete ? 0 : 20 }}
                  transition={{ delay: 2.4, duration: 0.8, ease: "easeOut" }}
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <Link href="/register">
                    <Button
                      className="group relative font-semibold px-8 py-4 text-base transition-all duration-300 rounded-xl overflow-hidden"
                      style={{
                        background: colors.gradients.purple,
                        color: colors.text.primary,
                        border: 'none',
                        boxShadow: `0 8px 25px ${colors.purple.glow}`
                      }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Start Learning Now
                        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                      <motion.div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                        }}
                      />
                    </Button>
                  </Link>
                  
                  <Button
                    variant="outline"
                    className="font-medium px-8 py-4 text-base transition-all duration-300 rounded-xl group"
                        style={{
                      color: colors.text.primary,
                      borderColor: colors.purple.primary,
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <PlayCircle className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:scale-110" />
                    Watch Demo
                  </Button>
                </motion.div>
              </motion.div>
                    </div>
                  </div>

          {/* Scroll Indicator */}
          <motion.div
                  initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3, duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2"
          >
                  <span 
              className="text-sm font-medium"
              style={{ color: colors.text.tertiary }}
            >
              Scroll to explore
                  </span>
            <div 
              className="w-6 h-10 border-2 rounded-full flex justify-center"
              style={{ borderColor: colors.purple.primary }}
            >
              <motion.div
                className="w-1 h-3 rounded-full mt-2"
                style={{ background: colors.purple.primary }}
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
              </div>
            </motion.div>
        </section>

        {/* Features Section - Bento Grid Style */}
        <motion.section 
          id="features"
          ref={featuresRef}
          data-section="1"
          className="min-h-screen py-20 relative overflow-hidden"
          style={{ 
            scrollSnapAlign: 'start',
            background: colors.background.base
          }}
          initial="hidden"
          animate={featuresInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          {/* Background Grid */}
          <div className="absolute inset-0">
            <div 
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `
                  linear-gradient(${colors.purple.primary} 1px, transparent 1px),
                  linear-gradient(90deg, ${colors.purple.primary} 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }}
            />
            <ParticleSystem count={20} />
          </div>

          <div className="container mx-auto px-6 max-w-7xl relative z-10">
            {/* Header */}
            <motion.div
              variants={itemVariants}
              className="text-center mb-16"
            >
              <Badge 
                className="mb-6 px-4 py-2 text-sm font-medium border"
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderColor: colors.purple.primary,
                  color: colors.purple.primary
                }}
              >
                ✨ Features
              </Badge>
              <h2 
                className="font-bold mb-6 leading-tight"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 4rem)',
                  fontWeight: 700,
                  color: colors.text.primary
                }}
              >
                Smart Learning{' '}
                <span 
                  style={{
                    background: colors.gradients.purple,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  Made Visual
                </span>
              </h2>
              <p 
                className="text-xl leading-relaxed max-w-2xl mx-auto"
                style={{ color: colors.text.secondary }}
              >
                Experience the future of education through AI-powered features that adapt to your learning style
              </p>
            </motion.div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Large Feature Card - AI Mind Maps */}
                  <motion.div
                variants={itemVariants}
                className="md:col-span-2 lg:col-span-2 group cursor-pointer"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div 
                  className="h-full p-8 rounded-3xl border backdrop-blur-xl relative overflow-hidden"
                  style={{
                    background: colors.gradients.card,
                    borderColor: colors.background.elevated,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {/* Hover glow effect */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                    style={{
                      background: colors.purple.glow,
                      filter: 'blur(20px)',
                    }}
                  />
                  
                  <div className="relative z-10">
                    <div className="flex items-center mb-6">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mr-4"
                        style={{
                          background: colors.purple.glow,
                          border: `1px solid ${colors.purple.primary}`
                        }}
                      >
                        <Brain className="h-7 w-7" style={{ color: colors.purple.primary }} />
                      </div>
                      <h3 
                        className="text-3xl font-bold"
                        style={{ color: colors.text.primary }}
                      >
                        AI Mind Maps
                      </h3>
                    </div>
                    <p 
                      className="text-lg leading-relaxed mb-6"
                      style={{ color: colors.text.secondary }}
                    >
                      Transform any video into interactive visual knowledge maps. Our AI analyzes content 
                      and creates structured learning paths that make complex topics intuitive.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Visual Learning', 'AI Powered', 'Interactive'].map((tag) => (
                        <span 
                          key={tag}
                          className="px-3 py-1 rounded-full text-sm font-medium"
                          style={{
                            background: colors.purple.glow,
                            color: colors.purple.primary
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      </div>
                    </div>
                  
                  {/* Decorative visualization */}
                  <div className="absolute top-4 right-4 opacity-20">
                    <Share2 className="h-16 w-16" style={{ color: colors.purple.primary }} />
                    </div>
                  </div>
                </motion.div>

              {/* Smaller Feature Cards */}
              {features.slice(0, 4).map((feature, index) => (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  className={`group cursor-pointer ${index === 0 ? 'md:col-span-1' : ''}`}
                  whileHover={{ y: -5, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <div 
                    className="h-full p-6 rounded-2xl border backdrop-blur-xl relative overflow-hidden"
                    style={{
                      background: colors.gradients.card,
                      borderColor: colors.background.elevated,
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {/* Hover glow */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: colors.purple.glow,
                        filter: 'blur(15px)',
                      }}
                    />
                    
                    <div className="relative z-10">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                        style={{
                          background: colors.purple.glow,
                          border: `1px solid ${colors.purple.primary}`
                        }}
                      >
                        {React.cloneElement(feature.icon, { 
                          style: { color: colors.purple.primary }
                        })}
                      </div>
                      <h3 
                        className="text-xl font-bold mb-3"
                        style={{ color: colors.text.primary }}
                      >
                        {feature.title}
                      </h3>
                      <p 
                        className="text-sm leading-relaxed"
                        style={{ color: colors.text.secondary }}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              </div>
          </div>
        </motion.section>

        {/* About Section */}
        <motion.section 
          id="about"
          ref={aboutRef}
          data-section="2"
          className="min-h-screen py-20 relative overflow-hidden flex items-center"
          style={{ 
            scrollSnapAlign: 'start',
            background: colors.background.base
          }}
          initial="hidden"
          animate={aboutInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          {/* Background Effects */}
          <div className="absolute inset-0">
            {/* Animated constellation pattern */}
            <div className="absolute inset-0">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: colors.purple.primary,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    opacity: 0.3,
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>
            <ParticleSystem count={15} />
          </div>

          <div className="container mx-auto px-6 max-w-7xl relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              {/* Left Content */}
              <motion.div variants={itemVariants} className="space-y-8">
                <h2 
                  className="font-bold leading-tight"
                  style={{
                    fontSize: 'clamp(2rem, 5vw, 4rem)',
                    fontWeight: 700,
                    color: colors.text.primary
                  }}
                >
                  Why Choose{' '}
                  <span 
                    style={{
                      background: colors.gradients.purple,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    StreamSmart?
                </span>
                </h2>
                <p 
                  className="text-xl leading-relaxed"
                  style={{ color: colors.text.secondary }}
                >
                  We're not just another learning platform. We're revolutionizing how you discover, 
                  organize, and master educational content with cutting-edge AI technology.
                </p>
                
                {/* Animated Stats */}
                <div className="grid grid-cols-3 gap-6 py-8">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.2 }}
                      className="text-center"
                    >
                      <div 
                        className="text-3xl font-bold mb-1"
                        style={{ color: colors.purple.primary }}
                      >
                        {stat.number}
                  </div>
                      <div 
                        className="text-sm"
                        style={{ color: colors.text.tertiary }}
                      >
                        {stat.label}
                  </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              
              {/* Right Visual Cards */}
              <motion.div variants={itemVariants} className="space-y-6">
                {[
                  { icon: Brain, title: "AI-Powered", desc: "Advanced machine learning", color: colors.purple.primary },
                  { icon: Users, title: "Global Community", desc: "Learn with peers worldwide", color: colors.purple.secondary },
                  { icon: Target, title: "Personalized", desc: "Tailored to your learning style", color: colors.purple.subtle }
                ].map((card, index) => (
                  <motion.div
                    key={card.title}
                    className="p-6 rounded-2xl border backdrop-blur-xl"
                    style={{
                      background: colors.gradients.card,
                      borderColor: colors.background.elevated,
                    }}
                    whileHover={{ x: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: colors.purple.glow,
                          border: `1px solid ${card.color}`
                        }}
                      >
                        <card.icon className="h-6 w-6" style={{ color: card.color }} />
                    </div>
                    <div>
                        <h3 
                          className="text-lg font-bold mb-1"
                          style={{ color: colors.text.primary }}
                        >
                          {card.title}
                        </h3>
                        <p 
                          className="text-sm"
                          style={{ color: colors.text.secondary }}
                        >
                          {card.desc}
                        </p>
                  </div>
                  </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Testimonials Section */}
        <motion.section 
          ref={testimonialsRef}
          data-section="3"
          className="min-h-screen py-20 flex items-center relative overflow-hidden"
          style={{ 
            scrollSnapAlign: 'start',
            background: colors.background.base
          }}
              initial="hidden"
          animate={testimonialsInView ? "visible" : "hidden"}
              variants={containerVariants}
        >
          <div className="absolute inset-0">
            <ParticleSystem count={25} />
          </div>

          <div className="container mx-auto px-6 max-w-6xl relative z-10">
            <motion.div variants={itemVariants} className="text-center mb-16">
              <Badge 
                className="mb-6 px-4 py-2 text-sm font-medium border"
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderColor: colors.purple.primary,
                  color: colors.purple.primary
                }}
              >
                💬 Testimonials
              </Badge>
              <h2 
                className="font-bold mb-6 leading-tight"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 4rem)',
                  fontWeight: 700,
                  color: colors.text.primary
                }}
              >
                Loved by learners{' '}
                <span 
                  style={{
                    background: colors.gradients.purple,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  worldwide
                </span>
              </h2>
            </motion.div>

            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  variants={itemVariants}
                  className="group"
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <div 
                    className="p-6 h-full rounded-2xl border backdrop-blur-xl relative overflow-hidden"
                    style={{
                      background: colors.gradients.card,
                      borderColor: colors.background.elevated,
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {/* Hover glow */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: colors.purple.glow,
                        filter: 'blur(20px)',
                      }}
                    />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star 
                            key={i} 
                            className="h-4 w-4 fill-current" 
                            style={{ color: '#FFC107' }}
                          />
                        ))}
                      </div>
                      <p 
                        className="italic leading-relaxed"
                        style={{ color: colors.text.secondary }}
                      >
                        "{testimonial.content}"
                      </p>
                      <div className="flex items-center gap-3 pt-4">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white text-sm"
                          style={{
                            background: colors.gradients.purple,
                          }}
                        >
                          {testimonial.avatar}
                        </div>
                        <div>
                          <div 
                            className="font-semibold"
                            style={{ color: colors.text.primary }}
                          >
                            {testimonial.name}
                          </div>
                          <div 
                            className="text-sm"
                            style={{ color: colors.text.tertiary }}
                          >
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
        </motion.section>

        {/* How It Works Section */}
        <motion.section 
          id="how-it-works"
          ref={howItWorksRef}
          data-section="4"
          className="min-h-screen py-20 flex items-center relative overflow-hidden"
          style={{ 
            scrollSnapAlign: 'start',
            background: colors.background.base
          }}
          initial="hidden"
          animate={howItWorksInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <div className="absolute inset-0">
            <ParticleSystem count={20} />
          </div>

          <div className="container mx-auto px-6 max-w-7xl relative z-10">
            <motion.div variants={itemVariants} className="text-center mb-20">
              <Badge 
                className="mb-6 px-4 py-2 text-sm font-medium border"
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderColor: colors.purple.primary,
                  color: colors.purple.primary
                }}
              >
                🚀 How it works
              </Badge>
              <h2 
                className="font-bold mb-8 leading-tight"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 4rem)',
                  fontWeight: 700,
                  color: colors.text.primary
                }}
              >
                Start learning in{' '}
                <span 
                  style={{
                    background: colors.gradients.purple,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  3 simple steps
                </span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {[
                {
                  step: "01",
                  icon: <ListVideoIcon className="h-10 w-10" />,
                  title: "Create Your Playlist",
                  description: "Add YouTube videos manually or let our AI suggest perfect content based on your learning goals."
                },
                {
                  step: "02", 
                  icon: <Brain className="h-10 w-10" />,
                  title: "Learn Interactively",
                  description: "Engage with AI-generated mind maps, take personalized quizzes, and chat with our AI tutor."
                },
                {
                  step: "03",
                  icon: <BarChart3Icon className="h-10 w-10" />,
                  title: "Track & Master",
                  description: "Monitor progress with detailed analytics, celebrate milestones, and watch your understanding grow."
                }
              ].map((step, index) => (
                <motion.div
                  key={step.title}
                  variants={itemVariants}
                  className="relative group"
                  whileHover={{ y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Large step number */}
                  <div 
                    className="absolute -top-8 -left-4 text-8xl font-bold opacity-10"
                    style={{ color: colors.purple.primary }}
                  >
                    {step.step}
                  </div>
                  
                  <div 
                    className="relative p-8 rounded-3xl border backdrop-blur-xl h-full"
                    style={{
                      background: colors.gradients.card,
                      borderColor: colors.background.elevated,
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {/* Hover glow */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                      style={{
                        background: colors.purple.glow,
                        filter: 'blur(20px)',
                      }}
                    />
                    
                    <div className="relative z-10">
                    <div 
                        className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
                      style={{
                          background: colors.purple.glow,
                          border: `1px solid ${colors.purple.primary}`
                          }}
                        >
                          {React.cloneElement(step.icon, {
                          style: { color: colors.purple.primary }
                          })}
                    </div>
                    
                      <h3 
                        className="text-2xl font-bold mb-6 text-center"
                        style={{ color: colors.text.primary }}
                      >
                        {step.title}
                      </h3>
                      <p 
                        className="leading-relaxed text-center"
                        style={{ color: colors.text.secondary }}
                      >
                        {step.description}
                      </p>
                    </div>
                    
                    {/* Step number badge */}
                    <div 
                      className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        background: colors.purple.primary,
                        color: colors.text.primary
                      }}
                    >
                      {index + 1}
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
          </div>
        </motion.section>

        {/* Contact & Footer Section */}
        <motion.section 
          id="contact"
          ref={contactRef}
          data-section="5"
          className="min-h-screen py-20 flex items-center relative overflow-hidden"
          style={{ 
            scrollSnapAlign: 'start',
            background: `linear-gradient(to bottom, ${colors.background.base}, #000000)`
          }}
          initial="hidden"
          animate={contactInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <div className="absolute inset-0">
            <ParticleSystem count={30} />
          </div>

          <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
            <motion.div variants={itemVariants} className="mb-16">
              <h2 
                className="font-bold mb-8 leading-tight"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 4rem)',
                  fontWeight: 700,
                  color: colors.text.primary
                }}
              >
                Get in{' '}
                <span 
                  style={{
                    background: colors.gradients.purple,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  Touch
                </span>
              </h2>
              <p 
                className="text-xl leading-relaxed"
                style={{ color: colors.text.secondary }}
              >
                Have questions or want to connect? Reach out and let's build the future of learning together!
              </p>
            </motion.div>
            
            {/* Contact Information */}
            <motion.div 
              variants={itemVariants} 
              className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-16"
            >
              {[
                {
                  icon: Mail,
                  label: "Email",
                  value: "hsundar080506@gmail.com",
                  href: "mailto:hsundar080506@gmail.com"
                },
                {
                  icon: Linkedin,
                  label: "LinkedIn", 
                  value: "LinkedIn Profile",
                  href: "https://www.linkedin.com/in/hari-sundar-237570286/"
                }
              ].map((contact) => (
                <a 
                  key={contact.label}
                  href={contact.href}
                  target={contact.href.startsWith('http') ? '_blank' : undefined}
                  rel={contact.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group flex items-center gap-4 p-6 rounded-2xl transition-all duration-300 hover:scale-105 border backdrop-blur-xl"
                style={{
                    background: colors.gradients.card,
                    borderColor: colors.background.elevated,
                }}
              >
                <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                      background: colors.purple.glow,
                      border: `1px solid ${colors.purple.primary}`
                    }}
                  >
                    <contact.icon 
                      className="h-7 w-7"
                      style={{ color: colors.purple.primary }}
                  />
                </div>
                <div className="text-left">
                  <div 
                    className="text-sm font-medium mb-1"
                      style={{ color: colors.text.tertiary }}
                  >
                      {contact.label}
                  </div>
                  <div 
                      className="text-lg font-semibold group-hover:text-purple-400 transition-colors duration-300"
                      style={{ color: colors.text.primary }}
                  >
                      {contact.value}
                  </div>
                </div>
                <ExternalLink 
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ color: colors.purple.primary }}
                />
              </a>
              ))}
            </motion.div>
            
            {/* Copyright */}
            <motion.div 
              variants={itemVariants}
              className="pt-12 border-t"
              style={{ borderTopColor: colors.background.elevated }}
            >
              <p 
                className="text-sm"
                style={{ color: colors.text.tertiary }}
              >
                © 2025 StreamSmart. All rights reserved.
              </p>
            </motion.div>
          </div>
        </motion.section>
      </main>

      {/* Add custom CSS for animations */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }
        
        .animate-float-gentle {
          animation: float-gentle 6s ease-in-out infinite;
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }
      `}</style>
    </div>
  );
}