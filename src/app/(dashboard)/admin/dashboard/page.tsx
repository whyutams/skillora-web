"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { SmoothImage } from "@/components/ui/SmoothImage";
import {
  BookOpen,
  ShieldCheck,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  ArrowRight,
  RefreshCw,
  Sparkles,
  DollarSign,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

interface OverviewCourse {
  id: string;
  title: string;
  slug: string;
  price: number;
  is_published: boolean;
  image_url?: string | null;
  enrolled_count?: number;
  created_at: string;
}

interface OverviewEnrollment {
  id: string;
  status: "pending_payment" | "approved" | "rejected";
  created_at: string;
  whatsapp_number: string;
  profiles: {
    full_name: string;
    username: string;
    school_origin: string;
    avatar_url?: string | null;
  } | null;
  courses: {
    title: string;
    price: number;
  } | null;
}

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [adminName, setAdminName] = React.useState<string>("");
  const [courses, setCourses] = React.useState<OverviewCourse[]>([]);
  const [enrollments, setEnrollments] = React.useState<OverviewEnrollment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDashboardData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.full_name) {
          setAdminName(profile.full_name);
        }
      }

      // 1. Fetch courses
      const coursesRes = await fetch("/api/admin/courses");
      const coursesData = await coursesRes.json();
      if (coursesRes.ok) {
        setCourses(coursesData.courses || []);
      }

      // 2. Fetch enrollments
      const enrollRes = await fetch("/api/admin/enrollments");
      const enrollData = await enrollRes.json();
      if (enrollRes.ok) {
        setEnrollments(enrollData.enrollments || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat ringkasan dashboard.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Kalkulasi Statistik Kursus & Pendaftaran
  const totalCourses = courses.length;
  const publishedCourses = courses.filter((c) => c.is_published).length;
  const draftCourses = courses.filter((c) => !c.is_published).length;

  const totalEnrollments = enrollments.length;
  const pendingEnrollments = enrollments.filter((e) => e.status === "pending_payment").length;
  const approvedEnrollments = enrollments.filter((e) => e.status === "approved").length;
  const rejectedEnrollments = enrollments.filter((e) => e.status === "rejected").length;

  const totalRevenue = enrollments
    .filter((e) => e.status === "approved")
    .reduce((acc, curr) => acc + (curr.courses?.price || 0), 0);

  const recentEnrollments = enrollments.slice(0, 5);
  const recentCourses = courses.slice(0, 5);

  return (
    <div className="space-y-8 w-full">
      {/* Header Panel Overview Admin */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Dashboard Admin
            </h1>
            <Badge variant="role-admin">Panel Utama</Badge>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Selamat datang kembali, <span className="font-semibold text-stone-800 dark:text-stone-200">{adminName || "Admin"}</span>. Pantau statistik kursus, progres pendaftaran mahasiswa, dan verifikasi pembayaran.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </Button>

          <Link href="/admin/courses/create">
            <Button
              size="sm"
              className="gap-2 bg-[#0F3E2E] hover:bg-[#165640] text-white shadow-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kursus</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid Statistik Kursus & Pendaftaran */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kursus */}
        <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-stone-900/50 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Statistik Kursus</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              <AnimatedCounter value={totalCourses} />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              <span className="text-emerald-600 font-semibold">{publishedCourses} Publik</span> •{" "}
              <span className="text-amber-600 font-semibold">{draftCourses} Draft</span>
            </p>
          </div>
        </div>

        {/* Menunggu Verifikasi */}
        <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-stone-900/50 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Menunggu Verifikasi
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              <AnimatedCounter value={pendingEnrollments} />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Perlu konfirmasi bukti pembayaran
            </p>
          </div>
        </div>

        {/* Pendaftaran Disetujui */}
        <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-stone-900/50 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Pendaftaran Disetujui
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              <AnimatedCounter value={approvedEnrollments} />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Dari total {totalEnrollments} pendaftaran peserta
            </p>
          </div>
        </div>

        {/* Estimasi Pendapatan */}
        <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-stone-900/50 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              Estimasi Pemasukan
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">
              Rp {totalRevenue.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Dari peserta yang telah disetujui
            </p>
          </div>
        </div>
      </div>

      {/* 2 Kolom: Pendaftaran Terbaru & Katalog Kursus Singkat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pendaftaran Terbaru */}
        <Card className="border-stone-200/90 dark:border-stone-800/90 overflow-hidden">
          <CardHeader className="border-b border-stone-200/80 dark:border-stone-800/80 p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Pendaftaran Terbaru</CardTitle>
              <CardDescription className="text-xs">
                5 pendaftaran peserta yang baru masuk
              </CardDescription>
            </div>
            <Link href="/admin/pendaftaran">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>Kelola Semua</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-stone-400">
                Memuat data pendaftaran...
              </div>
            ) : recentEnrollments.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                Belum ada data pendaftaran.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {recentEnrollments.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {item.profiles?.full_name || "Mahasiswa"}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                        {item.courses?.title || "Kursus"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === "approved" && (
                        <Badge variant="approved" className="text-[10px] px-2 py-0.5">
                          Disetujui
                        </Badge>
                      )}
                      {item.status === "pending_payment" && (
                        <Badge variant="pending" className="text-[10px] px-2 py-0.5">
                          Menunggu
                        </Badge>
                      )}
                      {item.status === "rejected" && (
                        <Badge variant="rejected" className="text-[10px] px-2 py-0.5">
                          Ditolak
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Katalog Kursus Terbaru */}
        <Card className="border-stone-200/90 dark:border-stone-800/90 overflow-hidden">
          <CardHeader className="border-b border-stone-200/80 dark:border-stone-800/80 p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Katalog Kursus</CardTitle>
              <CardDescription className="text-xs">
                Ringkasan kursus yang terdaftar di platform
              </CardDescription>
            </div>
            <Link href="/admin/courses">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>Kelola Kursus</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-stone-400">
                Memuat data kursus...
              </div>
            ) : recentCourses.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                Belum ada data kursus.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {recentCourses.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {c.title}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        {c.price > 0 ? `Rp ${c.price.toLocaleString("id-ID")}` : "Gratis"} • {c.enrolled_count || 0} Peserta
                      </p>
                    </div>

                    <div className="shrink-0">
                      {c.is_published ? (
                        <Badge variant="approved" className="text-[10px] px-2 py-0.5">
                          Publik
                        </Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[10px] px-2 py-0.5">
                          Draft
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
