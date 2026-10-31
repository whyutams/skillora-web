"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface KursusHeroHeaderProps {
  title: string;
  shortDescription?: string;
}

export function KursusHeroHeader({
  title,
  shortDescription,
}: KursusHeroHeaderProps) {
  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/#kursus"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800/80 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:border-stone-300 dark:hover:border-stone-700 shadow-2xs transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-stone-500" />
          <span>Kembali</span>
        </Link>
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
          {title}
        </h1>

        {shortDescription && (
          <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed max-w-3xl font-normal">
            {shortDescription}
          </p>
        )}
      </div>
    </div>
  );
}

export const CourseHeroHeader = KursusHeroHeader;

