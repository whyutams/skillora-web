"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageCircle,
  Upload,
  FileCheck,
  Star,
  Award,
  Lock,
  ExternalLink,
  ShieldCheck,
  Building2,
  CreditCard,
  Banknote,
  Users,
  Eye,
  Loader2,
  Check,
  RefreshCw,
  X,
  Phone,
  AlertTriangle,
  Play,
  FileText,
  Code,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Copy,
  BookOpen,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { Modal } from "@/components/ui/Modal";
import { StudentCourseDetailSkeleton } from "@/components/ui/Skeleton";
import { StudentEnrollmentItem } from "../DashboardPesertaClient";
import {
  parseCourseCurriculum,
  CourseModuleItem,
  CourseLessonItem,
  CourseQuizQuestion,
} from "@/utils/courseCurriculumParser";

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

interface PaymentAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_active: boolean;
}

export function DetailKursusPesertaClient({ enrollmentId }: { enrollmentId: string }) {
  const [enrollment, setEnrollment] = React.useState<StudentEnrollmentItem | null>(null);
  const [paymentAccounts, setPaymentAccounts] = React.useState<PaymentAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Upload proof modal & states
  const [isProofModalOpen, setIsProofModalOpen] = React.useState(false);
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [proofPreview, setProofPreview] = React.useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = React.useState(false);
  const [proofError, setProofError] = React.useState<string | null>(null);

  // Lightbox preview for proof receipt
  const [previewReceiptUrl, setPreviewReceiptUrl] = React.useState<string | null>(null);

  // Review states
  const [ratingValue, setRatingValue] = React.useState<number>(5);
  const [hoverRating, setHoverRating] = React.useState<number>(0);
  const [reviewText, setReviewText] = React.useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);
  const [reviewError, setReviewError] = React.useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = React.useState(false);

  // Copy rekening feedback
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  // tab aktif di area materi kursus
  const [activeContentTab, setActiveContentTab] = React.useState<"curikulum" | "deskripsi">("curikulum");

  // modul yang sedang terbuka di accordion
  const [openModules, setOpenModules] = React.useState<Record<number, boolean>>({ 0: true });

  // daftar kunci topik yang telah diselesaikan
  const [completedLessons, setCompletedLessons] = React.useState<string[]>([]);

  // modal pembelajar topik interaktif
  const [activeLessonModal, setActiveLessonModal] = React.useState<{
    moduleIndex: number;
    lessonIndex: number;
    moduleTitle: string;
    lesson: CourseLessonItem;
  } | null>(null);

  // states interaktif kuis
  const [quizAnswers, setQuizAnswers] = React.useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = React.useState(false);
  const [quizScore, setQuizScore] = React.useState<number | null>(null);

  // states tugas proyek
  const [projectSubmissionUrl, setProjectSubmissionUrl] = React.useState("");
  const [projectSubmittedUrl, setProjectSubmittedUrl] = React.useState("");
  const [projectSavedNotice, setProjectSavedNotice] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState(false);

  const adminPhone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "6281356578805";

  const fetchDetail = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/student/enrollments/${enrollmentId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memuat detail pendaftaran.");
      }
      setEnrollment(data.enrollment);
      setPaymentAccounts(data.payment_accounts || []);
      if (data.enrollment?.review_rating) {
        setRatingValue(data.enrollment.review_rating);
      }
      if (data.enrollment?.review_text) {
        setReviewText(data.enrollment.review_text);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // sinkronkan progres belajar dan pengumpulan proyek dari penyimpanan lokal
  React.useEffect(() => {
    if (!enrollment?.id) return;
    try {
      const savedProgress = localStorage.getItem(`skillora_progress_${enrollment.id}`);
      if (savedProgress) {
        setCompletedLessons(JSON.parse(savedProgress));
      }
      const savedProject = localStorage.getItem(`skillora_project_${enrollment.id}`);
      if (savedProject) {
        setProjectSubmittedUrl(savedProject);
        setProjectSubmissionUrl(savedProject);
      }
    } catch {
      // non blocking
    }
  }, [enrollment?.id]);

  const curriculum = React.useMemo(() => {
    if (!enrollment?.course) return null;
    return parseCourseCurriculum(enrollment.course as any, enrollment.course.content);
  }, [enrollment]);

  const curriculumModules: CourseModuleItem[] = React.useMemo(() => {
    return curriculum?.modules || [];
  }, [curriculum]);

  const totalLessons = React.useMemo(() => {
    return curriculumModules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  }, [curriculumModules]);

  const completedCount = React.useMemo(() => {
    return completedLessons.length;
  }, [completedLessons]);

  const progressPercentage = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

  const toggleLessonCompletion = (lessonKey: string) => {
    setCompletedLessons((prev) => {
      const exists = prev.includes(lessonKey);
      const next = exists ? prev.filter((k) => k !== lessonKey) : [...prev, lessonKey];
      if (enrollment?.id) {
        try {
          localStorage.setItem(`skillora_progress_${enrollment.id}`, JSON.stringify(next));
        } catch {
          // non blocking
        }
      }
      return next;
    });
  };

  const handleOpenLesson = (
    moduleIndex: number,
    lessonIndex: number,
    moduleTitle: string,
    lesson: CourseLessonItem
  ) => {
    setActiveLessonModal({
      moduleIndex,
      lessonIndex,
      moduleTitle,
      lesson,
    });
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setCopiedCode(false);
  };

  const currentQuizQuestions: CourseQuizQuestion[] = React.useMemo(() => {
    if (!activeLessonModal || activeLessonModal.lesson.type !== "quiz") return [];
    const qData = activeLessonModal.lesson.quiz_data;
    if (!qData) return [];
    if (Array.isArray(qData.questions) && qData.questions.length > 0) {
      return qData.questions;
    }
    if (qData.question) {
      return [
        {
          question: qData.question,
          options: qData.options || [],
          correct_index: qData.correct_index ?? 0,
          explanation: qData.explanation,
        },
      ];
    }
    return [];
  }, [activeLessonModal]);

  const handleQuizSubmit = () => {
    if (currentQuizQuestions.length === 0) return;
    let correct = 0;
    currentQuizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correct_index) correct++;
    });
    const score = Math.round((correct / currentQuizQuestions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);

    if (activeLessonModal) {
      const lessonKey = `mod-${activeLessonModal.moduleIndex}-les-${activeLessonModal.lessonIndex}`;
      if (score >= 60 && !completedLessons.includes(lessonKey)) {
        toggleLessonCompletion(lessonKey);
      }
    }
  };

  const handleSaveProjectSubmission = () => {
    if (!projectSubmissionUrl.trim() || !enrollment?.id) return;
    try {
      localStorage.setItem(`skillora_project_${enrollment.id}`, projectSubmissionUrl.trim());
      setProjectSubmittedUrl(projectSubmissionUrl.trim());
      setProjectSavedNotice(true);
      if (activeLessonModal) {
        const lessonKey = `mod-${activeLessonModal.moduleIndex}-les-${activeLessonModal.lessonIndex}`;
        if (!completedLessons.includes(lessonKey)) {
          toggleLessonCompletion(lessonKey);
        }
      }
      setTimeout(() => setProjectSavedNotice(false), 3000);
    } catch {
      // non blocking
    }
  };

  const getLessonIcon = (type: CourseLessonItem["type"]) => {
    switch (type) {
      case "practice":
        return <Code className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
      case "quiz":
        return <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case "project":
        return <Award className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />;
      case "reading":
      default:
        return <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
  };

  const getLessonBadgeLabel = (type: CourseLessonItem["type"]) => {
    switch (type) {
      case "practice":
        return "Latihan Koding";
      case "quiz":
        return "Kuis Interaktif";
      case "project":
        return "Tugas Proyek";
      case "reading":
      default:
        return "Materi Bacaan";
    }
  };

  const handleCopyAccount = (accountNumber: string, index: number) => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
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
    if (!enrollment) return;
    if (!proofFile && !proofPreview) {
      setProofError("Silakan pilih file bukti transfer terlebih dahulu.");
      return;
    }
    setIsUploadingProof(true);
    setProofError(null);

    try {
      let finalUrl = enrollment.payment_proof_url || "";
      if (proofFile) {
        const formData = new FormData();
        formData.append("file", proofFile);
        formData.append("bucket", "course-assets");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Gagal mengunggah file bukti.");
        finalUrl = uploadData.url;
      }

      const updateRes = await fetch("/api/student/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          payment_proof_url: finalUrl,
        }),
      });
      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.error || "Gagal menyimpan bukti transfer.");

      setIsProofModalOpen(false);
      await fetchDetail();
    } catch (err: unknown) {
      setProofError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!enrollment) return;
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
          enrollmentId: enrollment.id,
          rating: ratingValue,
          reviewText: reviewText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim ulasan.");

      setReviewSuccess(true);
      await fetchDetail();
      setTimeout(() => setReviewSuccess(false), 4000);
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const formatDateIndo = (dateStr?: string | null) => {
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

  if (loading) {
    return <StudentCourseDetailSkeleton />;
  }

  if (error || !enrollment) {
    return (
      <div className="py-16 text-center max-w-md mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
          Gagal Memuat Kursus
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {error || "Pendaftaran tidak ditemukan atau Anda tidak memiliki akses ke halaman ini."}
        </p>
        <Link href="/kursus-saya">
          <Button variant="outline" size="sm" className="gap-2 mt-2">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Kursus Saya
          </Button>
        </Link>
      </div>
    );
  }

  const course = enrollment.course;
  const isApproved = enrollment.status === "approved";
  const isPending = enrollment.status === "pending_payment";
  const isRejected = enrollment.status === "rejected";

  const eventEndPassed = course?.event_end
    ? new Date() > new Date(course.event_end)
    : false;

  const hasReviewed = !!enrollment.reviewed_at || (enrollment.review_rating !== null && enrollment.review_rating > 0);
  const canDownloadCert = isApproved && !!enrollment.certificate_url && hasReviewed;

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link href="/kursus-saya">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Kursus Saya</span>
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDetail}
            disabled={loading}
            className="gap-2 text-xs text-stone-500"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan Status</span>
          </Button>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge
            variant={
              isApproved
                ? "approved"
                : isPending
                ? "pending"
                : "rejected"
            }
            className="text-xs px-3 py-1 font-bold"
          >
            {isApproved
              ? "Disetujui / Aktif"
              : isPending
              ? "Menunggu Konfirmasi Admin"
              : "Pendaftaran Ditolak"}
          </Badge>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
            {course?.price && Number(course.price) > 0
              ? `Rp ${Number(course.price).toLocaleString("id-ID")}`
              : "Gratis"}
          </span>

          <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Terdaftar pada {formatDateIndo(enrollment.created_at)}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            {course?.title || "Detail Kursus"}
          </h1>
          {course?.description && (
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-2 max-w-4xl leading-relaxed">
              {course.description}
            </p>
          )}
        </div>

        {/* Timeline Bar */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 text-xs">
          {(course?.registration_start || course?.registration_end) && (
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="font-semibold text-stone-700 dark:text-stone-300">Pendaftaran:</span>
              <span>{formatDateIndo(course.registration_start)} &ndash; {formatDateIndo(course.registration_end)}</span>
            </div>
          )}
          {(course?.event_start || course?.event_end) && (
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-stone-700 dark:text-stone-300">Pelaksanaan:</span>
              <span>{formatDateIndo(course.event_start)} &ndash; {formatDateIndo(course.event_end)}</span>
            </div>
          )}
          {((course as unknown) as Record<string, unknown>)?.participant_count !== undefined && (
            <div className="flex items-center gap-1.5 text-stone-500">
              <Users className="w-3.5 h-3.5" />
              <span>{String(((course as unknown) as Record<string, unknown>).participant_count)} peserta bergabung</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid Layout: Left Content (2 cols) & Right Sidebar (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ================= LEFT COLUMN: COURSE CONTENT & MEDIA ================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* card progres belajar khusus peserta yang disetujui */}
          {isApproved && (
            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent shadow-xs overflow-hidden">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <span>Kemajuan Belajar Anda</span>
                        <Badge variant="approved" className="text-[10px] px-2 py-0.5">
                          {progressPercentage}% Selesai
                        </Badge>
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {completedCount} dari {totalLessons} materi pembelajaran telah diselesaikan
                      </p>
                    </div>
                  </div>
                </div>

                {/* progress bar visual */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 rounded-full bg-stone-200/80 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* tab navigasi sisi kiri */}
          {isApproved && (
            <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveContentTab("curikulum")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeContentTab === "curikulum"
                    ? "bg-[#0F3E2E] text-white shadow-xs"
                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Kurikulum & Modul Belajar</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                  {totalLessons}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveContentTab("deskripsi")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeContentTab === "deskripsi"
                    ? "bg-[#0F3E2E] text-white shadow-xs"
                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Deskripsi & Informasi Kursus</span>
              </button>
            </div>
          )}

          {/* konten tab kurikulum belajar */}
          {isApproved && activeContentTab === "curikulum" ? (
            <div className="space-y-4">
              {curriculumModules.length === 0 ? (
                <Card className="p-8 text-center text-xs text-stone-400 space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-stone-300" />
                  <p>Materi silabus modul belum diterbitkan oleh instruktur.</p>
                </Card>
              ) : (
                curriculumModules.map((moduleItem, modIdx) => {
                  const isOpen = openModules[modIdx] !== false;
                  const moduleLessons = moduleItem.lessons || [];
                  const moduleCompletedCount = moduleLessons.filter((_, lIdx) =>
                    completedLessons.includes(`mod-${modIdx}-les-${lIdx}`)
                  ).length;

                  return (
                    <Card
                      key={modIdx}
                      className="border-stone-200/90 dark:border-stone-800/90 shadow-xs overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenModules((prev) => ({
                            ...prev,
                            [modIdx]: !isOpen,
                          }))
                        }
                        className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                              Modul {moduleItem.moduleNumber || modIdx + 1}
                            </span>
                            <span className="text-xs text-stone-400">•</span>
                            <span className="text-xs text-stone-500">
                              {moduleCompletedCount}/{moduleLessons.length} selesai
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                            {moduleItem.title}
                          </h4>
                          {moduleItem.description && (
                            <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                              {moduleItem.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {moduleCompletedCount === moduleLessons.length && moduleLessons.length > 0 && (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Selesai</span>
                            </span>
                          )}
                          <div className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500">
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-stone-100 dark:border-stone-800/70 divide-y divide-stone-100 dark:divide-stone-800/50 bg-stone-50/30 dark:bg-stone-950/20">
                          {moduleLessons.length === 0 ? (
                            <p className="p-4 text-xs text-stone-400 text-center">
                              Belum ada topik materi pada modul ini.
                            </p>
                          ) : (
                            moduleLessons.map((lesson, lIdx) => {
                              const lessonKey = `mod-${modIdx}-les-${lIdx}`;
                              const isCompleted = completedLessons.includes(lessonKey);

                              return (
                                <div
                                  key={lIdx}
                                  className="p-4 flex items-center justify-between gap-3 hover:bg-white/80 dark:hover:bg-stone-900/60 transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleLessonCompletion(lessonKey)}
                                      title={isCompleted ? "Tandai belum selesai" : "Tandai selesai"}
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                                        isCompleted
                                          ? "bg-emerald-600 text-white"
                                          : "border border-stone-300 dark:border-stone-700 hover:border-emerald-500 text-transparent"
                                      }`}
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </button>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {getLessonIcon(lesson.type)}
                                        <span
                                          className={`text-xs font-semibold truncate ${
                                            isCompleted
                                              ? "line-through text-stone-400 dark:text-stone-500"
                                              : "text-stone-800 dark:text-stone-200"
                                          }`}
                                        >
                                          {lesson.title}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-stone-400">
                                          {getLessonBadgeLabel(lesson.type)}
                                        </span>
                                        {lesson.duration && (
                                          <>
                                            <span className="text-[10px] text-stone-300 dark:text-stone-700">•</span>
                                            <span className="text-[10px] text-stone-400 flex items-center gap-1">
                                              <Clock className="w-2.5 h-2.5" />
                                              {lesson.duration}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenLesson(modIdx, lIdx, moduleItem.title, lesson)}
                                    className="gap-1.5 text-xs shrink-0"
                                  >
                                    <span>Buka Materi</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </Button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* cover kursus */}
              {course?.image_url && (
                <div className="rounded-3xl overflow-hidden border border-stone-200/80 dark:border-stone-800/80 bg-stone-100 dark:bg-stone-900 shadow-xs max-h-[380px]">
                  <SmoothImage
                    src={course.image_url}
                    alt={course.title}
                    className="w-full h-full object-cover max-h-[380px]"
                  />
                </div>
              )}

              {/* materi html konten dari editor */}
              <Card className="border-stone-200/90 dark:border-stone-800/90 shadow-xs overflow-hidden">
                <CardHeader className="border-b border-stone-100 dark:border-stone-800/80 p-6">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <span>Materi & Silabus Kursus</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Informasi kurikulum, modul pembelajaran, dan instruksi kegiatan kursus.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 sm:p-8">
                  {course?.content ? (
                    <div
                      className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed prose-headings:font-bold prose-headings:text-stone-900 dark:prose-headings:text-stone-100 prose-img:rounded-2xl prose-img:border prose-img:border-stone-200 dark:prose-img:border-stone-800 prose-a:text-emerald-600 dark:prose-a:text-emerald-400"
                      dangerouslySetInnerHTML={{ __html: course.content }}
                    />
                  ) : (
                    <div className="py-10 text-center space-y-2 text-stone-400">
                      <BookOpen className="w-8 h-8 mx-auto text-stone-300" />
                      <p className="text-xs">Materi silabus lengkap akan diumumkan oleh instruktur melalui grup kelas.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: INTERACTIVE ACTIONS & CARDS ================= */}
        <div className="space-y-6 lg:sticky lg:top-24">
          {/* CARD 1: STATUS PENDAFTARAN & TINDAKAN UTAMA */}
          <Card className="border-stone-200/90 dark:border-stone-800/90 shadow-xs overflow-hidden">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Status Pendaftaran Anda
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              {/* Status Approved */}
              {isApproved && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                        Pendaftaran Telah Disetujui!
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-0.5">
                        Selamat! Pembayaran Anda telah divalidasi oleh admin. Anda dapat langsung bergabung ke grup WhatsApp kelas.
                      </p>
                    </div>
                  </div>

                  {/* Tombol Gabung Grup WhatsApp */}
                  {course?.whatsapp_group_url ? (
                    <a
                      href={course.whatsapp_group_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>Gabung Grup WhatsApp Kelas</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
                    </a>
                  ) : (
                    <p className="text-xs text-stone-500 italic">
                      Link grup WhatsApp akan segera diperbarui oleh admin kursus.
                    </p>
                  )}
                </div>
              )}

              {/* Status Pending */}
              {isPending && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                        Menunggu Validasi Admin
                      </h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                        {enrollment.payment_proof_url
                          ? "Bukti transfer Anda telah terkirim dan sedang dalam antrean verifikasi admin."
                          : "Segera unggah bukti transfer pembayaran agar pendaftaran Anda dapat diproses oleh admin."}
                      </p>
                    </div>
                  </div>

                  {enrollment.payment_proof_url ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => setPreviewReceiptUrl(enrollment.payment_proof_url)}
                        className="w-full text-xs text-emerald-700 dark:text-emerald-400 hover:underline flex items-center justify-center gap-1 font-semibold p-2 rounded-lg bg-white/60 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Bukti Transfer yang Diunggah</span>
                      </button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProofFile(null);
                          setProofPreview(enrollment.payment_proof_url);
                          setProofError(null);
                          setIsProofModalOpen(true);
                        }}
                        className="w-full gap-2 text-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Ganti Bukti Transfer</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setProofFile(null);
                        setProofPreview(null);
                        setProofError(null);
                        setIsProofModalOpen(true);
                      }}
                      className="w-full gap-2 bg-[#0F3E2E] hover:bg-[#165640] text-white font-semibold text-xs py-2.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Unggah Bukti Transfer Sekarang</span>
                    </Button>
                  )}
                </div>
              )}

              {/* Status Rejected */}
              {isRejected && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                        Pendaftaran Ditolak
                      </h4>
                      <div className="mt-1.5 p-2.5 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-900 dark:text-rose-200">
                        <span className="font-bold block mb-0.5">Alasan Admin:</span>
                        <p className="italic">
                          &ldquo;{enrollment.rejection_reason || "Bukti transfer tidak sesuai atau tidak valid."}&rdquo;
                        </p>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-2">
                        Jangan khawatir, Anda dapat mengunggah ulang bukti transfer yang benar di bawah ini. Status akan otomatis kembali <strong>Menunggu Verifikasi</strong>.
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setProofFile(null);
                      setProofPreview(enrollment.payment_proof_url);
                      setProofError(null);
                      setIsProofModalOpen(true);
                    }}
                    className="w-full gap-2 bg-[#0F3E2E] hover:bg-[#165640] text-white font-semibold text-xs py-2.5"
                  >
                    <Upload className="w-4 h-4 text-emerald-300" />
                    <span>Upload Ulang Bukti Transfer</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CARD 2: REKENING PEMBAYARAN RESMI (Tampil jika belum approved) */}
          {!isApproved && (
            <Card className="border-stone-200/90 dark:border-stone-800/90 shadow-xs overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Rekening Pembayaran Resmi</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Silakan transfer sesuai nominal kursus ke salah satu rekening berikut:
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-2.5">
                {paymentAccounts.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">
                    Hubungi admin untuk nomor rekening pembayaran resmi.
                  </p>
                ) : (
                  paymentAccounts.map((acc, idx) => (
                    <div
                      key={acc.id}
                      className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-stone-900 dark:text-stone-100">
                            {acc.bank_name}
                          </span>
                        </div>
                        <p className="text-xs font-mono font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                          {acc.account_number}
                        </p>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400">
                          a.n {acc.account_holder}
                        </p>
                      </div>

                      <button
                        onClick={() => handleCopyAccount(acc.account_number, idx)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors shrink-0 flex items-center gap-1"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Disalin</span>
                          </>
                        ) : (
                          <span>Salin</span>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* CARD 3: ULASAN & RATING (Khusus Peserta Approved) */}
          {isApproved && (
            <Card className="border-stone-200/90 dark:border-stone-800/90 shadow-xs overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Ulasan & Rating Kursus</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {eventEndPassed
                    ? "Berikan penilaian setelah menyelesaikan pelaksanaan kursus."
                    : "Ulasan wajib diisi setelah periode pelaksanaan selesai untuk membuka E-Sertifikat."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                {hasReviewed ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (enrollment.review_rating || 5)
                              ? "fill-amber-400 text-amber-400"
                              : "text-stone-300"
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-200 ml-1.5">
                        {enrollment.review_rating} / 5
                      </span>
                    </div>
                    <p className="text-xs text-stone-700 dark:text-stone-300 italic">
                      &ldquo;{enrollment.review_text}&rdquo;
                    </p>
                    <div className="pt-1 flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ulasan Anda telah tersimpan
                    </div>
                  </div>
                ) : eventEndPassed ? (
                  <div className="space-y-3">
                    {reviewSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Ulasan berhasil disimpan! E-Sertifikat kini terbuka.</span>
                      </div>
                    )}
                    {reviewError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{reviewError}</span>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Pilih Bintang:
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingValue(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 text-amber-400 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= (hoverRating || ratingValue)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-stone-300"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-stone-600 dark:text-stone-400 ml-2">
                          {hoverRating || ratingValue} Bintang
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                        Tulis Ulasan Anda:
                      </label>
                      <textarea
                        rows={3}
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Ceritakan pengalaman Anda selama mengikuti kursus ini..."
                        className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <Button
                      size="sm"
                      onClick={handleSubmitReview}
                      disabled={isSubmittingReview}
                      className="w-full gap-2 bg-[#0F3E2E] hover:bg-[#165640] text-white text-xs py-2"
                    >
                      {isSubmittingReview ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan Ulasan...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Kirim Ulasan & Buka E-Sertifikat</span>
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-2 text-center">
                    <Lock className="w-5 h-5 text-stone-400 mx-auto" />
                    <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                      Ulasan Belum Dibuka
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Form ulasan akan aktif otomatis setelah tanggal pelaksanaan selesai (
                      {formatDateIndo(course?.event_end)}).
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* CARD 4: E-SERTIFIKAT KURSUS (Khusus Peserta Approved) */}
          {isApproved && (
            <Card className="border-stone-200/90 dark:border-stone-800/90 shadow-xs overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>E-Sertifikat Resmi</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Sertifikat penyelesaian kursus terverifikasi Skillora.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3">
                {canDownloadCert ? (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>E-Sertifikat Anda siap diunduh!</span>
                    </div>

                    <a
                      href={enrollment.certificate_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0F3E2E] hover:bg-[#165640] text-white font-bold text-xs shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Award className="w-4 h-4 text-emerald-300" />
                      <span>Unduh E-Sertifikat (PDF / Gambar)</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-2 text-center">
                    <Lock className="w-5 h-5 text-stone-400 mx-auto" />
                    <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                      {!hasReviewed
                        ? "Wajib Mengisi Ulasan Terlebih Dahulu"
                        : "E-Sertifikat Sedang Diproses Admin"}
                    </p>
                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      {!hasReviewed
                        ? "Silakan isi rating dan ulasan di atas setelah masa pelaksanaan selesai untuk mengunduh sertifikat."
                        : "Admin akan mengunggah file e-sertifikat Anda setelah penilaian kursus selesai."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* CARD 5: BANTUAN ADMIN WHATSAPP */}
          <Card className="border-stone-200/90 dark:border-stone-800/90 shadow-xs overflow-hidden">
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Butuh Bantuan Kursus?
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Hubungi Admin Skillora via WhatsApp
                  </p>
                </div>
              </div>

              <a
                href={`https://wa.me/${adminPhone}?text=${encodeURIComponent(
                  `Halo Admin Skillora, saya peserta kursus "${course?.title}". Saya ingin bertanya mengenai pendaftaran saya.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <span>Chat</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ================= MODAL UPLOAD / GANTI BUKTI TRANSFER ================= */}
      {isProofModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0C0A09] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProofModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3 border border-emerald-500/20">
                <Upload className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Upload Bukti Transfer Pembayaran
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Kursus: <strong className="text-stone-800 dark:text-stone-200">{course?.title}</strong> &bull; Total:{" "}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {course?.price && Number(course.price) > 0
                    ? `Rp ${Number(course.price).toLocaleString("id-ID")}`
                    : "Gratis"}
                </strong>
              </p>
            </div>

            {proofError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{proofError}</span>
              </div>
            )}

            {/* Rekening Info */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Transfer ke Rekening Resmi Skillora:
              </span>
              {paymentAccounts.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Hubungi admin untuk info rekening.</p>
              ) : (
                paymentAccounts.map((acc, idx) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between text-xs py-1 border-b border-stone-200/50 dark:border-stone-800/50 last:border-0"
                  >
                    <div>
                      <span className="font-bold text-stone-800 dark:text-stone-200">{acc.bank_name}:</span>{" "}
                      <span className="font-mono">{acc.account_number}</span>{" "}
                      <span className="text-stone-400 text-[10px]">({acc.account_holder})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(acc.account_number, idx)}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      {copiedIndex === idx ? "Disalin!" : "Salin"}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* File Upload Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Pilih Foto / Screenshot Bukti Transfer
              </label>
              <label className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-stone-50/50 dark:bg-stone-900/50">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleProofFileChange}
                  className="hidden"
                />
                {proofPreview ? (
                  <div className="space-y-3 text-center">
                    <img
                      src={proofPreview}
                      alt="Preview Bukti"
                      className="max-h-48 rounded-xl object-contain mx-auto border border-stone-200 dark:border-stone-800"
                    />
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      Klik untuk mengganti foto
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-center">
                    <Upload className="w-8 h-8 text-stone-400 mx-auto" />
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Klik untuk memilih file gambar
                    </p>
                    <p className="text-[10px] text-stone-400">JPG, PNG, atau WEBP (Maks 5 MB)</p>
                  </div>
                )}
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProofModalOpen(false)}
                disabled={isUploadingProof}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitProof}
                disabled={isUploadingProof || (!proofFile && !proofPreview)}
                className="gap-2 bg-[#0F3E2E] hover:bg-[#165640] text-white"
              >
                {isUploadingProof ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Simpan & Kirim Bukti</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* modal interaktif materi pelajaran dan kuis */}
      {activeLessonModal && (
        <Modal
          isOpen={Boolean(activeLessonModal)}
          onClose={() => setActiveLessonModal(null)}
          title={activeLessonModal.lesson.title}
          description={`${activeLessonModal.moduleTitle} • ${getLessonBadgeLabel(activeLessonModal.lesson.type)}`}
          maxWidth="3xl"
        >
          {(() => {
            const lesson = activeLessonModal.lesson;
            const lessonKey = `mod-${activeLessonModal.moduleIndex}-les-${activeLessonModal.lessonIndex}`;
            const isCompleted = completedLessons.includes(lessonKey);
            const ytEmbed = getYouTubeEmbedUrl(lesson.video_url);

            return (
              <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                {/* video player */}
                {lesson.video_url && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Video Materi
                    </h4>
                    {ytEmbed ? (
                      <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-black">
                        <iframe
                          src={ytEmbed}
                          title={lesson.title}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex items-center justify-between">
                        <span className="text-xs text-stone-600 dark:text-stone-300 font-medium truncate">
                          {lesson.video_url}
                        </span>
                        <a
                          href={lesson.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Tonton Video</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* instruksi atau petunjuk belajar */}
                {lesson.instructions && (
                  <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Instruksi Belajar
                    </h4>
                    <p className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-line leading-relaxed">
                      {lesson.instructions}
                    </p>
                  </div>
                )}

                {/* bacaan atau uraian materi */}
                {lesson.content && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Uraian Materi
                    </h4>
                    <div
                      className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed prose-headings:font-bold prose-headings:text-stone-900 dark:prose-headings:text-stone-100 prose-img:rounded-2xl prose-img:border prose-img:border-stone-200 dark:prose-img:border-stone-800 prose-a:text-emerald-600 dark:prose-a:text-emerald-400"
                      dangerouslySetInnerHTML={{ __html: lesson.content }}
                    />
                  </div>
                )}

                {/* latihan praktik koding */}
                {lesson.type === "practice" && lesson.starter_code && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                        Kode Latihan
                      </h4>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(lesson.starter_code || "");
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Kode</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 rounded-2xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto leading-relaxed border border-stone-800">
                      <code>{lesson.starter_code}</code>
                    </pre>
                  </div>
                )}

                {/* pemutar kuis interaktif */}
                {lesson.type === "quiz" && (
                  <div className="space-y-6 pt-2">
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                          Uji Pemahaman Topik
                        </h4>
                        <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                          Jawab pertanyaan di bawah ini untuk menguji pemahaman Anda. Dapatkan skor minimal 60% untuk menyelesaikan materi secara otomatis.
                        </p>
                      </div>
                    </div>

                    {currentQuizQuestions.length === 0 ? (
                      <div className="p-6 text-center text-xs text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
                        Kuis untuk topik ini sedang dipersiapkan oleh instruktur.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {currentQuizQuestions.map((q, qIdx) => {
                          const chosenAnswer = quizAnswers[qIdx];
                          return (
                            <div
                              key={qIdx}
                              className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 space-y-3.5"
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 text-xs font-black text-stone-700 dark:text-stone-300 shrink-0">
                                  {qIdx + 1}
                                </span>
                                <div
                                  className="text-sm font-semibold text-stone-900 dark:text-stone-100 pt-0.5"
                                  dangerouslySetInnerHTML={{ __html: q.question }}
                                />
                              </div>

                              <div className="space-y-2 pt-1">
                                {(q.options || []).map((opt, oIdx) => {
                                  const isSelected = chosenAnswer === oIdx;
                                  const isCorrect = q.correct_index === oIdx;

                                  let optionStyle =
                                    "border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50";
                                  if (quizSubmitted) {
                                    if (isCorrect) {
                                      optionStyle =
                                        "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200";
                                    } else if (isSelected && !isCorrect) {
                                      optionStyle =
                                        "border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-200";
                                    }
                                  } else if (isSelected) {
                                    optionStyle =
                                      "border-emerald-600 bg-emerald-500/5 text-stone-900 dark:text-stone-100";
                                  }

                                  return (
                                    <label
                                      key={oIdx}
                                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${optionStyle}`}
                                    >
                                      <input
                                        type="radio"
                                        name={`quiz_q_${qIdx}`}
                                        value={oIdx}
                                        checked={isSelected}
                                        disabled={quizSubmitted}
                                        onChange={() =>
                                          setQuizAnswers((prev) => ({
                                            ...prev,
                                            [qIdx]: oIdx,
                                          }))
                                        }
                                        className="text-emerald-600 focus:ring-emerald-500"
                                      />
                                      <span className="font-medium flex-1">{opt}</span>
                                      {quizSubmitted && isCorrect && (
                                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                      )}
                                      {quizSubmitted && isSelected && !isCorrect && (
                                        <X className="w-4 h-4 text-rose-500 shrink-0" />
                                      )}
                                    </label>
                                  );
                                })}
                              </div>

                              {quizSubmitted && q.explanation && (
                                <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-xs text-stone-600 dark:text-stone-300">
                                  <span className="font-bold text-stone-900 dark:text-stone-100">
                                    Penjelasan
                                  </span>
                                  <p className="mt-0.5">{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* hasil kuis dan tombol submit */}
                        {quizSubmitted ? (
                          <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <Trophy
                                className={`w-6 h-6 ${
                                  (quizScore || 0) >= 60
                                    ? "text-amber-500"
                                    : "text-stone-400"
                                }`}
                              />
                              <div>
                                <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                                  Skor Akhir Kuis
                                </p>
                                <p className="text-base font-black text-stone-900 dark:text-stone-100">
                                  {quizScore}%{" "}
                                  <span
                                    className={`text-xs font-bold ${
                                      (quizScore || 0) >= 60
                                        ? "text-emerald-600"
                                        : "text-rose-500"
                                    }`}
                                  >
                                    {(quizScore || 0) >= 60
                                      ? "• Lulus & Materi Tercatat Selesai"
                                      : "• Belum Mencapai Syarat Minimum (60%)"}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setQuizSubmitted(false);
                                setQuizAnswers({});
                                setQuizScore(null);
                              }}
                              className="text-xs"
                            >
                              Ulangi Kuis
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <Button
                              onClick={handleQuizSubmit}
                              disabled={
                                Object.keys(quizAnswers).length <
                                currentQuizQuestions.length
                              }
                              className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs font-bold"
                            >
                              Periksa Jawaban Kuis
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* pengumpulan tugas proyek */}
                {lesson.type === "project" && (
                  <div className="space-y-4 pt-2">
                    <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-3">
                      <Award className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                          Pengumpulan Proyek Akhir
                        </h4>
                        <p className="text-xs text-purple-800 dark:text-purple-300/90 mt-0.5">
                          Kirimkan tautan repositori GitHub, deploy aplikasi, atau dokumen Google Drive untuk menyelesaikan proyek ini.
                        </p>
                      </div>
                    </div>

                    {lesson.project_data?.brief && (
                      <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                          Brief Proyek
                        </h4>
                        <p className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-line leading-relaxed">
                          {lesson.project_data.brief}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        Tautan Hasil Proyek (URL GitHub / Live Demo / Google Drive)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://github.com/username/project-anda"
                          value={projectSubmissionUrl}
                          onChange={(e) => setProjectSubmissionUrl(e.target.value)}
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        />
                        <Button
                          onClick={handleSaveProjectSubmission}
                          disabled={!projectSubmissionUrl.trim()}
                          className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs font-bold shrink-0"
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          <span>Simpan Proyek</span>
                        </Button>
                      </div>
                      {projectSavedNotice && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Tautan proyek berhasil tersimpan! Materi otomatis tercatat selesai.</span>
                        </p>
                      )}
                      {projectSubmittedUrl && !projectSavedNotice && (
                        <p className="text-xs text-stone-500">
                          Tautan terkirim saat ini:{" "}
                          <a
                            href={projectSubmittedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 underline font-mono"
                          >
                            {projectSubmittedUrl}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* footer tindakan */}
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => toggleLessonCompletion(lessonKey)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isCompleted
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        isCompleted ? "text-emerald-600 fill-emerald-600 text-white" : "text-stone-400"
                      }`}
                    />
                    <span>{isCompleted ? "Materi Selesai (Klik untuk Batal)" : "Tandai Materi Selesai"}</span>
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveLessonModal(null)}
                    className="text-xs"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ================= LIGHTBOX PREVIEW RECEIPT ================= */}
      {previewReceiptUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewReceiptUrl(null)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-3xl max-w-lg w-full p-4 space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Bukti Transfer Pembayaran
              </h4>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-950 flex items-center justify-center">
              <img
                src={previewReceiptUrl}
                alt="Bukti Transfer"
                className="max-h-[70vh] object-contain w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookOpenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export const StudentCourseDetailClient = DetailKursusPesertaClient;
