"use client";

import * as React from "react";
import { CheckCircle2, BookOpen, Target } from "lucide-react";
import { CourseCurriculum } from "@/utils/courseCurriculumParser";

interface TabTentangKursusProps {
  courseTitle: string;
  courseContentHtml?: string | null;
  curriculum: CourseCurriculum;
  whatsappGroupUrl?: string | null;
}

export function TabTentangKursus({
  courseTitle,
  courseContentHtml,
  curriculum,
}: TabTentangKursusProps) {
  const { targetLearning } = curriculum;

  return (
    <div className="space-y-10 mb-8">
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <BookOpen className="w-4 h-4" />
          <span>Informasi Umum & Ringkasan</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Tentang Kelas Ini
        </h2>

        {courseContentHtml ? (
          <div
            className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed max-w-none prose dark:prose-invert [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-stone-900 dark:[&_h1]:text-stone-100 [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-stone-900 dark:[&_h2]:text-stone-100 [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_pre]:bg-stone-900 [&_pre]:text-stone-100 [&_pre]:p-4 [&_pre]:rounded-xl [&_code]:bg-stone-100 dark:[&_code]:bg-stone-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs"
            dangerouslySetInnerHTML={{ __html: courseContentHtml }}
          />
        ) : (
          <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed">
            Kursus mandiri ini dirancang khusus untuk memberi pemahaman mendalam tentang{" "}
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              {courseTitle}
            </span>{" "}
            melalui kurikulum terstruktur langkah demi langkah, latihan praktik langsung,
            dan dukungan bimbingan mentor melalui komunitas diskusi WhatsApp.
          </p>
        )}
      </section>

      <section className="space-y-4 pt-6 border-t border-stone-200/80 dark:border-stone-800/80">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <Target className="w-4 h-4" />
          <span>Hasil Pembelajaran</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Target Pembelajaran
        </h2>

        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
          Setelah menyelesaikan seluruh rangkaian modul pada kursus ini, Anda diharapkan mampu:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {targetLearning.map((outcome, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800/80 shadow-2xs hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-colors"
            >
              <div className="p-1 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-200 leading-snug">
                {outcome}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export const CourseAboutTab = TabTentangKursus;

