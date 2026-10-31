"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  BookOpen,
  Edit2,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  Star,
  Users,
  MessageCircle,
  Code,
  FileText,
  HelpCircle,
  Award,
  MoveUp,
  MoveDown,
  RefreshCw,
  Target,
  Layers,
  Save,
  Building2,
  Search,
  Calendar,
  ChevronRight,
  AtSign,
  Phone,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { ConfirmModal, AlertModal } from "@/components/ui/ModalKonfirmasi";
import {
  CourseLessonItem,
  CourseModuleItem,
} from "@/utils/courseCurriculumParser";

interface CourseParticipant {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  created_at: string;
  whatsapp_number?: string | null;
  certificate_url?: string | null;
  review_rating?: number | null;
  review_text?: string | null;
  reviewed_at?: string | null;
  profiles?: {
    id?: string;
    full_name?: string | null;
    username?: string | null;
    school_origin?: string | null;
    avatar_url?: string | null;
    whatsapp_number?: string | null;
    role?: string | null;
  } | null;
}

export default function AdminCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [loading, setLoading] = React.useState(true);
  const [course, setCourse] = React.useState<any>(null);
  const [syllabus, setSyllabus] = React.useState<CourseModuleItem[]>([]);
  const [targetLearning, setTargetLearning] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  const [moduleModal, setModuleModal] = React.useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    moduleIndex: number | null;
    title: string;
    description: string;
    isPreview: boolean;
    lessons: CourseLessonItem[];
  }>({
    isOpen: false,
    mode: "create",
    moduleIndex: null,
    title: "",
    description: "",
    isPreview: false,
    lessons: [],
  });

  const [newLessonData, setNewLessonData] = React.useState<{
    title: string;
    type: CourseLessonItem["type"];
  }>({
    title: "",
    type: "reading",
  });

  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    isOpen: boolean;
    moduleIndex: number | null;
    moduleTitle: string;
  }>({
    isOpen: false,
    moduleIndex: null,
    moduleTitle: "",
  });

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

  const [participants, setParticipants] = React.useState<CourseParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = React.useState(true);
  const [participantSearch, setParticipantSearch] = React.useState("");
  const [participantPage, setParticipantPage] = React.useState(1);
  const PARTICIPANTS_PER_PAGE = 8;

  // muat data kursus
  const loadCourseData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data kursus.");

      const found = (data.courses || []).find((c: { id: string }) => c.id === courseId);
      if (!found) {
        throw new Error("Kursus dengan ID tersebut tidak ditemukan.");
      }

      setCourse(found);
      setTargetLearning(Array.isArray(found.target_learning) ? found.target_learning : []);

      if (Array.isArray(found.syllabus) && found.syllabus.length > 0) {
        setSyllabus(
          found.syllabus.map((m: any, idx: number) => ({
            moduleNumber: m.moduleNumber || m.module_number || idx + 1,
            title: m.title || `Modul ${idx + 1}`,
            description: m.description || "",
            duration: m.duration || "45 Menit",
            lessons: Array.isArray(m.lessons)
              ? m.lessons.map((l: any) => ({
                  title: l.title || "Topik Tanpa Judul",
                  type: l.type || "reading",
                  duration: l.duration || "15 Menit",
                  content: l.content || "",
                  video_url: l.video_url || "",
                  starter_code: l.starter_code || "",
                  instructions: l.instructions || "",
                  quiz_data: l.quiz_data || null,
                  project_data: l.project_data || null,
                }))
              : [],
            isPreview: typeof m.isPreview === "boolean" ? m.isPreview : idx < 2,
          }))
        );
      } else {
        setSyllabus([]);
      }
      setHasUnsavedChanges(false);
    } catch (err: unknown) {
      setAlertData({
        isOpen: true,
        title: "Gagal Memuat Kursus",
        message: err instanceof Error ? err.message : "Terjadi kesalahan server.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  // muat daftar peserta kursus yang telah disetujui
  const loadParticipants = React.useCallback(async () => {
    setLoadingParticipants(true);
    try {
      const res = await fetch(`/api/admin/enrollments?course_id=${courseId}&status=approved`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.enrollments)) {
        setParticipants(data.enrollments);
      }
    } catch (err) {
      console.error("Gagal memuat peserta kursus:", err);
    } finally {
      setLoadingParticipants(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    if (courseId) {
      loadCourseData();
      loadParticipants();
    }
  }, [courseId, loadCourseData, loadParticipants]);

  // simpan silabus ke database
  const handleSaveSyllabus = async (customSyllabus?: CourseModuleItem[]) => {
    const listToSave = customSyllabus || syllabus;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: courseId,
          syllabus: listToSave.map((m, idx) => ({
            moduleNumber: idx + 1,
            title: m.title,
            description: m.description,
            duration: m.duration || "45 Menit",
            lessons: (m.lessons || []).map((l) => ({
              title: l.title,
              type: l.type,
              duration: l.duration || "15 Menit",
              ...(l.content ? { content: l.content } : {}),
              ...(l.video_url ? { video_url: l.video_url } : {}),
              ...(l.starter_code ? { starter_code: l.starter_code } : {}),
              ...(l.instructions ? { instructions: l.instructions } : {}),
              ...(l.quiz_data ? { quiz_data: l.quiz_data } : {}),
              ...(l.project_data ? { project_data: l.project_data } : {}),
            })),
            isPreview: !!m.isPreview,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan silabus.");

      setHasUnsavedChanges(false);
      setAlertData({
        isOpen: true,
        title: "Silabus Berhasil Disimpan",
        message: `Total ${listToSave.length} modul silabus telah diperbarui dan langsung aktif di halaman detail kursus.`,
        type: "success",
      });
    } catch (err: unknown) {
      setAlertData({
        isOpen: true,
        title: "Gagal Menyimpan Silabus",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // buka modal tambah modul
  const handleOpenCreateModal = () => {
    setModuleModal({
      isOpen: true,
      mode: "create",
      moduleIndex: null,
      title: "",
      description: "",
      isPreview: syllabus.length < 2,
      lessons: [],
    });
    setNewLessonData({ title: "", type: "reading" });
  };

  // buka modal edit modul
  const handleOpenEditModal = (idx: number) => {
    const target = syllabus[idx];
    if (!target) return;

    setModuleModal({
      isOpen: true,
      mode: "edit",
      moduleIndex: idx,
      title: target.title,
      description: target.description,
      isPreview: !!target.isPreview,
      lessons: [...(target.lessons || [])],
    });
    setNewLessonData({ title: "", type: "reading" });
  };

  // simpan modal modul
  const handleSaveModuleModal = () => {
    if (!moduleModal.title.trim()) {
      alert("Judul modul wajib diisi.");
      return;
    }

    if (moduleModal.mode === "create") {
      const newMod: CourseModuleItem = {
        moduleNumber: syllabus.length + 1,
        title: moduleModal.title.trim(),
        description: moduleModal.description.trim(),
        duration: "45 Menit",
        lessons: moduleModal.lessons,
        isPreview: moduleModal.isPreview,
      };
      setSyllabus((prev) => [...prev, newMod]);
    } else if (moduleModal.mode === "edit" && moduleModal.moduleIndex !== null) {
      setSyllabus((prev) => {
        const copy = [...prev];
        copy[moduleModal.moduleIndex!] = {
          ...copy[moduleModal.moduleIndex!],
          title: moduleModal.title.trim(),
          description: moduleModal.description.trim(),
          isPreview: moduleModal.isPreview,
          lessons: moduleModal.lessons,
        };
        return copy;
      });
    }

    setHasUnsavedChanges(true);
    setModuleModal((prev) => ({ ...prev, isOpen: false }));
  };

  // tambah pelajaran di dalam modal
  const handleAddLessonInModal = () => {
    if (!newLessonData.title.trim()) return;
    setModuleModal((prev) => ({
      ...prev,
      lessons: [
        ...prev.lessons,
        {
          title: newLessonData.title.trim(),
          type: newLessonData.type,
        },
      ],
    }));
    setNewLessonData({ title: "", type: "reading" });
  };

  // hapus pelajaran di dalam modal
  const handleRemoveLessonInModal = (lIdx: number) => {
    setModuleModal((prev) => ({
      ...prev,
      lessons: prev.lessons.filter((_, i) => i !== lIdx),
    }));
  };

  // konfirmasi dan hapus modul
  const handleDeleteModule = () => {
    if (deleteConfirm.moduleIndex === null) return;
    setSyllabus((prev) => {
      const filtered = prev.filter((_, i) => i !== deleteConfirm.moduleIndex);
      return filtered.map((m, idx) => ({ ...m, moduleNumber: idx + 1 }));
    });
    setHasUnsavedChanges(true);
    setDeleteConfirm({ isOpen: false, moduleIndex: null, moduleTitle: "" });
  };

  // pindahkan urutan modul
  const handleMoveModule = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= syllabus.length) return;
    setSyllabus((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy.map((m, idx) => ({ ...m, moduleNumber: idx + 1 }));
    });
    setHasUnsavedChanges(true);
  };

  // icon helper untuk tipe materi
  const getLessonIcon = (type: CourseLessonItem["type"]) => {
    switch (type) {
      case "practice":
        return <Code className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case "quiz":
        return <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case "project":
        return <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case "reading":
      default:
        return <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  // helper nama tipe materi
  const getLessonTypeLabel = (type: CourseLessonItem["type"]) => {
    switch (type) {
      case "practice":
        return "Praktik Coding";
      case "quiz":
        return "Kuis Pemahaman";
      case "project":
        return "Proyek Akhir";
      case "reading":
      default:
        return "Bacaan & Teori";
    }
  };

  // helper embed video youtube
  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.trim().match(regExp);
      return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
    } catch {
      return null;
    }
  };

  // filter pencarian peserta
  const filteredParticipants = React.useMemo(() => {
    if (!participantSearch.trim()) return participants;
    const q = participantSearch.toLowerCase();
    return participants.filter((p) => {
      const name = (p.profiles?.full_name || "").toLowerCase();
      const uname = (p.profiles?.username || "").toLowerCase();
      const campus = (p.profiles?.school_origin || "").toLowerCase();
      const wa = (p.whatsapp_number || p.profiles?.whatsapp_number || "").toLowerCase();
      return name.includes(q) || uname.includes(q) || campus.includes(q) || wa.includes(q);
    });
  }, [participants, participantSearch]);

  const totalParticipantPages = Math.ceil(filteredParticipants.length / PARTICIPANTS_PER_PAGE) || 1;
  const paginatedParticipants = React.useMemo(() => {
    const start = (participantPage - 1) * PARTICIPANTS_PER_PAGE;
    return filteredParticipants.slice(start, start + PARTICIPANTS_PER_PAGE);
  }, [filteredParticipants, participantPage]);

  // ulasan dan testimoni dari peserta terdaftar
  const reviewsList = React.useMemo(() => {
    return participants.filter(
      (p) => (p.review_rating && p.review_rating > 0) || (p.review_text && p.review_text.trim() !== "")
    );
  }, [participants]);

  const effectiveReviewsCount = (course?.reviews_count && course.reviews_count > 0)
    ? course.reviews_count
    : reviewsList.length;

  const effectiveAverageRating = effectiveReviewsCount > 0
    ? (course?.average_rating || (reviewsList.reduce((acc, c) => acc + (c.review_rating || 5), 0) / effectiveReviewsCount).toFixed(1))
    : null;

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-stone-400 space-y-2">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
        <p>Memuat rincian kursus...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-12 text-center text-stone-500 space-y-3">
        <p>Kursus tidak ditemukan.</p>
        <Link href="/admin/courses">
          <Button variant="outline" size="sm">
            Kembali ke Daftar Kursus
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80 dark:border-stone-800/80">
        <div className="space-y-2">
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 shadow-2xs transition-all w-fit"
          >
            <ChevronLeft className="w-4 h-4 text-stone-500" />
            <span>Kembali ke Daftar Kursus</span>
          </Link>

          <div className="flex items-center gap-2.5 flex-wrap pt-1">
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              {course.title}
            </h1>
            <Badge
              variant={course.is_published ? "approved" : "neutral"}
              className="text-[11px] px-2.5 py-0.5 inline-flex items-center gap-1"
            >
              {course.is_published ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Publik</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 text-stone-400" />
                  <span>Draft</span>
                </>
              )}
            </Badge>
          </div>

          <p className="text-xs text-stone-500 font-mono">
            slug: <span className="text-emerald-700 dark:text-emerald-400 font-bold">/courses/{course.slug}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            href={`/courses/${course.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition-all shadow-2xs"
            title="Lihat Tampilan Publik Halaman Kursus"
          >
            <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
            <span>Halaman Publik</span>
          </Link>

          <Link
            href={`/admin/courses/${course.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs font-bold transition-all shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Informasi Kursus</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-stone-200/80 dark:border-stone-800/80">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Harga Kursus</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold">Rp</div>
          </div>
          <div className="text-xl font-black text-stone-900 dark:text-stone-100 mt-2">
            Rp {Number(course.price || 0).toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">Biaya belajar mandiri</p>
        </Card>

        <Card className="p-4 border-stone-200/80 dark:border-stone-800/80">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Pendaftar</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-stone-900 dark:text-stone-100 mt-2">
            {course.enrolled_count || 0} Peserta
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">
            {course.approved_count || 0} disetujui
          </p>
        </Card>

        <Card className="p-4 border-stone-200/80 dark:border-stone-800/80">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Rating Peserta</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          {effectiveReviewsCount > 0 && effectiveAverageRating ? (
            <>
              <div className="text-xl font-black text-stone-900 dark:text-stone-100 mt-2">
                {effectiveAverageRating}
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                dari {effectiveReviewsCount} ulasan peserta
              </p>
            </>
          ) : (
            <>
              <div className="text-xl font-black text-stone-900 dark:text-stone-100 mt-2">
                -
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Belum ada ulasan
              </p>
            </>
          )}
        </Card>

        <Card className="p-4 border-stone-200/80 dark:border-stone-800/80">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Viewer Kursus</span>
            <Eye className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-stone-900 dark:text-stone-100 mt-2">
            {course.views_count || 0} Views
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">Total kunjungan halaman</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <Card className="lg:col-span-5 p-5 border-stone-200/80 dark:border-stone-800/80 flex flex-col justify-between lg:h-[430px] space-y-4">
          <div className="space-y-4 overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Banner & Media
            </h3>

            {course.image_url ? (
              <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800">
                <SmoothImage
                  src={course.image_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full"
                />
              </div>
            ) : (
              <div className="w-full h-44 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-xs text-stone-400">
                Belum ada banner kursus
              </div>
            )}

            <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
              <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 block">
                Deskripsi Singkat
              </span>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-normal line-clamp-3">
                {course.description || "-"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800 shrink-0">
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 block">
              Grup WhatsApp Mentor
            </span>
            {course.whatsapp_group_url ? (
              <a
                href={course.whatsapp_group_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Tautan Grup Aktif</span>
              </a>
            ) : (
              <span className="text-xs text-stone-400 font-normal">Belum diatur</span>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-7 p-5 border-stone-200/80 dark:border-stone-800/80 flex flex-col lg:h-[430px] overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Target Hasil Pembelajaran ({targetLearning.length} Poin)
              </h3>
            </div>

            <Link
              href={`/admin/courses/${course.id}/edit`}
              className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
            >
              Ubah di Edit Kursus
            </Link>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1 space-y-2.5">
            {targetLearning.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-stone-400 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Belum Ada Target Pembelajaran
                  </h4>
                  <p className="max-w-xs text-stone-400 text-[11px]">
                    Belum ada target pembelajaran yang disimpan untuk kursus ini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-2">
                {targetLearning.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800/70 flex items-start gap-2.5 text-xs text-stone-800 dark:text-stone-200 leading-snug"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="border-stone-200/80 dark:border-stone-800/80 shadow-xs">
        <CardHeader className="p-5 sm:p-6 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-lg">Kurikulum & Silabus Kursus Mandiri</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Kelola rincian modul silabus dan topik materi pembelajaran yang tampil di tab &quot;Silabus&quot; pada detail kursus.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenCreateModal}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Modul</span>
            </Button>

            {hasUnsavedChanges && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveSyllabus()}
                disabled={isSaving}
                className="gap-1.5 text-xs bg-[#0F3E2E] hover:bg-[#15523d] text-white shadow-xs animate-pulse"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan Silabus"}</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-4">
          {syllabus.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Belum Ada Modul Silabus Khusus
                </h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Tambahkan modul dan materi silabus mandiri untuk kursus ini.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center">
                <Button size="sm" onClick={handleOpenCreateModal} className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Modul</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {syllabus.map((mod, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 p-4 sm:p-5 space-y-3.5 shadow-2xs hover:border-stone-300 dark:hover:border-stone-700 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center font-black text-xs shrink-0 border border-stone-200 dark:border-stone-700">
                        {String(idx + 1).padStart(2, "0")}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                            {mod.title}
                          </h4>
                          {mod.isPreview ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              Pratinjau Gratis Terbuka
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-200/60 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 border border-stone-300/40 dark:border-stone-700/40">
                              Terkunci untuk Peserta
                            </span>
                          )}
                        </div>
                        {mod.description && (
                          <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                            {mod.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveModule(idx, idx - 1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Geser Naik"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveModule(idx, idx + 1)}
                        disabled={idx === syllabus.length - 1}
                        className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Geser Turun"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(idx)}
                        className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold px-2"
                        title="Edit Modul & Materi"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            moduleIndex: idx,
                            moduleTitle: mod.title,
                          })
                        }
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Hapus Modul"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {mod.lessons && mod.lessons.length > 0 && (
                    <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block pb-0.5">
                        Daftar Topik Materi ({mod.lessons.length} Topik)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mod.lessons.map((lesson, lIdx) => (
                          <div
                            key={lIdx}
                            className="p-2.5 sm:p-3 rounded-xl bg-stone-50/80 dark:bg-stone-900/40 border border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between gap-3 text-xs text-stone-800 dark:text-stone-200 shadow-2xs hover:border-stone-300 dark:hover:border-stone-700 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 shrink-0">
                                {getLessonIcon(lesson.type)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="truncate font-semibold text-stone-900 dark:text-stone-100 block">
                                  {lesson.title}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-0.5 flex-wrap">
                                  <span className="font-medium text-stone-500 dark:text-stone-400">
                                    {getLessonTypeLabel(lesson.type)}
                                  </span>
                                  {lesson.content && (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                      • Ada Konten
                                    </span>
                                  )}
                                  {lesson.video_url && (
                                    <span className="text-red-500 font-semibold">
                                      • Video
                                    </span>
                                  )}
                                  {lesson.quiz_data?.question && (
                                    <span className="text-amber-500 font-semibold">
                                      • Kuis
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <Link
                              href={`/admin/courses/${course.id}/topics/${idx}/${lIdx}`}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors bg-white dark:bg-stone-900 shadow-2xs"
                              title="Buka Halaman Edit Konten Topik"
                            >
                              <Edit2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Edit Topik</span>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100 dark:border-stone-800">
                <p className="text-xs text-stone-500">
                  Total <span className="font-bold text-stone-800 dark:text-stone-200">{syllabus.length} modul silabus</span> aktif.
                  {hasUnsavedChanges && (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold ml-2">
                      (Ada perubahan yang belum disimpan ke database)
                    </span>
                  )}
                </p>

                <Button
                  size="md"
                  onClick={() => handleSaveSyllabus()}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="bg-[#0F3E2E] hover:bg-[#15523d] text-white gap-2 font-bold text-xs rounded-xl shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Menyimpan Silabus..." : "Simpan Perubahan Silabus"}</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* daftar peserta yang sudah terdaftar dan disetujui */}
      <Card className="border-stone-200/80 dark:border-stone-800/80 shadow-xs overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-lg">
                Daftar Peserta Terdaftar ({participants.length} Peserta)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Daftar peserta mahasiswa yang telah disetujui pendaftarannya untuk mengikuti kursus ini (tidak termasuk peserta yang masih dalam tahap pembayaran).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={participantSearch}
                onChange={(e) => {
                  setParticipantSearch(e.target.value);
                  setParticipantPage(1);
                }}
                placeholder="Cari nama, kampus, WA..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingParticipants ? (
            <div className="p-12 text-center text-xs text-stone-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
              <p>Memuat daftar peserta terdaftar...</p>
            </div>
          ) : participants.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Belum Ada Peserta Terdaftar
                </h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Belum ada peserta yang pendaftarannya disetujui untuk kursus ini. Peserta yang baru mendaftar atau sedang dalam tahap pembayaran dapat diverifikasi di menu Pendaftaran.
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                <Link href="/admin/pendaftaran">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <span>Buka Menu Pendaftaran</span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-400 space-y-1">
              <p className="font-semibold text-stone-700 dark:text-stone-300">
                Tidak ada peserta yang cocok
              </p>
              <p>Tidak ditemukan data peserta dengan kata kunci &quot;{participantSearch}&quot;.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Mahasiswa / Peserta</th>
                    <th className="py-3 px-4">Asal Kampus</th>
                    <th className="py-3 px-4">Kontak WhatsApp</th>
                    <th className="py-3 px-4">Tanggal Disetujui</th>
                    <th className="py-3 px-4">Ulasan / Sertifikat</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {paginatedParticipants.map((p, idx) => {
                    const rowNumber = (participantPage - 1) * PARTICIPANTS_PER_PAGE + idx + 1;
                    const prof = p.profiles;
                    const waNumber = p.whatsapp_number || prof?.whatsapp_number;
                    const cleanPhone = waNumber ? waNumber.replace(/[^0-9]/g, "") : "";

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-stone-50/80 dark:hover:bg-stone-900/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-center font-mono text-stone-400 font-medium">
                          {rowNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {prof?.avatar_url ? (
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                                <SmoothImage
                                  src={prof.avatar_url}
                                  alt={prof.full_name || "Peserta"}
                                  className="w-full h-full object-cover"
                                  containerClassName="w-full h-full"
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#0F3E2E] text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {prof?.full_name ? prof.full_name.charAt(0).toUpperCase() : "M"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-stone-900 dark:text-stone-100 block truncate">
                                {prof?.full_name || "Mahasiswa Peserta"}
                              </span>
                              {prof?.username && (
                                <span className="text-[11px] text-stone-400 flex items-center gap-0.5">
                                  <AtSign className="w-3 h-3 text-stone-400" />
                                  {prof.username}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {prof?.school_origin ? (
                            <span className="inline-flex items-center gap-1.5 text-stone-700 dark:text-stone-300 font-medium">
                              <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{prof.school_origin}</span>
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {cleanPhone ? (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
                              title="Chat WhatsApp Peserta"
                            >
                              <Phone className="w-3 h-3" />
                              <span>+{cleanPhone}</span>
                            </a>
                          ) : (
                            <span className="text-stone-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-stone-600 dark:text-stone-400">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <span>
                              {p.created_at
                                ? new Date(p.created_at).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "-"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {p.review_rating ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-[10px] border border-amber-500/20" title={p.review_text || "Ulasan peserta"}>
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span>{p.review_rating}.0</span>
                              </span>
                            ) : null}
                            {p.certificate_url ? (
                              <a
                                href={p.certificate_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                                title="Buka e-Sertifikat Peserta"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Sertifikat</span>
                              </a>
                            ) : null}
                            {!p.review_rating && !p.certificate_url && (
                              <span className="text-stone-400 text-[11px] font-normal">
                                Sedang Belajar
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="approved" className="text-[10px] px-2 py-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-1" />
                            <span>Aktif</span>
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalParticipantPages > 1 && (
                <div className="p-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
                  <span className="text-stone-400 text-[11px]">
                    Menampilkan halaman {participantPage} dari {totalParticipantPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setParticipantPage((p) => Math.max(p - 1, 1))}
                      disabled={participantPage === 1}
                      className="text-xs h-7 px-2.5"
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setParticipantPage((p) => Math.min(p + 1, totalParticipantPages))}
                      disabled={participantPage === totalParticipantPages}
                      className="text-xs h-7 px-2.5"
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* testimoni dan ulasan dari peserta kursus */}
      <Card className="border-stone-200/80 dark:border-stone-800/80 shadow-xs overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Quote className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-lg">
                Testimoni & Ulasan Peserta ({reviewsList.length} Ulasan)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Ulasan nyata dan penilaian rating bintang yang diberikan oleh peserta kursus setelah menyelesaikan proses belajar.
            </CardDescription>
          </div>

          {effectiveReviewsCount > 0 && effectiveAverageRating && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 self-start sm:self-center">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span className="font-bold text-xs">{effectiveAverageRating} / 5.0</span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">({effectiveReviewsCount} ulasan peserta)</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {reviewsList.length === 0 ? (
            <div className="p-10 text-center space-y-3 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
                <Star className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Belum Ada Testimoni dari Peserta
                </h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Belum ada ulasan atau rating yang diberikan oleh peserta untuk kursus ini. Ulasan peserta yang telah menyelesaikan materi akan otomatis tampil di sini.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewsList.map((rev) => {
                const prof = rev.profiles;
                const starRating = Math.max(1, Math.min(5, Math.round(rev.review_rating || 5)));

                return (
                  <div
                    key={rev.id}
                    className="p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/40 space-y-3.5 flex flex-col justify-between hover:border-stone-300 dark:hover:border-stone-700 transition-all shadow-2xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= starRating
                                  ? "fill-amber-500 text-amber-500"
                                  : "text-stone-300 dark:text-stone-700"
                              }`}
                            />
                          ))}
                          <span className="font-bold text-xs text-stone-800 dark:text-stone-200 ml-1">
                            {starRating}.0
                          </span>
                        </div>

                        {rev.reviewed_at && (
                          <span className="text-[11px] text-stone-400">
                            {new Date(rev.reviewed_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-700 dark:text-stone-300 italic leading-relaxed">
                        &quot;{rev.review_text || "Materi kursus mandiri sangat lengkap dan mudah dipahami."}&quot;
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {prof?.avatar_url ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                            <SmoothImage
                              src={prof.avatar_url}
                              alt={prof.full_name || "Peserta"}
                              className="w-full h-full object-cover"
                              containerClassName="w-full h-full"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#0F3E2E] text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {prof?.full_name ? prof.full_name.charAt(0).toUpperCase() : "M"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-stone-900 dark:text-stone-100 block truncate">
                            {prof?.full_name || "Mahasiswa Peserta"}
                          </span>
                          {prof?.school_origin ? (
                            <span className="text-[10px] text-stone-400 flex items-center gap-1 truncate">
                              <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="truncate">{prof.school_origin}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-400">Mahasiswa Peserta</span>
                          )}
                        </div>
                      </div>

                      <Badge variant="approved" className="text-[9px] px-2 py-0.5 shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 mr-1" />
                        <span>Terverifikasi</span>
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {moduleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>
                  {moduleModal.mode === "create" ? "Tambah Modul Silabus Baru" : "Edit Modul Silabus"}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setModuleModal((p) => ({ ...p, isOpen: false }))}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs font-bold p-1 cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-stone-700 dark:text-stone-300 block">
                  Judul Modul <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={moduleModal.title}
                  onChange={(e) => setModuleModal((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Misal: Pengenalan Bahasa Python & Dasar Sintaks"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-stone-700 dark:text-stone-300 block">
                  Deskripsi Modul
                </label>
                <textarea
                  rows={2}
                  value={moduleModal.description}
                  onChange={(e) => setModuleModal((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Tuliskan rangkuman apa yang dipelajari pada modul ini..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] resize-none"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-stone-900 dark:text-stone-100 block">
                    Buka Sebagai Pratinjau Gratis?
                  </span>
                  <p className="text-[11px] text-stone-500">
                    Jika aktif, calon mahasiswa dapat melihat daftar topik materi pada modul ini sebelum mendaftar.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={moduleModal.isPreview}
                  onChange={(e) => setModuleModal((p) => ({ ...p, isPreview: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <span className="font-bold text-stone-700 dark:text-stone-300 block">
                  Topik & Aktivitas Belajar ({moduleModal.lessons.length} Topik)
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newLessonData.title}
                    onChange={(e) => setNewLessonData((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Nama materi/kuis/praktik baru..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <select
                    value={newLessonData.type}
                    onChange={(e) =>
                      setNewLessonData((p) => ({
                        ...p,
                        type: e.target.value as CourseLessonItem["type"],
                      }))
                    }
                    className="px-2 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shrink-0"
                  >
                    <option value="reading">Bacaan</option>
                    <option value="practice">Praktik</option>
                    <option value="quiz">Kuis</option>
                    <option value="project">Tugas Proyek</option>
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddLessonInModal}
                    className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs px-3 py-1.5 rounded-xl shrink-0"
                  >
                    + Tambah
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
                  {moduleModal.lessons.map((lesson, lIdx) => (
                    <div
                      key={lIdx}
                      className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getLessonIcon(lesson.type)}
                        <span className="truncate font-medium">{lesson.title}</span>
                        <span className="text-[10px] text-stone-400">
                          ({getLessonTypeLabel(lesson.type)})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {moduleModal.moduleIndex !== null && (
                          <Link
                            href={`/admin/courses/${course.id}/topics/${moduleModal.moduleIndex}/${lIdx}`}
                            className="text-stone-400 hover:text-emerald-600 transition-colors p-1 cursor-pointer"
                            title="Buka Halaman Edit Konten Topik"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveLessonInModal(lIdx)}
                          className="text-stone-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                          title="Hapus Topik"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModuleModal((p) => ({ ...p, isOpen: false }))}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveModuleModal}
                className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs font-bold"
              >
                {moduleModal.mode === "create" ? "Tambahkan ke Silabus" : "Perbarui Modul"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((p) => ({ ...p, isOpen: false }))}
        onConfirm={handleDeleteModule}
        title="Hapus Modul Silabus?"
        description={`Apakah Anda yakin ingin menghapus modul "${deleteConfirm.moduleTitle}" dari silabus kursus ini?`}
        confirmText="Ya, Hapus Modul"
        cancelText="Batal"
        variant="danger"
      />

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
