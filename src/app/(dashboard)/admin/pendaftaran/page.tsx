"use client";

import * as React from "react";
import { createClient } from "@/utils/supabase/client";
import { EnrollmentStatus, Course } from "@/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmModal, AlertModal } from "@/components/ui/ConfirmModal";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Building2,
  Phone,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileSpreadsheet,
  Upload,
  Award,
  Star,
  Eye,
  X,
  Loader2,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  FileCheck,
} from "lucide-react";
import { SmoothImage } from "@/components/ui/SmoothImage";
import * as XLSX from "xlsx";

interface AdminEnrollmentItem {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  whatsapp_number: string;
  created_at: string;
  payment_proof_url: string | null;
  rejection_reason: string | null;
  certificate_url: string | null;
  review_rating: number | null;
  review_text: string | null;
  reviewed_at: string | null;
  profiles: {
    id: string;
    full_name: string;
    username: string;
    school_origin: string;
    whatsapp_number: string;
    avatar_url?: string | null;
    role: string;
  } | null;
  courses: (Course & {
    content?: string;
    image_url?: string | null;
    registration_start?: string | null;
    registration_end?: string | null;
    event_start?: string | null;
    event_end?: string | null;
  }) | null;
}

interface CourseWithEnrollments {
  id: string;
  title: string;
  slug: string;
  price: number;
  image_url?: string | null;
  event_start?: string | null;
  event_end?: string | null;
  registration_start?: string | null;
  registration_end?: string | null;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  enrollments: AdminEnrollmentItem[];
}

const ITEMS_PER_PAGE = 10;

export default function AdminPendaftaranPage() {
  const supabase = createClient();
  const [enrollments, setEnrollments] = React.useState<AdminEnrollmentItem[]>([]);
  const [coursesList, setCoursesList] = React.useState<Course[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Mode View: per-course atau specific course selected atau all
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // Modal Bukti Transfer Preview
  const [previewProofUrl, setPreviewProofUrl] = React.useState<string | null>(null);

  // Modal Tolak Pendaftaran dengan Alasan
  const [rejectModalData, setRejectModalData] = React.useState<{
    isOpen: boolean;
    enrollmentId: string;
    studentName: string;
    courseTitle: string;
    reason: string;
  }>({
    isOpen: false,
    enrollmentId: "",
    studentName: "",
    courseTitle: "",
    reason: "",
  });
  const [isSubmittingReject, setIsSubmittingReject] = React.useState(false);

  // Modal Upload E-Sertifikat Per Siswa
  const [certificateModalData, setCertificateModalData] = React.useState<{
    isOpen: boolean;
    enrollmentId: string;
    studentName: string;
    courseTitle: string;
    currentUrl: string | null;
  }>({
    isOpen: false,
    enrollmentId: "",
    studentName: "",
    courseTitle: "",
    currentUrl: null,
  });
  const [certFile, setCertFile] = React.useState<File | null>(null);
  const [isUploadingCert, setIsUploadingCert] = React.useState(false);
  const [certError, setCertError] = React.useState<string | null>(null);

  // Modal Konfirmasi Approve
  const [approveModalData, setApproveModalData] = React.useState<{
    isOpen: boolean;
    enrollmentId: string;
    studentName: string;
    courseTitle: string;
  }>({
    isOpen: false,
    enrollmentId: "",
    studentName: "",
    courseTitle: "",
  });
  const [isExecutingApprove, setIsExecutingApprove] = React.useState(false);

  // Alert Modal
  const [alertModalData, setAlertModalData] = React.useState<{
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

  const fetchEnrollments = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch enrollments
      const res = await fetch("/api/admin/enrollments");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengambil data pendaftaran");
      }
      setEnrollments(data.enrollments || []);

      // 2. Fetch courses list
      const courseRes = await fetch("/api/admin/courses");
      const courseData = await courseRes.json();
      if (courseRes.ok) {
        setCoursesList(courseData.courses || []);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Gagal memuat data pendaftaran.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Grouping Data Per Kursus
  const coursesGrouped: CourseWithEnrollments[] = React.useMemo(() => {
    const map = new Map<string, CourseWithEnrollments>();

    // Masukkan semua kursus yang terdaftar
    coursesList.forEach((c) => {
      map.set(c.id, {
        id: c.id,
        title: c.title,
        slug: c.slug,
        price: c.price,
        image_url: c.image_url,
        event_start: c.event_start,
        event_end: c.event_end,
        registration_start: c.registration_start,
        registration_end: c.registration_end,
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        enrollments: [],
      });
    });

    // Petakan setiap pendaftaran ke kursusnya
    enrollments.forEach((item) => {
      const courseId = item.course_id;
      if (!map.has(courseId)) {
        map.set(courseId, {
          id: courseId,
          title: item.courses?.title || "Kursus Tidak Diketahui",
          slug: item.courses?.slug || "",
          price: item.courses?.price || 0,
          image_url: item.courses?.image_url,
          event_start: item.courses?.event_start,
          event_end: item.courses?.event_end,
          registration_start: item.courses?.registration_start,
          registration_end: item.courses?.registration_end,
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          enrollments: [],
        });
      }

      const entry = map.get(courseId)!;
      entry.total += 1;
      if (item.status === "pending_payment") entry.pending += 1;
      if (item.status === "approved") entry.approved += 1;
      if (item.status === "rejected") entry.rejected += 1;
      entry.enrollments.push(item);
    });

    return Array.from(map.values());
  }, [coursesList, enrollments]);

  const selectedCourseGroup = coursesGrouped.find((c) => c.id === selectedCourseId);

  // Handler Approve
  const handleOpenApproveModal = (item: AdminEnrollmentItem) => {
    setApproveModalData({
      isOpen: true,
      enrollmentId: item.id,
      studentName: item.profiles?.full_name || "Siswa",
      courseTitle: item.courses?.title || "Kursus",
    });
  };

  const handleExecuteApprove = async () => {
    const { enrollmentId, studentName } = approveModalData;
    setIsExecutingApprove(true);
    setActionLoadingId(enrollmentId);

    try {
      const res = await fetch("/api/admin/enrollments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId,
          status: "approved",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyetujui pendaftaran");
      }

      setApproveModalData((prev) => ({ ...prev, isOpen: false }));
      setAlertModalData({
        isOpen: true,
        title: "Pendaftaran Disetujui",
        message: `Pendaftaran siswa "${studentName}" berhasil disetujui. Link grup WhatsApp kelas kini aktif untuk siswa.`,
        type: "success",
      });
      fetchEnrollments();
    } catch (err: unknown) {
      setAlertModalData({
        isOpen: true,
        title: "Gagal Menyetujui",
        message: err instanceof Error ? err.message : "Terjadi kesalahan.",
        type: "error",
      });
    } finally {
      setIsExecutingApprove(false);
      setActionLoadingId(null);
    }
  };

  // Handler Tolak dengan Alasan
  const handleOpenRejectModal = (item: AdminEnrollmentItem) => {
    setRejectModalData({
      isOpen: true,
      enrollmentId: item.id,
      studentName: item.profiles?.full_name || "Siswa",
      courseTitle: item.courses?.title || "Kursus",
      reason: item.rejection_reason || "Bukti transfer tidak sesuai nominal atau tidak terbaca.",
    });
  };

  const handleExecuteReject = async () => {
    const { enrollmentId, studentName, reason } = rejectModalData;
    if (!reason.trim()) {
      setAlertModalData({
        isOpen: true,
        title: "Alasan Penolakan Wajib",
        message: "Silakan tuliskan alasan penolakan agar siswa memahami kendala pendaftarannya.",
        type: "error",
      });
      return;
    }

    setIsSubmittingReject(true);
    setActionLoadingId(enrollmentId);

    try {
      const res = await fetch("/api/admin/enrollments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId,
          status: "rejected",
          rejection_reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menolak pendaftaran");
      }

      setRejectModalData((prev) => ({ ...prev, isOpen: false }));
      setAlertModalData({
        isOpen: true,
        title: "Pendaftaran Ditolak",
        message: `Pendaftaran siswa "${studentName}" telah ditolak beserta alasan penolakan yang dikirimkan.`,
        type: "info",
      });
      fetchEnrollments();
    } catch (err: unknown) {
      setAlertModalData({
        isOpen: true,
        title: "Gagal Menolak",
        message: err instanceof Error ? err.message : "Terjadi kesalahan.",
        type: "error",
      });
    } finally {
      setIsSubmittingReject(false);
      setActionLoadingId(null);
    }
  };

  // Handler Upload E-Sertifikat
  const handleOpenCertModal = (item: AdminEnrollmentItem) => {
    setCertificateModalData({
      isOpen: true,
      enrollmentId: item.id,
      studentName: item.profiles?.full_name || "Siswa",
      courseTitle: item.courses?.title || "Kursus",
      currentUrl: item.certificate_url,
    });
    setCertFile(null);
    setCertError(null);
  };

  const handleExecuteUploadCert = async () => {
    const { enrollmentId, studentName, currentUrl } = certificateModalData;
    if (!certFile && !currentUrl) {
      setCertError("Silakan pilih file sertifikat (PDF / Gambar).");
      return;
    }

    setIsUploadingCert(true);
    setCertError(null);

    try {
      let finalCertUrl = currentUrl || "";

      if (certFile) {
        const formData = new FormData();
        formData.append("file", certFile);
        formData.append("bucket", "course-assets");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Gagal mengunggah file sertifikat.");
        }
        finalCertUrl = uploadData.url;
      }

      const res = await fetch("/api/admin/enrollments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId,
          certificate_url: finalCertUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan E-Sertifikat.");
      }

      setCertificateModalData((prev) => ({ ...prev, isOpen: false }));
      setAlertModalData({
        isOpen: true,
        title: "E-Sertifikat Berhasil Diunggah",
        message: `E-Sertifikat untuk siswa "${studentName}" berhasil disimpan dan siap diunduh oleh siswa setelah mengisi ulasan kursus.`,
        type: "success",
      });
      fetchEnrollments();
    } catch (err: unknown) {
      setCertError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsUploadingCert(false);
    }
  };

  // Handler Export Excel (.xlsx)
  const handleExportExcel = (itemsToExport: AdminEnrollmentItem[], courseName = "semua_kursus") => {
    if (itemsToExport.length === 0) {
      setAlertModalData({
        isOpen: true,
        title: "Data Kosong",
        message: "Tidak ada data peserta untuk diunduh.",
        type: "info",
      });
      return;
    }

    try {
      const data = itemsToExport.map((item, index) => {
        const student = item.profiles;
        const course = item.courses;
        const statusIndo =
          item.status === "approved"
            ? "Disetujui"
            : item.status === "pending_payment"
            ? "Menunggu Konfirmasi"
            : "Ditolak";

        const certStatus = item.certificate_url ? "Sudah Diupload" : "Belum";

        return {
          "No": index + 1,
          "Nama Lengkap": student?.full_name || "-",
          "Username": student?.username || "-",
          "Asal Sekolah / Kampus": student?.school_origin || "-",
          "No WhatsApp": item.whatsapp_number || "-",
          "Kursus": course?.title || "-",
          "Harga Kursus (Rp)": Number(course?.price || 0),
          "Tanggal Pendaftaran": new Date(item.created_at).toLocaleDateString("id-ID"),
          "Status Pembayaran": statusIndo,
          "Link Bukti Transfer": item.payment_proof_url || "-",
          "Alasan Penolakan": item.rejection_reason || "-",
          "Status E-Sertifikat": certStatus,
          "Link E-Sertifikat": item.certificate_url || "-",
          "Rating Bintang (1-5)": item.review_rating ?? "-",
          "Ulasan Peserta": item.review_text || "-",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet["!cols"] = [
        { wch: 6 },  // No
        { wch: 25 }, // Nama Lengkap
        { wch: 18 }, // Username
        { wch: 28 }, // Asal Sekolah
        { wch: 18 }, // No WhatsApp
        { wch: 38 }, // Kursus
        { wch: 18 }, // Harga
        { wch: 20 }, // Tgl Pendaftaran
        { wch: 22 }, // Status
        { wch: 35 }, // Bukti Transfer
        { wch: 30 }, // Alasan Penolakan
        { wch: 20 }, // Status E-Sertifikat
        { wch: 35 }, // Link E-Sertifikat
        { wch: 16 }, // Rating
        { wch: 45 }, // Ulasan Peserta
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Peserta");

      const cleanCourseName = courseName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `peserta-skillora-${cleanCourseName || "rekap"}-${dateStr}.xlsx`;

      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error("Gagal export excel:", err);
      setAlertModalData({
        isOpen: true,
        title: "Gagal Mengunduh",
        message: "Terjadi kesalahan saat membuat file Excel.",
        type: "error",
      });
    }
  };

  // Filter & Search Peserta
  const activeEnrollmentsList = React.useMemo(() => {
    if (selectedCourseId && selectedCourseId !== "ALL_GLOBAL") {
      return selectedCourseGroup ? selectedCourseGroup.enrollments : [];
    }
    return enrollments;
  }, [selectedCourseId, selectedCourseGroup, enrollments]);

  const filteredEnrollments = activeEnrollmentsList.filter((item) => {
    const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;

    const studentName = item.profiles?.full_name?.toLowerCase() || "";
    const username = item.profiles?.username?.toLowerCase() || "";
    const school = item.profiles?.school_origin?.toLowerCase() || "";
    const courseTitle = item.courses?.title?.toLowerCase() || "";
    const phone = item.whatsapp_number?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      studentName.includes(query) ||
      username.includes(query) ||
      school.includes(query) ||
      courseTitle.includes(query) ||
      phone.includes(query);

    return matchesStatus && matchesSearch;
  });

  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, selectedCourseId]);

  const totalPages = Math.max(1, Math.ceil(filteredEnrollments.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEnrollments = filteredEnrollments.slice(startIndex, endIndex);

  const formatDateIndo = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 w-full pb-12 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/15 text-purple-700 dark:text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                Pendaftaran & Peserta Kursus
              </h1>
              <Badge variant="role-admin">Verifikasi & E-Sertifikat</Badge>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              Periksa bukti transfer siswa, berikan alasan penolakan, unggah E-Sertifikat per peserta, dan unduh data ke Excel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEnrollments}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleExportExcel(enrollments, "semua_peserta")}
            className="gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>Download Semua Excel</span>
          </Button>
        </div>
      </div>

      {/* TAMPILAN UTAMA 1: DAFTAR PER KURSUS (Level 1) */}
      {!selectedCourseId ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Pilih Kursus untuk Melihat Daftar Peserta
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Klik kartu kursus untuk mengelola pendaftar, memvalidasi bukti bayar, mengunggah e-sertifikat, dan unduh roster Excel.
              </p>
            </div>
            <button
              onClick={() => setSelectedCourseId("ALL_GLOBAL")}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Lihat Semua Peserta Global ({enrollments.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coursesGrouped.map((cg) => {
              return (
                <Card
                  key={cg.id}
                  className="flex flex-col justify-between border-stone-200/90 dark:border-stone-800/90 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all duration-200 shadow-xs hover:shadow-md group"
                >
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {cg.title}
                      </CardTitle>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 shrink-0">
                        {cg.price > 0 ? `Rp ${cg.price.toLocaleString("id-ID")}` : "Gratis"}
                      </span>
                    </div>

                    {/* Pelaksanaan Dates */}
                    {(cg.event_start || cg.event_end) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>
                          Pelaksanaan: {formatDateIndo(cg.event_start)} &ndash; {formatDateIndo(cg.event_end)}
                        </span>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-2 pb-5 space-y-4">
                    {/* Metrik Pendaftar Kursus */}
                    <div className="grid grid-cols-4 gap-1.5 p-3 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 text-center">
                      <div>
                        <span className="text-[10px] text-stone-400 block">Total</span>
                        <span className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                          {cg.total}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 block font-medium">Pending</span>
                        <span className="text-sm font-extrabold text-amber-600">
                          {cg.pending}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block font-medium">Aktif</span>
                        <span className="text-sm font-extrabold text-emerald-600">
                          {cg.approved}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-600 block font-medium">Ditolak</span>
                        <span className="text-sm font-extrabold text-rose-600">
                          {cg.rejected}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedCourseId(cg.id)}
                        className="w-full gap-1.5 bg-[#0F3E2E] hover:bg-[#16533e] text-white text-xs"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Kelola Peserta</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportExcel(cg.enrollments, cg.title)}
                        className="w-full gap-1.5 text-xs text-stone-700 dark:text-stone-300"
                        title="Download file Excel untuk kursus ini"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Excel</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= TAMPILAN 2: ROSTER PESERTA (Level 2) ================= */
        <div className="space-y-6">
          {/* Back Button & Course Title Banner */}
          <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCourseId(null)}
                className="gap-1 text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Daftar Kursus</span>
              </Button>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                  {selectedCourseId === "ALL_GLOBAL"
                    ? "Semua Pendaftaran Peserta (Global)"
                    : `Peserta Kursus: ${selectedCourseGroup?.title}`}
                </h2>
                {selectedCourseGroup && (
                  <p className="text-xs text-stone-500">
                    Jadwal: {formatDateIndo(selectedCourseGroup.event_start)} &ndash;{" "}
                    {formatDateIndo(selectedCourseGroup.event_end)} • Total Peserta:{" "}
                    <strong>{selectedCourseGroup.total}</strong>
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                handleExportExcel(
                  activeEnrollmentsList,
                  selectedCourseGroup ? selectedCourseGroup.title : "peserta"
                )
              }
              className="gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Download Excel Roster (.csv/.xlsx)</span>
            </Button>
          </div>

          {/* Table Card Peserta */}
          <Card className="border-stone-200/90 dark:border-stone-800/90 overflow-hidden">
            <CardHeader className="border-b border-stone-200/80 dark:border-stone-800/80 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold">Roster Peserta</CardTitle>
                  <CardDescription className="text-xs">
                    Periksa bukti transfer, beri alasan tolak, dan upload e-sertifikat per peserta
                  </CardDescription>
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari siswa, sekolah, no wa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/60 overflow-x-auto">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    statusFilter === "all"
                      ? "bg-[#0F3E2E] text-white font-semibold"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  Semua ({activeEnrollmentsList.length})
                </button>
                <button
                  onClick={() => setStatusFilter("pending_payment")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    statusFilter === "pending_payment"
                      ? "bg-amber-600 text-white font-semibold"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  Menunggu ({activeEnrollmentsList.filter((e) => e.status === "pending_payment").length})
                </button>
                <button
                  onClick={() => setStatusFilter("approved")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    statusFilter === "approved"
                      ? "bg-emerald-600 text-white font-semibold"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  Disetujui ({activeEnrollmentsList.filter((e) => e.status === "approved").length})
                </button>
                <button
                  onClick={() => setStatusFilter("rejected")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    statusFilter === "rejected"
                      ? "bg-rose-600 text-white font-semibold"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  Ditolak ({activeEnrollmentsList.filter((e) => e.status === "rejected").length})
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-xs text-stone-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                  <p>Memuat data peserta...</p>
                </div>
              ) : filteredEnrollments.length === 0 ? (
                <div className="p-12 text-center text-stone-400 text-xs">
                  Tidak ada data peserta pada kursus ini yang sesuai dengan filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-stone-500">
                        <th className="py-3 px-4 font-semibold">Siswa & Asal Sekolah</th>
                        <th className="py-3 px-4 font-semibold">WhatsApp & Tgl</th>
                        <th className="py-3 px-4 font-semibold">Bukti Pembayaran</th>
                        <th className="py-3 px-4 font-semibold">Status Pendaftaran</th>
                        <th className="py-3 px-4 font-semibold">E-Sertifikat</th>
                        <th className="py-3 px-4 font-semibold">Ulasan Peserta</th>
                        <th className="py-3 px-4 font-semibold text-right">Aksi Verifikasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                      {paginatedEnrollments.map((item) => {
                        const student = item.profiles;
                        const course = item.courses;
                        const isLoadingThis = actionLoadingId === item.id;

                        const waChatUrl = `https://wa.me/${item.whatsapp_number}?text=${encodeURIComponent(
                          `Halo ${student?.full_name || "Siswa"}, kami dari Admin Skillora terkait pendaftaran kursus "${course?.title || "kursus"}" Anda.`
                        )}`;

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-colors"
                          >
                            {/* Siswa */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0 flex items-center justify-center font-bold text-xs">
                                  {student?.avatar_url ? (
                                    <SmoothImage
                                      src={student.avatar_url}
                                      alt={student.full_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span>
                                      {student?.full_name ? student.full_name.charAt(0).toUpperCase() : "S"}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                                    {student?.full_name || "Tanpa Nama"}
                                  </p>
                                  <div className="flex items-center gap-2 text-[11px] text-stone-400">
                                    <span>@{student?.username || "-"}</span>
                                    {student?.school_origin && (
                                      <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                          <Building2 className="w-3 h-3" />
                                          {student.school_origin}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* WhatsApp & Tgl */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <a
                                  href={waChatUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>+{item.whatsapp_number}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                </a>
                                <p className="text-[10px] text-stone-400">
                                  {formatDateIndo(item.created_at)}
                                </p>
                              </div>
                            </td>

                            {/* Bukti Pembayaran */}
                            <td className="py-3.5 px-4">
                              {item.payment_proof_url ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewProofUrl(item.payment_proof_url)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold hover:bg-emerald-500/20 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Lihat Bukti</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-stone-400 italic">
                                  Belum diunggah
                                </span>
                              )}
                            </td>

                            {/* Status Pendaftaran */}
                            <td className="py-3.5 px-4">
                              {item.status === "approved" && (
                                <Badge variant="approved" className="text-[10px] gap-1 px-2 py-0.5">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Disetujui</span>
                                </Badge>
                              )}
                              {item.status === "pending_payment" && (
                                <Badge variant="pending" className="text-[10px] gap-1 px-2 py-0.5">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Menunggu</span>
                                </Badge>
                              )}
                              {item.status === "rejected" && (
                                <div className="space-y-1">
                                  <Badge variant="rejected" className="text-[10px] gap-1 px-2 py-0.5">
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    <span>Ditolak</span>
                                  </Badge>
                                  {item.rejection_reason && (
                                    <p className="text-[10px] text-rose-600 dark:text-rose-400 italic max-w-[140px] truncate" title={item.rejection_reason}>
                                      Ket: {item.rejection_reason}
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* E-Sertifikat */}
                            <td className="py-3.5 px-4">
                              {item.certificate_url ? (
                                <div className="space-y-1">
                                  <a
                                    href={item.certificate_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-semibold text-[11px]"
                                  >
                                    <Award className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Lihat File</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                  </a>
                                  <button
                                    onClick={() => handleOpenCertModal(item)}
                                    className="block text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                                  >
                                    Ganti Sertifikat
                                  </button>
                                </div>
                              ) : item.status === "approved" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenCertModal(item)}
                                  className="text-[11px] gap-1 h-7 px-2 border-dashed border-stone-300 dark:border-stone-700"
                                >
                                  <Upload className="w-3 h-3 text-stone-400" />
                                  <span>Upload</span>
                                </Button>
                              ) : (
                                <span className="text-[10px] text-stone-400">-</span>
                              )}
                            </td>

                            {/* Ulasan */}
                            <td className="py-3.5 px-4">
                              {item.review_rating ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-0.5 text-amber-500">
                                    {[...Array(item.review_rating)].map((_, i) => (
                                      <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    ))}
                                  </div>
                                  <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1 max-w-[120px]" title={item.review_text || ""}>
                                    &quot;{item.review_text}&quot;
                                  </p>
                                </div>
                              ) : (
                                <span className="text-[10px] text-stone-400 italic">Belum ulasan</span>
                              )}
                            </td>

                            {/* Aksi Verifikasi */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.status !== "approved" && (
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    disabled={isLoadingThis}
                                    onClick={() => handleOpenApproveModal(item)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1 text-xs"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Setujui</span>
                                  </Button>
                                )}

                                {item.status !== "rejected" && (
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    disabled={isLoadingThis}
                                    onClick={() => handleOpenRejectModal(item)}
                                    className="gap-1 text-xs"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>Tolak</span>
                                  </Button>
                                )}

                                <a
                                  href={waChatUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                                  title="Chat WhatsApp Siswa"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!loading && filteredEnrollments.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200/80 dark:border-stone-800/80 text-xs">
                  <span className="text-stone-500">
                    Menampilkan <span className="font-semibold">{startIndex + 1}</span> -{" "}
                    <span className="font-semibold">
                      {Math.min(endIndex, filteredEnrollments.length)}
                    </span>{" "}
                    dari <span className="font-semibold">{filteredEnrollments.length}</span> peserta
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="gap-1"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      <span>Sebelumnya</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="gap-1"
                    >
                      <span>Selanjutnya</span>
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================= MODAL TOLAK DENGAN ALASAN ================= */}
      {rejectModalData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0C0A09] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setRejectModalData((prev) => ({ ...prev, isOpen: false }))}
              className="absolute top-5 right-5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-3 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Tolak Pendaftaran Siswa
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Siswa: <span className="font-semibold text-stone-800 dark:text-stone-200">{rejectModalData.studentName}</span> ({rejectModalData.courseTitle})
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Alasan Penolakan (Wajib Diisi):
              </label>
              <textarea
                value={rejectModalData.reason}
                onChange={(e) =>
                  setRejectModalData((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Contoh: Bukti transfer tidak valid / nominal tidak sesuai / screenshot buram..."
                rows={3}
                className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none"
              />
              <p className="text-[11px] text-stone-400">
                * Alasan ini akan tampil di kartu dashboard siswa agar siswa dapat memperbaiki bukti bayar.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalData((prev) => ({ ...prev, isOpen: false }))}
                disabled={isSubmittingReject}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleExecuteReject}
                disabled={isSubmittingReject || !rejectModalData.reason.trim()}
                className="gap-2"
              >
                {isSubmittingReject ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menolak...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Tolak Pendaftaran</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL UPLOAD E-SERTIFIKAT PER SISWA ================= */}
      {certificateModalData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0C0A09] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setCertificateModalData((prev) => ({ ...prev, isOpen: false }))}
              className="absolute top-5 right-5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3 border border-amber-500/20">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Upload E-Sertifikat Peserta
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Peserta: <span className="font-semibold text-stone-800 dark:text-stone-200">{certificateModalData.studentName}</span>
              </p>
            </div>

            {certError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{certError}</span>
              </div>
            )}

            <div className="space-y-3">
              <label
                htmlFor="cert-upload"
                className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-stone-50/50 dark:bg-stone-900/30 text-center"
              >
                <Upload className="w-8 h-8 text-stone-400 mb-2" />
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  {certFile ? certFile.name : "Pilih File Sertifikat (PDF / JPG / PNG)"}
                </p>
                <p className="text-[10px] text-stone-400 mt-1">Maksimal ukuran file 5 MB</p>
                <input
                  id="cert-upload"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCertFile(f);
                  }}
                  className="hidden"
                />
              </label>

              {certificateModalData.currentUrl && !certFile && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <FileCheck className="w-4 h-4 text-emerald-600" /> File saat ini tersedia
                  </span>
                  <a
                    href={certificateModalData.currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[11px]"
                  >
                    Buka File
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCertificateModalData((prev) => ({ ...prev, isOpen: false }))}
                disabled={isUploadingCert}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteUploadCert}
                disabled={isUploadingCert || (!certFile && !certificateModalData.currentUrl)}
                className="gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white"
              >
                {isUploadingCert ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-emerald-300" />
                    <span>Simpan Sertifikat</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL LIHAT BUKTI TRANSFER ================= */}
      {previewProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0C0A09] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setPreviewProofUrl(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Bukti Transfer Pembayaran Siswa
            </h3>

            <div className="w-full max-h-[70vh] rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900">
              <SmoothImage
                src={previewProofUrl}
                alt="Bukti Transfer"
                className="w-full h-auto max-h-[65vh] object-contain mx-auto"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <a
                href={previewProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <span>Buka di Tab Baru</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Button variant="outline" size="sm" onClick={() => setPreviewProofUrl(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL KONFIRMASI APPROVE ================= */}
      <ConfirmModal
        isOpen={approveModalData.isOpen}
        title="Setujui Pendaftaran Siswa?"
        description={`Apakah Anda yakin ingin menyetujui pendaftaran "${approveModalData.studentName}" untuk kursus "${approveModalData.courseTitle}"? Akses tautan grup WhatsApp kelas akan langsung aktif untuk siswa.`}
        confirmText="Ya, Setujui"
        cancelText="Batal"
        variant="primary"
        isLoading={isExecutingApprove}
        onConfirm={handleExecuteApprove}
        onClose={() => setApproveModalData((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* ================= MODAL ALERT NOTIFIKASI ================= */}
      <AlertModal
        isOpen={alertModalData.isOpen}
        title={alertModalData.title}
        message={alertModalData.message}
        type={alertModalData.type}
        onClose={() => setAlertModalData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
