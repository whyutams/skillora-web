"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertModal, ConfirmModal } from "@/components/ui/ModalKonfirmasi";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { Profile, USER_ROLES, getRoleLabel } from "@/types/database";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { ImageCropModal } from "@/components/ui/ModalCropGambar";

import {
  User,
  Camera,
  Trash2,
  AtSign,
  Mail,
  Building2,
  Phone,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ProfilPesertaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [email, setEmail] = React.useState<string>("");
  const [fullName, setFullName] = React.useState("");
  const [schoolOrigin, setSchoolOrigin] = React.useState("");
  const [whatsappNumber, setWhatsappNumber] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = React.useState(false);

  // status modal crop foto profil
  const [cropModalOpen, setCropModalOpen] = React.useState(false);
  const [selectedCropFile, setSelectedCropFile] = React.useState<File | null>(null);
  const [isSavingCrop, setIsSavingCrop] = React.useState(false);

  // status modal hapus foto profil
  const [deleteAvatarModalOpen, setDeleteAvatarModalOpen] = React.useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = React.useState(false);

  // status pembaruan kata sandi
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmNewPassword, setConfirmNewPassword] = React.useState("");
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);
  const [passwordErrorMsg, setPasswordErrorMsg] = React.useState<string | null>(null);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login?redirect=/profil");
          return;
        }

        setEmail(session.user.email || "");

        const res = await fetch("/api/profile");
        const data = await res.json();

        if (res.ok && data.profile) {
          if (data.profile.role === USER_ROLES.SUPERADMIN) {
            router.push("/superadmin/profile");
            return;
          }
          if (data.profile.role === USER_ROLES.ADMIN) {
            router.push("/admin/profile");
            return;
          }

          setProfile(data.profile);
          setFullName(data.profile.full_name || "");
          setSchoolOrigin(data.profile.school_origin || "");
          setWhatsappNumber(data.profile.whatsapp_number || "");
          setAvatarUrl(data.profile.avatar_url || null);
        }
      } catch (err) {
        console.error("Gagal memuat data profil", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase, router]);

  // buka modal crop saat file dipilih
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Harap pilih file gambar (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran gambar maksimal 5MB.");
      return;
    }

    setErrorMsg(null);
    setSelectedCropFile(file);
    setCropModalOpen(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // simpan hasil pemotongan foto ke storage
  const handleSaveCrop = async (croppedBlob: Blob) => {
    setIsSavingCrop(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      const fileName = `avatar-${profile?.id || "user"}-${Date.now()}.jpg`;
      formData.append("file", croppedBlob, fileName);
      formData.append("bucket", "avatars");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Gagal mengunggah foto ke storage.");
      }

      const newAvatarUrl = uploadData.url;
      setAvatarUrl(newAvatarUrl);

      // perbarui profil dengan avatar baru
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          schoolOrigin,
          whatsappNumber,
          avatarUrl: newAvatarUrl,
        }),
      });

      setProfile((prev) => (prev ? { ...prev, avatar_url: newAvatarUrl } : null));
      setCropModalOpen(false);
      setSelectedCropFile(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg("Gagal memproses foto " + err.message);
      } else {
        setErrorMsg("Terjadi kesalahan saat menyimpan foto profil.");
      }
    } finally {
      setIsSavingCrop(false);
    }
  };

  // hapus foto profil pengguna dan kembalikan ke avatar inisial nama
  const handleDeleteAvatar = async () => {
    setIsDeletingAvatar(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          schoolOrigin,
          whatsappNumber,
          avatarUrl: null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus foto profil.");
      }

      setAvatarUrl(null);
      setProfile((prev) => (prev ? { ...prev, avatar_url: null } : null));
      setDeleteAvatarModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Terjadi kesalahan saat menghapus foto profil.");
      }
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          schoolOrigin,
          whatsappNumber,
          avatarUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui profil.");
      }

      setSuccessModalOpen(true);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Terjadi kesalahan saat menyimpan data profil.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg(null);
    setPasswordSuccessMsg(null);

    if (newPassword.length < 6) {
      setPasswordErrorMsg("Kata sandi baru minimal terdiri dari 6 karakter.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordErrorMsg("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message || "Gagal memperbarui kata sandi.");
      }

      setPasswordSuccessMsg("Kata sandi akun Anda telah berhasil diperbarui!");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: unknown) {
      setPasswordErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan saat mengganti kata sandi."
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      {/* header */}
      <div className="pb-5 border-b border-stone-200/80 dark:border-stone-800/80">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
          <User className="w-7 h-7 text-[#0F3E2E] dark:text-emerald-400" />
          <span>Pengaturan Profil Akun</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
          Kelola identitas diri, kontak WhatsApp, dan foto profil Anda di platform Skillora.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {/* kartu avatar dan ringkasan akun */}
        <Card className="p-6 text-center space-y-5 h-fit">
          <div className="relative inline-block mx-auto">
            {avatarUrl ? (
              <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-2 border-emerald-500/40 shadow-sm">
                <SmoothImage
                  src={avatarUrl}
                  alt="Foto Profil"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-full bg-[#0F3E2E] text-emerald-300 flex items-center justify-center font-extrabold text-3xl mx-auto shadow-sm border border-emerald-600/30">
                {fullName ? fullName.charAt(0).toUpperCase() : "U"}
              </div>
            )}

            {/* tombol upload ganti foto profil */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar || isDeletingAvatar}
              aria-label="Ubah Foto Profil"
              title="Unggah Foto Profil Baru"
              className="absolute bottom-0 right-0 p-2 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-md text-stone-700 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-105 transition-all active:scale-95"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>

            {/* tombol hapus foto profil jika ada foto */}
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setDeleteAvatarModalOpen(true)}
                disabled={uploadingAvatar || isDeletingAvatar}
                aria-label="Hapus Foto Profil"
                title="Hapus Foto Profil"
                className="absolute bottom-0 left-0 p-2 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:scale-105 transition-all active:scale-95"
              >
                {isDeletingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>

          {/* aksi teks hapus foto profil jika ada foto */}
          {avatarUrl && (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setDeleteAvatarModalOpen(true)}
                disabled={uploadingAvatar || isDeletingAvatar}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 inline-flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Foto Profil</span>
              </button>
            </div>
          )}

          <div className="space-y-1">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {fullName || "Nama Pengguna"}
            </h2>
            <p className="text-xs text-stone-500 flex items-center justify-center gap-1">
              <AtSign className="w-3 h-3" />
              {profile?.username}
            </p>
            <div className="pt-2 flex justify-center">
              <Badge variant="role-student" className="text-xs uppercase">
                {getRoleLabel(profile?.role || "student")}
              </Badge>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 dark:border-stone-800 text-left text-xs space-y-2 text-stone-500">
            <p className="flex items-center gap-2 truncate">
              <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">{email}</span>
            </p>
            <p className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>
                Terdaftar sejak {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID") : "-"}
              </span>
            </p>
          </div>
        </Card>

        {/* formulir edit informasi akun */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Informasi Profil</CardTitle>
              <CardDescription className="text-xs">
                Perbarui data kontak dan informasi institusi perguruan tinggi asal Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* username terkunci */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      disabled
                      value={profile?.username || ""}
                      className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 text-stone-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* nama lengkap */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Masukkan nama lengkap"
                      className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
                    />
                  </div>
                </div>

                {/* email terkunci */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 text-stone-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* asal kampus */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Asal Perguruan Tinggi / Kampus <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={schoolOrigin}
                      onChange={(e) => setSchoolOrigin(e.target.value)}
                      placeholder="Masukkan nama universitas atau institut"
                      className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
                    />
                  </div>
                </div>

                {/* nomor whatsapp */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nomor WhatsApp Aktif</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="Contoh 081234567890"
                      className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={saving}
                    className="gap-2 text-xs font-bold"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Simpan Perubahan</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* ganti kata sandi */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Keamanan Akun & Kata Sandi</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Perbarui kata sandi akun Anda secara berkala untuk menjaga keamanan akses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {passwordErrorMsg && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passwordErrorMsg}</span>
                  </div>
                )}

                {passwordSuccessMsg && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{passwordSuccessMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingPassword || !newPassword}
                    className="gap-2 text-xs font-semibold"
                  >
                    {isUpdatingPassword ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4" />
                    )}
                    <span>Perbarui Kata Sandi</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* modal konfirmasi sukses pembaruan profil */}
      <AlertModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="Profil Berhasil Diperbarui"
        message="Data identitas profil Anda telah berhasil disimpan dan disinkronkan ke sistem Skillora."
        buttonText="Selesai"
        type="success"
      />

      {/* modal konfirmasi hapus foto profil */}
      <ConfirmModal
        isOpen={deleteAvatarModalOpen}
        onClose={() => setDeleteAvatarModalOpen(false)}
        onConfirm={handleDeleteAvatar}
        isLoading={isDeletingAvatar}
        title="Hapus Foto Profil"
        description="Apakah Anda yakin ingin menghapus foto profil ini? Foto akan dihapus dan profil Anda akan menggunakan avatar inisial nama."
        confirmText="Ya, Hapus Foto"
        cancelText="Batal"
        variant="danger"
      />

      {/* modal crop foto profil rasio satu banding satu */}
      {cropModalOpen && selectedCropFile && (
        <ImageCropModal
          isOpen={cropModalOpen}
          imageFile={selectedCropFile}
          onClose={() => {
            setCropModalOpen(false);
            setSelectedCropFile(null);
          }}
          onSaveCrop={handleSaveCrop}
          isSaving={isSavingCrop}
        />
      )}
    </div>
  );
}
