"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Course, UserRole } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EnrollModal } from "@/components/EnrollModal";
import { AlertModal } from "@/components/ui/ConfirmModal";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { CoursePlaceholderBanner } from "@/components/ui/CoursePlaceholderBanner";
import {
  ChevronLeft,
  Users,
  Eye,
  MessageCircle,
  ArrowRight,
  ZoomIn,
  Calendar,
  Clock,
  Ban,
  CheckCircle2,
} from "lucide-react";

interface CourseDetailClientProps {
  course: Course;
  currentUser: {
    id: string;
    email: string;
    role?: UserRole;
    whatsapp_number?: string | null;
  } | null;
  initialEnrolledCount?: number;
  initialViews?: number;
  isEnrolled?: boolean;
  userEnrollmentId?: string | null;
}

function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function CourseDetailClient({
  course,
  currentUser,
  initialEnrolledCount = 0,
  initialViews = 0,
  isEnrolled = false,
  userEnrollmentId = null,
}: CourseDetailClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isLoginAlertOpen, setIsLoginAlertOpen] = React.useState(false);
  const [isAdminAlertOpen, setIsAdminAlertOpen] = React.useState(false);
  const [views, setViews] = React.useState(initialViews);
  const [enrolledCount] = React.useState(initialEnrolledCount);

  const [previewImage, setPreviewImage] = React.useState<{
    isOpen: boolean;
    url: string | null;
    title: string;
  }>({
    isOpen: false,
    url: null,
    title: "",
  });

  const adminPhone =
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "6281234567890";

  // Rekam kunjungan kursus (Per-Course Analytics)
  React.useEffect(() => {
    let isMounted = true;
    const recordCourseView = async () => {
      try {
        const res = await fetch("/api/analytics/course-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: course.slug,
            courseId: course.id,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.views === "number") {
            setViews(data.views);
          }
        }
      } catch (err) {
        console.error("Gagal merekam view kursus:", err);
      }
    };

    recordCourseView();
    return () => {
      isMounted = false;
    };
  }, [course.slug, course.id]);

  // Evaluasi Masa Waktu Pendaftaran
  const registrationStatus = React.useMemo(() => {
    const now = new Date();
    const startStr = course.registration_start?.trim();
    const endStr = course.registration_end?.trim();

    // Jika tanggal pendaftaran belum diisi oleh admin, tombol pendaftaran belum bisa dibuka
    if (!startStr || !endStr) {
      return {
        isOpen: false,
        state: "not_set" as const,
        label: "Pendaftaran Belum Dibuka",
        badgeColor:
          "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
        tooltip:
          "Pendaftaran belum dibuka (Jadwal tanggal pendaftaran belum ditentukan oleh admin).",
      };
    }

    const startDate = new Date(startStr);
    // Atur ke awal hari (00:00:00) jika hanya format YYYY-MM-DD
    if (startStr.length <= 10) {
      startDate.setHours(0, 0, 0, 0);
    }
    if (now < startDate) {
      return {
        isOpen: false,
        state: "not_started" as const,
        label: "Pendaftaran Belum Dibuka",
        badgeColor:
          "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
        tooltip: `Pendaftaran belum dibuka. Pendaftaran akan dimulai pada ${formatDateIndo(
          startStr
        )}.`,
      };
    }

    const endDate = new Date(endStr);
    // Atur ke akhir hari (23:59:59) jika hanya format YYYY-MM-DD
    if (endStr.length <= 10) {
      endDate.setHours(23, 59, 59, 999);
    }
    if (now > endDate) {
      return {
        isOpen: false,
        state: "ended" as const,
        label: "Pendaftaran Telah Ditutup",
        badgeColor:
          "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
        tooltip: `Pendaftaran telah berakhir pada ${formatDateIndo(endStr)}.`,
      };
    }

    return {
      isOpen: true,
      state: "open" as const,
      label: "Pendaftaran Dibuka",
      badgeColor:
        "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/20",
      tooltip:
        "Pendaftaran sedang dibuka! Klik untuk mendaftar kursus ini sekarang.",
    };
  }, [course.registration_start, course.registration_end]);

  const handleEnrollClick = () => {
    if (isEnrolled) {
      return;
    }
    if (!registrationStatus.isOpen) {
      return;
    }
    if (!currentUser) {
      setIsLoginAlertOpen(true);
      return;
    }
    if (currentUser.role === "admin" || currentUser.role === "superadmin") {
      setIsAdminAlertOpen(true);
      return;
    }
    setIsModalOpen(true);
  };

  const handleGoToLogin = () => {
    setIsLoginAlertOpen(false);
    router.push(`/login?redirect=/courses/${course.slug}`);
  };

  return (
    <div className="min-h-screen py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Tombol Kembali ke Katalog Kursus */}
      <div data-aos="fade-down" className="flex items-center">
        <Link
          href="/#kursus"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800/80 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:border-stone-300 dark:hover:border-stone-700 shadow-2xs transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-stone-500" />
          <span>Kembali ke Kursus</span>
        </Link>
      </div>

      {/* 2 Kolom Layout: Sebelah Kiri (Konten & Teks), Sebelah Kanan (Widget Harga, Peserta, Viewer, Aksi) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= SEBELAH KIRI (KOLOM KONTEN) ================= */}
        <div
          data-aos="fade-up"
          className="lg:col-span-7 space-y-6 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 backdrop-blur-md p-6 sm:p-8 shadow-xs"
        >
          {/* Banner Utama Kursus (Gambar Upload atau Branded Placeholder) */}
          {course.image_url ? (
            <div
              onClick={() =>
                setPreviewImage({
                  isOpen: true,
                  url: course.image_url!,
                  title: course.title,
                })
              }
              className="relative w-full h-60 sm:h-84 rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800/80 bg-stone-100 dark:bg-stone-800 cursor-pointer group"
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
            <div className="w-full h-52 sm:h-64 rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800/80">
              <CoursePlaceholderBanner title={course.title} slug={course.slug} />
            </div>
          )}

          {/* Judul & Deskripsi Singkat */}
          <div className="space-y-3 pt-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
              {course.title}
            </h1>

            {course.description && (
              <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
                {course.description}
              </p>
            )}
          </div>

          {/* Konten Lengkap Hasil dari HTML Editor */}
          <div className="pt-6 border-t border-stone-100 dark:border-stone-800/60 space-y-3">
            <div
              className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed max-w-none prose dark:prose-invert [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-stone-900 dark:[&_h2]:text-stone-100 [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-stone-900 dark:[&_h3]:text-stone-100 [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1 [&_p]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2.5 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-600 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-stone-500 [&_code]:bg-stone-100 dark:[&_code]:bg-stone-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_a]:text-emerald-600 [&_a]:underline [&_img]:rounded-2xl [&_img]:max-w-full [&_img]:my-4 [&_img]:shadow-xs"
              dangerouslySetInnerHTML={{
                __html:
                  course.content ||
                  "<p>Belum ada rincian materi untuk kursus ini.</p>",
              }}
            />
          </div>
        </div>

        {/* ================= SEBELAH KANAN (WIDGET HARGA & AKSI) ================= */}
        <div
          data-aos="fade-up"
          data-aos-delay="100"
          className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md p-6 sm:p-7 shadow-xs"
        >
          {/* Harga Kursus */}
          <div className="space-y-1 pb-4 border-b border-stone-100 dark:border-stone-800/60">
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
              Biaya Pelatihan & Modul
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#0F3E2E] dark:text-emerald-400">
                Rp {Number(course.price).toLocaleString("id-ID")}
              </span>
              <span className="text-xs text-stone-400 font-medium">
                / peserta
              </span>
            </div>
          </div>

          {/* Jadwal & Masa Waktu Pendaftaran */}
          <div className="space-y-2.5 p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                <span>Masa Pendaftaran</span>
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${registrationStatus.badgeColor}`}
              >
                {registrationStatus.label}
              </span>
            </div>

            {course.registration_start && course.registration_end ? (
              <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-400">Mulai:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    {formatDateIndo(course.registration_start)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-400">Selesai:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    {formatDateIndo(course.registration_end)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                Jadwal periode pendaftaran belum ditentukan oleh admin.
              </p>
            )}
          </div>

          {/* Statistik Partisipasi & Dilihat */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Jumlah Partisipan / Peserta */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>Peserta</span>
              </div>
              <p className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                <AnimatedCounter value={enrolledCount} />
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {enrolledCount === 0 ? "Belum ada peserta" : "Telah bergabung"}
              </p>
            </div>

            {/* Jumlah Kunjungan Viewer */}
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs">
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold mb-1">
                <Eye className="w-3.5 h-3.5" />
                <span>Pengunjung</span>
              </div>
              <p className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                <AnimatedCounter value={views} />x
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Total dilihat
              </p>
            </div>
          </div>

          {/* Tombol Interaksi: Daftar & Tanya Admin */}
          <div className="space-y-3 pt-2">
            {/* Tombol Daftar Kursus (Disabled / Link ke Kursus Saya jika sudah terdaftar, atau Disabled jika di luar periode) */}
            {isEnrolled ? (
              <Link
                href={userEnrollmentId ? `/kursus-saya/${userEnrollmentId}` : "/kursus-saya"}
                className="block w-full"
              >
                <Button
                  size="lg"
                  className="w-full bg-[#0F3E2E] hover:bg-[#15523d] text-white gap-2 font-semibold py-3.5 rounded-xl shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Anda Sudah Terdaftar (Buka di Kursus Saya)</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : registrationStatus.isOpen ? (
              <Button
                size="lg"
                onClick={handleEnrollClick}
                className="w-full bg-[#0F3E2E] hover:bg-[#15523d] text-white gap-2 font-semibold py-3.5 rounded-xl shadow-xs"
                title={registrationStatus.tooltip}
              >
                <span>Daftar Kursus Ini Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <button
                type="button"
                disabled
                title={registrationStatus.tooltip}
                className="w-full py-3.5 px-4 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 font-semibold text-sm cursor-not-allowed flex items-center justify-center gap-2 border border-stone-300/80 dark:border-stone-700/80 select-none transition-opacity"
              >
                <Ban className="w-4 h-4 text-rose-500" />
                <span>{registrationStatus.label}</span>
              </button>
            )}

            {/* Tombol Tanya Admin via WhatsApp */}
            <a
              href={`https://wa.me/${adminPhone}?text=${encodeURIComponent(
                `Halo Admin Skillora, saya ingin bertanya mengenai kelas: ${course.title}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl py-3"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Tanya Admin via WhatsApp</span>
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Modal Preview Zoom Gambar */}
      <ImagePreviewModal
        isOpen={previewImage.isOpen}
        imageUrl={previewImage.url}
        title={previewImage.title}
        onClose={() => setPreviewImage({ isOpen: false, url: null, title: "" })}
      />

      {/* Modal Pendaftaran */}
      <EnrollModal
        course={course}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={currentUser?.id}
        userEmail={currentUser?.email}
        userRole={currentUser?.role}
        userWhatsapp={currentUser?.whatsapp_number}
      />

      {/* Login Required Alert Modal */}
      <AlertModal
        isOpen={isLoginAlertOpen}
        title="Masuk Akun Diperlukan"
        message="Anda harus login terlebih dahulu sebelum melakukan pendaftaran kursus."
        type="info"
        onClose={handleGoToLogin}
      />

      {/* Admin Warning Alert Modal */}
      <AlertModal
        isOpen={isAdminAlertOpen}
        title="Akses Ditolak untuk Admin"
        message="Akun administrator tidak dapat mendaftar kursus sebagai siswa. Silakan gunakan akun siswa atau logout terlebih dahulu."
        type="error"
        onClose={() => setIsAdminAlertOpen(false)}
      />
    </div>
  );
}
