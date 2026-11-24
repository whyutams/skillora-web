"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trophy,
  Lock,
  ArrowRight,
  Medal,
  RefreshCw,
  Building2,
  AtSign,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SmoothImage } from "@/components/ui/SmoothImage";

export interface LeaderboardParticipant {
  enrollment_id: string;
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  school_origin: string | null;
  average_score: number;
  total_score: number;
  completed_count: number;
  total_lessons: number;
  is_course_completed: boolean;
  is_current_user: boolean;
  created_at: string;
  rank: number;
}

interface TabLeaderboardKursusProps {
  isUnlocked: boolean;
  completedCount: number;
  totalLessons: number;
  progressPercentage: number;
  courseTitle: string;
  enrollmentOrSlug: string;
  lastAccessedLesson?: { moduleIndex: number; topicIndex: number } | null;
}

export function TabLeaderboardKursus({
  isUnlocked,
  completedCount,
  totalLessons,
  progressPercentage,
  courseTitle,
  enrollmentOrSlug,
  lastAccessedLesson,
}: TabLeaderboardKursusProps) {
  const [loading, setLoading] = React.useState(false);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardParticipant[]>([]);
  const [currentUserRank, setCurrentUserRank] = React.useState<number | null>(null);
  const [totalParticipants, setTotalParticipants] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  // ambil data leaderboard dari api saat peringkat terbuka
  const fetchLeaderboard = React.useCallback(async () => {
    if (!isUnlocked || !enrollmentOrSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/courses/${enrollmentOrSlug}/leaderboard`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memuat papan peringkat kelas.");
      }
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      setCurrentUserRank(data.current_user_rank || null);
      setTotalParticipants(data.total_participants || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan server.");
    } finally {
      setLoading(false);
    }
  }, [isUnlocked, enrollmentOrSlug]);

  React.useEffect(() => {
    if (isUnlocked) {
      fetchLeaderboard();
    }
  }, [isUnlocked, fetchLeaderboard]);

  const targetModuleIdx = lastAccessedLesson?.moduleIndex ?? 0;
  const targetTopicIdx = lastAccessedLesson?.topicIndex ?? 0;
  const learnUrl = `/kursus-saya/${enrollmentOrSlug}/belajar/${targetModuleIdx}/${targetTopicIdx}`;

  // tampilan jika peringkat kelas masih terkunci
  if (!isUnlocked) {
    const remainingLessons = Math.max(0, totalLessons - completedCount);

    return (
      <div className="w-full space-y-6">
        <div className="p-8 sm:p-12 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-2xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <Badge variant="neutral" className="text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20">
              Peringkat Kelas Terkunci
            </Badge>
            <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              Selesaikan Seluruh Silabus untuk Membuka Peringkat
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
              Peringkat dan hasil perolehan nilai antar peserta di kelas <span className="font-semibold text-stone-800 dark:text-stone-200">{courseTitle}</span> akan terbuka secara otomatis setelah Anda menyelesaikan seluruh materi dan evaluasi pemahaman di silabus.
            </p>
          </div>

          {/* kartu ringkasan progres belajar */}
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-stone-600 dark:text-stone-400">Progres Belajar Anda</span>
              <span className="text-[#0F3E2E] dark:text-emerald-400">
                {completedCount} dari {totalLessons} Topik ({progressPercentage}%)
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-[#0F3E2E] dark:bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              {remainingLessons > 0
                ? `Tersisa ${remainingLessons} topik materi lagi untuk membuka klasemen kelas!`
                : "Semua topik telah dipelajari, silakan periksa kelengkapan kuis atau evaluasi."}
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link href={learnUrl}>
              <Button size="md" className="bg-[#0F3E2E] hover:bg-[#15523d] text-white gap-2 text-xs font-bold px-6 py-2.5 rounded-xl shadow-xs">
                <span>Lanjutkan Belajar Silabus</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // tampilan jika peringkat kelas sudah terbuka
  const currentUserItem = leaderboard.find((item) => item.is_current_user);
  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="w-full space-y-6">
      {/* banner ucapan selamat peringkat terbuka */}
      <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
              Papan Peringkat Kelas Telah Terbuka
            </h3>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Selamat! Anda telah menyelesaikan seluruh silabus materi kursus ini dan dapat melihat peringkat hasil evaluasi bersama rekan peserta sekelas.
          </p>
        </div>

        {currentUserItem && (
          <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-emerald-500/30 shrink-0 text-center sm:text-right shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Posisi Anda
            </span>
            <div className="flex items-baseline justify-center sm:justify-end gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-[#0F3E2E] dark:text-emerald-400">
                #{currentUserRank || "-"}
              </span>
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                dari {totalParticipants} Peserta
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              Rata-Rata Nilai: {currentUserItem.average_score}/100
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-stone-400 space-y-2 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
          <p>Memuat klasemen peringkat kelas...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 space-y-2">
          <p className="font-bold">{error}</p>
          <Button size="sm" variant="outline" onClick={fetchLeaderboard} className="text-xs">
            Coba Muat Ulang
          </Button>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="p-12 text-center text-xs text-stone-400 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 space-y-2">
          <Trophy className="w-8 h-8 mx-auto text-stone-300" />
          <p>Belum ada data peringkat untuk kursus ini.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* kartu podium 3 teratas */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {topThree.map((item) => {
                const isFirst = item.rank === 1;
                const isSecond = item.rank === 2;
                const isThird = item.rank === 3;

                return (
                  <div
                    key={item.enrollment_id}
                    className={`p-4 rounded-2xl border relative flex flex-col justify-between space-y-3 transition-all ${
                      isFirst
                        ? "border-amber-400/50 bg-amber-500/10 dark:bg-amber-950/20 shadow-2xs"
                        : isSecond
                        ? "border-stone-300/80 dark:border-stone-700/80 bg-stone-100/70 dark:bg-stone-800/40"
                        : "border-amber-700/30 bg-amber-700/10 dark:bg-amber-950/10"
                    } ${item.is_current_user ? "ring-2 ring-emerald-600" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                          isFirst
                            ? "bg-amber-500 text-white"
                            : isSecond
                            ? "bg-stone-400 text-white dark:bg-stone-600"
                            : "bg-amber-700 text-white"
                        }`}
                      >
                        Peringkat #{item.rank}
                      </span>
                      <Medal
                        className={`w-5 h-5 ${
                          isFirst
                            ? "text-amber-500"
                            : isSecond
                            ? "text-stone-400 dark:text-stone-300"
                            : "text-amber-700"
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      {item.avatar_url ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                          <SmoothImage
                            src={item.avatar_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            containerClassName="w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0F3E2E] text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {item.name ? item.name.charAt(0).toUpperCase() : "M"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate block">
                            {item.name}
                          </span>
                          {item.is_current_user && (
                            <Badge variant="neutral" className="text-[9px] font-bold bg-[#0F3E2E] text-white">
                              Anda
                            </Badge>
                          )}
                        </div>
                        {item.school_origin && (
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate block">
                            {item.school_origin}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between text-xs">
                      <span className="text-stone-500 dark:text-stone-400 text-[11px]">Nilai Rata-Rata</span>
                      <span className="font-extrabold text-[#0F3E2E] dark:text-emerald-400 text-sm">
                        {item.average_score} / 100
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* tabel lengkap peringkat kelas */}
          <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Seluruh Peserta Kursus ({leaderboard.length} Mahasiswa)
                </h4>
                <p className="text-[11px] text-stone-400">
                  Diurutkan berdasarkan perolehan nilai rata-rata hasil pemeriksaan evaluasi topik.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-14 text-center">Rank</th>
                    <th className="py-3 px-4">Mahasiswa / Peserta</th>
                    <th className="py-3 px-4">Asal Kampus</th>
                    <th className="py-3 px-4 text-center">Topik Selesai</th>
                    <th className="py-3 px-4 text-center">Rata-Rata Nilai</th>
                    <th className="py-3 px-4 text-center">Total Nilai</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {leaderboard.map((item) => (
                    <tr
                      key={item.enrollment_id}
                      className={`transition-colors ${
                        item.is_current_user
                          ? "bg-emerald-500/10 dark:bg-emerald-950/20 font-semibold"
                          : "hover:bg-stone-50/80 dark:hover:bg-stone-900/50"
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${
                            item.rank === 1
                              ? "bg-amber-500 text-white"
                              : item.rank === 2
                              ? "bg-stone-400 text-white dark:bg-stone-600"
                              : item.rank === 3
                              ? "bg-amber-700 text-white"
                              : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                          }`}
                        >
                          #{item.rank}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {item.avatar_url ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                              <SmoothImage
                                src={item.avatar_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                containerClassName="w-full h-full"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#0F3E2E] text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {item.name ? item.name.charAt(0).toUpperCase() : "M"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-stone-900 dark:text-stone-100 block truncate">
                                {item.name}
                              </span>
                              {item.is_current_user && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#0F3E2E] text-white">
                                  Anda
                                </span>
                              )}
                            </div>
                            {item.username && (
                              <span className="text-[11px] text-stone-400 flex items-center gap-0.5">
                                <AtSign className="w-3 h-3 text-stone-400" />
                                {item.username}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.school_origin ? (
                          <span className="inline-flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
                            <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="truncate max-w-[170px]">{item.school_origin}</span>
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-stone-700 dark:text-stone-300">
                          {item.completed_count} / {item.total_lessons} Topik
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block font-extrabold px-2.5 py-1 rounded-lg text-xs ${
                            item.average_score >= 80
                              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
                              : item.average_score >= 70
                              ? "bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/20"
                              : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                          }`}
                        >
                          {item.average_score} / 100
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-stone-700 dark:text-stone-300">
                        {item.total_score}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {item.is_course_completed ? (
                          <Badge variant="approved" className="text-[10px] px-2 py-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-1" />
                            <span>Lulus</span>
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] px-2 py-0.5">
                            <span>Sedang Belajar</span>
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

