"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertModal } from "@/components/ui/ConfirmModal";
import {
  Users,
  ArrowLeft,
  User,
  AtSign,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Building2,
  Phone,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function CreateUserPage() {
  const router = useRouter();

  const [fullName, setFullName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [schoolOrigin, setSchoolOrigin] = React.useState("");
  const [whatsappNumber, setWhatsappNumber] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("student");

  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage("Nama lengkap wajib diisi.");
      return;
    }
    if (!username.trim()) {
      setErrorMessage("Username wajib diisi.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Email akun wajib diisi.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Kata sandi minimal 6 karakter.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          username: username.trim().toLowerCase().replace(/\s+/g, ""),
          email: email.trim().toLowerCase(),
          password,
          schoolOrigin: schoolOrigin.trim() || "-",
          whatsappNumber: whatsappNumber.trim() || "-",
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat akun pengguna.");
      }

      setAlertData({
        isOpen: true,
        title: "Pengguna Berhasil Ditambahkan",
        message: data.message || `Akun untuk "${fullName}" berhasil didaftarkan.`,
        type: "success",
      });

      setTimeout(() => {
        router.push("/superadmin/users");
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat pengguna.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl text-left space-y-6">
      {/* Header Navigasi Balik */}
      <div className="flex items-center justify-between">
        <Link
          href="/superadmin/users"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Manajemen Pengguna</span>
        </Link>
      </div>

      {/* Form Card */}
      <Card className="border-stone-200/90 dark:border-stone-800/90 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-stone-200/80 dark:border-stone-800/80 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F3E2E] text-emerald-300 flex items-center justify-center border border-emerald-600/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Tambah Pengguna Baru</CardTitle>
              <CardDescription className="text-xs">
                Daftarkan akun pengguna baru ke dalam platform Skillora secara manual.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  <span>Nama Lengkap *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan nama lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                />
              </div>

              {/* 2. Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-stone-400" />
                  <span>Username *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                />
              </div>

              {/* 3. Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span>Email Akun *</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Masukkan email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                />
              </div>

              {/* 4. Kata Sandi */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-stone-400" />
                  <span>Kata Sandi (Min. 6 Karakter) *</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 5. Asal Sekolah */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-stone-400" />
                  <span>Asal Sekolah / Kampus</span>
                </label>
                <input
                  type="text"
                  placeholder="Masukkan asal sekolah / instansi"
                  value={schoolOrigin}
                  onChange={(e) => setSchoolOrigin(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                />
              </div>

              {/* 6. Nomor WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>Nomor WhatsApp</span>
                </label>
                <input
                  type="tel"
                  placeholder="Masukkan nomor WhatsApp"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Role Picker: Hanya Student dan Admin */}
            <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Pilih Hak Akses Peran (Role):
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                    role === "student"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                      : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50"
                  }`}
                >
                  <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Student / Siswa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                    role === "admin"
                      ? "bg-purple-500/15 border-purple-500/40 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500/20"
                      : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50"
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span>Admin Officer</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-3">
              <Link href="/superadmin/users">
                <Button type="button" variant="outline" size="md" disabled={isSubmitting}>
                  Batal
                </Button>
              </Link>
              <Button
                type="submit"
                size="md"
                isLoading={isSubmitting}
                className="bg-[#0F3E2E] hover:bg-[#165640] text-white font-semibold gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan & Daftarkan Pengguna</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertModal
        isOpen={alertData.isOpen}
        onClose={() => setAlertData((p) => ({ ...p, isOpen: false }))}
        title={alertData.title}
        message={alertData.message}
        type={alertData.type}
      />
    </div>
  );
}
