"use client";

import * as React from "react";
import { Code, Terminal, Palette, BookOpen, GraduationCap } from "lucide-react";

interface BannerKursusPlaceholderProps {
  title?: string;
  slug?: string;
  className?: string;
}

export function BannerKursusPlaceholder({
  title = "Kursus Skillora",
  slug = "",
  className = "",
}: BannerKursusPlaceholderProps) {
  const s = (slug || "").toLowerCase();

  const getIcon = () => {
    if (s.includes("web") || s.includes("html") || s.includes("react") || s.includes("next")) {
      return <Code className="w-8 h-8 text-emerald-400" />;
    }
    if (s.includes("python") || s.includes("code") || s.includes("backend") || s.includes("otomasi")) {
      return <Terminal className="w-8 h-8 text-amber-400" />;
    }
    if (s.includes("design") || s.includes("ui") || s.includes("ux") || s.includes("figma")) {
      return <Palette className="w-8 h-8 text-purple-400" />;
    }
    return <BookOpen className="w-8 h-8 text-teal-400" />;
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-stone-900 via-[#0A261C] to-stone-950 text-white select-none ${className}`}
    >
      {/* Decorative ambient glow */}
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Grid texture */}
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Center Emblem with Logo / Icon */}
      <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center space-y-2.5">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 dark:bg-stone-800/80 border border-emerald-500/30 backdrop-blur-md flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
          {getIcon()}
        </div>

        <div className="space-y-0.5 max-w-[85%]"> 
          <p className="text-xs font-bold text-stone-200 line-clamp-1 tracking-tight">
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}

export const CoursePlaceholderBanner = BannerKursusPlaceholder;
