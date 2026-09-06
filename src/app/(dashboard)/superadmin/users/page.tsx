"use client";

import * as React from "react";
import Link from "next/link";
import { UserRole } from "@/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmModal, AlertModal } from "@/components/ui/ConfirmModal";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import {
  Users,
  Search,
  RefreshCw,
  Building2,
  Phone,
  AtSign,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  Lock,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Trash2,
  KeyRound,
  X,
  Eye,
  EyeOff,
  Loader2,
  Check,
} from "lucide-react";

interface SuperadminUser {
  id: string;
  full_name: string;
  username: string;
  school_origin: string;
  whatsapp_number: string;
  role: UserRole;
  avatar_url?: string | null;
  created_at: string;
}

export default function SuperadminUsersPage() {
  const [users, setUsers] = React.useState<SuperadminUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal Pratinjau Gambar
  const [previewImage, setPreviewImage] = React.useState<{ isOpen: boolean; url: string | null; title: string; description?: string }>({
    isOpen: false, url: null, title: "",
  });

  // Modal Hapus Akun
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ isOpen: boolean; userId: string; userName: string }>({
    isOpen: false, userId: "", userName: "",
  });
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Modal Reset Password
  const [resetModal, setResetModal] = React.useState<{ isOpen: boolean; userId: string; userName: string }>({
    isOpen: false, userId: "", userName: "",
  });
  const [newPassword, setNewPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [resetError, setResetError] = React.useState<string | null>(null);

  // Alert modal
  const [alertData, setAlertData] = React.useState<{ isOpen: boolean; title: string; message: string; type: "success" | "error" | "info" }>({
    isOpen: false, title: "", message: "", type: "info",
  });

  const showAlert = (title: string, message: string, type: "success" | "error" | "info") => {
    setAlertData({ isOpen: true, title, message, type });
  };

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data pengguna.");
      setUsers(data.users || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Hapus Akun
  const handleDeleteUser = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/superadmin/users?userId=${deleteConfirm.userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      setUsers((prev) => prev.filter((u) => u.id !== deleteConfirm.userId));
      showAlert("Akun Dihapus", data.message || `Akun "${deleteConfirm.userName}" berhasil dihapus.`, "success");
    } catch (err: unknown) {
      setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      showAlert("Gagal Menghapus", err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset Password
  const handleOpenResetModal = (userId: string, userName: string) => {
    setResetModal({ isOpen: true, userId, userName });
    setNewPassword("");
    setResetError(null);
    setShowPassword(false);
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setResetError("Password baru minimal 6 karakter.");
      return;
    }
    setIsResetting(true);
    setResetError(null);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetModal.userId, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResetModal((prev) => ({ ...prev, isOpen: false }));
      showAlert("Password Direset", data.message || `Password berhasil direset.`, "success");
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = React.useMemo(() => {
    const query = searchQuery.toLowerCase();
    return users.filter((u) =>
      u.full_name?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query) ||
      u.school_origin?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  React.useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 w-full">
      {/* Header Panel Users */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2">
              Users Management
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Kelola seluruh akun terdaftar, reset password, hapus akun, dan daftarkan pengguna baru.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan Data</span>
          </Button>
          <Link href="/superadmin/users/create">
            <Button size="sm" className="gap-2 bg-[#0F3E2E] hover:bg-[#165640] text-white shadow-xs font-semibold">
              <UserPlus className="w-4 h-4" />
              <span>Tambah Pengguna</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border-stone-200/90 dark:border-stone-800/90 overflow-hidden">
        <CardHeader className="border-b border-stone-200/80 dark:border-stone-800/80 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Daftar Seluruh Pengguna</CardTitle>
            <CardDescription className="text-xs">
              Total {users.length} pengguna terdaftar di platform Skillora.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, username, atau asal sekolah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#0F3E2E]"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-stone-400" />
              <span>Memuat data seluruh pengguna...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-600 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" /> <span>{error}</span>
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-400">
              Tidak ada data pengguna yang ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-stone-700 dark:text-stone-300">
                <thead className="bg-stone-50 dark:bg-stone-900/70 border-b border-stone-200/80 dark:border-stone-800/80 text-[11px] uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Pengguna</th>
                    <th className="py-3 px-4 font-semibold">Asal Sekolah / Kampus</th>
                    <th className="py-3 px-4 font-semibold">No. WhatsApp</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold text-center">Aksi</th>
                    <th className="py-3 px-4 font-semibold text-right">Tgl. Registrasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                  {paginatedUsers.map((u) => {
                    const avatarSrc = u.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || "User")}&background=0F3E2E&color=6ee7b7`;

                    return (
                      <tr key={u.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors">
                        {/* Avatar & Nama */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ isOpen: true, url: avatarSrc, title: u.full_name || "Pengguna", description: `@${u.username || "-"} • ${u.role}` })}
                              className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-stone-200 dark:border-stone-800 group hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                              title="Klik untuk melihat foto profil"
                            >
                              <SmoothImage src={avatarSrc} alt={u.full_name || "Avatar"} className="w-full h-full object-cover group-hover:scale-105 transition-transform" containerClassName="w-full h-full" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <ZoomIn className="w-3 h-3" />
                              </div>
                            </button>
                            <div>
                              <div className="font-semibold text-stone-900 dark:text-stone-100">{u.full_name || "-"}</div>
                              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                <AtSign className="w-3 h-3" /> <span>{u.username || "-"}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Asal Sekolah */}
                        <td className="py-3.5 px-4 text-stone-600 dark:text-stone-400">
                          {u.school_origin && u.school_origin !== "-" ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span className="truncate max-w-[200px]">{u.school_origin}</span>
                            </div>
                          ) : <span className="text-stone-400 font-semibold">-</span>}
                        </td>

                        {/* No WhatsApp */}
                        <td className="py-3.5 px-4">
                          {u.whatsapp_number && u.whatsapp_number !== "-" ? (
                            <a href={`https://wa.me/${u.whatsapp_number.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline">
                              <Phone className="w-3 h-3" /> <span>+{u.whatsapp_number}</span>
                            </a>
                          ) : <span className="text-stone-400 font-semibold">-</span>}
                        </td>

                        {/* Role Badge */}
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={u.role === "superadmin" ? "role-superadmin" : u.role === "admin" ? "role-admin" : "role-student"}
                            className="text-[10px] px-2 py-0.5 uppercase tracking-wide"
                          >
                            {u.role === "superadmin" && <ShieldAlert className="w-3 h-3 mr-1 inline" />}
                            {u.role === "admin" && <ShieldCheck className="w-3 h-3 mr-1 inline" />}
                            {u.role === "student" && <GraduationCap className="w-3 h-3 mr-1 inline" />}
                            {u.role}
                          </Badge>
                        </td>

                        {/* Aksi: Reset Password + Hapus */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 justify-center">
                            {u.role === "superadmin" ? "-" : (
                              <>
                                {/* Reset Password */}
                                {u.role === "admin" && (
                                  <button
                                    onClick={() => handleOpenResetModal(u.id, u.full_name)}
                                    title="Reset password akun ini"
                                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                                  >
                                    <KeyRound className="w-3 h-3" /> Reset PW
                                  </button>
                                )}

                                {/* Hapus Akun */}
                                <button
                                  onClick={() => setDeleteConfirm({ isOpen: true, userId: u.id, userName: u.full_name })}
                                  title="Hapus akun ini secara permanen"
                                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" /> Hapus
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Tanggal Terdaftar */}
                        <td className="py-3.5 px-4 text-right text-stone-400 text-[11px]">
                          {new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredUsers.length > ITEMS_PER_PAGE && (
            <div className="p-4 border-t border-stone-200/80 dark:border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
              <span>Menampilkan {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)} dari {filteredUsers.length} pengguna</span>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="gap-1 px-2.5 py-1 text-xs">
                  <ChevronLeft className="w-3.5 h-3.5" /> <span>Sebelumnya</span>
                </Button>
                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${currentPage === page ? "bg-[#0F3E2E] text-white" : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"}`}>
                      {page}
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="gap-1 px-2.5 py-1 text-xs">
                  <span>Selanjutnya</span> <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Pratinjau Foto Profil */}
      <ImagePreviewModal
        isOpen={previewImage.isOpen}
        onClose={() => setPreviewImage((p) => ({ ...p, isOpen: false }))}
        imageUrl={previewImage.url}
        title={previewImage.title}
        description={previewImage.description}
      />

      {/* Modal Konfirmasi Hapus Akun */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleDeleteUser}
        title="Hapus Akun Pengguna"
        description={`Apakah Anda yakin ingin menghapus akun "${deleteConfirm.userName}" secara permanen? Semua data pendaftaran kursus pengguna ini juga akan terhapus. Tindakan ini TIDAK DAPAT dibatalkan.`}
        confirmText="Ya, Hapus Permanen"
        cancelText="Batal"
        isLoading={isDeleting}
        variant="danger"
      />

      {/* Modal Reset Password */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0C0A09] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button onClick={() => setResetModal((prev) => ({ ...prev, isOpen: false }))} className="absolute top-5 right-5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800">
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-500/20">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Reset Password</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Atur password baru untuk akun <span className="font-semibold text-stone-800 dark:text-stone-200">{resetModal.userName}</span>. Password lama akan langsung diganti.
              </p>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> <span>{resetError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Password Baru <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleResetPassword(); }}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-stone-400">Password akan langsung aktif setelah disimpan.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setResetModal((prev) => ({ ...prev, isOpen: false }))} disabled={isResetting}>
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleResetPassword}
                disabled={isResetting || !newPassword}
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isResetting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Mereset...</span></>
                ) : (
                  <><Check className="w-4 h-4" /><span>Reset Password</span></>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal Hasil */}
      <AlertModal
        isOpen={alertData.isOpen}
        onClose={() => setAlertData((prev) => ({ ...prev, isOpen: false }))}
        title={alertData.title}
        message={alertData.message}
        type={alertData.type}
      />
    </div>
  );
}
