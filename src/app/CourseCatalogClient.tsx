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
  Code,
  Terminal,
  Palette,
} from "lucide-react";

import { CoursePlaceholderBanner } from "@/components/ui/CoursePlaceholderBanner";

interface CourseCatalogClientProps {
  courses: Course[];
  currentUser: { id: string; email: string; role?: UserRole } | null;
  enrolledCourseIds?: string[];
}

function getCourseRegistrationStatus(
  startStr?: string | null,
  endStr?: string | null
) {
  if (!startStr?.trim() || !endStr?.trim()) {
    return {
      isOpen: false,
      label: "Pendaftaran Belum Dibuka",
      className:
        "bg-amber-500/90 text-white dark:bg-amber-600/90 border-amber-400/40",
    };
  }
  const now = new Date();
  const start = new Date(startStr);
  if (startStr.length <= 10) start.setHours(0, 0, 0, 0);
  if (now < start) {
    return {
      isOpen: false,
      label: "Pendaftaran Belum Dibuka",
      className:
        "bg-amber-500/90 text-white dark:bg-amber-600/90 border-amber-400/40",
    };
  }
  const end = new Date(endStr);
  if (endStr.length <= 10) end.setHours(23, 59, 59, 999);
  if (now > end) {
    return {
      isOpen: false,
      label: "Pendaftaran Ditutup",
      className:
        "bg-rose-600/90 text-white dark:bg-rose-700/90 border-rose-500/40",
    };
  }
  return {
    isOpen: true,
    label: "Pendaftaran Dibuka",
    className:
      "bg-emerald-600/90 text-white dark:bg-emerald-700/90 border-emerald-500/40",
  };
}

export default function CourseCatalogClient({
  courses,
  enrolledCourseIds = [],
}: CourseCatalogClientProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 6;

  const totalPages = Math.ceil(courses.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentCourses = courses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Tampilan ketika data kursus belum tersedia dari database
  if (!courses || courses.length === 0) {
    return (
      <div
        data-aos="fade-up"
        className="text-center py-16 px-6 rounded-3xl border border-dashed border-stone-300 dark:border-stone-800 bg-white/40 dark:bg-stone-900/30 backdrop-blur-sm max-w-xl mx-auto space-y-3"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
          Kursus Belum Tersedia
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
          Saat ini belum ada data kursus yang dipublikasikan. Silakan cek kembali dalam waktu dekat atau hubungi admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentCourses.map((course, idx) => {
          const isEnrolled = enrolledCourseIds.includes(course.id);
          const regStatus = getCourseRegistrationStatus(
            course.registration_start,
            course.registration_end
          );

          return (
            <div
              key={course.id}
              data-aos="fade-up"
              data-aos-delay={idx * 100}
              className="group rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 backdrop-blur-sm overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-stone-300 dark:hover:border-stone-700 hover:-translate-y-1 hover:shadow-md"
            >
              <div>
                {/* Thumbnail Gambar Kursus atau Branded Course Logo Banner */}
                <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-stone-100 dark:bg-stone-800">
                  {/* Status Badge Pendaftaran / Terdaftar */}
                  <div className="absolute top-3 left-3 z-10">
                    {isEnrolled ? (
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded-full border backdrop-blur-md shadow-2xs bg-[#0F3E2E] text-white dark:bg-emerald-700 border-emerald-500/40">
                        ✓ Sudah Terdaftar
                      </span>
                    ) : (
                      <span
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-full border backdrop-blur-md shadow-2xs ${regStatus.className}`}
                      >
                        {regStatus.label}
                      </span>
                    )}
                  </div>

                  {course.image_url ? (
                    <SmoothImage
                      src={course.image_url}
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <CoursePlaceholderBanner
                      title={course.title}
                      slug={course.slug}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>

                {/* Konten Kursus */}
                <div className="p-5 sm:p-6 space-y-3">
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 leading-snug line-clamp-2">
                    {course.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                    {(course.description || "").replace(/<[^>]*>?/gm, "").trim()}
                  </p>
                </div>
              </div>

              {/* Footer Card: Harga & Tombol Lihat Detail */}
              <div className="p-5 sm:p-6 border-t border-stone-100 dark:border-stone-800/60 mt-auto flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                    Biaya Pelajar
                  </span>
                  <span className="text-sm font-extrabold text-[#0F3E2E] dark:text-emerald-400">
                    Rp {Number(course.price).toLocaleString("id-ID")}
                  </span>
                </div>

                <Link href={`/courses/${course.slug}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs font-semibold hover:bg-[#0F3E2E] hover:text-white dark:hover:bg-emerald-600 transition-colors"
                  >
                    <span>Lihat Detail</span>
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
