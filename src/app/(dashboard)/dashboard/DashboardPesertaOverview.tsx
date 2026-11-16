"use client";

import * as React from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  AlertCircle,
  MessageCircle,
  ChevronRight,
  Compass,
  Play,
  FileCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { BannerKursusPlaceholder } from "@/components/ui/BannerKursusPlaceholder";
import { Skeleton } from "@/components/ui/Skeleton";
import { Profile, Course, getRoleLabel } from "@/types/database";
import { StudentEnrollmentItem } from "../kursus-saya/DashboardPesertaClient";
import { parseCourseCurriculum } from "@/utils/courseCurriculumParser";

export function DashboardPesertaOverview() {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [enrollments, setEnrollments] = React.useState<StudentEnrollmentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [completedTopicCount, setCompletedTopicCount] = React.useState<number>(0);

  const adminPhone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "6281356578805";

  // ambil data pendaftaran kursus dan profil peserta
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/enrollments");
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile || null);
        const list: StudentEnrollmentItem[] = data.enrollments || [];
        setEnrollments(list);

        // hitung total topik yang telah diselesaikan dari penyimpanan lokal
        let totalCompleted = 0;
        list.forEach((item) => {
          try {
            const saved = localStorage.getItem(`skillora_progress_${item.id}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) {
                totalCompleted += parsed.length;
              }
            }
          } catch {
            // abaikan kegagalan baca penyimpanan lokal
          }
        });
        setCompletedTopicCount(totalCompleted);
      }
    } catch (err) {
      console.error("Gagal memuat overview dashboard peserta", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // filter pendaftaran berdasarkan status
  const approvedEnrollments = enrollments.filter((e) => e.status === "approved");
  const pendingEnrollments = enrollments.filter((e) => e.status === "pending_payment");
  const certificateCount = enrollments.filter((e) => Boolean(e.certificate_url) || e.status === "approved").length;

  // tentukan kursus aktif yang paling relevan untuk dilanjutkan belajar
  const resumeEnrollment = approvedEnrollments[0] || null;

  // kalkulasi kurikulum dan progres kursus aktif
  const resumeCurriculum = React.useMemo(() => {
    if (!resumeEnrollment?.course) {
      return { totalModules: 0, totalLessons: 0 };
    }
    const curr = parseCourseCurriculum(resumeEnrollment.course as Course, resumeEnrollment.course.content || null);
    const totalLessons = (curr.modules || []).reduce(
      (acc, m) => acc + (m.lessons?.length || 0),
      0
    );
    return {
      totalModules: curr.totalModules || curr.modules?.length || 0,
      totalLessons,
    };
  }, [resumeEnrollment]);

  const resumeProgressPercent = React.useMemo(() => {
    if (!resumeEnrollment || resumeCurriculum.totalLessons === 0) return 0;
    try {
      const saved = localStorage.getItem(`skillora_progress_${resumeEnrollment.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const count = parsed.length;
          return Math.min(100, Math.round((count / resumeCurriculum.totalLessons) * 100));
        }
      }
    } catch {
      // abaikan
    }
    return 0;
  }, [resumeEnrollment, resumeCurriculum]);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
        <Skeleton className="w-full h-36 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="w-full h-56 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      {/* banner sambutan peserta */}
      <div className="rounded-2xl bg-[#0F3E2E] text-white p-6 sm:p-8 shadow-xs border border-emerald-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Selamat Datang Kembali, {profile?.full_name || "Peserta"}!
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Pantau kemajuan silabus, kerjakan kuis latihan, dan lanjutkan pembelajaran untuk meraih sertifikat keahlian Anda.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/dashboard/kursus">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/25 text-xs font-semibold gap-1.5"
              >
                <Compass className="w-4 h-4" />
                <span>Eksplorasi Kursus</span>
              </Button>
            </Link>
            <Link href="/kursus-saya">
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold text-xs gap-1.5 shadow-sm"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Kursus Saya</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* peringatan pembayaran tertunda jika ada pendaftaran yang pending */}
      {pendingEnrollments.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs sm:text-sm">
              <p className="font-bold">
                Ada {pendingEnrollments.length} pendaftaran kursus menunggu verifikasi pembayaran
              </p>
              <p className="text-stone-600 dark:text-stone-400 text-xs">
                Segera unggah bukti transfer agar admin dapat mengaktifkan akses materi dan grup WhatsApp kelas.
              </p>
            </div>
          </div>
          <Link href="/kursus-saya" className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-semibold"
            >
              Lihat di Kursus Saya
            </Button>
          </Link>
        </div>
      )}

      {/* 4 kartu statistik ringkas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Kursus Aktif
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100">
              {approvedEnrollments.length}
            </span>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Kelas sedang dipelajari
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Topik Selesai
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100">
              {completedTopicCount}
            </span>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Materi pembelajaran tuntas
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Menunggu Verifikasi
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100">
              {pendingEnrollments.length}
            </span>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Pendaftaran ditinjau admin
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Sertifikat Tersedia
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100">
              {certificateCount}
            </span>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              E-Sertifikat siap diunduh
            </p>
          </div>
        </Card>
      </div>

      {/* baris utama widget lanjutkan belajar dan akses cepat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* kolom kiri widget lanjutkan belajar */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  <Play className="w-4 h-4 fill-emerald-600 dark:fill-emerald-400 text-transparent" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                    Lanjutkan Belajar
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Akses cepat materi kursus aktif yang sedang Anda pelajari
                  </p>
                </div>
              </div>

              <Link
                href="/kursus-saya"
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Semua Kelas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {resumeEnrollment?.course ? (
              <div className="flex flex-col sm:flex-row gap-5 p-4 sm:p-5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/70 dark:border-stone-800/70">
                <div className="w-full sm:w-44 h-28 rounded-xl overflow-hidden shrink-0 relative bg-stone-200 dark:bg-stone-800">
                  {resumeEnrollment.course.image_url ? (
                    <SmoothImage
                      src={resumeEnrollment.course.image_url}
                      alt={resumeEnrollment.course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BannerKursusPlaceholder
                      title={resumeEnrollment.course.title}
                      className="w-full h-full"
                    />
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                        {resumeEnrollment.course.category || "Pemrograman"}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {resumeCurriculum.totalLessons} Topik Materi
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                      {resumeEnrollment.course.title}
                    </h3>
                  </div>

                  {/* progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
                      <span>Progres Pembelajaran</span>
                      <span>{resumeProgressPercent}% Selesai</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full bg-[#0F3E2E] dark:bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${resumeProgressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <Link
                      href={`/kursus-saya/${resumeEnrollment.course.slug}/belajar/0/0`}
                      className="flex-1 sm:flex-none"
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full sm:w-auto text-xs font-bold gap-2"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Mulai Belajar</span>
                      </Button>
                    </Link>
                    <Link
                      href={`/kursus-saya/${resumeEnrollment.course.slug}`}
                      className="flex-1 sm:flex-none"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto text-xs font-semibold gap-1.5"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Silabus Lengkap</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200/70 dark:border-stone-800/70 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Compass className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Belum Ada Kursus Aktif
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                    Pilih kursus yang Anda minati di katalog untuk mulai belajar mandiri dan mendapatkan sertifikat kompetensi.
                  </p>
                </div>
                <Link href="/dashboard/kursus">
                  <Button variant="primary" size="sm" className="text-xs font-bold gap-1.5 mt-2">
                    <Compass className="w-4 h-4" />
                    <span>Jelajahi Katalog Kursus</span>
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* daftar kursus yang sedang diikuti */}
          {approvedEnrollments.length > 1 && (
            <Card className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-6 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Kursus Aktif Lainnya
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {approvedEnrollments.slice(1, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={`/kursus-saya/${item.course?.slug || item.id}`}
                    className="p-4 rounded-2xl border border-stone-200/70 dark:border-stone-800/70 bg-stone-50/70 dark:bg-stone-950/40 hover:border-emerald-500/40 transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                        {item.course?.title}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {item.course?.category || "Pemrograman"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* kolom kanan kartu navigasi aksi cepat */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-5">
          <Card className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Akses Cepat
            </h2>

            <div className="space-y-2.5">
              <Link
                href="/dashboard/kursus"
                className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200/70 dark:border-stone-800/70 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                      Katalog Kursus
                    </span>
                    <span className="text-[11px] text-stone-500 block">
                      Temukan kelas baru
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/kursus-saya"
                className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200/70 dark:border-stone-800/70 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                      Kursus Saya
                    </span>
                    <span className="text-[11px] text-stone-500 block">
                      Manajemen silabus materi
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/dashboard/sertifikat"
                className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200/70 dark:border-stone-800/70 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                      Sertifikat Saya
                    </span>
                    <span className="text-[11px] text-stone-500 block">
                      Unduh bukti kelulusan
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <a
                href={`https://wa.me/${adminPhone}?text=${encodeURIComponent("Halo admin dan mentor Skillora, saya ingin konsultasi mengenai materi pembelajaran.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">
                      Tanya Mentor
                    </span>
                    <span className="text-[11px] opacity-80 block">
                      Bantuan WhatsApp langsung
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
