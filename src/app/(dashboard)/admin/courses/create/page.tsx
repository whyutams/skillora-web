"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AlertModal } from "@/components/ui/ConfirmModal";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { HtmlEditor } from "@/components/ui/HtmlEditor";
import {
  BookOpen,
  ArrowLeft,
  Upload,
  Sparkles,
  MessageCircle,
  FileText,
  AlignLeft,
  DollarSign,
  CheckCircle2,
  X,
  ImageIcon,
  Calendar,
  Trash2,
  Settings,
} from "lucide-react";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export default function CreateCoursePage() {
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [content, setContent] = React.useState(
    "<p>Kuasai materi kursus ini melalui bimbingan praktis dan modul terstruktur...</p>"
  );
  const [price, setPrice] = React.useState<number>(49000);
  const [whatsappGroupUrl, setWhatsappGroupUrl] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState<string>("");
  const [registrationStart, setRegistrationStart] = React.useState<string>("");
  const [registrationEnd, setRegistrationEnd] = React.useState<string>("");
  const [eventStart, setEventStart] = React.useState<string>("");
  const [eventEnd, setEventEnd] = React.useState<string>("");
  const [isPublished, setIsPublished] = React.useState(true);

  const [isUploadingBanner, setIsUploadingBanner] = React.useState(false);
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

  const bannerInputRef = React.useRef<HTMLInputElement>(null);

  const generatedSlug = React.useMemo(() => {
    return slugify(title);
  }, [title]);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "course-assets");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah banner gambar.");
      }

      setImageUrl(data.url);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal mengunggah banner."
      );
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Judul kursus wajib diisi.");
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Deskripsi singkat kursus wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: generatedSlug,
          description: description.trim(),
          content,
          price,
          whatsapp_group_url: whatsappGroupUrl.trim() || null,
          image_url: imageUrl ? imageUrl.trim() : null,
          registration_start: registrationStart || null,
          registration_end: registrationEnd || null,
          event_start: eventStart || null,
          event_end: eventEnd || null,
          is_published: isPublished,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menambahkan kursus.");
      }

      setAlertData({
        isOpen: true,
        title: "Kursus Berhasil Ditambahkan",
        message: `Kursus "${title}" telah disimpan dan siap dipublikasikan.`,
        type: "success",
      });
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan kursus."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full text-left">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/admin/courses">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Tambah Kursus Baru
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Isi data judul, deskripsi singkat landing page, materi HTML editor, dan media kursus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || isUploadingBanner}
            className="bg-[#0F3E2E] hover:bg-[#165640] text-white font-semibold gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? "Menyimpan..." : "Simpan Kursus"}</span>
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* 1 Wadah Tunggal Form Kursus (2 Kolom Lebar) */}
      <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 backdrop-blur-sm p-6 sm:p-8 shadow-xs">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          {/* Kolom Kiri: Judul, Slug, Deskripsi Singkat & Konten HTML Editor (7 Kolom) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Konten & Silabus Kursus
              </h2>
            </div>

            {/* Judul & Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Judul Kursus *
              </label>
              <input
                type="text"
                required
                placeholder="Masukkan judul kursus"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
              />
              <div className="flex items-center gap-1.5 text-[11px] text-stone-400 pt-0.5">
                <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Slug:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  /{generatedSlug || "judul-kursus"}
                </span>
              </div>
            </div>

            {/* Deskripsi Singkat Kursus (Summary untuk Landing Page) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>Deskripsi Singkat Kursus (Summary untuk Landing Page) *</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Masukkan ringkasan singkat kursus yang akan tampil pada kartu katalog landing page..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500 resize-none leading-relaxed"
              />
              <p className="text-[11px] text-stone-400">
                Ringkasan ini akan tampil pada kartu kursus di beranda (endpoint &quot;/&quot;).
              </p>
            </div>

            {/* Konten & Silabus Kursus dengan HTML Editor */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Konten & Silabus Lengkap Kursus (HTML Editor) *</span>
              </label>
              <HtmlEditor
                value={content}
                onChange={setContent}
                placeholder="Tuliskan materi silabus, rincian modul, manfaat belajar, dan target pencapaian siswa..."
                minHeight="280px"
              />
              <p className="text-[11px] text-stone-400">
                Konten lengkap ini akan tampil pada halaman detail kursus (/courses/[slug]).
              </p>
            </div>
          </div>

          {/* Kolom Kanan: Media Banner, Galeri, Biaya & Pengaturan (5 Kolom) */}
          <div className="lg:col-span-5 space-y-6 lg:border-l lg:border-stone-100 dark:lg:border-stone-800/60 lg:pl-8">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <ImageIcon className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Media Kursus
              </h2>
            </div>

            {/* Banner Utama */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Banner Utama Kursus
              </label>

              {imageUrl ? (
                <div className="relative w-full h-44 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 group">
                  <SmoothImage
                    src={imageUrl}
                    alt={title || "Banner Kursus"}
                    className="w-full h-full object-cover"
                    containerClassName="w-full h-full"
                  />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-2 bg-black/70 backdrop-blur-xs p-1 rounded-lg text-white">
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="text-[11px] flex items-center gap-1 hover:text-rose-300 transition-colors px-1"
                      title="Hapus Banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => bannerInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 rounded-xl p-5 text-center cursor-pointer transition-colors bg-stone-50/50 dark:bg-stone-950/40"
                >
                  <Upload className="w-6 h-6 text-stone-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    {isUploadingBanner
                      ? "Mengunggah..."
                      : "Upload Banner Kursus"}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    JPG, PNG, WEBP (Maks. 5 MB)
                  </p>
                </div>
              )}

              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden"
              />
            </div>

            {/* Waktu Pendaftaran Kursus */}
            <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Waktu Pendaftaran Kursus
                </h3>
              </div>
              <p className="text-[11px] text-stone-400">
                Tentukan periode kapan siswa dapat mendaftar kursus ini.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    Mulai Pendaftaran
                  </label>
                  <input
                    type="date"
                    value={registrationStart}
                    onChange={(e) => setRegistrationStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    Selesai Pendaftaran
                  </label>
                  <input
                    type="date"
                    value={registrationEnd}
                    onChange={(e) => setRegistrationEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Jadwal Pelaksanaan Kursus */}
            <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Jadwal Pelaksanaan Kursus
                </h3>
              </div>
              <p className="text-[11px] text-stone-400">
                Tentukan periode berlangsungnya kelas hingga selesai (patokan pembukaan ulasan siswa).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    Mulai Pelaksanaan
                  </label>
                  <input
                    type="date"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    Selesai Pelaksanaan
                  </label>
                  <input
                    type="date"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Sub-header Biaya & Status */}
            <div className="flex items-center gap-2 pt-4 pb-2 border-t border-stone-100 dark:border-stone-800">
              <Settings className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Biaya & Status
              </h2>
            </div>

            {/* Biaya Pendaftaran */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Biaya Pendaftaran (Rp) *</span>
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                placeholder="Contoh: 49000"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
              />
            </div>

            {/* Tautan Grup WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tautan Grup WhatsApp</span>
              </label>
              <input
                type="url"
                placeholder="https://chat.whatsapp.com/..."
                value={whatsappGroupUrl}
                onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
              />
            </div>

            {/* Status Publikasi */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Publikasikan Kursus
                </p>
                <p className="text-[10px] text-stone-400">
                  Tampilkan di katalog landing page
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600 peer-checked:bg-[#0F3E2E]"></div>
              </label>
            </div>

            {/* Tombol Simpan */}
            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2">
              <Link href="/admin/courses">
                <Button variant="outline" size="sm" type="button">
                  Batal
                </Button>
              </Link>
              <Button
                type="submit"
                size="sm"
                disabled={
                  isSubmitting || isUploadingBanner
                }
                className="bg-[#0F3E2E] hover:bg-[#165640] text-white font-semibold gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? "Menyimpan..." : "Simpan Kursus"}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertData.isOpen}
        title={alertData.title}
        message={alertData.message}
        type={alertData.type}
        onClose={() => {
          setAlertData((prev) => ({ ...prev, isOpen: false }));
          router.push("/admin/courses");
        }}
      />
    </div>
  );
}
