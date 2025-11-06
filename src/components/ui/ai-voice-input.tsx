"use client";

import { Mic } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
}

export function AIVoiceInput({
  onStart,
  onStop,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className
}: AIVoiceInputProps) {
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (submitted) {
      onStart?.();
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      onStop?.(time);
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [submitted, time, onStart, onStop]);

  useEffect(() => {
    if (!isDemo) return;

    let timeoutId: NodeJS.Timeout;
    const runAnimation = () => {
      setSubmitted(true);
      timeoutId = setTimeout(() => {
        setSubmitted(false);
        timeoutId = setTimeout(runAnimation, 1000);
      }, demoInterval);
    };

    const initialTimeout = setTimeout(runAnimation, 100);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(initialTimeout);
    };
  }, [isDemo, demoInterval]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClick = () => {
    if (isDemo) {
      setIsDemo(false);
      setSubmitted(false);
    } else {
      setSubmitted((prev) => !prev);
    }
  };

  return (
    <div className={cn("w-auto py-0", className)}>
      <div className="relative flex items-center flex-col gap-1">
        <button
          className={cn(
            "group w-10 h-10 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
            submitted
              ? "bg-none"
              : "bg-none hover:bg-black/10 dark:hover:bg-white/10"
          )}
          type="button"
          onClick={handleClick}
        >
          {submitted ? (
            <div
              className="w-4 h-4 rounded-sm animate-spin bg-black dark:bg-white cursor-pointer pointer-events-auto"
              style={{ animationDuration: "3s" }}
            />
          ) : (
            <Mic className="w-4 h-4 text-black/70 dark:text-white/70" />
          )}
        </button>

        {submitted && (
          <>
            <span
              className={cn(
                "font-mono text-xs transition-opacity duration-300 text-black/70 dark:text-white/70"
              )}
            >
              {formatTime(time)}
            </span>

            <div className="h-3 w-32 flex items-center justify-center gap-0.5">
              {[...Array(visualizerBars)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-0.5 rounded-full transition-all duration-300",
                    submitted
                      ? "bg-black/50 dark:bg-white/50 animate-pulse"
                      : "bg-black/10 dark:bg-white/10 h-0.5"
                  )}
                  style={
                    submitted && isClient
                      ? {
                          height: `${20 + Math.random() * 80}%`,
                          animationDelay: `${i * 0.05}s`,
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          </>
        )}

        <p className="h-3 text-xs text-black/50 dark:text-white/50 text-center whitespace-nowrap">
          {submitted ? "Recording" : "Click to speak"}
        </p>
      </div>
    </div>
  );
}
