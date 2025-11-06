"use client";

import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  src?: string;
};

export const AnimatedTestimonials = ({
  testimonials,
  autoplay = false,
  className,
  variant = 'dark',
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
  className?: string;
  variant?: 'dark' | 'light';
}) => {
  const [active, setActive] = useState(0);
  const isDark = variant === 'dark';
  const total = testimonials.length;

  const handleNext = () => {
    setActive((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleSelect = (index: number) => {
    setActive(index);
  };

  const isActive = (index: number) => {
    return index === active;
  };

  useEffect(() => {
    if (autoplay) {
      const interval = setInterval(handleNext, 5000);
      return () => clearInterval(interval);
    }
  }, [autoplay]);

  const randomRotateY = () => {
    return Math.floor(Math.random() * 21) - 10;
  };

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full flex-col gap-10 overflow-hidden rounded-[40px] px-6 py-12 md:px-12",
        isDark
          ? "border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),rgba(0,0,0,0.65))] shadow-[0_45px_80px_-40px_rgba(0,0,0,0.55)]"
          : "border border-black/5 bg-[radial-gradient(circle_at_top_left,#FFFFFF,#F4F5FA)] shadow-[0_45px_80px_-48px_rgba(15,23,42,0.12)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
        <div
          className={cn(
            "absolute -right-32 top-0 h-[320px] w-[320px] rounded-full blur-[160px]",
            isDark ? "bg-white/20" : "bg-black/5"
          )}
        />
        <div
          className={cn(
            "absolute -bottom-32 left-10 h-[260px] w-[260px] rounded-full blur-[140px]",
            isDark ? "bg-white/10" : "bg-black/5"
          )}
        />
      </div>

      <div className="relative grid gap-12 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:items-center">
        <div className="relative flex flex-col gap-6">
          <span
            className={cn(
              "w-fit rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em]",
              isDark ? "bg-white/10 text-white/70" : "bg-white text-black/60 shadow-[0_16px_32px_-20px_rgba(15,23,42,0.18)]"
            )}
          >
            Trusted voices
          </span>

          <div
            className={cn(
              "relative h-72 w-full overflow-hidden rounded-[32px]",
              isDark
                ? "border border-white/15 bg-white/5"
                : "border border-black/10 bg-white"
            )}
          >
            <AnimatePresence>
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={`${testimonial.name}-${index}`}
                  initial={{
                    opacity: 0,
                    scale: 0.9,
                    z: -100,
                    rotate: randomRotateY(),
                  }}
                  animate={{
                    opacity: isActive(index) ? 1 : 0.6,
                    scale: isActive(index) ? 1 : 0.95,
                    z: isActive(index) ? 0 : -100,
                    rotate: isActive(index) ? 0 : randomRotateY(),
                    zIndex: isActive(index) ? 30 : testimonials.length + 2 - index,
                    y: isActive(index) ? [0, -40, 0] : 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    z: 100,
                    rotate: randomRotateY(),
                  }}
                  transition={{
                    duration: 0.5,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 origin-bottom"
                >
                  {testimonial.src ? (
                    <Image
                      src={testimonial.src}
                      alt={testimonial.name}
                      width={480}
                      height={480}
                      draggable={false}
                      className="h-full w-full rounded-[28px] object-cover object-center"
                    />
                  ) : (
                    <div
                      className={cn(
                        "flex h-full w-full items-center justify-center rounded-[28px] border text-xs font-semibold uppercase tracking-[0.24em]",
                        isDark
                          ? "border-white/20 bg-white/5 text-white/60"
                          : "border-black/10 bg-[#F6F6F8] text-black/40"
                      )}
                    >
                      Creative Placeholder
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex min-h-[280px] flex-col justify-between">
          <motion.div
            key={active}
            initial={{
              y: 20,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: -20,
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
              ease: "easeInOut",
            }}
          >
            <div
              className={cn(
                "flex flex-col gap-6 rounded-[32px] border px-8 py-8",
                isDark
                  ? "border-white/15 bg-white/5 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.45)]"
                  : "border-black/5 bg-white shadow-[0_35px_70px_-45px_rgba(15,23,42,0.12)]"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h3 className={cn("text-[26px] font-semibold", isDark ? "text-white" : "text-black")}>
                    {testimonials[active].name}
                  </h3>
                  <p
                    className={cn(
                      "text-[11px] uppercase tracking-[0.32em]",
                      isDark ? "text-white/60" : "text-black/50"
                    )}
                  >
                    {testimonials[active].designation}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, index) => (
                    <Star
                      key={index}
                      className={cn(
                        "h-4 w-4",
                        isDark ? "fill-white/70 text-white/70" : "fill-black/20 text-black/40"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <span className={cn("text-4xl", isDark ? "text-white/60" : "text-black/20")}>“</span>
                <motion.p
                  className={cn("text-[19px] leading-[32px]", isDark ? "text-white/80" : "text-black/70")}
                >
                  {testimonials[active].quote.split(" ").map((word, index) => (
                    <motion.span
                      key={index}
                      initial={{
                        filter: "blur(10px)",
                        opacity: 0,
                        y: 5,
                      }}
                      animate={{
                        filter: "blur(0px)",
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        duration: 0.25,
                        ease: "easeInOut",
                        delay: 0.015 * index,
                      }}
                      className="inline-block"
                    >
                      {word}&nbsp;
                    </motion.span>
                  ))}
                </motion.p>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col gap-5 pt-8 md:flex-row md:items-center md:justify-between md:pt-0">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold",
                  isDark ? "bg-white/10 text-white/70" : "bg-white text-black/60 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.22)]"
                )}
              >
                {String(active + 1).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelect(index)}
                    className={cn(
                      "h-2.5 w-8 rounded-full transition-all",
                      index === active
                        ? isDark
                          ? "bg-white"
                          : "bg-black"
                        : isDark
                          ? "bg-white/20"
                          : "bg-black/10"
                    )}
                    aria-label={`Show testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                className={cn(
                  "group flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-300 hover:-translate-y-1",
                  isDark
                    ? "border border-white/30 bg-white/5 text-white"
                    : "border border-black/10 bg-white text-black shadow-[0_14px_28px_-18px_rgba(15,23,42,0.18)]"
                )}
              >
                <IconArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
              </button>
              <button
                onClick={handleNext}
                className={cn(
                  "group flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-300 hover:-translate-y-1",
                  isDark
                    ? "border border-white/30 bg-white/5 text-white"
                    : "border border-black/10 bg-white text-black shadow-[0_14px_28px_-18px_rgba(15,23,42,0.18)]"
                )}
              >
                <IconArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
