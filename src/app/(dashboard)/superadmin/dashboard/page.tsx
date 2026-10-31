"use client";

import * as React from "react";
import Link from "next/link";
import moment from "moment";
import "moment/locale/id";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import {
  Users,
  ScrollText,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Eye,
  Calendar,
  TrendingUp,
  UserCheck,
  Activity,
  Plus,
} from "lucide-react";

moment.locale("id");

interface SuperadminUser {
  id: string;
  email: string;
  role: "superadmin" | "admin" | "student";
  created_at: string;
  profile?: {
    full_name: string;
    username: string;
    school_origin: string;
  } | null;
}

interface SuperadminLog {
  id: string;
  action: string;
  table_name: string;
  user_email?: string | null;
  user_role?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export default function SuperadminDashboardPage() {
  const [users, setUsers] = React.useState<SuperadminUser[]>([]);
  const [logs, setLogs] = React.useState<SuperadminLog[]>([]);
  const [visitorStats, setVisitorStats] = React.useState<{
    daily: number;
    monthly: number;
    total: number;
  }>({ daily: 0, monthly: 0, total: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchSuperadminData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Users
      const usersRes = await fetch("/api/superadmin/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      // 2. Fetch Logs
      const logsRes = await fetch("/api/superadmin/logs?limit=5");
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }

      // 3. Fetch Visitor stats
      const visRes = await fetch("/api/analytics/visitor");
      if (visRes.ok) {
        const visData = await visRes.json();
        setVisitorStats({
          daily: typeof visData.dailyVisitors === "number" ? visData.dailyVisitors : 0,
          monthly: typeof visData.monthlyVisitors === "number" ? visData.monthlyVisitors : 0,
          total: typeof visData.totalVisitors === "number" ? visData.totalVisitors : 0,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat ringkasan superadmin.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSuperadminData();
  }, [fetchSuperadminData]);

  const totalUsers = users.length;
  const countSuperadmin = users.filter((u) => u.role === "superadmin").length;
  const countAdmin = users.filter((u) => u.role === "admin").length;
  const countStudent = users.filter((u) => u.role === "student").length;

  const recentUsers = users.slice(0, 5);
  const recentLogs = logs.slice(0, 5);

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("CREATE") || action.includes("INSERT")) return "approved";
    if (action.includes("UPDATE") || action.includes("PATCH")) return "pending";
    if (action.includes("DELETE")) return "rejected";
    return "neutral";
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header Panel Superadmin */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Dashboard Superadmin
            </h1>
            <Badge variant="role-superadmin">Otoritas Tertinggi</Badge>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Pusat pemantauan integritas akun pengguna, hak akses peran sistem, dan audit log aktivitas real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSuperadminData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </Button>

          <Link href="/superadmin/users/create">
            <Button
              size="sm"
              className="gap-2 bg-[#0F3E2E] hover:bg-[#165640] text-white shadow-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah User</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pengguna */}
        <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-stone-900/50 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Total Pengguna</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              <AnimatedCounter value={totalUsers} />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              <span className="text-purple-600 font-semibold">{countAdmin} Admin</span> •{" "}
              <span className="text-emerald-600 font-semibold">{countStudent} Mahasiswa</span>
            </p>
          </div>
        </div>

        {/* Total Log Aktivitas */}
        <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-stone-900/50 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Audit Logs
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ScrollText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              <AnimatedCounter value={logs.length} />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Log aktivitas mutasi & otentikasi
            </p>
          </div>
        </div>

        {/* Pengunjung Hari Ini */}
        <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-stone-900/50 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Pengunjung Hari Ini
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              <AnimatedCounter value={visitorStats.daily} />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Tercatat unik berdasarkan IP harian
            </p>
          </div>
        </div>

        {/* Total Pengunjung */}
        <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-stone-900/50 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              Total Pengunjung
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">
              <AnimatedCounter value={visitorStats.total} />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              {visitorStats.monthly} pengunjung bulan ini
            </p>
          </div>
        </div>
      </div>

      {/* 2 Kolom: Log Aktivitas Terbaru & Pengguna Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Log Aktivitas Terbaru */}
        <Card className="border-stone-200/90 dark:border-stone-800/90 overflow-hidden">
          <CardHeader className="border-b border-stone-200/80 dark:border-stone-800/80 p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Log Aktivitas Terbaru</CardTitle>
              <CardDescription className="text-xs">
                Aktivitas perubahan data sistem terkini
              </CardDescription>
            </div>
            <Link href="/superadmin/logs">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>Semua Log</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-stone-400">
                Memuat log aktivitas...
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                Belum ada aktivitas yang tercatat.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={getActionBadgeVariant(log.action)}
                          className="text-[10px] px-1.5 py-0.5"
                        >
                          {log.action}
                        </Badge>
                        <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                          {log.table_name}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1 truncate">
                        Oleh: {log.user_email || "System"} ({log.user_role || "system"})
                      </p>
                    </div>

                    <span className="text-[10px] text-stone-400 whitespace-nowrap shrink-0">
                      {moment(log.created_at).fromNow()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pengguna Terbaru */}
        <Card className="border-stone-200/90 dark:border-stone-800/90 overflow-hidden">
          <CardHeader className="border-b border-stone-200/80 dark:border-stone-800/80 p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Pengguna Terbaru</CardTitle>
              <CardDescription className="text-xs">
                Akun yang baru terdaftar di platform
              </CardDescription>
            </div>
            <Link href="/superadmin/users">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>Semua Pengguna</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-stone-400">
                Memuat data pengguna...
              </div>
            ) : recentUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                Belum ada data pengguna.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {recentUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {u.profile?.full_name || "Pengguna"}
                      </p>
                      <p className="text-[11px] text-stone-400 truncate">
                        {u.email}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {u.role === "superadmin" && (
                        <Badge variant="role-superadmin" className="text-[10px] px-2 py-0.5">
                          Superadmin
                        </Badge>
                      )}
                      {u.role === "admin" && (
                        <Badge variant="role-admin" className="text-[10px] px-2 py-0.5">
                          Admin
                        </Badge>
                      )}
                      {u.role === "student" && (
                        <Badge variant="role-student" className="text-[10px] px-2 py-0.5">
                          Mahasiswa
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
