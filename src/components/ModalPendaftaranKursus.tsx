"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Course, UserRole } from "@/types/database";
import { createClient } from "@/utils/supabase/client";
import {
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Phone,
  Edit3,
} from "lucide-react";

interface ModalPendaftaranKursusProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  userId?: string | null;
  userRole?: UserRole | null;
  userWhatsapp?: string | null;
}

export function ModalPendaftaranKursus({
  course,
  isOpen,
  onClose,
  userEmail,
  userId,
  userRole,
  userWhatsapp,
}: ModalPendaftaranKursusProps) {
  const router = useRouter();
  const [whatsappNumber, setWhatsappNumber] = React.useState(userWhatsapp || "");
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(false);
  const [isProfileIncomplete, setIsProfileIncomplete] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    async function fetchWhatsapp() {
      if (!userId) return;
      setIsLoadingProfile(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("profiles")
          .select("whatsapp_number, avatar_url, school_origin")
          .eq("id", userId)
          .maybeSingle();

        if (data) {
          if (data.whatsapp_number && data.whatsapp_number !== "-") {
            setWhatsappNumber(data.whatsapp_number);
          } else if (userWhatsapp) {
            setWhatsappNumber(userWhatsapp);
          }

          const hasAv = Boolean(data.avatar_url && data.avatar_url.trim().length > 0);
          const hasSch = Boolean(
            data.school_origin &&
              data.school_origin.trim().length > 0 &&
              data.school_origin !== "-"
          );
          setIsProfileIncomplete(!hasAv || !hasSch);
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingProfile(false);
      }
    }

    if (isOpen) {
      setError(null);
      setSuccess(false);
      fetchWhatsapp();
    }
  }, [isOpen, userId, userWhatsapp]);

  if (!course) return null;

  const adminPhone =
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "6281234567890";

  // Jika user adalah Admin atau Superadmin -> tampilkan proteksi modal
  const isAdminOrSuperadmin = userRole === "admin" || userRole === "superadmin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Jika belum login, redirect ke login
    if (!userId || !userEmail) {
      router.push(`/login?redirect=/courses/${course.slug}`);
      return;
    }

    if (isAdminOrSuperadmin) {
      setError(
        `Akun Anda saat ini memiliki hak akses ${userRole?.toUpperCase()}. Akun admin tidak dapat mendaftar sebagai mahasiswa.`
      );
      return;
    }

    const cleanPhone = whatsappNumber.trim().replace(/[^0-9+]/g, "");
    if (!cleanPhone || cleanPhone === "-" || cleanPhone.length < 9) {
      setError(
        "Nomor WhatsApp aktif belum terisi di profil Anda. Silakan lengkapi nomor WhatsApp di pengaturan profil terlebih dahulu."
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: course.id,
          whatsappNumber: cleanPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal melakukan pendaftaran kursus.");
      }

      setSuccess(true);

      // Siapkan pesan WhatsApp terformat untuk konfirmasi
      const message = encodeURIComponent(
        `Halo Admin Skillora, saya sudah mendaftar kursus "${course.title}" dengan email ${userEmail}. Mohon info instruksi pembayaran dan verifikasinya.`
      );
      const waUrl = `https://wa.me/${adminPhone}?text=${message}`;

      // Buka otomatis WhatsApp Admin di tab baru
      window.open(waUrl, "_blank", "noopener,noreferrer");

      // Redirect ke menu Kursus Saya
      setTimeout(() => {
        router.push("/kursus-saya");
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan sistem saat mendaftar.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasValidWhatsapp =
    whatsappNumber &&
    whatsappNumber !== "-" &&
    whatsappNumber.trim().replace(/[^0-9]/g, "").length >= 9;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pendaftaran Kursus"
      description={`Konfirmasi pendaftaran untuk kursus ${course.title}`}
    >
      {isAdminOrSuperadmin ? (
        <div className="py-4 space-y-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Akses Dibatasi untuk Peran {userRole?.toUpperCase()}
            </h4>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-sm mx-auto">
              Akun Administrator dan Superadmin mengelola platform dan verifikasi mahasiswa, sehingga tidak dapat mendaftar kursus sebagai peserta.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Button variant="outline" size="sm" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      ) : success ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Pendaftaran Berhasil Dicatat!
            </h4>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-sm mx-auto">
              WhatsApp Admin telah dibuka di tab baru. Anda juga dapat mengunggah bukti transfer langsung di menu Kursus Saya.
            </p>
          </div>
          <p className="text-xs text-stone-400">
            Mengarahkan ke Halaman Kursus Saya...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Rincian Ringkas Kursus */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 space-y-2.5">
            <div className="flex justify-between items-start text-xs sm:text-sm">
              <span className="text-stone-500 dark:text-stone-400">Kursus:</span>
              <span className="font-semibold text-stone-900 dark:text-stone-100 text-right max-w-[220px]">
                {course.title}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-stone-500 dark:text-stone-400">Biaya Pendaftaran:</span>
              <span className="font-extrabold text-[#0F3E2E] dark:text-emerald-400 text-base">
                Rp {Number(course.price).toLocaleString("id-ID")}
              </span>
            </div>
            {userEmail && (
              <div className="flex justify-between items-center text-xs pt-2 border-t border-stone-200/60 dark:border-stone-800/60">
                <span className="text-stone-500 dark:text-stone-400">Email Terdaftar:</span>
                <span className="text-stone-700 dark:text-stone-300 font-medium">
                  {userEmail}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-stone-500 dark:text-stone-400">Nomor WhatsApp Profil:</span>
              <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {isLoadingProfile
                    ? "Memuat..."
                    : hasValidWhatsapp
                    ? whatsappNumber.startsWith("+")
                      ? whatsappNumber
                      : `+${whatsappNumber}`
                    : "(Belum Diisi di Profil)"}
                </span>
              </span>
            </div>
          </div>

          {/* Kotak Peringatan Validasi WhatsApp */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Pemberitahuan:</strong> Pastikan nomor WhatsApp pada profil Anda benar-benar aktif karena akan divalidasi oleh admin untuk konfirmasi verifikasi dan pembagian akses kelas.
            </p>
          </div>

          {isProfileIncomplete && !isLoadingProfile && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
              <span>Foto profil dan asal kampus wajib dilengkapi terlebih dahulu.</span>
              <Link
                href={`/profile?returnUrl=${encodeURIComponent(`/courses/${course.slug}`)}`}
                className="font-bold underline hover:text-amber-900 dark:hover:text-amber-100 flex items-center gap-1 shrink-0"
              >
                <Edit3 className="w-3 h-3" />
                <span>Lengkapi Profil</span>
              </Link>
            </div>
          )}

          {!hasValidWhatsapp && !isLoadingProfile && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between gap-2">
              <span>Nomor WhatsApp belum terdaftar di profil Anda.</span>
              <Link
                href="/profile"
                className="font-bold underline hover:text-rose-800 flex items-center gap-1 shrink-0"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Profil</span>
              </Link>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              disabled={!hasValidWhatsapp || isProfileIncomplete || isLoading}
              className="gap-2 bg-[#0F3E2E] hover:bg-[#15523d] text-white font-semibold"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Daftar Sekarang & Lanjut ke WA</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export const EnrollModal = ModalPendaftaranKursus;
