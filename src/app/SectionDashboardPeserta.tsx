"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EnrollmentCardSkeleton } from "@/components/ui/Skeleton";
import { Enrollment, Course, Profile } from "@/types/database";
import {
  GraduationCap,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Building2,
  Phone,
  AtSign,
} from "lucide-react";

type EnrolledWithCourse = Enrollment & {
  courses: Course | null;
};

interface SectionDashboardPesertaProps {
  userId: string;
  userEmail: string;
}

export default function SectionDashboardPeserta({
  userId,
  userEmail,
}: SectionDashboardPesertaProps) {
  const supabase = createClient();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [enrollments, setEnrollments] = React.useState<EnrolledWithCourse[]>([]);
  const [loading, setLoading] = React.useState(true);

  const adminPhone =
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "6281234567890";

  React.useEffect(() => {
    async function loadStudentData() {
      setLoading(true);
      try {
        // ambil profil mahasiswa
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileData) {
          setProfile(profileData as Profile);
        }

        // ambil data pendaftaran kursus
        const { data: enrollData } = await supabase
          .from("enrollments")
          .select(`
            id,
            user_id,
            course_id,
            status,
            whatsapp_number,
            created_at,
            courses (
              id,
              title,
              slug,
              description,
              price,
              is_published,
              whatsapp_group_url,
              created_at
            )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (enrollData) {
          setEnrollments(enrollData as unknown as EnrolledWithCourse[]);
        }
      } catch (err) {
        console.error("Error loading student dashboard data:", err);
      } finally {
        // simulasi delay singkat transisi skeleton
        setTimeout(() => setLoading(false), 200);
      }
    }

    loadStudentData();
  }, [userId, supabase]);

  return (
    <section id="kursus-saya" className="scroll-mt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div data-aos="fade-up" className="space-y-3 mb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F3E2E] dark:text-emerald-400 uppercase tracking-wider">
          <GraduationCap className="w-4 h-4" />
          <span>Dashboard Mahasiswa Saya</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
          Progres Kelas & Tautan Grup WhatsApp Anda
        </h2>
      </div>

      <div
        data-aos="fade-up"
        className="mb-8 p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#0F3E2E] text-emerald-300 flex items-center justify-center font-bold text-base shrink-0">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "M"}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">
                Halo, {profile?.full_name || "Mahasiswa"}!
              </h3>
              {profile?.username && (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium">
                  <AtSign className="w-3 h-3" />
                  {profile.username}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-stone-500 dark:text-stone-400 mt-1">
              <span>{userEmail}</span>
              {profile?.school_origin && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-stone-400" />
                  {profile.school_origin}
                </span>
              )}
              {profile?.whatsapp_number && profile.whatsapp_number !== "-" && (
                <span className="flex items-center gap-1 font-medium">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  +{profile.whatsapp_number}
                </span>
              )}
            </div>
          </div>
        </div>

        <a href="#kursus">
          <Button variant="secondary" size="sm" className="gap-2 shrink-0">
            <BookOpen className="w-4 h-4" />
            <span>Pilih Kursus Baru</span>
          </Button>
        </a>
      </div>

      {/* Grid Kursus Terdaftar dengan Skeleton Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EnrollmentCardSkeleton />
          <EnrollmentCardSkeleton />
        </div>
      ) : enrollments.length === 0 ? (
        <Card data-aos="fade-up" className="p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto text-stone-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Belum Ada Kursus yang Didaftarkan
            </h4>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
              Anda belum mendaftar di kelas mana pun. Pilih kursus yang Anda minati pada daftar kursus di bawah ini.
            </p>
          </div>
          <a href="#kursus" className="inline-block pt-2">
            <Button variant="primary" size="sm" className="gap-2">
              <span>Lihat Kursus</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enrollments.map((item) => {
            const course = item.courses;
            const isApproved = item.status === "approved";
            const isPending = item.status === "pending_payment";
            const isRejected = item.status === "rejected";

            const confirmMessage = encodeURIComponent(
              `Halo Admin Skillora, saya ingin konfirmasi bukti transfer untuk kursus ${course?.title || "kursus"} dengan email ${userEmail} (@${profile?.username || "-"}).`
            );
            const waConfirmUrl = `https://wa.me/${adminPhone}?text=${confirmMessage}`;

            return (
              <Card
                key={item.id}
                data-aos="fade-up"
                className="flex flex-col justify-between border-stone-200/90 dark:border-stone-800/90 hover:border-stone-300 dark:hover:border-stone-700 transition-colors shadow-sm"
              >
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-stone-400 block">
                        Terdaftar: {new Date(item.created_at).toLocaleDateString("id-ID")}
                      </span>
                      <CardTitle className="text-base sm:text-lg">
                        {course?.title || "Kursus Skillora"}
                      </CardTitle>
                    </div>

                    {/* Status Badge */}
                    {isApproved && (
                      <Badge variant="approved" className="shrink-0 gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Aktif</span>
                      </Badge>
                    )}
                    {isPending && (
                      <Badge variant="pending" className="shrink-0 gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Menunggu Konfirmasi Admin</span>
                      </Badge>
                    )}
                    {isRejected && (
                      <Badge variant="rejected" className="shrink-0 gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Ditolak / Batal</span>
                      </Badge>
                    )}
                  </div>

                  <CardDescription className="text-xs leading-relaxed line-clamp-2">
                    {course?.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-2 pb-5">
                  {/* Jika Approved -> Tombol Masuk Grup WhatsApp */}
                  {isApproved && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>Pendaftaran disetujui! Anda resmi menjadi peserta kelas ini.</span>
                      </div>
                      {course?.whatsapp_group_url ? (
                        <a
                          href={course.whatsapp_group_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full"
                        >
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white"
                          >
                            <MessageCircle className="w-4 h-4 text-emerald-300" />
                            <span>Masuk Grup WhatsApp Kelas</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      ) : (
                        <p className="text-xs text-stone-500 italic">
                          Tautan grup WhatsApp akan segera diunggah oleh admin kelas.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Jika Pending -> Tombol Bantuan WhatsApp Admin */}
                  {isPending && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                        <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <span>
                          Pendaftaran sedang diverifikasi. Pastikan Anda telah mengirimkan bukti transfer ke WhatsApp Admin.
                        </span>
                      </div>
                      <a
                        href={waConfirmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full gap-2 text-stone-800 dark:text-stone-200 border-amber-500/30"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                          <span>Kirim / Konfirmasi Bukti Transfer</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </div>
                  )}

                  {/* Jika Rejected */}
                  {isRejected && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>Pendaftaran ditolak. Hubungi admin untuk informasi lebih lanjut.</span>
                      </div>
                      <a
                        href={waConfirmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                      >
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <MessageCircle className="w-4 h-4" />
                          <span>Tanyakan ke Admin</span>
                        </Button>
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
