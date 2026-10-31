"use client";

import * as React from "react";
import Link from "next/link";
import { Course, UserRole } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { SmoothImage } from "@/components/ui/SmoothImage";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Star,
  Zap,
  Clock,
  Sparkles,
} from "lucide-react";

import { BannerKursusPlaceholder } from "@/components/ui/BannerKursusPlaceholder";
import { detectCourseTopic } from "@/utils/courseCurriculumParser";

interface KatalogKursusClientProps {
  courses: Course[];
  currentUser: { id: string; email: string; role?: UserRole } | null;
  enrolledCourseIds?: string[];
}

export default function KatalogKursusClient({
  courses,
  enrolledCourseIds = [],
}: KatalogKursusClientProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 6;

  const totalPages = Math.ceil(courses.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentCourses = courses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (!courses || courses.length === 0) {
    return (
      <div
        data-aos="fade-up"
        className="text-center py-14 px-6 rounded-3xl max-w-xl mx-auto space-y-3"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-[#0F3E2E] dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
          Kursus Belum Tersedia
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
          Saat ini belum ada data kursus mandiri yang dipublikasikan. Silakan cek kembali dalam waktu dekat.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentCourses.map((course, idx) => {
          const isEnrolled = enrolledCourseIds.includes(course.id);
          const topic = detectCourseTopic(course.slug || course.title);

          return (
            <div
              key={course.id}
              data-aos="fade-up"
              data-aos-delay={idx * 100}
              className="group rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 backdrop-blur-sm overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-emerald-600/40 dark:hover:border-emerald-500/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/5"
            >
              <div>
                <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-stone-100 dark:bg-stone-800">
                  {course.image_url ? (
                    <SmoothImage
                      src={course.image_url}
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <BannerKursusPlaceholder
                      title={course.title}
                      slug={course.slug}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>

                {/* Konten Kursus */}
                <div className="p-5 sm:p-6 space-y-3">
                  {/* Rating & Silabus Module Badge */}
                  <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>4.9</span>
                    </div>
                    <span className="text-stone-300 dark:text-stone-700">•</span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>8 Modul Belajar</span>
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {course.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                    {(course.description || "").replace(/<[^>]*>?/gm, "").trim()}
                  </p>
                </div>
              </div>

              {/* Footer Card: Harga Pelajar & Tombol CTA */}
              <div className="p-5 sm:p-6 border-t border-stone-100 dark:border-stone-800/60 mt-auto flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                    Biaya Kursus Mandiri
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#0F3E2E] dark:text-emerald-400">
                    Rp {Number(course.price).toLocaleString("id-ID")}
                  </span>
                </div>

                <Link href={`/courses/${course.slug}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs font-semibold hover:bg-[#0F3E2E] hover:text-white dark:hover:bg-emerald-600 transition-colors"
                  >
                    <span>Lihat Silabus</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div
          data-aos="fade-up"
          className="flex items-center justify-center gap-2 pt-4"
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5">
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#0F3E2E] dark:bg-emerald-600 text-white shadow-xs"
                      : "border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Halaman Selanjutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
