import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";

// Note: SplitText is a premium GSAP plugin. 
// For this implementation, we'll create a fallback that splits text manually
// If you have GSAP SplitText license, uncomment the lines below:
// import { ScrollTrigger } from "gsap/ScrollTrigger";
// import { SplitText as GSAPSplitText } from "gsap/SplitText";
// gsap.registerPlugin(ScrollTrigger, GSAPSplitText);

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: "chars" | "words";
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  onLetterAnimationComplete?: () => void;
  stagger?: number;
  trigger?: boolean;
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = "",
  delay = 0,
  duration = 0.6,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  onLetterAnimationComplete,
  stagger = 0.05,
  trigger = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const animationCompletedRef = useRef(false);

  useEffect(() => {
    if (!trigger || animationCompletedRef.current) return;
    
    const el = ref.current;
    if (!el) return;

    const chars = el.querySelectorAll('.split-char');
    
    if (chars.length === 0) return;

    // Set initial state
    gsap.set(chars, from);

    // Create animation timeline
    const tl = gsap.timeline({
      delay: delay,
      onComplete: () => {
        animationCompletedRef.current = true;
        onLetterAnimationComplete?.();
      },
    });

    // Animate characters
    tl.to(chars, {
      ...to,
      duration,
      ease,
      stagger: stagger,
    });

    return () => {
      tl.kill();
      gsap.killTweensOf(chars);
    };
  }, [text, delay, duration, ease, from, to, stagger, trigger, onLetterAnimationComplete]);

  const splitText = () => {
    if (splitType === "chars") {
      return text.split('').map((char, index) => (
        <span 
          key={index} 
          className="split-char"
          style={{ 
            display: 'inline-block',
            whiteSpace: 'nowrap',
            color: index === 0 ? '#FF0000' : 'inherit', // First letter bright YouTube red
            verticalAlign: 'baseline',
            lineHeight: 'inherit'
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ));
    } else {
      return text.split(' ').map((word, index) => (
        <span key={index} className="split-char inline-block mr-2">
          {word}
        </span>
      ));
    }
  };

  return (
    <div
      ref={ref}
      className={`split-parent ${className}`}
      style={{
        display: 'inline-block',
        whiteSpace: 'nowrap',
        lineHeight: 'inherit'
      }}
    >
      {splitText()}
    </div>
  );
};

export default SplitText; 