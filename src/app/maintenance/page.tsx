import type { Metadata } from "next";
import Link from "next/link";
import {
  Wrench,
  Clock,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Lock,
  Sparkles,
} from "lucide-react";
import { createAdminClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sistem Sedang Dalam Pemeliharaan | Skillora",
  description: "Platform Skillora sedang dalam pemeliharaan sistem berkala untuk peningkatan fitur dan kualitas layanan.",
};

// ambil pesan pemeliharaan terkini
async function getMaintenanceData() {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("activity_logs")
      .select("details")
      .eq("table_name", "system_settings")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.details && typeof data.details === "object") {
      const details = data.details as Record<string, unknown>;
      return {
        message:
          typeof details.message === "string" && details.message.trim() !== ""
            ? details.message
            : "Platform Skillora sedang dalam pemeliharaan sistem berkala untuk peningkatan performa dan kualitas belajar.",
        estimated_finish:
          typeof details.estimated_finish === "string" ? details.estimated_finish : "",
      };
    }
  } catch {
    // abaikan kesalahan pembacaan data
  }

  return {
    message:
      "Platform Skillora sedang dalam pemeliharaan sistem berkala untuk peningkatan performa dan kualitas belajar.",
    estimated_finish: "",
  };
}

export default async function MaintenancePage() {
  const { message, estimated_finish } = await getMaintenanceData();
  const adminPhone =
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "6281234567890";
  const waHelpUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(
    "Halo Admin Skillora, saya ingin menanyakan informasi pemeliharaan sistem website."
  )}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-100 dark:from-[#0C0A09] dark:via-[#141210] dark:to-[#0C0A09] text-stone-900 dark:text-stone-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* header logo skillora */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-[#0F3E2E] text-emerald-400 flex items-center justify-center font-black text-lg shadow-md shadow-emerald-950/20">
            S
          </div>
          <span className="text-lg font-black tracking-tight text-stone-900 dark:text-stone-100">
            Skill<span className="text-emerald-700 dark:text-emerald-400">ora</span>
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>Pemeliharaan Sistem</span>
        </div>
      </header>

      {/* konten utama */}
      <main className="max-w-2xl mx-auto w-full my-auto py-12 text-center space-y-6">
        {/* animasi ikon ilustrasi */}
        <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/5 animate-pulse" />
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl flex items-center justify-center text-[#0F3E2E] dark:text-emerald-400 relative">
            <Wrench className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-700 dark:text-emerald-400 animate-bounce duration-1000" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* judul & narasi */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-4xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Kami Sedang Melakukan Peningkatan Sistem
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-lg mx-auto leading-relaxed">
            {message}
          </p>
        </div>

        {/* estimasi waktu jika ada */}
        {estimated_finish && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 font-medium">
            <Clock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span>
              Perkiraan Selesai: <strong>{estimated_finish}</strong>
            </span>
          </div>
        )}

        {/* aksi tombol bantuan & refresh */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={waHelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg"
          >
            <MessageCircle className="w-4 h-4 text-emerald-300" />
            <span>Hubungi WhatsApp Bantuan</span>
          </a>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold transition-all shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-stone-400" />
            <span>Coba Muat Ulang</span>
          </Link>
        </div>

        {/* jaminan keamanan data */}
        <div className="pt-6 flex items-center justify-center gap-2 text-[11px] text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Seluruh data akun, sertifikat, dan progres belajar mahasiswa tersimpan dengan aman.</span>
        </div>
      </main>

      {/* footer dengan akses pengelola khusus */}
      <footer className="max-w-4xl mx-auto w-full pt-4 border-t border-stone-200/60 dark:border-stone-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400">
        <p className="text-[11px]">
          &copy; {new Date().getFullYear()} Skillora. Platform Belajar Mandiri Mahasiswa.
        </p>

        {/* pintu akses pengelola saat pemeliharaan */}
        <Link
          href="/maintenance/login"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 bg-stone-100/80 dark:bg-stone-900/80 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors border border-stone-200/80 dark:border-stone-800/80"
          title="Masuk sebagai Admin atau Superadmin"
        >
          <Lock className="w-3 h-3 text-amber-500" />
          <span>Akses Pengelola Sistem</span>
        </Link>
      </footer>
    </div>
  );
}

