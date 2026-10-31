"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import {
  GraduationCap,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  User,
  AtSign,
  Building2,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [schoolOrigin, setSchoolOrigin] = React.useState("");
  const [whatsappNumber, setWhatsappNumber] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Password visibility toggles
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Real-time validation states
  const [usernameStatus, setUsernameStatus] = React.useState<{
    loading: boolean;
    valid?: boolean;
    available?: boolean;
    message?: string;
  }>({ loading: false });

  const [emailStatus, setEmailStatus] = React.useState<{
    loading: boolean;
    valid?: boolean;
    available?: boolean;
    message?: string;
  }>({ loading: false });

  const [whatsappStatus, setWhatsappStatus] = React.useState<{
    loading: boolean;
    valid?: boolean;
    available?: boolean;
    message?: string;
  }>({ loading: false });

  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Event Validasi Username (Real-time debounce)
  React.useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setUsernameStatus({ loading: false });
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus({ loading: true });
      try {
        const res = await fetch("/api/auth/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "username", value: clean }),
        });
        const data = await res.json();
        setUsernameStatus({
          loading: false,
          valid: data.valid,
          available: data.available,
          message: data.message,
        });
      } catch {
        setUsernameStatus({ loading: false });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [username]);

  // Event Validasi Email (Real-time debounce)
  React.useEffect(() => {
    const clean = email.trim().toLowerCase();
    if (!clean) {
      setEmailStatus({ loading: false });
      return;
    }

    const timer = setTimeout(async () => {
      setEmailStatus({ loading: true });
      try {
        const res = await fetch("/api/auth/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "email", value: clean }),
        });
        const data = await res.json();
        setEmailStatus({
          loading: false,
          valid: data.valid,
          available: data.available,
          message: data.message,
        });
      } catch {
        setEmailStatus({ loading: false });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [email]);

  // Event Validasi WhatsApp / Nomor HP (Real-time debounce)
  React.useEffect(() => {
    const clean = whatsappNumber.trim().replace(/[^0-9]/g, "");
    if (!clean) {
      setWhatsappStatus({ loading: false });
      return;
    }
    if (clean.length < 9) {
      setWhatsappStatus({
        loading: false,
        valid: false,
        available: false,
        message: "Nomor WhatsApp minimal 9 digit.",
      });
      return;
    }

    const timer = setTimeout(async () => {
      setWhatsappStatus({ loading: true });
      try {
        const res = await fetch("/api/auth/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "whatsapp", value: clean }),
        });
        const data = await res.json();
        setWhatsappStatus({
          loading: false,
          valid: data.valid,
          available: data.available,
          message: data.message,
        });
      } catch {
        setWhatsappStatus({ loading: false });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [whatsappNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();
    const cleanSchool = schoolOrigin.trim();
    const cleanPhone = whatsappNumber.trim().replace(/[^0-9]/g, "");

    // Validasi field wajib
    if (!cleanFullName) {
      setError("Nama lengkap mahasiswa wajib diisi.");
      return;
    }

    if (!cleanUsername) {
      setError("Username unik wajib diisi.");
      return;
    }

    if (usernameStatus.available === false) {
      setError("Username sudah digunakan. Silakan gunakan username lain.");
      return;
    }

    if (!cleanSchool) {
      setError("Asal kampus wajib diisi.");
      return;
    }

    if (!cleanPhone || cleanPhone.length < 9) {
      setError("Nomor WhatsApp aktif wajib diisi (minimal 9 digit).");
      return;
    }

    if (whatsappStatus.available === false) {
      setError("Nomor WhatsApp sudah terdaftar pada akun lain. Silakan gunakan nomor lain.");
      return;
    }

    if (!cleanEmail) {
      setError("Alamat email aktif wajib diisi.");
      return;
    }

    if (emailStatus.valid === false) {
      setError("Format email tidak valid.");
      return;
    }

    if (emailStatus.available === false) {
      setError("Alamat email sudah terdaftar. Silakan gunakan alamat email lain atau masuk.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi minimal terdiri dari 6 karakter.");
      return;
    }

    if (!turnstileToken && process.env.NODE_ENV === "production") {
      setError("Mohon selesaikan verifikasi captcha keamanan Cloudflare.");
      return;
    }

    setIsLoading(true);

    try {
      // Registrasi akun melalui API endpoint server-side
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: cleanFullName,
          username: cleanUsername,
          email: cleanEmail,
          password,
          schoolOrigin: cleanSchool,
          whatsappNumber: cleanPhone,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Gagal mendaftarkan akun.");
      }

      // Login otomatis setelah registrasi berhasil
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (!signInError && signInData.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan saat pendaftaran akun.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F3E2E] text-emerald-300 border border-emerald-600/30 mb-2">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Daftar Akun Pelajar Skillora
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Lengkapi identitas untuk bergabung dalam kelas & grup WhatsApp belajar.
          </p>
        </div>

        <Card className="border border-stone-200/80 dark:border-stone-800/80 shadow-sm">
          <CardContent className="p-6">
            {success ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                    Pendaftaran Berhasil!
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
                    Akun Anda telah terdaftar. Anda dapat langsung masuk menggunakan username <strong>{username}</strong> Anda.
                  </p>
                </div>
                <Link href="/login" className="block pt-2">
                  <Button variant="primary" size="md" className="w-full">
                    Menuju Halaman Masuk
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 1. Nama Lengkap */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                  >
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="fullName"
                      type="text"
                      required
                      placeholder="Masukkan nama lengkap"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* 2. Username dengan Event Validasi Real-time */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="username"
                      className="block text-xs font-semibold text-stone-700 dark:text-stone-300"
                    >
                      Username Akun (Untuk Login) <span className="text-rose-500">*</span>
                    </label>
                    {usernameStatus.loading && (
                      <span className="text-[11px] text-stone-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Memeriksa...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="username"
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="Masukkan username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                      className={`w-full pl-9 pr-9 py-2 text-sm rounded-lg border bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 transition-colors ${
                        username && usernameStatus.available === true
                          ? "border-emerald-500 focus:ring-emerald-500"
                          : username && usernameStatus.available === false
                          ? "border-rose-500 focus:ring-rose-500"
                          : "border-stone-300 dark:border-stone-700 focus:ring-[#0F3E2E]"
                      }`}
                    />
                    {username && !usernameStatus.loading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameStatus.available ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : usernameStatus.available === false ? (
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {usernameStatus.message && username && (
                    <p
                      className={`text-[11px] mt-1 ${
                        usernameStatus.available
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {usernameStatus.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="schoolOrigin"
                      className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                    >
                      Asal Kampus <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="schoolOrigin"
                        type="text"
                        required
                        placeholder="Masukkan asal kampus"
                        value={schoolOrigin}
                        onChange={(e) => setSchoolOrigin(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="whatsappNumber"
                        className="block text-xs font-semibold text-stone-700 dark:text-stone-300"
                      >
                        Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                      </label>
                      {whatsappStatus.loading && (
                        <span className="text-[11px] text-stone-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Cek...
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="whatsappNumber"
                        type="tel"
                        required
                        placeholder="Contoh: 08123456789"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className={`w-full pl-9 pr-9 py-2 text-sm rounded-lg border bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 transition-colors ${
                          whatsappNumber && whatsappStatus.available === true
                            ? "border-emerald-500 focus:ring-emerald-500"
                            : whatsappNumber && whatsappStatus.available === false
                            ? "border-rose-500 focus:ring-rose-500"
                            : "border-stone-300 dark:border-stone-700 focus:ring-[#0F3E2E]"
                        }`}
                      />
                      {whatsappNumber && !whatsappStatus.loading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {whatsappStatus.available ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : whatsappStatus.available === false ? (
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                          ) : null}
                        </div>
                      )}
                    </div>
                    {whatsappStatus.message && whatsappNumber && (
                      <p
                        className={`text-[11px] mt-1 ${
                          whatsappStatus.available
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {whatsappStatus.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Email dengan Event Validasi */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold text-stone-700 dark:text-stone-300"
                    >
                      Alamat Email Aktif <span className="text-rose-500">*</span>
                    </label>
                    {emailStatus.loading && (
                      <span className="text-[11px] text-stone-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Memeriksa...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="Masukkan email aktif"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-9 pr-9 py-2 text-sm rounded-lg border bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 transition-colors ${
                        email && emailStatus.available === true
                          ? "border-emerald-500 focus:ring-emerald-500"
                          : email && (emailStatus.valid === false || emailStatus.available === false)
                          ? "border-rose-500 focus:ring-rose-500"
                          : "border-stone-300 dark:border-stone-700 focus:ring-[#0F3E2E]"
                      }`}
                    />
                    {email && !emailStatus.loading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {emailStatus.available ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : emailStatus.valid === false || emailStatus.available === false ? (
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {emailStatus.message && email && (
                    <p
                      className={`text-[11px] mt-1 ${
                        emailStatus.available
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {emailStatus.message}
                    </p>
                  )}
                </div>

                {/* 5. Password dengan Toggle Show/Hide */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                    >
                      Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Masukkan kata sandi"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                    >
                      Ulangi Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder="Masukkan konfirmasi kata sandi"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cloudflare Turnstile */}
                <div className="pt-1">
                  <TurnstileWidget
                    onSuccess={(token) => setTurnstileToken(token)}
                    onError={() => {
                      setTurnstileToken("verified-fallback");
                    }}
                    onExpire={() => setTurnstileToken(null)}
                  />
                </div>

                {/* Tombol Daftar dengan disable state jika Cloudflare belum selesai */}
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  disabled={!turnstileToken || isLoading}
                  className="w-full gap-2 font-semibold"
                >
                  <span>Daftar Akun Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>


        <p className="text-center text-xs text-stone-500 dark:text-stone-400">
          Sudah memiliki akun?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#0F3E2E] dark:text-emerald-400 hover:underline"
          >
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
