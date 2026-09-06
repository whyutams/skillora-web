"use client";

import * as React from "react";
import Link from "next/link";
import {
  GraduationCap,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Building2,
  Phone,
  AtSign,
  Upload,
  FileCheck,
  Star,
  Award,
  Lock,
  Calendar,
  AlertTriangle,
  X,
  Loader2,
  RefreshCw,
  Eye,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { EnrollmentCardSkeleton } from "@/components/ui/Skeleton";
import { Profile, Course } from "@/types/database";

export interface StudentEnrollmentItem {
  id: string;
  user_id: string;
  course_id: string;
  status: "pending_payment" | "approved" | "rejected";
  created_at: string;
  whatsapp_number: string;
  payment_proof_url: string | null;
  rejection_reason: string | null;
  certificate_url: string | null;
  review_rating: number | null;
  review_text: string | null;
  reviewed_at: string | null;
  course: (Course & {
    content?: string;
    image_url?: string | null;
    registration_start?: string | null;
    registration_end?: string | null;
    event_start?: string | null;
    event_end?: string | null;
  }) | null;
}

export function StudentDashboardClient() {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [enrollments, setEnrollments] = React.useState<StudentEnrollmentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"all" | "approved" | "pending_payment" | "rejected">("all");

  // Modal Upload Bukti Transfer
  const [isProofModalOpen, setIsProofModalOpen] = React.useState(false);
  const [selectedEnrollmentForProof, setSelectedEnrollmentForProof] = React.useState<StudentEnrollmentItem | null>(null);
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [proofPreview, setProofPreview] = React.useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = React.useState(false);
  const [proofError, setProofError] = React.useState<string | null>(null);

  // Modal Review & Rating
  const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false);
  const [selectedEnrollmentForReview, setSelectedEnrollmentForReview] = React.useState<StudentEnrollmentItem | null>(null);
  const [ratingValue, setRatingValue] = React.useState<number>(5);
  const [hoverRating, setHoverRating] = React.useState<number>(0);
  const [reviewText, setReviewText] = React.useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);
  const [reviewError, setReviewError] = React.useState<string | null>(null);

  // Modal Lihat Bukti / Preview Image
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);

  const adminPhone =
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "6281234567890";

  const fetchStudentData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/enrollments");
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile || null);
        setEnrollments(data.enrollments || []);
      }
    } catch (err) {
      console.error("Error fetching student enrollments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Handler Upload Bukti Transfer
  const handleOpenProofModal = (item: StudentEnrollmentItem) => {
    setSelectedEnrollmentForProof(item);
    setProofFile(null);
    setProofPreview(item.payment_proof_url || null);
    setProofError(null);
    setIsProofModalOpen(true);
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProofError("Harap unggah file gambar (JPG, PNG, atau WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofError("Ukuran file maksimal 5 MB.");
      return;
    }

    setProofError(null);
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async () => {
    if (!selectedEnrollmentForProof) return;
    if (!proofFile && !proofPreview) {
      setProofError("Silakan pilih file bukti transfer terlebih dahulu.");
      return;
    }

    setIsUploadingProof(true);
    setProofError(null);

    try {
      let finalUrl = selectedEnrollmentForProof.payment_proof_url || "";

      // Upload file baru jika dipilih
      if (proofFile) {
        const formData = new FormData();
        formData.append("file", proofFile);
        formData.append("bucket", "course-assets");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Gagal mengunggah file gambar.");
        }
        finalUrl = uploadData.url;
      }

      // Simpan ke API Student Enrollments
      const updateRes = await fetch("/api/student/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: selectedEnrollmentForProof.id,
          payment_proof_url: finalUrl,
        }),
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updateData.error || "Gagal menyimpan bukti transfer.");
      }

      setIsProofModalOpen(false);
      fetchStudentData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setProofError(msg);
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Handler Review & Rating
  const handleOpenReviewModal = (item: StudentEnrollmentItem) => {
    setSelectedEnrollmentForReview(item);
    setRatingValue(item.review_rating || 5);
    setReviewText(item.review_text || "");
    setReviewError(null);
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedEnrollmentForReview) return;
    if (!reviewText.trim()) {
      setReviewError("Harap tuliskan ulasan singkat mengenai pengalaman kursus Anda.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      const res = await fetch("/api/student/enrollments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: selectedEnrollmentForReview.id,
          rating: ratingValue,
          reviewText: reviewText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim ulasan.");
      }

      setIsReviewModalOpen(false);
      fetchStudentData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setReviewError(msg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const formatDateIndo = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Helper memeriksa apakah kursus sudah selesai pelaksanaan
  const isCourseFinished = (course: StudentEnrollmentItem["course"]) => {
    if (!course || !course.event_end) return true; // fallback: jika tidak diisi, dianggap selesai
    const end = new Date(course.event_end);
    return new Date() >= end;
  };

  const filteredEnrollments = enrollments.filter((item) => {
    if (activeTab === "all") return true;
    return item.status === activeTab;
  });

  const countApproved = enrollments.filter((e) => e.status === "approved").length;
  const countPending = enrollments.filter((e) => e.status === "pending_payment").length;
  const countRejected = enrollments.filter((e) => e.status === "rejected").length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Profil Header Siswa */}
      <div className="p-6 sm:p-8 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#0F3E2E] text-emerald-300 flex items-center justify-center font-extrabold text-xl sm:text-2xl shrink-0 shadow-md">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "S"}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                Halo, {profile?.full_name || "Pelajar"}!
              </h1>
              {profile?.username && (
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                  <AtSign className="w-3 h-3" />
                  {profile.username}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              Selamat datang di Dashboard Peserta Skillora. Kelola bukti pendaftaran, tautan grup kelas, dan e-sertifikat Anda di sini.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 dark:text-stone-400 pt-1 font-medium">
              {profile?.school_origin && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-stone-400" />
                  {profile.school_origin}
                </span>
              )}
              {profile?.whatsapp_number && profile.whatsapp_number !== "-" && (
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <Phone className="w-3.5 h-3.5" />
                  +{profile.whatsapp_number}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
          <Link href="/#kursus" className="w-full md:w-auto">
            <Button variant="primary" size="sm" className="gap-2 w-full justify-center bg-[#0F3E2E] hover:bg-[#16533e] text-white">
              <BookOpen className="w-4 h-4 text-emerald-300" />
              <span>Jelajahi Kursus Lain</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStudentData}
            title="Muat ulang data"
            className="p-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Metric Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-stone-900/40 backdrop-blur-sm">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 block">
            Total Kursus Didaftarkan
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
              {enrollments.length}
            </span>
            <span className="text-xs text-stone-400">kursus</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 backdrop-blur-sm">
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">
            Disetujui / Aktif
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">
              {countApproved}
            </span>
            <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80">kelas aktif</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 backdrop-blur-sm">
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 block">
            Menunggu Verifikasi Admin
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400">
              {countPending}
            </span>
            <span className="text-xs text-amber-600/80 dark:text-amber-400/80">proses</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10 backdrop-blur-sm">
          <span className="text-xs font-semibold text-rose-800 dark:text-rose-300 block">
            Ditolak / Batal
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-400">
              {countRejected}
            </span>
            <span className="text-xs text-rose-600/80 dark:text-rose-400/80">pendaftaran</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-stone-200 dark:border-stone-800">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "all"
              ? "bg-[#0F3E2E] text-white shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800"
          }`}
        >
          Semua Pendaftaran ({enrollments.length})
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "approved"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800"
          }`}
        >
          Disetujui / Aktif ({countApproved})
        </button>
        <button
          onClick={() => setActiveTab("pending_payment")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "pending_payment"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800"
          }`}
        >
          Menunggu Verifikasi ({countPending})
        </button>
        <button
          onClick={() => setActiveTab("rejected")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "rejected"
              ? "bg-rose-600 text-white shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800"
          }`}
        >
          Ditolak ({countRejected})
        </button>
      </div>

      {/* Daftar Kursus */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EnrollmentCardSkeleton />
          <EnrollmentCardSkeleton />
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-dashed border-stone-300 dark:border-stone-800 bg-white/40 dark:bg-stone-900/20">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto text-stone-400">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {activeTab === "all"
                ? "Belum Ada Kursus yang Didaftarkan"
                : `Tidak Ada Kursus dengan Status ${activeTab.toUpperCase()}`}
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
              Silakan temukan kursus keterampilan impian Anda di katalog resmi Skillora.
            </p>
          </div>
          <Link href="/#kursus" className="inline-block pt-2">
            <Button variant="primary" size="sm" className="gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white">
              <span>Jelajahi Katalog Kursus</span>
              <ArrowRight className="w-4 h-4 text-emerald-300" />
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEnrollments.map((item) => {
            const course = item.course;
            const isApproved = item.status === "approved";
            const isPending = item.status === "pending_payment";
            const isRejected = item.status === "rejected";
            const finished = isCourseFinished(course);
            const hasReviewed = !!item.review_rating;

            const confirmMessage = encodeURIComponent(
              `Halo Admin Skillora, saya ingin konfirmasi bukti transfer untuk kursus ${course?.title || "kursus"} dengan email ${profile?.username || "pelajar"}.`
            );
            const waConfirmUrl = `https://wa.me/${adminPhone}?text=${confirmMessage}`;

            return (
              <Card
                key={item.id}
                className="flex flex-col justify-between border-stone-200/90 dark:border-stone-800/90 hover:border-stone-300 dark:hover:border-stone-700 transition-all shadow-sm overflow-hidden"
              >
                <CardHeader className="space-y-4 pb-4">
                  {/* Status Bar Top */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-stone-400 block">
                        Didaftarkan: {formatDateIndo(item.created_at)}
                      </span>
                      <CardTitle className="text-lg font-bold">
                        {course?.title || "Kursus Skillora"}
                      </CardTitle>
                    </div>

                    {isApproved && (
                      <Badge variant="approved" className="shrink-0 gap-1.5 py-1 px-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Aktif / Disetujui</span>
                      </Badge>
                    )}
                    {isPending && (
                      <Badge variant="pending" className="shrink-0 gap-1.5 py-1 px-2.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Menunggu Validasi</span>
                      </Badge>
                    )}
                    {isRejected && (
                      <Badge variant="rejected" className="shrink-0 gap-1.5 py-1 px-2.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Ditolak</span>
                      </Badge>
                    )}
                  </div>

                  {/* Info Jadwal Pelaksanaan Kursus */}
                  {(course?.event_start || course?.event_end) && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800/70 text-stone-700 dark:text-stone-300 text-xs border border-stone-200/60 dark:border-stone-700/60">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold">Jadwal Pelaksanaan: </span>
                        <span>
                          {formatDateIndo(course.event_start)} &ndash; {formatDateIndo(course.event_end)}
                        </span>
                        {finished ? (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                            Selesai
                          </span>
                        ) : (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            Berjalan
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <CardDescription className="text-xs leading-relaxed line-clamp-2">
                    {course?.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-2 pb-5 space-y-4">
                  {/* KONDISI 1: PENDING PAYMENT */}
                  {isPending && (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                          <div>
                            <p className="font-bold">Menunggu Pemeriksaan Manual oleh Admin</p>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                              Admin akan memvalidasi bukti transfer pendaftaran Anda. Pastikan bukti transfer telah terunggah.
                            </p>
                          </div>
                        </div>

                        {/* Status Bukti Transfer Saat Ini */}
                        {item.payment_proof_url ? (
                          <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 text-[11px]">
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5" />
                              Bukti transfer telah diunggah
                            </span>
                            <button
                              onClick={() => setPreviewImageUrl(item.payment_proof_url)}
                              className="text-stone-700 dark:text-stone-300 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Eye className="w-3 h-3" />
                              Lihat Bukti
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                            * Anda belum mengunggah foto bukti transfer.
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenProofModal(item)}
                          className="w-full gap-2 border-amber-500/30 text-stone-800 dark:text-stone-200"
                        >
                          <Upload className="w-4 h-4 text-amber-600" />
                          <span>{item.payment_proof_url ? "Ganti Bukti Transfer" : "Upload Bukti Transfer"}</span>
                        </Button>

                        <a
                          href={waConfirmUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Hubungi Admin WA</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* KONDISI 2: REJECTED DENGAN ALASAN DARI ADMIN */}
                  {isRejected && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                          <div>
                            <span className="font-bold block text-sm">Pendaftaran Kursus Ditolak</span>
                            <p className="text-stone-600 dark:text-stone-400 text-xs mt-0.5">
                              Admin telah meninjau pendaftaran Anda dan memberikan catatan penolakan berikut:
                            </p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-white/70 dark:bg-stone-900/70 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-800 dark:text-rose-300">
                          &quot;{item.rejection_reason || "Bukti transfer tidak sesuai atau data tidak valid."}&quot;
                        </div>
                      </div>

                      <a
                        href={waConfirmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                      >
                        <Button variant="outline" size="sm" className="w-full gap-2 border-rose-500/30 text-rose-600 dark:text-rose-400">
                          <MessageCircle className="w-4 h-4" />
                          <span>Hubungi Admin Terkait Penolakan</span>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </a>
                    </div>
                  )}

                  {/* KONDISI 3: APPROVED */}
                  {isApproved && (
                    <div className="space-y-4">
                      {/* Banner Akses Kelas */}
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Pendaftaran disetujui! Anda resmi menjadi peserta kelas ini.</span>
                        </div>
                        {course?.whatsapp_group_url && (
                          <a
                            href={course.whatsapp_group_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                          >
                            <Button
                              variant="primary"
                              size="sm"
                              className="gap-1.5 bg-[#0F3E2E] hover:bg-[#16533e] text-white text-xs py-1 h-8"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
                              <span>Grup WA</span>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </a>
                        )}
                      </div>

                      {/* Box Fitur E-Sertifikat & Ulasan */}
                      <div className="p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/70 dark:bg-stone-900/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                              E-Sertifikat & Ulasan Kursus
                            </span>
                          </div>

                          {hasReviewed ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Ulasan Terisi
                            </span>
                          ) : finished ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              Wajib Ulasan
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-stone-400">
                              Tersedia Setelah Selesai
                            </span>
                          )}
                        </div>

                        {/* Ulasan Info */}
                        {hasReviewed ? (
                          <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-800 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-0.5 text-amber-500">
                                {[...Array(item.review_rating || 5)].map((_, i) => (
                                  <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                ))}
                              </div>
                              <span className="text-[10px] text-stone-400">
                                {formatDateIndo(item.reviewed_at)}
                              </span>
                            </div>
                            <p className="text-stone-600 dark:text-stone-400 italic text-xs">
                              &quot;{item.review_text}&quot;
                            </p>
                          </div>
                        ) : finished ? (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Ulasan Wajib Diisi Sebelum Unduh Sertifikat</p>
                              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                                Berikan rating bintang dan ulasan pengalaman belajar Anda untuk membuka akses download e-sertifikat resmi.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                            Periode pelaksanaan kursus sedang berlangsung. Anda dapat memberikan ulasan dan mengunduh E-Sertifikat setelah tanggal pelaksanaan selesai ({formatDateIndo(course?.event_end)}).
                          </p>
                        )}

                        {/* Action Buttons: Beri Ulasan & Unduh Sertifikat */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {/* Tombol Beri / Edit Ulasan */}
                          <Button
                            variant={hasReviewed ? "outline" : "secondary"}
                            size="sm"
                            disabled={!finished}
                            onClick={() => handleOpenReviewModal(item)}
                            className="w-full gap-1.5 text-xs"
                          >
                            <Star className={`w-3.5 h-3.5 ${hasReviewed ? "fill-amber-500 text-amber-500" : ""}`} />
                            <span>{hasReviewed ? "Ubah Ulasan" : "Beri Ulasan Kursus"}</span>
                          </Button>

                          {/* Tombol Unduh Sertifikat (GATED) */}
                          {item.certificate_url ? (
                            hasReviewed ? (
                              <a
                                href={item.certificate_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="w-full"
                              >
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="w-full gap-1.5 bg-[#0F3E2E] hover:bg-[#16533e] text-white text-xs"
                                >
                                  <Award className="w-3.5 h-3.5 text-emerald-300" />
                                  <span>Unduh E-Sertifikat</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </a>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                title="Wajib memberikan ulasan terlebih dahulu"
                                className="w-full gap-1.5 text-xs opacity-60 cursor-not-allowed"
                              >
                                <Lock className="w-3.5 h-3.5 text-stone-400" />
                                <span>Unduh E-Sertifikat (Terkunci)</span>
                              </Button>
                            )
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              title="Sertifikat sedang dalam proses penerbitan oleh Admin"
                              className="w-full gap-1.5 text-xs opacity-60 cursor-not-allowed"
                            >
                              <Award className="w-3.5 h-3.5 text-stone-400" />
                              <span>Sertifikat Segera Terbit</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ================= MODAL UPLOAD BUKTI TRANSFER ================= */}
      {isProofModalOpen && selectedEnrollmentForProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0C0A09] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsProofModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-500/20">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Upload Bukti Pembayaran
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Kursus: <span className="font-semibold text-stone-800 dark:text-stone-200">{selectedEnrollmentForProof.course?.title}</span>
              </p>
            </div>

            {/* Rekening Tujuan */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 text-xs space-y-1">
              <span className="font-bold text-stone-700 dark:text-stone-300 block">
                Rekening Pembayaran Resmi Skillora:
              </span>
              <p className="text-stone-600 dark:text-stone-400 font-mono text-[11px]">
                BCA: <strong>123-456-7890</strong> (a.n Skillora Edukasi)
              </p>
              <p className="text-stone-600 dark:text-stone-400 font-mono text-[11px]">
                DANA / GoPay / ShopeePay: <strong>0812-3456-7890</strong>
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                Nominal: Rp{Number(selectedEnrollmentForProof.course?.price || 0).toLocaleString("id-ID")}
              </p>
            </div>

            {/* Error Banner */}
            {proofError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{proofError}</span>
              </div>
            )}

            {/* Area Unggah File */}
            <div className="space-y-3">
              <label
                htmlFor="proof-upload"
                className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-stone-50/50 dark:bg-stone-900/30 min-h-[140px]"
              >
                {proofPreview ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proofPreview}
                      alt="Preview Bukti Transfer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <Upload className="w-8 h-8 text-stone-400 mx-auto" />
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Klik untuk memilih foto struk / screenshot transfer
                    </p>
                    <p className="text-[10px] text-stone-400">JPG, PNG, atau WEBP (Maks 5 MB)</p>
                  </div>
                )}
                <input
                  id="proof-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProofFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProofModalOpen(false)}
                disabled={isUploadingProof}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitProof}
                disabled={isUploadingProof || (!proofFile && !proofPreview)}
                className="gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white"
              >
                {isUploadingProof ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Kirim Bukti Pembayaran</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL ULASAN KURSUS ================= */}
      {isReviewModalOpen && selectedEnrollmentForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0C0A09] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsReviewModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-500/20">
                <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Ulasan & Rating Kursus
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Berikan masukan mengenai kursus <span className="font-semibold text-stone-800 dark:text-stone-200">{selectedEnrollmentForReview.course?.title}</span>. Ulasan Anda akan membuka akses pengunduhan E-Sertifikat resmi.
              </p>
            </div>

            {/* Error Banner */}
            {reviewError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {/* Rating Stars Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Pilih Rating Kepuasan (1-5 Bintang):
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRatingValue(star)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoverRating || ratingValue)
                          ? "fill-amber-500 text-amber-500"
                          : "text-stone-300 dark:text-stone-700"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-sm font-bold text-stone-700 dark:text-stone-300 ml-2">
                  {ratingValue} / 5 Bintang
                </span>
              </div>
            </div>

            {/* Review Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Tuliskan Ulasan / Testimoni Anda:
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Bagikan apa yang Anda pelajari, bagaimana kualitas bimbingan di grup WhatsApp, dan manfaat materi kursus ini bagi Anda..."
                rows={4}
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReviewModalOpen(false)}
                disabled={isSubmittingReview}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || !reviewText.trim()}
                className="gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white"
              >
                {isSubmittingReview ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4 text-emerald-300" />
                    <span>Kirim Ulasan & Buka Sertifikat</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL LIHAT GAMBAR BUKTI ================= */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0C0A09] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Bukti Transfer Pembayaran
            </h3>

            <div className="w-full max-h-[70vh] rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900">
              <SmoothImage
                src={previewImageUrl}
                alt="Bukti Transfer"
                className="w-full h-auto max-h-[65vh] object-contain mx-auto"
              />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setPreviewImageUrl(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
