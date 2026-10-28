"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertModal } from "@/components/ui/ConfirmModal";
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
} from "lucide-react";

export function DashboardProfileForm({ roleTitle }: { roleTitle: string }) {
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

  // Crop Modal States (1:1 crop requirement)
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
          router.push("/login");
          return;
        }

        setEmail(session.user.email || "");

        const res = await fetch("/api/profile");
        const data = await res.json();

        if (res.ok && data.profile) {
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

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Harap pilih file gambar (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran file gambar maksimal 5MB.");
      return;
    }

    setErrorMsg(null);
    setSelectedCropFile(file);
    setCropModalOpen(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
      const updateRes = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          schoolOrigin,
          whatsappNumber,
          avatarUrl: newAvatarUrl,
        }),
      });

      if (!updateRes.ok) {
        const d = await updateRes.json();
        throw new Error(d.error || "Gagal menyimpan URL avatar ke database.");
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: newAvatarUrl } : null));
      setCropModalOpen(false);
      setSelectedCropFile(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Terjadi kesalahan saat memproses foto profil.");
      }
    } finally {
      setIsSavingCrop(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Nama lengkap tidak boleh kosong.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          schoolOrigin: schoolOrigin.trim(),
          whatsappNumber: whatsappNumber.trim(),
          avatarUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui profil.");
      }

      setProfile(data.profile);
      setSuccessModalOpen(true);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Gagal menyimpan perubahan profil.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F3E2E] dark:text-emerald-400" />
        <p className="text-xs font-medium">Memuat data profil {roleTitle}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-5xl text-left">
      {/* Header Info */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
          Pengaturan Profil {roleTitle}
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
          Kelola informasi identitas, foto profil, dan kredensial akun administrator Anda.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Quick Info */}
        <Card className="border-stone-200/90 dark:border-stone-800/90 text-center p-6 space-y-4">
          <div className="relative inline-block mx-auto">
            {avatarUrl ? (
              <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-md">
                <SmoothImage
                  src={avatarUrl}
                  alt="Foto Profil"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-[#0F3E2E] text-emerald-300 font-extrabold text-3xl flex items-center justify-center border border-emerald-600/30 mx-auto shadow-md">
                {fullName ? fullName.charAt(0).toUpperCase() : "A"}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Ubah foto profil"
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:text-emerald-600 shadow-md hover:scale-105 transition-all"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />
          </div>

          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {fullName || "Administrator"}
            </h3>
            <p className="text-xs text-stone-500 flex items-center justify-center gap-1 mt-0.5">
              <AtSign className="w-3 h-3 text-emerald-600" />
              <span>{profile?.username || "username"}</span>
            </p>
          </div>

          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-center">
            <Badge
              variant={
                profile?.role === "superadmin"
                  ? "role-superadmin"
                  : "role-admin"
              }
              className="text-[10px] px-2.5 py-0.5 uppercase tracking-wider"
            >
              <Shield className="w-3 h-3 mr-1" />
              {profile?.role || "admin"}
            </Badge>
          </div>
        </Card>

        {/* Right Column: Edit Form */}
        <Card className="md:col-span-2 border-stone-200/90 dark:border-stone-800/90">
          <CardHeader className="border-b border-stone-100 dark:border-stone-800 p-5">
            <CardTitle className="text-base">Informasi Akun Administrator</CardTitle>
            <CardDescription className="text-xs">
              Ubah rincian nama, instansi sekolah/kampus, dan nomor kontak aktif.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Readonly: Username */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Username (Kredensial Login)
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profile?.username || ""}
                    disabled
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 text-stone-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Readonly: Email */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Alamat Email Akun
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={email}
                    disabled
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 text-stone-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Editable: Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Editable: Asal Sekolah / Kampus */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Asal Kampus
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={schoolOrigin}
                    onChange={(e) => setSchoolOrigin(e.target.value)}
                    placeholder="Masukkan asal kampus"
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Editable: No WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nomor WhatsApp Aktif
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="Masukkan nomor WhatsApp"
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={saving}
                  className="w-full sm:w-auto gap-2 font-semibold"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Profil</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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

      <AlertModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="Profil Berhasil Diperbarui"
        message="Informasi profil dan foto akun Anda telah berhasil disimpan ke database."
        type="success"
      />
    </div>
  );
}
