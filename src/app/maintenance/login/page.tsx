"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  User,
  KeyRound,
  ShieldAlert,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { USER_ROLES } from "@/constants/roles";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { AlertModal } from "@/components/ui/ModalKonfirmasi";

export default function MaintenanceLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
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

  // proses login otentikasi pengelola menggunakan username atau email
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
      setErrorMessage("Silakan masukkan username dan kata sandi.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // konversi username menjadi email jika input bukan email langsung
      let loginEmail = cleanIdentifier;
      if (!cleanIdentifier.includes("@")) {
        const lookupRes = await fetch("/api/auth/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: cleanIdentifier }),
        });

        const lookupData = await lookupRes.json();
        if (!lookupRes.ok || !lookupData.email) {
          throw new Error("Username atau kata sandi tidak cocok. Silakan periksa kembali akun Anda.");
        }
        loginEmail = lookupData.email;
      }

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

      if (authError || !authData.user) {
        throw new Error("Username atau kata sandi tidak cocok. Silakan periksa kembali akun Anda.");
      }

      // periksa role profil pengguna di database
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", authData.user.id)
        .maybeSingle();

      const userRole =
        profile?.role ||
        (authData.user.email === "skillorastartup26@gmail.com"
          ? USER_ROLES.SUPERADMIN
          : USER_ROLES.STUDENT);

      // jika akun yang login adalah mahasiswa tolak akses dan logout otomatis
      if (userRole === USER_ROLES.STUDENT) {
        await supabase.auth.signOut();
        setAlertData({
          isOpen: true,
          title: "Akses Mahasiswa Ditutup Sementara",
          message:
            "Sistem saat ini sedang dalam proses pemeliharaan. Akses masuk akun mahasiswa ditutup sementara demi kelancaran update platform. Silakan coba kembali nanti.",
          type: "error",
        });
        setLoading(false);
        return;
      }

      // jika akun terverifikasi sebagai admin atau superadmin izinkan masuk ke dashboard
      if (userRole === USER_ROLES.SUPERADMIN) {
        router.push("/superadmin/dashboard");
      } else if (userRole === USER_ROLES.ADMIN) {
        router.push("/admin/dashboard");
      } else {
        router.push("/maintenance");
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Gagal memproses login pengelola. Silakan periksa kembali kredensial Anda."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-100 dark:from-[#0C0A09] dark:via-[#141210] dark:to-[#0C0A09] text-stone-900 dark:text-stone-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* tombol kembali ke halaman pemeliharaan */}
        <div>
          <Link
            href="/maintenance"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Pemeliharaan</span>
          </Link>
        </div>

        {/* kartu form login khusus pengelola */}
        <Card className="border-stone-200/80 dark:border-stone-800/80 shadow-xl overflow-hidden bg-white dark:bg-stone-900/90">
          <CardHeader className="p-6 sm:p-8 border-b border-stone-100 dark:border-stone-800 text-center space-y-3 bg-stone-50/50 dark:bg-stone-900/50">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <CardTitle className="text-xl font-black tracking-tight">
                Portal Login Pengelola
              </CardTitle>
              <CardDescription className="text-xs">
                Akses terbatas khusus <strong>Admin</strong> dan <strong>Superadmin</strong> saat sistem dalam mode pemeliharaan.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-5">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Masukkan username atau email pengelola..."
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
                  />
                </div>
                <p className="text-[11px] text-stone-400">
                  Gunakan username akun Admin atau Superadmin Anda
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0F3E2E] hover:bg-[#15523d] text-white font-bold text-xs py-2.5 rounded-xl shadow-xs gap-2 mt-2"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{loading ? "Memverifikasi Akses..." : "Masuk Sebagai Pengelola"}</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* modal peringatan akses ditolak */}
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
