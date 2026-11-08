"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GraduationCap, Mail, AlertCircle, ArrowLeft, CheckCircle2, User } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [identifier, setIdentifier] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [targetEmail, setTargetEmail] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInput = identifier.trim().toLowerCase();
    if (!cleanInput) {
      setError("Mohon masukkan alamat email atau username akun Anda.");
      return;
    }

    setIsLoading(true);

    try {
      let resolvedEmail = cleanInput;

      // jika input bukan format email cari email via endpoint lookup
      if (!cleanInput.includes("@")) {
        const lookupRes = await fetch("/api/auth/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cleanInput }),
        });
        const lookupData = await lookupRes.json();
        if (!lookupRes.ok || !lookupData.email) {
          throw new Error("Username tidak terdaftar pada sistem kami.");
        }
        resolvedEmail = lookupData.email;
      }

      setTargetEmail(resolvedEmail);

      const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resolvedEmail, {
        redirectTo: `${siteUrl}/reset-password`,
      });

      if (resetErr) {
        throw new Error(resetErr.message || "Gagal mengirimkan instruksi pemulihan kata sandi.");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F3E2E] text-emerald-300 border border-emerald-600/30 mb-2 shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Lupa Kata Sandi
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Masukkan email atau username Anda untuk menerima instruksi pemulihan kata sandi.
          </p>
        </div>

        <Card className="border border-stone-200/80 dark:border-stone-800/80 shadow-xs">
          <CardContent className="p-6">
            {success ? (
              <div className="text-center space-y-4 py-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    Instruksi Pemulihan Terkirim
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1.5 leading-relaxed">
                    Kami telah mengirimkan tautan pemulihan kata sandi ke email <strong>{targetEmail}</strong>. Silakan periksa kotak masuk atau folder spam Anda.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/login" className="block">
                    <Button variant="primary" size="sm" className="w-full gap-2">
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kembali ke Halaman Masuk</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="identifier"
                    className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                  >
                    Email atau Username Akun
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="identifier"
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="Masukkan email atau username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                    Anda bisa memasukkan username akun Anda jika lupa alamat email yang terdaftar.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  className="w-full font-semibold"
                >
                  Kirim Instruksi Pemulihan
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-stone-500 dark:text-stone-400">
          Sudah ingat kata sandi Anda?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#0F3E2E] dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            <span>Masuk kembali</span>
          </Link>
        </p>
      </div>
    </div>
  );
}

