"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Share2,
  Check,
  ZoomIn,
  BookOpen,
  Award,
  Copy,
  Users,
  Star,
  Eye,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { BannerKursusPlaceholder } from "@/components/ui/BannerKursusPlaceholder";
import { Course, UserRole } from "@/types/database";

interface KursusActionSidebarProps {
  course: Course;
  level: string;
  totalModules: number;
  enrolledCount?: number;
  averageRating?: number;
  totalReviews?: number;
  views?: number;
  isEnrolled?: boolean;
  userEnrollmentId?: string | null;
  currentUser?: {
    id: string;
    email: string;
    role?: UserRole;
    whatsapp_number?: string | null;
    avatar_url?: string | null;
    school_origin?: string | null;
  } | null;
  onEnrollClick: () => void;
  onPreviewImage: (url: string, title: string) => void;
}

export function KursusActionSidebar({
  course,
  totalModules,
  enrolledCount = 0,
  averageRating = 4.9,
  totalReviews = 0,
  views = 0,
  isEnrolled = false,
  userEnrollmentId,
  currentUser,
  onEnrollClick,
  onPreviewImage,
}: KursusActionSidebarProps) {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const adminPhone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "6281356578805";

  const originalPrice = Math.round(Number(course.price) * 1.8);

  const hasAvatar = Boolean(currentUser?.avatar_url && currentUser.avatar_url.trim().length > 0);
  const hasSchool = Boolean(
    currentUser?.school_origin &&
      currentUser.school_origin.trim().length > 0 &&
      currentUser.school_origin !== "-"
  );
  const isProfileComplete = !currentUser || (hasAvatar && hasSchool);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const shareWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Yuk belajar kursus "${course.title}" di Skillora! Modul lengkap, belajar mandiri, dan dapat sertifikat resmi: ${
      typeof window !== "undefined" ? window.location.href : ""
    }`
  )}`;

  return (
    <div className="space-y-6 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md p-6 sm:p-7 shadow-xs">
      {/* Banner */}
      {course.image_url ? (
        <div
          onClick={() => onPreviewImage(course.image_url!, course.title)}
          className="relative w-full h-44 sm:h-48 rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800/80 bg-stone-100 dark:bg-stone-800 cursor-pointer group shadow-2xs"
          title="Klik untuk memperbesar banner"
        >
          <SmoothImage
            src={course.image_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            containerClassName="w-full h-full"
          />
          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 text-xs font-medium">
            <ZoomIn className="w-4 h-4" />
            <span>Perbesar Gambar</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-44 sm:h-48 rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800/80">
          <BannerKursusPlaceholder title={course.title} slug={course.slug} />
        </div>
      )}

      {/* Harga */}
      <div className="space-y-2 pb-4 border-b border-stone-100 dark:border-stone-800/60">
        <div className="flex items-baseline gap-2.5">
          <span className="text-3xl sm:text-4xl font-black text-[#0F3E2E] dark:text-emerald-400 tracking-tight">
            Rp {Number(course.price).toLocaleString("id-ID")}
          </span>
          <span className="text-xs sm:text-sm text-stone-400 line-through font-normal">
            Rp {originalPrice.toLocaleString("id-ID")}
          </span>
        </div>

        <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
          Tanpa biaya langganan bulanan. Akses materi selamanya & dukungan tanya jawab mentor.
        </p>
      </div>

      {/* Tombol Aksi & Informasi Status Profil */}
      <div className="space-y-3">
        {currentUser && !isEnrolled && !isProfileComplete && (
          <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 text-stone-800 dark:text-stone-200 space-y-2.5 text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-stone-900 dark:text-stone-100">
                  Lengkapi Profil untuk Mendaftar
                </p>
                <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
                  Peserta wajib melengkapi <strong>foto profil</strong> dan <strong>asal kampus</strong> terlebih dahulu agar tombol pendaftaran kursus terbuka.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-1 text-[11px]">
              <div className="flex items-center gap-1.5">
                {hasAvatar ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                )}
                <span className={hasAvatar ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium"}>
                  Foto Profil: {hasAvatar ? "Sudah Diunggah" : "Belum Diunggah"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasSchool ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                )}
                <span className={hasSchool ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium"}>
                  Asal Kampus: {hasSchool ? `(${currentUser.school_origin})` : "Belum Diisi"}
                </span>
              </div>
            </div>

            <Link
              href={`/profile?returnUrl=${encodeURIComponent(`/courses/${course.slug}`)}`}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <span>Lengkapi Profil Sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {isEnrolled ? (
          <Link
            href={userEnrollmentId ? `/kursus-saya/${userEnrollmentId}` : "/kursus-saya"}
            className="block w-full"
          >
            <Button
              size="lg"
              className="w-full bg-[#0F3E2E] hover:bg-[#15523d] text-white gap-2 font-bold py-3.5 rounded-xl shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Buka di Kursus Saya</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        ) : (
          <Button
            size="lg"
            onClick={onEnrollClick}
            disabled={!isProfileComplete}
            className="w-full bg-[#0F3E2E] hover:bg-[#15523d] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0F3E2E] text-white gap-2 font-bold py-3.5 rounded-xl shadow-xs text-sm transition-all"
            title={!isProfileComplete ? "Lengkapi foto profil dan asal kampus terlebih dahulu untuk mendaftar" : undefined}
          >
            <span>Daftar Kursus & Mulai Belajar</span>
            <ArrowRight className="w-4 h-4 text-emerald-300" />
          </Button>
        )}

        <a
          href={`https://wa.me/${adminPhone}?text=${encodeURIComponent(
            `Halo Admin Skillora, saya ingin bertanya mengenai kursus: ${course.title}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full"
        >
          <Button
            variant="outline"
            size="md"
            className="w-full gap-2 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl py-2.5 text-xs font-semibold"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Tanya Admin via WhatsApp</span>
          </Button>
        </a>
      </div>

      {/* Fakta Kursus */}
      <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800/60">
        <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block pb-1">
          FAKTA RINGKAS KURSUS:
        </span>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-stone-100/60 dark:border-stone-800/40">
            <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-stone-400" />
              <span>Total Modul</span>
            </span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {totalModules} Modul
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100/60 dark:border-stone-800/40">
            <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-stone-400" />
              <span>Jumlah Peserta</span>
            </span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {enrolledCount} Peserta
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100/60 dark:border-stone-800/40">
            <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Rating Peserta</span>
            </span>
            {totalReviews > 0 ? (
              <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                <span>{averageRating}</span>
                <span className="text-stone-400 font-normal">({totalReviews} ulasan)</span>
              </span>
            ) : (
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                -
              </span>
            )}
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100/60 dark:border-stone-800/40">
            <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-stone-400" />
              <span>Viewer Kursus</span>
            </span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {views} Views
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-stone-100/60 dark:border-stone-800/40">
            <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-stone-400" />
              <span>Sertifikat Kelulusan</span>
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              Ya, Tersedia
            </span>
          </div>
        </div>
      </div>

      {/* Fasilitas */}
      <div className="p-4 rounded-2xl bg-stone-50/80 dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-800/80 space-y-2.5">
        <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">
          Fasilitas Kursus yang Didapatkan:
        </span>
        <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300">
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Akses materi belajar mandiri selamanya</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Latihan praktik & kuis pemahaman tiap bab</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Pendampingan mentor via WhatsApp Group</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>E-Sertifikat kelulusan resmi terverifikasi</span>
          </li>
        </ul>
      </div>

      {/* Bagikan */}
      <div className="pt-2 border-t border-stone-100 dark:border-stone-800/60 flex items-center justify-between gap-2">
        <span className="text-xs text-stone-400 font-medium">Bagikan kelas:</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
            title="Salin tautan kursus"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Link</span>
              </>
            )}
          </button>

          <a
            href={shareWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Bagikan ke WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export const CourseActionSidebar = KursusActionSidebar;

