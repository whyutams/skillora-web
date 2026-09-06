"use client";

import * as React from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  formatter?: (val: number) => string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1200,
  prefix = "",
  suffix = "",
  formatter,
  className = "",
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const elementRef = React.useRef<HTMLSpanElement>(null);
  const isIntersectingRef = React.useRef(false);
  const currentValRef = React.useRef(0);
  const rafIdRef = React.useRef<number | null>(null);

  const animateTo = React.useCallback(
    (targetVal: number) => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      const startVal = currentValRef.current;
      const endVal = targetVal;

      if (startVal === endVal) {
        setDisplayValue(endVal);
        return;
      }

      const startTime = performance.now();
      const easeOutCubic = (t: number): number => {
        return 1 - Math.pow(1 - t, 3);
      };

      const step = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);

        const current = Math.round(startVal + (endVal - startVal) * easedProgress);
        currentValRef.current = current;
        setDisplayValue(current);

        if (progress < 1) {
          rafIdRef.current = requestAnimationFrame(step);
        } else {
          currentValRef.current = endVal;
          setDisplayValue(endVal);
        }
      };

      rafIdRef.current = requestAnimationFrame(step);
    },
    [duration]
  );

  // Setup intersection observer
  React.useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          isIntersectingRef.current = true;
          animateTo(value);
        }
      },
      {
        threshold: 0.1,
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [animateTo, value]);

  // When value changes after initial mount / data fetch
  React.useEffect(() => {
    if (isIntersectingRef.current) {
      animateTo(value);
    }
  }, [value, animateTo]);

  const formattedNumber = formatter
    ? formatter(displayValue)
    : displayValue.toLocaleString("id-ID");

  return (
    <span ref={elementRef} className={className}>
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
}
