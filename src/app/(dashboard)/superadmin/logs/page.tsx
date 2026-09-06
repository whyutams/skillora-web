"use client";

import * as React from "react";
import { ActivityLog } from "@/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  ShieldCheck,
  Eye,
  Database,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ITEMS_PER_PAGE = 10;

export default function SuperadminLogsPage() {
  const [logs, setLogs] = React.useState<ActivityLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tableFilter, setTableFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [selectedLog, setSelectedLog] = React.useState<ActivityLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // Helper konversi waktu ke format WITA (Asia/Makassar - UTC+8)
  const formatWITA = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const datePart = date.toLocaleDateString("id-ID", {
        timeZone: "Asia/Makassar",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const timePart = date.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Makassar",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      return `${datePart}, ${timePart} WITA`;
    } catch {
      return dateString;
    }
  };

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tableFilter !== "all") params.set("table", tableFilter);
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/superadmin/logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  }, [tableFilter, searchQuery]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [tableFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(logs.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLogs = logs.slice(startIndex, endIndex);

  // Helper styling badge action
  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("LOGIN")) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
          {action}
        </span>
      );
    }
    if (act.includes("APPROVE")) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          {action}
        </span>
      );
    }
    if (act.includes("REJECT")) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
          {action}
        </span>
      );
    }
    if (act.includes("ENROLL")) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
          {action}
        </span>
      );
    }
    if (act.includes("ROLE") || act.includes("SUPERADMIN")) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-stone-500/15 text-stone-700 dark:text-stone-300 border border-stone-500/30">
        {action}
      </span>
    );
  };

  const tableOptions = [
    { value: "all", label: "Semua Tabel" },
    { value: "auth", label: "auth (Login/Register)" },
    { value: "enrollments", label: "enrollments (Pendaftaran)" },
    { value: "profiles", label: "profiles (User & Role)" },
    { value: "courses", label: "courses (Kursus)" },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header Panel Activity Logs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2">
              Log Aktivitas & Audit Sistem
              <Badge variant="role-superadmin">Superadmin</Badge>
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Pemantauan seluruh aktivitas autentikasi, pendaftaran kursus, approval admin, dan perubahan data.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={loading}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Segarkan Data</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Table Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-stone-400 flex items-center gap-1 mr-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              Tabel:
            </span>
            {tableOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTableFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  tableFilter === opt.value
                    ? "bg-[#0F3E2E] text-white shadow-xs font-semibold"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Masukkan kata kunci pencarian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Riwayat Log ({logs.length})</CardTitle>
              <CardDescription className="text-xs">
                Log real-time yang tersimpan pada tabel <code>activity_logs</code>
              </CardDescription>
            </div>
            <span className="text-[11px] text-stone-400">
              Limit: 100 log terbaru
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-stone-400" />
              <span>Memuat log aktivitas sistem...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ScrollText className="w-8 h-8 text-stone-300 dark:text-stone-700 mx-auto" />
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                Tidak ada log aktivitas yang cocok
              </p>
              <p className="text-xs text-stone-500">
                Coba ubah filter tabel atau kata kunci pencarian Anda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-900/60 text-stone-500 border-b border-stone-200/60 dark:border-stone-800/60">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Waktu & Tanggal</th>
                    <th className="py-3 px-4 font-semibold">Pengguna</th>
                    <th className="py-3 px-4 font-semibold">Aksi (Action)</th>
                    <th className="py-3 px-4 font-semibold">Tabel Target</th>
                    <th className="py-3 px-4 font-semibold">Record ID</th>
                    <th className="py-3 px-4 font-semibold text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                  {paginatedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-stone-50/60 dark:hover:bg-stone-900/40 transition-colors"
                    >
                      {/* Timestamp (WITA) */}
                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{formatWITA(log.created_at)}</span>
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-stone-900 dark:text-stone-100">
                            {log.user_email || "Anonymous / System"}
                          </p>
                          {log.user_role && (
                            <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-500">
                              {log.user_role}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      {/* Table Target */}
                      <td className="py-3 px-4 text-stone-600 dark:text-stone-300">
                        <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-[11px]">
                          {log.table_name || "-"}
                        </span>
                      </td>

                      {/* Record ID */}
                      <td className="py-3 px-4 text-[11px] text-stone-400 truncate max-w-[120px]">
                        {log.record_id || "-"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setIsDetailModalOpen(true);
                          }}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspeksi</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-stone-200/80 dark:border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-stone-500">
                Menampilkan <span className="font-semibold text-stone-900 dark:text-stone-100">{startIndex + 1}</span> - <span className="font-semibold text-stone-900 dark:text-stone-100">{Math.min(endIndex, logs.length)}</span> dari <span className="font-semibold text-stone-900 dark:text-stone-100">{logs.length}</span> log aktivitas
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </Button>
                <span className="px-3 py-1 font-semibold text-stone-700 dark:text-stone-300">
                  Halaman {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail JSON Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detail Metadata Aktivitas"
        description={`Log ID: ${selectedLog?.id || ""}`}
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
              <div>
                <span className="text-stone-400 block text-[11px]">Waktu (WITA):</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {formatWITA(selectedLog.created_at)}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Aksi:</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  {selectedLog.action}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Tabel Target:</span>
                <span className="text-stone-900 dark:text-stone-100">
                  {selectedLog.table_name}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Pengguna:</span>
                <span className="text-stone-900 dark:text-stone-100">
                  {selectedLog.user_email || "-"}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">IP Address:</span>
                <span className="text-stone-900 dark:text-stone-100">
                  {selectedLog.ip_address || "127.0.0.1"}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Record ID:</span>
                <span className="text-stone-900 dark:text-stone-100">
                  {selectedLog.record_id || "-"}
                </span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                Payload JSON Details:
              </span>
              <pre className="p-3.5 rounded-xl bg-stone-950 text-emerald-400 text-[11px] overflow-x-auto max-h-60 border border-stone-800 leading-relaxed">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
