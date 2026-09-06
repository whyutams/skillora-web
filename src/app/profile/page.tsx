"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertModal } from "@/components/ui/ConfirmModal";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { Profile } from "@/types/database";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { ImageCropModal } from "@/components/ui/ImageCropModal";

import {
  User,
  Camera,
  AtSign,
  Mail,
  Building2,
  Phone,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";

export default function ProfilePage() {
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

  // 1:1 Crop Modal states
  const [cropModalOpen, setCropModalOpen] = React.useState(false);
  const [selectedCropFile, setSelectedCropFile] = React.useState<File | null>(null);
  const [isSavingCrop, setIsSavingCrop] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login?redirect=/profile");
          return;
        }

        setEmail(session.user.email || "");

        const res = await fetch("/api/profile");
        const data = await res.json();

        if (res.ok && data.profile) {
          if (data.profile.role === "superadmin") {
            router.push("/superadmin/profile");
            return;
          }
          if (data.profile.role === "admin") {
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
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase, router]);

  // Handle Avatar Selection -> Buka 1:1 Crop Modal
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

  // Simpan hasil Crop 1:1 ke Supabase Storage (avatars bucket)
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

      // Auto update avatarUrl ke profile
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
        setErrorMsg("Gagal memproses foto: " + err.message);
      } else {
        setErrorMsg("Terjadi kesalahan saat menyimpan foto profil.");
      }
    } finally {
      setIsSavingCrop(false);
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

  if (loading) {
    return <ProfileSkeleton />;
  }


  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200/80 dark:border-stone-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <User className="w-7 h-7 text-[#0F3E2E] dark:text-emerald-400" />
            <span>Pengaturan Profil Akun</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Kelola identitas diri, kontak WhatsApp, dan foto profil Anda di platform Skillora.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="gap-2 shrink-0 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {/* Kolom Kiri: Kartu Avatar & Ringkasan Akun */}
        <Card className="p-6 text-center space-y-5 h-fit">
          <div className="relative inline-block mx-auto">
            {avatarUrl ? (
              <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-sm">
                <SmoothImage
                  src={avatarUrl}
                  alt="Foto Profil"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-[#0F3E2E] text-emerald-300 flex items-center justify-center font-extrabold text-3xl mx-auto shadow-sm border border-emerald-600/30">
                {fullName ? fullName.charAt(0).toUpperCase() : "U"}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Ubah Foto Profil"
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-md text-stone-700 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-transform active:scale-95"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {fullName || "Nama Pengguna"}
            </h2>
            <p className="text-xs text-stone-500 flex items-center justify-center gap-1">
              <AtSign className="w-3 h-3" />
              {profile?.username}
            </p>
            <div className="pt-2 flex justify-center">
              <Badge
                variant={
                  profile?.role === "superadmin"
                    ? "role-superadmin"
                    : profile?.role === "admin"
                    ? "role-admin"
                    : "role-student"
                }
                className="text-xs uppercase"
              >
                {profile?.role || "Student"}
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
                Terdaftar: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID") : "-"}
              </span>
            </p>
          </div>
        </Card>

        {/* Kolom Kanan: Form Edit Profil */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Detail Informasi Akun</CardTitle>
              <CardDescription className="text-xs">
                Perbarui data nama, institusi belajar, dan nomor kontak WhatsApp Anda.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
                  />
                </div>

                {/* Username (Locked) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Username Akun (Permanen)
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

                {/* Email (Locked) */}
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

                {/* Asal Sekolah / Kampus */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Asal Sekolah / Kampus <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={schoolOrigin}
                      onChange={(e) => setSchoolOrigin(e.target.value)}
                      placeholder="Masukkan asal sekolah / instansi"
                      className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
                    />
                  </div>
                </div>

                {/* Nomor WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nomor WhatsApp / Telepon Aktif</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="Masukkan nomor WhatsApp / Telepon"
                      className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Digunakan untuk verifikasi pembayaran dan bergabung ke WhatsApp Group kelas.
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={saving}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan Profil</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 1:1 Image Crop Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => {
          if (!isSavingCrop) {
            setCropModalOpen(false);
            setSelectedCropFile(null);
          }
        }}
        imageFile={selectedCropFile}
        onSaveCrop={handleSaveCrop}
        isSaving={isSavingCrop}
      />

      {/* Modal Notifikasi Sukses */}
      <AlertModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="Profil Berhasil Disimpan"
        message="Data identitas dan foto profil akun Skillora Anda telah berhasil diperbarui."
        buttonText="Selesai"
        type="success"
      />
    </div>
  );
}
