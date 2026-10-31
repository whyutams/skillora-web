"use client";

import * as React from "react";
import { Info, BookOpen, Star } from "lucide-react";

export type CourseTabKey = "about" | "syllabus" | "reviews";
export type NavTabKey = CourseTabKey;

interface NavTabKursusProps {
  activeTab: CourseTabKey;
  onTabChange: (tab: CourseTabKey) => void;
  totalModules: number;
  totalReviews: number;
}

export function NavTabKursus({
  activeTab,
  onTabChange,
  totalModules,
  totalReviews,
}: NavTabKursusProps) {
  const tabs = [
    {
      key: "about" as CourseTabKey,
      label: "Tentang",
      icon: Info,
      badge: null,
    },
    {
      key: "syllabus" as CourseTabKey,
      label: "Silabus",
      icon: BookOpen,
      badge: totalModules > 0 ? `${totalModules}` : null,
    },
    {
      key: "reviews" as CourseTabKey,
      label: "Testimoni",
      icon: Star,
      badge: totalReviews > 0 ? `${totalReviews}` : null,
    },
  ];

  return (
    <div className="w-full border-b border-stone-200 dark:border-stone-800">
      <div
        role="tablist"
        aria-label="Navigasi Informasi Kursus"
        className="flex items-center gap-1 sm:gap-2 -mb-px overflow-x-auto no-scrollbar py-1"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.key)}
              className={`group inline-flex items-center gap-2 py-3.5 px-4 sm:px-6 rounded-t-xl font-bold text-sm tracking-tight transition-all relative whitespace-nowrap cursor-pointer select-none ${
                isActive
                  ? "text-[#0F3E2E] dark:text-emerald-400 border-b-2 border-[#0F3E2E] dark:border-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 font-extrabold"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100/60 dark:hover:bg-stone-800/40"
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive
                    ? "text-[#0F3E2E] dark:text-emerald-400"
                    : "text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300"
                }`}
              />
              <span>{tab.label}</span>

              {tab.badge && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                    isActive
                      ? "bg-[#0F3E2E] text-white dark:bg-emerald-600"
                      : "bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-400 group-hover:bg-stone-300/80 dark:group-hover:bg-stone-700"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const CourseTabNav = NavTabKursus;

