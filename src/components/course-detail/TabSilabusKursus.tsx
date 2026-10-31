"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Lock,
  Eye,
  FileText,
  Code,
  HelpCircle,
  Award,
  Sparkles,
} from "lucide-react";
import { CourseModuleItem, CourseLessonItem } from "@/utils/courseCurriculumParser";
import { Button } from "@/components/ui/Button";

interface TabSilabusKursusProps {
  modules: CourseModuleItem[];
  isEnrolled?: boolean;
  onEnrollClick?: () => void;
}

function getLessonIcon(type: CourseLessonItem["type"]) {
  switch (type) {
    case "practice":
      return <Code className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
    case "quiz":
      return <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
    case "project":
      return <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
    case "reading":
    default:
      return <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
  }
}

function getLessonTypeLabel(type: CourseLessonItem["type"]) {
  switch (type) {
    case "practice":
      return "Praktik Koding";
    case "quiz":
      return "Kuis Evaluasi";
    case "project":
      return "Tugas Proyek";
    case "reading":
    default:
      return "Materi Bacaan";
  }
}

export function TabSilabusKursus({
  modules,
  isEnrolled = false,
  onEnrollClick,
}: TabSilabusKursusProps) {
  const [openModules, setOpenModules] = React.useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    modules.forEach((m) => {
      if (m.isPreview || isEnrolled) {
        initial[m.moduleNumber] = true;
      }
    });
    return initial;
  });

  const previewableModules = React.useMemo(() => {
    return modules.filter((m) => m.isPreview || isEnrolled);
  }, [modules, isEnrolled]);

  const allOpen = React.useMemo(() => {
    if (previewableModules.length === 0) return false;
    return previewableModules.every((m) => openModules[m.moduleNumber]);
  }, [previewableModules, openModules]);

  const toggleAll = () => {
    const nextState = !allOpen;
    const updated: Record<number, boolean> = {};
    previewableModules.forEach((m) => {
      updated[m.moduleNumber] = nextState;
    });
    setOpenModules(updated);
  };

  const toggleModule = (moduleNum: number, canPreview: boolean) => {
    if (!canPreview) return;
    setOpenModules((prev) => ({
      ...prev,
      [moduleNum]: !prev[moduleNum],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-200/80 dark:border-stone-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <BookOpen className="w-4 h-4" />
            <span>Kurikulum Modul</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Modul yang Akan Anda Pelajari
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Rincian {modules.length} modul materi, disusun berurutan dari dasar sampai selesai.
          </p>
        </div>

        {previewableModules.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="self-start sm:self-center text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 transition-colors cursor-pointer"
          >
            {allOpen ? "Tutup Semua Modul" : "Buka Semua Modul"}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {modules.map((mod) => {
          const canPreview = mod.isPreview || isEnrolled;
          const isOpen = canPreview && !!openModules[mod.moduleNumber];

          return (
            <div
              key={mod.moduleNumber}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                !canPreview
                  ? "border-stone-200/50 dark:border-stone-800/50 bg-stone-100/50 dark:bg-stone-900/20 opacity-75 select-none"
                  : isOpen
                  ? "border-emerald-500/40 bg-white dark:bg-stone-900 shadow-xs"
                  : "border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 hover:border-stone-300 dark:hover:border-stone-700"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleModule(mod.moduleNumber, canPreview)}
                disabled={!canPreview}
                className={`w-full p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 sm:gap-4 text-left transition-colors ${
                  canPreview ? "cursor-pointer" : "cursor-not-allowed"
                }`}
                aria-expanded={isOpen}
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 transition-colors ${
                      !canPreview
                        ? "bg-stone-200/60 dark:bg-stone-800/60 text-stone-400 dark:text-stone-500"
                        : isOpen
                        ? "bg-[#0F3E2E] text-white dark:bg-emerald-600 shadow-2xs"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                    }`}
                  >
                    {String(mod.moduleNumber).padStart(2, "0")}
                  </div>

                  <div className="space-y-1">
                    <h3 className={`text-sm sm:text-base font-bold tracking-tight leading-snug ${
                      canPreview ? "text-stone-900 dark:text-stone-100" : "text-stone-500 dark:text-stone-400"
                    }`}>
                      {mod.title}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                      {mod.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                  {canPreview ? (
                    <>
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        <Eye className="w-3 h-3" />
                        <span>{isEnrolled ? "Terbuka" : "Pratinjau"}</span>
                      </span>
                      <div className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-500 dark:text-stone-400 bg-stone-200/60 dark:bg-stone-800/60 px-2.5 py-1 rounded-full border border-stone-300/40 dark:border-stone-700/40">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Terkunci</span>
                    </span>
                  )}
                </div>
              </button>

              {isOpen && canPreview && (
                <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-stone-100 dark:border-stone-800/80 space-y-3.5 bg-stone-50/50 dark:bg-stone-900/30">
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed pt-2">
                    {mod.description}
                  </p>

                  {mod.lessons && mod.lessons.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                        Rincian Topik & Aktivitas Belajar:
                      </span>
                      <div className="divide-y divide-stone-200/60 dark:divide-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 overflow-hidden">
                        {mod.lessons.map((lesson, lIdx) => (
                          <div
                            key={lIdx}
                            className="p-3 sm:px-4 flex items-center justify-between gap-3 text-xs sm:text-sm hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 shrink-0">
                                {getLessonIcon(lesson.type)}
                              </div>
                              <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                                {lesson.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 text-xs">
                              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md hidden sm:inline">
                                {getLessonTypeLabel(lesson.type)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isEnrolled && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0F3E2E] to-stone-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-bold flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Siap Mempelajari Seluruh Silabus Ini?</span>
            </h3>
            <p className="text-xs sm:text-sm text-stone-300">
              Daftar sekarang untuk membuka akses penuh 8 modul belajar mandiri, latihan praktik, dan sertifikat resmi.
            </p>
          </div>

          {onEnrollClick && (
            <Button
              onClick={onEnrollClick}
              size="md"
              className="bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-bold text-xs sm:text-sm rounded-xl shrink-0 px-5 py-2.5"
            >
              Daftar Kursus Sekarang
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export const CourseSyllabusTab = TabSilabusKursus;

