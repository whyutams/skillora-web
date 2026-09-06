"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { GraduationCap, AlertCircle, ArrowRight, Lock, User, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const supabase = createClient();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError("Mohon masukkan username akun Anda.");
      return;
    }

    if (!password) {
      setError("Mohon masukkan kata sandi.");
      return;
    }

    // Turnstile check
    if (!turnstileToken && process.env.NODE_ENV === "production") {
      setError("Mohon selesaikan verifikasi captcha keamanan Cloudflare.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Resolve username ke email jika bukan format email
      let loginEmail = cleanUsername;

      if (!cleanUsername.includes("@")) {
        const lookupRes = await fetch("/api/auth/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: cleanUsername }),
        });

        const lookupData = await lookupRes.json();
        if (!lookupRes.ok || !lookupData.email) {
          // Selalu gunakan pesan umum yang sama
          throw new Error("Username atau kata sandi salah. Silakan periksa kembali kredensial Anda.");
        }
        loginEmail = lookupData.email;
      }

      // 2. Login via Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError) {
        throw new Error("Username atau kata sandi salah. Silakan periksa kembali kredensial Anda.");
      }

      if (data.user) {
        // Ambil data profil untuk direct ke dashboard yang sesuai
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, username, full_name")
          .eq("id", data.user.id)
          .maybeSingle();

        const role = profile?.role || (data.user.email === "skillorastartup26@gmail.com" ? "superadmin" : "student");

        // Catat aktivitas login pengguna
        try {
          await fetch("/api/logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "USER_LOGIN",
              tableName: "auth.users",
              recordId: data.user.id,
              userId: data.user.id,
              userEmail: data.user.email,
              userRole: role,
              details: {
                username: profile?.username || username.trim().toLowerCase(),
                full_name: profile?.full_name || null,
              },
            }),
          });
        } catch {
          // non-blocking
        }

        if (role === "superadmin") {
          router.push("/superadmin/users");
        } else if (role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push(redirectPath);
        }
        router.refresh();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Username atau kata sandi salah. Silakan periksa kembali kredensial Anda.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F3E2E] text-emerald-300 border border-emerald-600/30 mb-2">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Masuk ke Akun Skillora
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Gunakan username dan kata sandi yang telah Anda daftarkan.
          </p>
        </div>

        <Card className="border border-stone-200/80 dark:border-stone-800/80 shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Username Akun <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="username"
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="Masukkan username akun"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

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

              {/* Tombol Masuk dengan disable state jika Cloudflare belum selesai */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                disabled={!turnstileToken || isLoading}
                className="w-full gap-2 font-semibold"
              >
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-stone-500 dark:text-stone-400">
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#0F3E2E] dark:text-emerald-400 hover:underline"
          >
            Daftar Akun Baru
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-xs text-stone-400">
          Memuat halaman masuk...
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
