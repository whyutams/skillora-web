"use client";

import * as React from "react";
import Link from "next/link";
import { Course } from "@/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmModal, AlertModal } from "@/components/ui/ConfirmModal";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { ImagePreviewModal } from "@/components/ui/ImagePreviewModal";
import {
  BookOpen,
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Images,
} from "lucide-react";

interface AdminCourseItem extends Course {
  image_url?: string | null;
  gallery?: string[];
  enrolled_count?: number;
  approved_count?: number;
  pending_count?: number;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = React.useState<AdminCourseItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "published" | "draft">("all");

  // Pagination (10 data per page)
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal Hapus Kursus
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    isOpen: boolean;
    courseId: string;
    courseTitle: string;
  }>({
    isOpen: false,
    courseId: "",
    courseTitle: "",
  });
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Modal Pratinjau Gambar Lightbox
  const [previewImage, setPreviewImage] = React.useState<{
    isOpen: boolean;
    url: string | null;
    title: string;
    description?: string;
  }>({
    isOpen: false,
    url: null,
    title: "",
  });

  // Alert Modal
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

  const fetchCourses = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/courses");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memuat katalog kursus.");
      }
      setCourses(data.courses || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat katalog kursus.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleDeleteCourse = async () => {
    if (!deleteConfirm.courseId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/courses?id=${deleteConfirm.courseId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus kursus.");
      }

      setDeleteConfirm({ isOpen: false, courseId: "", courseTitle: "" });
      setAlertData({
        isOpen: true,
        title: "Kursus Dihapus",
        message: data.message || "Kursus berhasil dihapus dari sistem.",
        type: "success",
      });

      fetchCourses();
    } catch (err: unknown) {
      setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      setAlertData({
        isOpen: true,
        title: "Gagal Menghapus Kursus",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus kursus.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCourses = React.useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "published"
          ? c.is_published
          : !c.is_published;

      return matchesSearch && matchesStatus;
    });
  }, [courses, searchQuery, statusFilter]);

  // Reset pagination saat search/filter berubah
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Hitung Data Terpaginasi
  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const totalCourses = courses.length;
  const publishedCourses = courses.filter((c) => c.is_published).length;
  const draftCourses = courses.filter((c) => !c.is_published).length;
  const totalEnrolledStudents = courses.reduce((acc, c) => acc + (c.enrolled_count || 0), 0);

  return (
    <div className="space-y-8 w-full">
      {/* Header Panel Kursus */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                Manajemen Kursus
              </h1>
              <Badge variant="role-admin">Katalog & Silabus</Badge>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              Kelola katalog materi kursus, harga pendaftaran, status publikasi, dan link grup WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCourses}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>

          {/* CRUD Menggunakan Halaman Baru (Bukan Modal) */}
          <Link href="/admin/courses/create">
            <Button
              size="sm"
              className="bg-[#0F3E2E] hover:bg-[#165640] text-white font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kursus</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ringkasan Metrik Kursus */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/50 dark:bg-stone-900/40">
          <span className="text-xs font-semibold text-stone-500">Total Kursus</span>
          <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 mt-1">
            <AnimatedCounter value={totalCourses} />
          </div>
        </div>
        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/50 dark:bg-stone-900/40">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Aktif / Publik
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            <AnimatedCounter value={publishedCourses} />
          </div>
        </div>
        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/50 dark:bg-stone-900/40">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            Draft / Non-aktif
          </span>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            <AnimatedCounter value={draftCourses} />
          </div>
        </div>
        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/50 dark:bg-stone-900/40">
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
            Total Pendaftar
          </span>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
            <AnimatedCounter value={totalEnrolledStudents} />
          </div>
        </div>
      </div>

      {/* Main Table & Filter */}
      <Card className="border-stone-200/90 dark:border-stone-800/90 overflow-hidden">
        <CardHeader className="border-b border-stone-200/80 dark:border-stone-800/80 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Katalog Kursus Skillora</CardTitle>
              <CardDescription className="text-xs">
                Daftar kursus yang tersedia di landing page dan sistem pendaftaran.
              </CardDescription>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Masukkan judul atau slug kursus..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#0F3E2E] dark:focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/60 overflow-x-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-[#0F3E2E] text-white font-semibold"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              Semua ({totalCourses})
            </button>
            <button
              onClick={() => setStatusFilter("published")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === "published"
                  ? "bg-[#0F3E2E] text-white font-semibold"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              Publik ({publishedCourses})
            </button>
            <button
              onClick={() => setStatusFilter("draft")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === "draft"
                  ? "bg-[#0F3E2E] text-white font-semibold"
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              Draft ({draftCourses})
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
              <p>Memuat data kursus...</p>
            </div>
          ) : paginatedCourses.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-xs space-y-3">
              <BookOpen className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600" />
              <p>Tidak ada kursus yang sesuai dengan kriteria pencarian.</p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-emerald-600 hover:underline text-xs font-semibold"
                >
                  Bersihkan Pencarian
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-stone-500">
                    <th className="py-3 px-4 font-semibold">Kursus</th>
                    <th className="py-3 px-4 font-semibold">Harga</th>
                    <th className="py-3 px-4 font-semibold">Peserta</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">WhatsApp Group</th>
                    <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                  {paginatedCourses.map((course) => {
                    return (
                      <tr
                        key={course.id}
                        className="hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {course.image_url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    isOpen: true,
                                    url: course.image_url!,
                                    title: course.title,
                                    description: course.description || "-",
                                  })
                                }
                                className="relative w-14 h-10 rounded-lg overflow-hidden shrink-0 border border-stone-200 dark:border-stone-800 group hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer"
                                title="Klik untuk melihat pratinjau gambar"
                              >
                                <SmoothImage
                                  src={course.image_url}
                                  alt={course.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  containerClassName="w-full h-full"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <ZoomIn className="w-3.5 h-3.5" />
                                </div>
                              </button>
                            ) : (
                              <div
                                className="w-14 h-10 rounded-lg overflow-hidden shrink-0 border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400"
                                title="Tidak ada banner gambar kustom"
                              >
                                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              </div>
                            )}

                            <div className="min-w-0 max-w-xs sm:max-w-md">
                              <p className="font-semibold text-stone-900 dark:text-stone-100 line-clamp-1">
                                {course.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-stone-400 truncate">
                                  /{course.slug}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Harga */}
                        <td className="py-3.5 px-4 font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                          {course.price > 0 ? `Rp ${course.price.toLocaleString("id-ID")}` : "-"}
                        </td>

                        {/* Status Publikasi */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {course.is_published ? (
                            <Badge
                              variant="approved"
                              className="text-[10px] px-2 py-0.5 inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Publik
                            </Badge>
                          ) : (
                            <Badge
                              variant="neutral"
                              className="text-[10px] px-2 py-0.5 inline-flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3 text-stone-400" />
                              Draft
                            </Badge>
                          )}
                        </td>

                        {/* Pendaftar */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                            {course.enrolled_count || 0} Peserta
                          </span>
                        </td>

                        {/* Link Grup WA (Tampilkan '-' jika tidak diisi) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {course.whatsapp_group_url ? (
                            <a
                              href={course.whatsapp_group_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:underline max-w-[160px] truncate"
                            >
                              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Grup WA Terhubung</span>
                            </a>
                          ) : (
                            <span className="text-stone-400 text-xs font-semibold">-</span>
                          )}
                        </td>

                        {/* Aksi (Edit di Halaman Baru & Hapus) */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/courses/${course.slug}`}
                              target="_blank"
                              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                              title="Lihat Halaman Publik"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <Link
                              href={`/admin/courses/${course.id}/edit`}
                              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors inline-flex"
                              title="Edit Kursus di Halaman Baru"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            </Link>

                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  isOpen: true,
                                  courseId: course.id,
                                  courseTitle: course.title,
                                })
                              }
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Hapus Kursus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination (10 data per page) */}
          {filteredCourses.length > ITEMS_PER_PAGE && (
            <div className="p-4 border-t border-stone-200/80 dark:border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
              <span>
                Menampilkan {startIndex + 1} -{" "}
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredCourses.length)} dari{" "}
                {filteredCourses.length} kursus
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="gap-1 px-2.5 py-1 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </Button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                        currentPage === page
                          ? "bg-[#0F3E2E] text-white"
                          : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-1 px-2.5 py-1 text-xs"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Konfirmasi Hapus Kursus */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((p) => ({ ...p, isOpen: false }))}
        onConfirm={handleDeleteCourse}
        title="Konfirmasi Hapus Kursus"
        description={`Apakah Anda yakin ingin menghapus kursus "${deleteConfirm.courseTitle}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus Kursus"
        cancelText="Batal"
        isLoading={isDeleting}
        variant="danger"
      />

      {/* Modal Pratinjau Gambar Lightbox */}
      <ImagePreviewModal
        isOpen={previewImage.isOpen}
        onClose={() => setPreviewImage((p) => ({ ...p, isOpen: false }))}
        imageUrl={previewImage.url}
        title={previewImage.title}
        description={previewImage.description}
      />

      {/* Modal Notifikasi Hasil */}
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
