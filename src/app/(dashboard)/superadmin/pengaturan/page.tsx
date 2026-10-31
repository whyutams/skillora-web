"use client";

import * as React from "react";
import Link from "next/link";
import {
  Settings,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Save,
  Clock,
  MessageSquare,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AlertModal } from "@/components/ui/ModalKonfirmasi";

interface MaintenanceSettings {
  maintenance_mode: boolean;
  message: string;
  estimated_finish?: string;
  updated_at?: string;
  updated_by?: string;
}

export default function SuperadminPengaturanPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [isMaintenanceActive, setIsMaintenanceActive] = React.useState(false);
  const [customMessage, setCustomMessage] = React.useState("");
  const [estimatedFinish, setEstimatedFinish] = React.useState("");
  const [lastUpdated, setLastUpdated] = React.useState<{ at: string; by: string } | null>(null);

  const [alertData, setAlertData] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  // muat data pengaturan sistem
  const loadSettings = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat pengaturan.");

      const s = data.settings as MaintenanceSettings;
      setIsMaintenanceActive(Boolean(s.maintenance_mode));
      setCustomMessage(s.message || "");
      setEstimatedFinish(s.estimated_finish || "");
      if (s.updated_at) {
        setLastUpdated({
          at: s.updated_at,
          by: s.updated_by || "Superadmin",
        });
      }
    } catch (err: unknown) {
      console.error("Gagal memuat pengaturan:", err);
      setAlertData({
        isOpen: true,
        title: "Gagal Memuat Pengaturan",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // simpan perubahan mode pemeliharaan
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenance_mode: isMaintenanceActive,
          message: customMessage,
          estimated_finish: estimatedFinish,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengaturan.");

      if (data.settings?.updated_at) {
        setLastUpdated({
          at: data.settings.updated_at,
          by: data.settings.updated_by || "Superadmin",
        });
      }

      setAlertData({
        isOpen: true,
        title: isMaintenanceActive ? "Mode Pemeliharaan Aktif" : "Sistem Kembali Normal",
        message: data.message || "Pengaturan berhasil diperbarui.",
        type: "success",
      });
    } catch (err: unknown) {
      setAlertData({
        isOpen: true,
        title: "Gagal Menyimpan",
        message: err instanceof Error ? err.message : "Terjadi kendala saat menyimpan.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* header halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80 dark:border-stone-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              Pengaturan Sistem
            </h1>
            <Badge variant="role-superadmin" className="text-xs">
              Otoritas Superadmin
            </Badge>
          </div>
          <p className="text-xs text-stone-500">
            Kelola konfigurasi platform, mode operasional website, dan kendali pemeliharaan server Skillora.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadSettings}
          disabled={loading}
          className="gap-1.5 text-xs self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Muat Ulang</span>
        </Button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-stone-400 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
          <p>Memuat konfigurasi pengaturan sistem...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* kartu kendali mode pemeliharaan */}
          <Card className="border-stone-200/80 dark:border-stone-800/80 shadow-xs overflow-hidden">
            <CardHeader className="p-5 sm:p-6 border-b border-stone-100 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <CardTitle className="text-lg">Mode Pemeliharaan Website (Maintenance Mode)</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Kunci akses publik ke seluruh halaman web saat tim melakukan perbaikan berkala, update fitur, atau migrasi server.
                </CardDescription>
              </div>

              {isMaintenanceActive ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold animate-pulse self-start sm:self-center">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Pemeliharaan Aktif</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold self-start sm:self-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Sistem Normal</span>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-6">
              {/* status banner */}
              {isMaintenanceActive ? (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      Mode Pemeliharaan Sedang Aktif!
                    </p>
                    <p className="text-rose-700 dark:text-rose-300 leading-relaxed font-normal">
                      Seluruh pengunjung dan mahasiswa saat ini dialihkan secara otomatis ke halaman pemeliharaan. Hanya akun dengan hak akses <strong>Admin</strong> dan <strong>Superadmin</strong> yang dapat masuk dan mengoperasikan platform.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      Platform Berjalan Normal
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed font-normal">
                      Semua halaman publik, katalog kursus mandiri, pendaftaran peserta, dan dashboard belajar mahasiswa dapat diakses secara terbuka tanpa pembatasan.
                    </p>
                  </div>
                </div>
              )}

              {/* saklar toggle utama */}
              <div className="p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-sm text-stone-900 dark:text-stone-100 block">
                    Status Mode Pemeliharaan
                  </span>
                  <p className="text-xs text-stone-500">
                    Geser tombol saklar untuk mengaktifkan atau menonaktifkan mode pemeliharaan sistem.
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    * Catatan: Mode pemeliharaan otomatis dinonaktifkan pada lingkungan localhost agar pengujian dan pengembangan lokal tidak terganggu.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isMaintenanceActive}
                    onChange={(e) => setIsMaintenanceActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-stone-200 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-600" />
                </label>
              </div>

              {/* field pengaturan teks pemberitahuan */}
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
                    <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                    <span>Pesan Pemberitahuan untuk Pengunjung / Mahasiswa</span>
                  </label>
                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Tuliskan pesan penjelasan yang akan tampil di halaman pemeliharaan..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] resize-none"
                  />
                  <p className="text-[11px] text-stone-400">
                    Pesan ini akan dibaca oleh calon peserta dan mahasiswa saat mencoba membuka web ketika mode pemeliharaan aktif.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>Estimasi Waktu Selesai (Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={estimatedFinish}
                    onChange={(e) => setEstimatedFinish(e.target.value)}
                    placeholder="Contoh: 31 Oktober 2026, pukul 21:00 WIB"
                    className="w-full sm:max-w-md px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
                  />
                  <p className="text-[11px] text-stone-400">
                    Beri tahu mahasiswa perkiraan durasi sistem offline agar mereka dapat kembali belajar tepat waktu.
                  </p>
                </div>
              </div>

              {/* tautan cepat & informasi akses */}
              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-stone-200/70 dark:border-stone-800/70 bg-stone-50/50 dark:bg-stone-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-stone-400" />
                      <span>Halaman Pemeliharaan Publik</span>
                    </span>
                    <Link
                      href="/maintenance"
                      target="_blank"
                      className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Lihat Halaman</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Rute publik: <code className="px-1 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono text-[10px]">/maintenance</code>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-stone-200/70 dark:border-stone-800/70 bg-stone-50/50 dark:bg-stone-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Portal Login Khusus Pengelola</span>
                    </span>
                    <Link
                      href="/maintenance/login"
                      target="_blank"
                      className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Buka Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Rute khusus login pengelola: <code className="px-1 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono text-[10px]">/maintenance/login</code>
                  </p>
                </div>
              </div>

              {/* tombol simpan & riwayat */}
              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[11px] text-stone-400 text-center sm:text-left">
                  {lastUpdated ? (
                    <span>
                      Terakhir diperbarui oleh <strong>{lastUpdated.by}</strong> pada{" "}
                      {new Date(lastUpdated.at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : (
                    <span>Pengaturan belum pernah diubah dari standar sistem.</span>
                  )}
                </div>

                <Button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="bg-[#0F3E2E] hover:bg-[#15523d] text-white gap-2 font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs w-full sm:w-auto"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Menyimpan Perubahan..." : "Simpan Pengaturan"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* modal pemberitahuan */}
      <AlertModal
        isOpen={alertData.isOpen}
        title={alertData.title}
        message={alertData.message}
        type={alertData.type}
        onClose={() => setAlertData((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
}

