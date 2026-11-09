"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageCircle,
  Upload,
  Star,
  Award,
  ExternalLink,
  BookOpen,
  Users,
  Eye,
  Check,
  X,
  Play,
  FileText,
  Code,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Copy,
  Trophy,
  ZoomIn,
  Share2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { BannerKursusPlaceholder } from "@/components/ui/BannerKursusPlaceholder";
import { ImagePreviewModal } from "@/components/ui/ModalPreviewGambar";
import { KursusHeroHeader } from "@/components/course-detail/KursusHeroHeader";
import { NavTabKursus, CourseTabKey } from "@/components/course-detail/NavTabKursus";
import { TabTentangKursus } from "@/components/course-detail/TabTentangKursus";
import { TabSilabusKursus } from "@/components/course-detail/TabSilabusKursus";
import { TabUlasanKursus } from "@/components/course-detail/TabUlasanKursus";
import { StudentEnrollmentItem } from "../DashboardPesertaClient";
import {
  parseCourseCurriculum,
  getCourseReviewsData,
  CourseReviewItem,
  CourseModuleItem,
} from "@/utils/courseCurriculumParser";

interface PaymentAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_active: boolean;
}

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// ekstrak judul topik bersih dan ringkas tanpa deskripsi panjang
function cleanTopicTitle(rawTitle?: string, content?: string): string {
  if (!rawTitle) return "Materi Pembelajaran";

  if (content && typeof content === "string") {
    let unescapedContent = content;
    if (unescapedContent.includes("&lt;h")) {
      unescapedContent = decodeHtmlEntities(unescapedContent);
    }
    const headingMatch = unescapedContent.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
    if (headingMatch && headingMatch[1]) {
      const headingText = decodeHtmlEntities(
        headingMatch[1].replace(/<[^>]+>/g, "").trim()
      );
      if (headingText.length > 2 && headingText.length <= 95) {
        return headingText;
      }
    }
  }

  let text = decodeHtmlEntities(rawTitle.trim());
  text = text.replace(/<[^>]+>/g, "").trim();

  if (text.length <= 75) return text;

  const firstLine = text.split(/[\r\n]+/)[0].trim();
  if (firstLine.length <= 75 && firstLine.length > 3) return firstLine;

  const matchNumbered = text.match(/^(\d+[\.\:\)]\s*[^.\n\r?!●:]{3,65})/);
  if (matchNumbered && matchNumbered[1]) {
    return matchNumbered[1].trim();
  }

  const slice = text.substring(0, 65);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 25 ? slice.substring(0, lastSpace) : slice).trim() + "...";
}

export function DetailKursusPesertaClient({ enrollmentId }: { enrollmentId: string }) {
  const [enrollment, setEnrollment] = React.useState<StudentEnrollmentItem | null>(null);
  const [paymentAccounts, setPaymentAccounts] = React.useState<PaymentAccount[]>([]);
  const [views, setViews] = React.useState(0);
  const [dbReviews, setDbReviews] = React.useState<CourseReviewItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // tab navigasi aktif
  const [activeTab, setActiveTab] = React.useState<CourseTabKey>("about");

  // modal pratinjau zoom gambar banner
  const [previewImage, setPreviewImage] = React.useState<{
    isOpen: boolean;
    url: string | null;
    title: string;
  }>({
    isOpen: false,
    url: null,
    title: "",
  });

  // modal upload bukti pembayaran
  const [isProofModalOpen, setIsProofModalOpen] = React.useState(false);
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [proofPreview, setProofPreview] = React.useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = React.useState(false);
  const [proofError, setProofError] = React.useState<string | null>(null);

  // lightbox pratinjau bukti transfer yang tersimpan
  const [previewReceiptUrl, setPreviewReceiptUrl] = React.useState<string | null>(null);

  // status mount komponen peramban
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // kunci scroll halaman saat modal aktif
  React.useEffect(() => {
    if (isProofModalOpen || previewReceiptUrl || previewImage.isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isProofModalOpen, previewReceiptUrl, previewImage.isOpen]);

  // status ulasan dan penilaian
  const [ratingValue, setRatingValue] = React.useState<number>(5);
  const [hoverRating, setHoverRating] = React.useState<number>(0);
  const [reviewText, setReviewText] = React.useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);
  const [reviewError, setReviewError] = React.useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = React.useState(false);

  // umpan balik salin
  const [copiedAccountIndex, setCopiedAccountIndex] = React.useState<number | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // modul yang sedang terbuka di accordion silabus
  const [openModules, setOpenModules] = React.useState<Record<number, boolean>>({ 0: true, 1: true });

  // daftar kunci topik yang telah diselesaikan
  const [completedLessons, setCompletedLessons] = React.useState<string[]>([]);

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
      if (typeof data.views === "number") {
        setViews(data.views);
      }
      if (Array.isArray(data.reviews)) {
        setDbReviews(data.reviews);
      }
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

  // sinkronkan progres belajar dari penyimpanan lokal
  React.useEffect(() => {
    if (!enrollment?.id) return;
    try {
      const savedProgress = localStorage.getItem(`skillora_progress_${enrollment.id}`);
      if (savedProgress) {
        setCompletedLessons(JSON.parse(savedProgress));
      }
    } catch {
      // non blocking
    }
  }, [enrollment?.id]);

  const course = enrollment?.course;

  // hitung harga dan diskon
  const priceNum = Number(course?.price || 0);
  const discountPercent = Number(course?.discount_percent || 0);
  const hasDiscount = discountPercent > 0 && priceNum > 0;
  const finalPrice = hasDiscount
    ? Math.round(priceNum * (1 - discountPercent / 100))
    : priceNum;

  // kurikulum silabus
  const curriculum = React.useMemo(() => {
    if (!course) {
      return {
        level: "Tingkat Pemula",
        category: "Kursus Mandiri",
        estimatedHours: 10,
        totalModules: 0,
        totalDuration: "0 jam",
        targetLearning: [],
        instructor: { name: "", title: "", avatarUrl: "", bio: "" },
        prerequisites: [],
        gradingScheme: { moduleWeight: "", quizWeight: "", projectWeight: "", passingScore: 70 },
        modules: [],
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parseCourseCurriculum(course as any, course.content);
  }, [course]);

  // data ulasan
  const reviewsData = React.useMemo(() => {
    if (!course) {
      return {
        reviews: [],
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recommendPercentage: 100,
      };
    }
    return getCourseReviewsData(course.slug || course.title, dbReviews);
  }, [course, dbReviews]);

  const curriculumModules: CourseModuleItem[] = React.useMemo(() => {
    return curriculum?.modules || [];
  }, [curriculum]);

  const totalLessons = React.useMemo(() => {
    return curriculumModules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  }, [curriculumModules]);

  const completedCount = React.useMemo(() => {
    return completedLessons.length;
  }, [completedLessons]);

  const progressPercentage =
    totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

  const handleCopyAccountNumber = (accNumber: string, idx: number) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(accNumber);
      setCopiedAccountIndex(idx);
      setTimeout(() => setCopiedAccountIndex(null), 2500);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProofError("Ukuran file maksimal 5MB.");
      return;
    }
    setProofFile(file);
    setProofError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async () => {
    if (!proofFile && !proofPreview) {
      setProofError("Pilih file bukti transfer terlebih dahulu.");
      return;
    }
    if (!enrollment?.id) return;

    setIsUploadingProof(true);
    setProofError(null);

    try {
      let finalUrl = proofPreview || "";
      if (proofFile) {
        const formData = new FormData();
        formData.append("file", proofFile);
        formData.append("folder", "payment-proofs");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Gagal mengunggah file.");
        }
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
      if (!updateRes.ok) {
        throw new Error(updateData.error || "Gagal menyimpan bukti transfer.");
      }

      setIsProofModalOpen(false);
      setProofFile(null);
      setProofPreview(null);
      fetchDetail();
    } catch (err: unknown) {
      setProofError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!enrollment?.id) return;
    if (!reviewText.trim()) {
      setReviewError("Harap tuliskan ulasan singkat pengalaman belajar Anda.");
      return;
    }
    setIsSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(false);

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
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim ulasan.");
      }
      setReviewSuccess(true);
      fetchDetail();
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

  const isApproved = enrollment?.status === "approved";
  const isPending = enrollment?.status === "pending_payment";
  const isRejected = enrollment?.status === "rejected";

  const shareWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Yuk belajar kursus "${course?.title || "Skillora"}" di Skillora! Modul lengkap, belajar mandiri, dan dapat sertifikat resmi: ${
      typeof window !== "undefined" ? window.location.href : ""
    }`
  )}`;

  // kondisi loading menggunakan kerangka skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-[#0C0A09] text-stone-900 dark:text-stone-100 py-6 sm:py-10 transition-colors animate-in fade-in duration-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
          <div className="space-y-4">
            <div className="w-36 h-8 rounded-xl bg-stone-200 dark:bg-stone-800" />
            <div className="space-y-3">
              <div className="w-2/3 h-10 rounded-xl bg-stone-200 dark:bg-stone-800" />
              <div className="w-full max-w-2xl h-5 rounded-lg bg-stone-200 dark:bg-stone-800" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-8 space-y-6">
              <div className="w-full h-12 rounded-2xl bg-stone-200 dark:bg-stone-800" />
              <div className="p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 space-y-4">
                <div className="w-48 h-6 rounded-md bg-stone-200 dark:bg-stone-800" />
                <div className="w-full h-4 rounded bg-stone-200 dark:bg-stone-800" />
                <div className="w-4/5 h-4 rounded bg-stone-200 dark:bg-stone-800" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-full h-20 rounded-2xl bg-stone-200/70 dark:bg-stone-800/60" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="w-full h-[450px] rounded-3xl bg-stone-200 dark:bg-stone-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // kondisi error
  if (error || !enrollment || !course) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-[#0C0A09] text-stone-900 dark:text-stone-100 py-12 px-4 transition-colors flex items-center justify-center">
        <div className="text-center p-8 max-w-md w-full space-y-4 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              Gagal Memuat Kursus
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              {error || "Pendaftaran kursus tidak ditemukan."}
            </p>
          </div>
          <Link href="/kursus-saya" className="inline-block pt-2">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Kursus Saya</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0C0A09] text-stone-900 dark:text-stone-100 py-6 sm:py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* tata letak grid dua kolom identik dengan landing page */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* kolom kiri header judul dan navigasi konten tab */}
          <main className="lg:col-span-8 space-y-8">
            <KursusHeroHeader
              title={course.title}
              shortDescription={course.description || ""}
              backHref="/kursus-saya"
              backText="Kembali ke Kursus Saya"
            />

            <div className="space-y-6">
              <div className="sticky top-16 z-20 bg-stone-50/95 dark:bg-[#0C0A09]/95 backdrop-blur-md pt-2">
                <NavTabKursus
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  totalModules={curriculum.totalModules}
                  totalReviews={reviewsData.totalReviews}
                />
              </div>

              {/* konten sesuai tab aktif */}
              <div className="pt-2">
                {activeTab === "about" && (
                  <div data-aos="fade-in" className="animate-in fade-in duration-300">
                    <TabTentangKursus
                      courseTitle={course.title}
                      courseContentHtml={course.content}
                      curriculum={curriculum}
                      whatsappGroupUrl={course.whatsapp_group_url}
                    />
                  </div>
                )}

                {activeTab === "syllabus" && (
                  <div data-aos="fade-in" className="animate-in fade-in duration-300">
                    {isApproved ? (
                      <div className="space-y-6">
                        {/* ringkasan progres belajar mahasiswa dengan tombol kerjakan kursus */}
                        <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xs space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                <Trophy className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                                  <span>Kemajuan Belajar Anda</span>
                                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                                    {progressPercentage}% Selesai
                                  </span>
                                </h3>
                                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                  {completedCount} dari {totalLessons} materi pembelajaran telah diselesaikan
                                </p>
                              </div>
                            </div>

                            <Link href={`/kursus-saya/${course.slug || enrollment.id}/belajar`}>
                              <Button
                                variant="primary"
                                size="sm"
                                className="gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white text-xs font-bold py-2.5 px-4 rounded-xl shrink-0"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Kerjakan Kursus</span>
                              </Button>
                            </Link>
                          </div>

                          <div className="w-full h-2.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* silabus terstruktur mengarah ke ruang belajar mandiri */}
                        <div className="space-y-3">
                          {curriculumModules.map((mod, modIdx) => {
                            const isOpen = !!openModules[modIdx];
                            return (
                              <div
                                key={modIdx}
                                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                  isOpen
                                    ? "border-emerald-500/40 bg-white dark:bg-stone-900 shadow-xs"
                                    : "border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 hover:border-stone-300 dark:hover:border-stone-700"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenModules((prev) => ({
                                      ...prev,
                                      [modIdx]: !prev[modIdx],
                                    }))
                                  }
                                  className="w-full p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 text-left cursor-pointer"
                                  aria-expanded={isOpen}
                                >
                                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                                    <div
                                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 transition-colors ${
                                        isOpen
                                          ? "bg-[#0F3E2E] text-white dark:bg-emerald-600 shadow-2xs"
                                          : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                                      }`}
                                    >
                                      {String(mod.moduleNumber || modIdx + 1).padStart(2, "0")}
                                    </div>
                                    <div className="space-y-0.5">
                                      <h3 className="text-sm sm:text-base font-bold tracking-tight text-stone-900 dark:text-stone-100">
                                        {mod.title}
                                      </h3>
                                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                                        {mod.description}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                      {mod.lessons?.length || 0} Materi
                                    </span>
                                    <div className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
                                      {isOpen ? (
                                        <ChevronUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                      ) : (
                                        <ChevronDown className="w-5 h-5" />
                                      )}
                                    </div>
                                  </div>
                                </button>

                                {isOpen && mod.lessons && mod.lessons.length > 0 && (
                                  <div className="border-t border-stone-100 dark:border-stone-800/80 divide-y divide-stone-100 dark:divide-stone-800/60 bg-stone-50/50 dark:bg-stone-900/30">
                                    {mod.lessons.map((les, lesIdx) => {
                                      const lessonKey = `mod-${modIdx}-les-${lesIdx}`;
                                      const isCompleted = completedLessons.includes(lessonKey);
                                      const topicHref = `/kursus-saya/${course.slug || enrollment.id}/belajar/${modIdx}/${lesIdx}`;

                                      return (
                                        <div
                                          key={lesIdx}
                                          className="p-3.5 sm:p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-stone-100/60 dark:hover:bg-stone-800/40 transition-colors"
                                        >
                                          <Link
                                            href={topicHref}
                                            className="flex items-center gap-3 flex-1 min-w-0 group"
                                          >
                                            <div className="p-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0 group-hover:border-emerald-500 transition-colors">
                                              {les.type === "practice" ? (
                                                <Code className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                              ) : les.type === "quiz" ? (
                                                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                              ) : les.type === "project" ? (
                                                <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                              ) : (
                                                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                              )}
                                            </div>

                                            <div className="min-w-0">
                                              <p className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                                {cleanTopicTitle(les.title, les.content)}
                                              </p>
                                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-400">
                                                <span>{les.duration || "15 menit"}</span>
                                                <span>&bull;</span>
                                                <span className="capitalize">{les.type}</span>
                                              </div>
                                            </div>
                                          </Link>

                                          <div className="flex items-center gap-2 shrink-0">
                                            {isCompleted && (
                                              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                <span>Selesai</span>
                                              </span>
                                            )}

                                            <Link href={topicHref}>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 text-xs py-1.5 px-3 rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                                              >
                                                <span>Kerjakan</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                              </Button>
                                            </Link>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <TabSilabusKursus
                        modules={curriculum.modules}
                        isEnrolled={false}
                        onEnrollClick={() => setIsProofModalOpen(true)}
                      />
                    )}
                  </div>
                )}

                {activeTab === "reviews" && (
                  <div data-aos="fade-in" className="animate-in fade-in duration-300 space-y-8">
                    <TabUlasanKursus
                      reviews={reviewsData.reviews}
                      averageRating={reviewsData.averageRating}
                      totalReviews={reviewsData.totalReviews}
                      ratingDistribution={reviewsData.ratingDistribution}
                      recommendPercentage={reviewsData.recommendPercentage}
                    />

                    {/* formulir ulasan untuk mahasiswa yang telah disetujui */}
                    {isApproved && (
                      <div className="p-6 sm:p-7 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 backdrop-blur-md shadow-xs space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span>
                              {enrollment.review_rating ? "Ulasan Anda" : "Beri Ulasan Kursus"}
                            </span>
                          </h3>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            Bagikan pengalaman Anda mempelajari kursus ini untuk membantu mahasiswa lainnya.
                          </p>
                        </div>

                        {reviewSuccess && (
                          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                            <span>Ulasan Anda berhasil disimpan. Terima kasih atas partisipasi Anda!</span>
                          </div>
                        )}

                        {reviewError && (
                          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
                            {reviewError}
                          </div>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-500 font-medium">Rating:</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRatingValue(star)}
                                  onMouseEnter={() => setHoverRating(star)}
                                  onMouseLeave={() => setHoverRating(0)}
                                  className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                                >
                                  <Star
                                    className={`w-5 h-5 ${
                                      star <= (hoverRating || ratingValue)
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-stone-300 dark:text-stone-700"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                            <span className="text-xs font-bold text-stone-700 dark:text-stone-300 ml-1">
                              {ratingValue} dari 5 Bintang
                            </span>
                          </div>

                          <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Tulis kesan, pesan, dan manfaat yang Anda peroleh dari kursus ini..."
                            rows={3}
                            className="w-full p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={handleSubmitReview}
                              disabled={isSubmittingReview || !reviewText.trim()}
                              className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs gap-1.5"
                            >
                              <span>
                                {isSubmittingReview
                                  ? "Menyimpan..."
                                  : enrollment.review_rating
                                  ? "Perbarui Ulasan"
                                  : "Kirim Ulasan"}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* kolom kanan action sidebar dengan card utama pendaftaran */}
          <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-6">
            <div className="space-y-6 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md p-6 sm:p-7 shadow-xs">
              {/* banner kursus dengan zoom preview */}
              {course.image_url ? (
                <div
                  onClick={() =>
                    setPreviewImage({
                      isOpen: true,
                      url: course.image_url!,
                      title: course.title,
                    })
                  }
                  className="relative w-full h-44 sm:h-48 rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800/80 bg-stone-100 dark:bg-stone-800 cursor-pointer group shadow-2xs"
                  title="Klik untuk memperbesar banner"
                >
                  <SmoothImage
                    src={course.image_url}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    containerClassName="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 text-xs font-medium">
                    <ZoomIn className="w-4 h-4" />
                    <span>Perbesar Gambar</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-44 sm:h-48 rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800/80">
                  <BannerKursusPlaceholder title={course.title} slug={course.slug} />
                </div>
              )}

              {/* harga kursus mandiri */}
              <div className="space-y-2 pb-4 border-b border-stone-100 dark:border-stone-800/60">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  BIAYA KURSUS MANDIRI
                </span>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-3xl sm:text-4xl font-black text-[#0F3E2E] dark:text-emerald-400 tracking-tight">
                    {finalPrice === 0 ? "Gratis" : `Rp ${finalPrice.toLocaleString("id-ID")}`}
                  </span>
                  {hasDiscount && (
                    <span className="text-xs sm:text-sm text-stone-400 line-through font-normal">
                      Rp {priceNum.toLocaleString("id-ID")}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  Tanpa biaya langganan bulanan. Akses materi selamanya & dukungan tanya jawab mentor.
                </p>
              </div>

              {/* card utama pendaftaran mahasiswa di sisi kanan */}
              <div className="space-y-3">
                {isApproved && (
                  <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Pendaftaran Telah Disetujui!</span>
                      </span>
                      <span className="text-[10px] font-semibold text-stone-400">
                        {formatDateIndo(enrollment.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                      Selamat, pendaftaran Anda aktif. Anda dapat langsung mengerjakan modul kursus dan berdiskusi bersama mentor di grup kelas.
                    </p>

                    {/* tombol utama kerjakan kursus */}
                    <Link
                      href={`/kursus-saya/${course.slug || enrollment.id}/belajar`}
                      className="block w-full"
                    >
                      <Button
                        size="lg"
                        className="w-full bg-[#0F3E2E] hover:bg-[#15523d] text-white gap-2 font-bold py-3.5 rounded-xl shadow-xs text-xs sm:text-sm"
                      >
                        <Play className="w-4 h-4 fill-emerald-300 text-emerald-300" />
                        <span>Kerjakan Kursus</span>
                        <ArrowRight className="w-4 h-4 text-emerald-300 ml-auto" />
                      </Button>
                    </Link>

                    {course.whatsapp_group_url && (
                      <a
                        href={course.whatsapp_group_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                      >
                        <Button
                          variant="outline"
                          size="md"
                          className="w-full gap-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-white/70 dark:bg-stone-900/70 hover:bg-emerald-500/10 rounded-xl py-2.5 text-xs font-semibold"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Gabung WhatsApp Group Kelas</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}

                    {enrollment.certificate_url && (
                      <a
                        href={enrollment.certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                      >
                        <Button
                          variant="outline"
                          size="md"
                          className="w-full gap-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl py-2.5 text-xs font-bold"
                        >
                          <Award className="w-4 h-4 text-emerald-600" />
                          <span>Unduh E-Sertifikat Resmi</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                )}

                {isPending && (
                  <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Menunggu Validasi Admin</span>
                      </span>
                      <span className="text-[10px] font-semibold text-stone-400">
                        {formatDateIndo(enrollment.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                      {enrollment.payment_proof_url
                        ? "Bukti pembayaran telah diunggah. Admin sedang memverifikasi pendaftaran Anda."
                        : "Segera lakukan transfer sesuai biaya kursus dan unggah bukti transfer agar pendaftaran segera disetujui."}
                    </p>

                    {enrollment.payment_proof_url && (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-amber-500/20">
                        <div
                          onClick={() => setPreviewReceiptUrl(enrollment.payment_proof_url)}
                          className="relative w-12 h-12 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 shrink-0 cursor-pointer group"
                          title="Klik untuk memperbesar bukti transfer"
                        >
                          <SmoothImage
                            src={enrollment.payment_proof_url}
                            alt="Bukti Transfer"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block truncate">
                            Bukti Transfer Terunggah
                          </span>
                          <span className="text-[11px] text-stone-400">Menunggu konfirmasi</span>
                        </div>
                      </div>
                    )}

                    <Button
                      size="lg"
                      onClick={() => setIsProofModalOpen(true)}
                      className="w-full bg-[#0F3E2E] hover:bg-[#15523d] text-white gap-2 font-bold py-3.5 rounded-xl shadow-xs text-xs"
                    >
                      <Upload className="w-4 h-4 text-emerald-300" />
                      <span>
                        {enrollment.payment_proof_url
                          ? "Ganti Bukti Transfer"
                          : "Unggah Bukti Transfer Sekarang"}
                      </span>
                    </Button>

                    {/* rincian rekening transfer resmi */}
                    {paymentAccounts.length > 0 && (
                      <div className="pt-2 border-t border-amber-500/20 space-y-2">
                        <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">
                          Rekening Pembayaran Resmi:
                        </span>
                        <div className="space-y-2">
                          {paymentAccounts.map((acc, idx) => (
                            <div
                              key={acc.id}
                              className="p-2.5 rounded-xl bg-white/90 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                                  {acc.bank_name}
                                </span>
                                <p className="text-xs font-mono font-bold text-[#0F3E2E] dark:text-emerald-400 tracking-wider">
                                  {acc.account_number}
                                </p>
                                <p className="text-[10px] text-stone-400 truncate">
                                  a.n. {acc.account_holder}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyAccountNumber(acc.account_number, idx)}
                                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors shrink-0"
                                title="Salin nomor rekening"
                              >
                                {copiedAccountIndex === idx ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isRejected && (
                  <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-500/5 space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>Pendaftaran Ditolak</span>
                      </span>
                    </div>

                    {enrollment.rejection_reason && (
                      <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                        <span className="font-bold block">Alasan Penolakan:</span>
                        <p className="leading-relaxed">{enrollment.rejection_reason}</p>
                      </div>
                    )}

                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                      Silakan perbaiki data pembayaran dan unggah ulang bukti transfer baru yang valid.
                    </p>

                    <Button
                      size="lg"
                      onClick={() => setIsProofModalOpen(true)}
                      className="w-full bg-rose-700 hover:bg-rose-800 text-white gap-2 font-bold py-3.5 rounded-xl shadow-xs text-xs"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Unggah Ulang Bukti Transfer</span>
                    </Button>
                  </div>
                )}

                {/* tombol bantuan whatsapp admin */}
                <a
                  href={`https://wa.me/${adminPhone}?text=${encodeURIComponent(
                    `Halo Admin Skillora, saya ingin bertanya mengenai status kursus saya: ${course.title}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full gap-2 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl py-2.5 text-xs font-semibold"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Tanya Admin via WhatsApp</span>
                  </Button>
                </a>
              </div>

              {/* fakta ringkas kursus identik dengan landing page */}
              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800/60">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block pb-1">
                  FAKTA RINGKAS KURSUS:
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-stone-100/60 dark:border-stone-800/40">
                    <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                      <span>Total Modul</span>
                    </span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {curriculum.totalModules > 0
                        ? `${curriculum.totalModules} Modul`
                        : "Segera Hadir"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-stone-100/60 dark:border-stone-800/40">
                    <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <span>Jumlah Peserta</span>
                    </span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {course.participant_count || 0} Peserta
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-stone-100/60 dark:border-stone-800/40">
                    <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>Rating Peserta</span>
                    </span>
                    {reviewsData.totalReviews > 0 ? (
                      <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                        <span>{reviewsData.averageRating}</span>
                        <span className="text-stone-400 font-normal">
                          ({reviewsData.totalReviews} ulasan)
                        </span>
                      </span>
                    ) : (
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        Belum ada ulasan
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-stone-100/60 dark:border-stone-800/40">
                    <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-stone-400" />
                      <span>Viewer Kursus</span>
                    </span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {views} Views
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-stone-100/60 dark:border-stone-800/40">
                    <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-stone-400" />
                      <span>Sertifikat Kelulusan</span>
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Ya, Tersedia
                    </span>
                  </div>
                </div>
              </div>

              {/* fasilitas kursus yang didapatkan */}
              <div className="p-4 rounded-2xl bg-stone-50/80 dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-800/80 space-y-2.5">
                <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">
                  Fasilitas Kursus yang Didapatkan:
                </span>
                <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Akses materi belajar mandiri selamanya</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Latihan praktik & kuis pemahaman tiap bab</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Pendampingan mentor via WhatsApp Group</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>E-Sertifikat kelulusan resmi terverifikasi</span>
                  </li>
                </ul>
              </div>

              {/* bagikan kelas */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800/60 flex items-center justify-between gap-2">
                <span className="text-xs text-stone-400 font-medium">Bagikan kelas:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
                    title="Salin tautan kursus"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={shareWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                    title="Bagikan ke WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* modal preview zoom banner gambar */}
      <ImagePreviewModal
        isOpen={previewImage.isOpen}
        imageUrl={previewImage.url}
        title={previewImage.title}
        onClose={() => setPreviewImage({ isOpen: false, url: null, title: "" })}
      />

      {/* modal preview zoom bukti transfer */}
      <ImagePreviewModal
        isOpen={Boolean(previewReceiptUrl)}
        imageUrl={previewReceiptUrl}
        title="Bukti Transfer Pembayaran"
        onClose={() => setPreviewReceiptUrl(null)}
      />

      {/* modal upload bukti transfer pembayaran */}
      {mounted &&
        isProofModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setIsProofModalOpen(false)} />
            <div className="bg-white dark:bg-[#0C0A09] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl relative z-10">
              <button
                type="button"
                onClick={() => setIsProofModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                  Upload Bukti Transfer Pembayaran
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Kursus: <span className="font-medium text-stone-700 dark:text-stone-300">{course.title}</span> &bull; Total:{" "}
                  <span className="font-bold text-[#0F3E2E] dark:text-emerald-400">
                    {finalPrice === 0 ? "Gratis" : `Rp ${finalPrice.toLocaleString("id-ID")}`}
                  </span>
                </p>
              </div>

              {/* daftar rekening tujuan */}
              {paymentAccounts.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
                  <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300 block">
                    Transfer ke Rekening Resmi Skillora:
                  </span>
                  <div className="space-y-1.5">
                    {paymentAccounts.map((acc, idx) => (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800/50"
                      >
                        <div>
                          <span className="font-semibold">{acc.bank_name}: </span>
                          <span className="font-mono font-bold text-[#0F3E2E] dark:text-emerald-400">
                            {acc.account_number}
                          </span>
                          <span className="text-[10px] text-stone-400 ml-1">({acc.account_holder})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAccountNumber(acc.account_number, idx)}
                          className="text-[11px] text-emerald-600 hover:underline font-semibold cursor-pointer"
                        >
                          {copiedAccountIndex === idx ? "Tersalin!" : "Salin"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* area upload file */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                  Pilih Foto / Screenshot Bukti Transfer
                </label>

                {proofPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 max-h-48 flex items-center justify-center bg-stone-100 dark:bg-stone-800">
                    <img
                      src={proofPreview}
                      alt="Preview Bukti"
                      className="max-h-48 w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProofFile(null);
                        setProofPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 rounded-2xl cursor-pointer bg-stone-50/50 dark:bg-stone-900/30 transition-colors">
                    <Upload className="w-8 h-8 text-stone-400 mb-2" />
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Klik untuk memilih file gambar
                    </span>
                    <span className="text-[10px] text-stone-400 mt-1">JPG, PNG, atau WEBP (Maks 5 MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}

                {proofError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{proofError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsProofModalOpen(false)}
                  disabled={isUploadingProof}
                  className="text-xs"
                >
                  <span>Batal</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitProof}
                  disabled={isUploadingProof || (!proofFile && !proofPreview)}
                  className="gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white text-xs"
                >
                  {isUploadingProof ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan & Kirim Bukti</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export const StudentCourseDetailClient = DetailKursusPesertaClient;
