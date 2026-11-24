"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  Trophy,
  Medal,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { AdminCourseDetailSkeleton } from "@/components/ui/Skeleton";
import { ConfirmModal, AlertModal } from "@/components/ui/ModalKonfirmasi";
import {
  CourseLessonItem,
  CourseModuleItem,
} from "@/utils/courseCurriculumParser";
import { ProjectSubmissionItem } from "@/utils/enrollmentMeta";
import { useBreadcrumb } from "@/context/BreadcrumbContext";

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
  completed_lessons?: string[];
  project_submission_url?: string | null;
  project_submissions?: Record<string, ProjectSubmissionItem>;
  quiz_results?: Record<string, unknown>;
  total_score?: number | null;
  average_score?: number | null;
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
  const { setCustomTitle } = useBreadcrumb();

  // reset judul breadcrumb saat unmount
  React.useEffect(() => {
    return () => {
      setCustomTitle(null);
    };
  }, [setCustomTitle]);

  const [loading, setLoading] = React.useState(true);
  const [course, setCourse] = React.useState<any>(null);
  const [syllabus, setSyllabus] = React.useState<CourseModuleItem[]>([]);
  const [targetLearning, setTargetLearning] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const moduleTitleInputRef = React.useRef<HTMLInputElement>(null);
  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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

  // kunci scroll body dan alihkan fokus ke modal saat modal modul terbuka
  React.useEffect(() => {
    if (!moduleModal.isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // fokuskan input judul modul secara otomatis
    const timer = setTimeout(() => {
      moduleTitleInputRef.current?.focus();
    }, 60);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModuleModal((p) => ({ ...p, isOpen: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [moduleModal.isOpen]);

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

      const found = (data.courses || []).find(
        (c: { id: string; slug?: string }) => c.slug === courseId || c.id === courseId
      );
      if (!found) {
        throw new Error("Kursus dengan slug atau ID tersebut tidak ditemukan.");
      }

      setCourse(found);
      setCustomTitle(found.title || null);
      loadParticipants(found.id);
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
                duration: l.duration || "",
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
  const loadParticipants = React.useCallback(async (targetCourseId?: string) => {
    const idToUse = targetCourseId || courseId;
    setLoadingParticipants(true);
    try {
      const res = await fetch(`/api/admin/enrollments?course_id=${idToUse}&status=approved`);
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
    }
  }, [courseId, loadCourseData]);

  // simpan silabus ke database
  const handleSaveSyllabus = async (customSyllabus?: CourseModuleItem[]) => {
    const listToSave = customSyllabus || syllabus;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: course?.id || courseId,
          syllabus: listToSave.map((m, idx) => ({
            moduleNumber: idx + 1,
            title: m.title,
            description: m.description,
            duration: m.duration || "45 Menit",
            lessons: (m.lessons || []).map((l) => ({
              title: l.title,
              type: l.type,
              duration: l.duration || "",
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

  // geser urutan topik di dalam modal modul
  const handleMoveLessonInModal = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= moduleModal.lessons.length) return;
    setModuleModal((prev) => {
      const copy = [...prev.lessons];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return {
        ...prev,
        lessons: copy,
      };
    });
  };

  // geser urutan topik langsung di silabus modul utama
  const handleMoveLessonDirect = (modIndex: number, fromIndex: number, toIndex: number) => {
    const mod = syllabus[modIndex];
    if (!mod || !mod.lessons || toIndex < 0 || toIndex >= mod.lessons.length) return;
    setSyllabus((prev) => {
      const copy = [...prev];
      const lessonsCopy = [...(copy[modIndex].lessons || [])];
      const [moved] = lessonsCopy.splice(fromIndex, 1);
      lessonsCopy.splice(toIndex, 0, moved);
      copy[modIndex] = {
        ...copy[modIndex],
        lessons: lessonsCopy,
      };
      return copy;
    });
    setHasUnsavedChanges(true);
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

  // tab tampilan peserta di halaman admin antara ranking, proyek, dan data pendaftaran
  const [participantTab, setParticipantTab] = React.useState<"ranking" | "projects" | "directory">("ranking");

  // state modal penilaian tugas proyek link drive oleh admin
  const [projectReviewModal, setProjectReviewModal] = React.useState<{
    isOpen: boolean;
    enrollmentId: string;
    participantName: string;
    lessonKey: string;
    topicTitle: string;
    driveUrl: string;
    score: number;
    feedback: string;
  }>({
    isOpen: false,
    enrollmentId: "",
    participantName: "",
    lessonKey: "",
    topicTitle: "",
    driveUrl: "",
    score: 90,
    feedback: "",
  });
  const [isSavingProjectReview, setIsSavingProjectReview] = React.useState(false);

  // peta nama topik proyek berdasarkan lessonkey
  const projectTopicTitleMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    syllabus.forEach((mod, mIdx) => {
      (mod.lessons || []).forEach((les, lIdx) => {
        const key = `mod-${mIdx}-les-${lIdx}`;
        map[key] = `${mod.title ? `${mod.title} - ` : ""}${les.title || `Topik ${lIdx + 1}`}`;
      });
    });
    return map;
  }, [syllabus]);

  // daftar seluruh pengumpulan link drive proyek peserta
  const projectSubmissionsList = React.useMemo(() => {
    const rows: {
      enrollmentId: string;
      participant: CourseParticipant;
      lessonKey: string;
      topicTitle: string;
      submission: ProjectSubmissionItem;
    }[] = [];

    participants.forEach((p) => {
      const subs = p.project_submissions || {};
      const keys = Object.keys(subs);
      if (keys.length > 0) {
        keys.forEach((k) => {
          const item = subs[k];
          if (item?.driveUrl) {
            rows.push({
              enrollmentId: p.id,
              participant: p,
              lessonKey: k,
              topicTitle: projectTopicTitleMap[k] || "Tugas Proyek",
              submission: item,
            });
          }
        });
      } else if (p.project_submission_url) {
        rows.push({
          enrollmentId: p.id,
          participant: p,
          lessonKey: "legacy-project",
          topicTitle: "Tugas Proyek Kursus",
          submission: {
            lessonKey: "legacy-project",
            driveUrl: p.project_submission_url,
            status: "submitted",
            submittedAt: p.created_at,
          },
        });
      }
    });

    const q = participantSearch.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => {
          const name = (r.participant.profiles?.full_name || "").toLowerCase();
          const uname = (r.participant.profiles?.username || "").toLowerCase();
          const topic = r.topicTitle.toLowerCase();
          return name.includes(q) || uname.includes(q) || topic.includes(q);
        })
      : rows;

    return filtered.sort((a, b) => {
      const tA = new Date(a.submission.updatedAt || a.submission.submittedAt || 0).getTime();
      const tB = new Date(b.submission.updatedAt || b.submission.submittedAt || 0).getTime();
      return tB - tA;
    });
  }, [participants, projectTopicTitleMap, participantSearch]);

  const handleSaveProjectReview = async () => {
    if (!projectReviewModal.enrollmentId || !projectReviewModal.lessonKey) return;
    setIsSavingProjectReview(true);
    try {
      const res = await fetch("/api/admin/enrollments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: projectReviewModal.enrollmentId,
          project_review: {
            lessonKey: projectReviewModal.lessonKey,
            score: projectReviewModal.score,
            feedback: projectReviewModal.feedback,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan penilaian proyek.");
      }

      setParticipants((prev) =>
        prev.map((p) =>
          p.id === projectReviewModal.enrollmentId
            ? {
                ...p,
                project_submissions: data.updated?.project_submissions || p.project_submissions,
                total_score: data.updated?.total_score ?? p.total_score,
                average_score: data.updated?.average_score ?? p.average_score,
              }
            : p
        )
      );

      setProjectReviewModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan penilaian.";
      console.error(msg);
    } finally {
      setIsSavingProjectReview(false);
    }
  };

  // total materi silabus kursus
  const totalLessonsCount = React.useMemo(() => {
    return syllabus.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  }, [syllabus]);

  // klasemen peringkat peserta berdasarkan perolehan nilai
  const rankedParticipants = React.useMemo(() => {
    const list = participants.map((p) => {
      const avg = typeof p.average_score === "number" ? p.average_score : 0;
      const tot = typeof p.total_score === "number" ? p.total_score : 0;
      const comp = Array.isArray(p.completed_lessons) ? p.completed_lessons.length : 0;
      return {
        ...p,
        calculatedAverage: avg,
        calculatedTotal: tot,
        calculatedCompleted: comp,
      };
    });

    list.sort((a, b) => {
      if (b.calculatedAverage !== a.calculatedAverage) {
        return b.calculatedAverage - a.calculatedAverage;
      }
      if (b.calculatedTotal !== a.calculatedTotal) {
        return b.calculatedTotal - a.calculatedTotal;
      }
      return b.calculatedCompleted - a.calculatedCompleted;
    });

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [participants]);

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

  const filteredRankedParticipants = React.useMemo(() => {
    if (!participantSearch.trim()) return rankedParticipants;
    const q = participantSearch.toLowerCase();
    return rankedParticipants.filter((p) => {
      const name = (p.profiles?.full_name || "").toLowerCase();
      const uname = (p.profiles?.username || "").toLowerCase();
      const campus = (p.profiles?.school_origin || "").toLowerCase();
      return name.includes(q) || uname.includes(q) || campus.includes(q);
    });
  }, [rankedParticipants, participantSearch]);

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
    return <AdminCourseDetailSkeleton />;
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
    <div className="space-y-8 w-full pb-12">
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

          <p className="text-xs text-stone-500 font-medium">
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
            href={`/admin/courses/${course.slug || course.id}/edit`}
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
          {(() => {
            const rawPrice = Number(course.price || 0);
            const discountPercent = Number(course.discount_percent || 0);
            const hasDiscount = discountPercent > 0 && rawPrice > 0;
            const finalPrice = hasDiscount
              ? Math.round(rawPrice * (1 - discountPercent / 100))
              : rawPrice;

            return (
              <>
                <div className="text-xl font-black text-stone-900 dark:text-stone-100 mt-2">
                  {finalPrice === 0 ? "Gratis" : `Rp ${finalPrice.toLocaleString("id-ID")}`}
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  {hasDiscount ? (
                    <span>
                      Diskon {discountPercent}% dari Rp {rawPrice.toLocaleString("id-ID")}
                    </span>
                  ) : (
                    "Biaya belajar mandiri"
                  )}
                </p>
              </>
            );
          })()}
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
              href={`/admin/courses/${course.slug || course.id}/edit`}
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

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveLessonDirect(idx, lIdx, lIdx - 1)}
                                disabled={lIdx === 0}
                                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title="Geser Topik Naik"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMoveLessonDirect(idx, lIdx, lIdx + 1)}
                                disabled={lIdx === (mod.lessons?.length || 0) - 1}
                                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title="Geser Topik Turun"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>

                              <Link
                                href={`/admin/courses/${course.slug || course.id}/topics/${idx}/${lIdx}`}
                                className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors bg-white dark:bg-stone-900 shadow-2xs"
                                title="Buka Halaman Edit Konten Topik"
                              >
                                <Edit2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Edit Topik</span>
                              </Link>
                            </div>
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
              {participantTab === "ranking" ? (
                <Trophy className="w-4 h-4 text-emerald-600" />
              ) : participantTab === "projects" ? (
                <Award className="w-4 h-4 text-purple-600" />
              ) : (
                <Users className="w-4 h-4 text-emerald-600" />
              )}
              <CardTitle className="text-lg">
                {participantTab === "ranking"
                  ? `Papan Peringkat & Nilai Peserta (${participants.length} Peserta)`
                  : participantTab === "projects"
                  ? `Pengumpulan Link Proyek Peserta (${projectSubmissionsList.length})`
                  : `Daftar Peserta Terdaftar (${participants.length} Peserta)`}
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              {participantTab === "ranking"
                ? "Klasemen ranking peserta berdasarkan akumulasi dan rata-rata nilai hasil evaluasi tiap topik silabus."
                : participantTab === "projects"
                ? "Daftar tautan Google Drive proyek yang telah dikumpulkan oleh peserta untuk diperiksa dan diberi nilai."
                : "Daftar peserta mahasiswa yang telah disetujui pendaftarannya untuk mengikuti kursus ini."}
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 self-start sm:self-center w-full sm:w-auto">
            {/* tombol beralih tab tampilan */}
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80">
              <button
                type="button"
                onClick={() => setParticipantTab("ranking")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  participantTab === "ranking"
                    ? "bg-white dark:bg-stone-900 text-[#0F3E2E] dark:text-emerald-400 shadow-2xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Peringkat & Nilai</span>
              </button>

              <button
                type="button"
                onClick={() => setParticipantTab("projects")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  participantTab === "projects"
                    ? "bg-white dark:bg-stone-900 text-purple-700 dark:text-purple-400 shadow-2xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Proyek Peserta</span>
                {projectSubmissionsList.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                    {projectSubmissionsList.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setParticipantTab("directory")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  participantTab === "directory"
                    ? "bg-white dark:bg-stone-900 text-[#0F3E2E] dark:text-emerald-400 shadow-2xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Data Pendaftaran</span>
              </button>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={participantSearch}
                onChange={(e) => {
                  setParticipantSearch(e.target.value);
                  setParticipantPage(1);
                }}
                placeholder="Cari nama, kampus..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingParticipants ? (
            <div className="p-12 text-center text-xs text-stone-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
              <p>Memuat data peserta kursus...</p>
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
          ) : participantTab === "ranking" ? (
            <div className="p-5 sm:p-6 space-y-6">
              {/* podium 3 besar peringkat teratas */}
              {rankedParticipants.length > 0 && !participantSearch && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {rankedParticipants.slice(0, 3).map((item) => {
                    const isFirst = item.rank === 1;
                    const isSecond = item.rank === 2;
                    const prof = item.profiles;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border relative flex flex-col justify-between space-y-3 transition-all ${
                          isFirst
                            ? "border-amber-400/50 bg-amber-500/10 dark:bg-amber-950/20 shadow-2xs"
                            : isSecond
                            ? "border-stone-300/80 dark:border-stone-700/80 bg-stone-100/70 dark:bg-stone-800/40"
                            : "border-amber-700/30 bg-amber-700/10 dark:bg-amber-950/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                              isFirst
                                ? "bg-amber-500 text-white"
                                : isSecond
                                ? "bg-stone-400 text-white dark:bg-stone-600"
                                : "bg-amber-700 text-white"
                            }`}
                          >
                            Peringkat #{item.rank}
                          </span>
                          <Medal
                            className={`w-5 h-5 ${
                              isFirst
                                ? "text-amber-500"
                                : isSecond
                                ? "text-stone-400 dark:text-stone-300"
                                : "text-amber-700"
                            }`}
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          {prof?.avatar_url ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                              <SmoothImage
                                src={prof.avatar_url}
                                alt={prof.full_name || "Peserta"}
                                className="w-full h-full object-cover"
                                containerClassName="w-full h-full"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#0F3E2E] text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {prof?.full_name ? prof.full_name.charAt(0).toUpperCase() : "M"}
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate block">
                              {prof?.full_name || "Mahasiswa Peserta"}
                            </span>
                            {prof?.school_origin && (
                              <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate block">
                                {prof.school_origin}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between text-xs">
                          <span className="text-stone-500 dark:text-stone-400 text-[11px]">Rata-Rata Nilai</span>
                          <span className="font-extrabold text-[#0F3E2E] dark:text-emerald-400 text-sm">
                            {item.calculatedAverage} / 100
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* tabel peringkat peserta */}
              {filteredRankedParticipants.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400 space-y-1">
                  <p className="font-semibold text-stone-700 dark:text-stone-300">
                    Tidak ada peserta yang cocok
                  </p>
                  <p>Tidak ditemukan data peringkat dengan kata kunci &quot;{participantSearch}&quot;.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4 w-14 text-center">Rank</th>
                          <th className="py-3 px-4">Mahasiswa / Peserta</th>
                          <th className="py-3 px-4">Asal Kampus</th>
                          <th className="py-3 px-4 text-center">Topik Selesai</th>
                          <th className="py-3 px-4 text-center">Rata-Rata Nilai</th>
                          <th className="py-3 px-4 text-center">Total Nilai</th>
                          <th className="py-3 px-4 text-center">Status Silabus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {filteredRankedParticipants.map((p) => {
                          const prof = p.profiles;
                          const isCoursePassed = totalLessonsCount > 0 && p.calculatedCompleted >= totalLessonsCount;

                          return (
                            <tr
                              key={p.id}
                              className="hover:bg-stone-50/80 dark:hover:bg-stone-900/50 transition-colors"
                            >
                              <td className="py-3.5 px-4 text-center">
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${
                                    p.rank === 1
                                      ? "bg-amber-500 text-white"
                                      : p.rank === 2
                                      ? "bg-stone-400 text-white dark:bg-stone-600"
                                      : p.rank === 3
                                      ? "bg-amber-700 text-white"
                                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                                  }`}
                                >
                                  #{p.rank}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
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

                              <td className="py-3.5 px-4">
                                {prof?.school_origin ? (
                                  <span className="inline-flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
                                    <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                    <span className="truncate max-w-[170px]">{prof.school_origin}</span>
                                  </span>
                                ) : (
                                  <span className="text-stone-400 text-[11px]">-</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <span className="font-semibold text-stone-700 dark:text-stone-300">
                                  {p.calculatedCompleted} / {totalLessonsCount} Topik
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <span
                                  className={`inline-block font-extrabold px-2.5 py-1 rounded-lg text-xs ${
                                    p.calculatedAverage >= 80
                                      ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
                                      : p.calculatedAverage >= 70
                                      ? "bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/20"
                                      : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                                  }`}
                                >
                                  {p.calculatedAverage} / 100
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-center font-bold text-stone-700 dark:text-stone-300">
                                {p.calculatedTotal}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                {isCoursePassed ? (
                                  <Badge variant="approved" className="text-[10px] px-2 py-0.5">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-1" />
                                    <span>Lulus & Selesai</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="neutral" className="text-[10px] px-2 py-0.5">
                                    <span>Sedang Belajar</span>
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : participantTab === "projects" ? (
            // tampilan daftar pengumpulan tautan google drive proyek peserta
            <div>
              {projectSubmissionsList.length === 0 ? (
                <div className="p-12 text-center text-xs text-stone-400 space-y-1.5">
                  <Award className="w-7 h-7 text-stone-300 dark:text-stone-700 mx-auto mb-1" />
                  <p className="font-semibold text-stone-700 dark:text-stone-300">
                    Belum Ada Pengumpulan Link Proyek
                  </p>
                  <p>
                    Tautan Google Drive yang dikumpulkan peserta pada topik bertipe proyek akan tampil di sini.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4 w-12 text-center">No</th>
                        <th className="py-3 px-4">Peserta</th>
                        <th className="py-3 px-4">Topik Proyek</th>
                        <th className="py-3 px-4">Link Google Drive</th>
                        <th className="py-3 px-4 text-center">Status & Nilai</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                      {projectSubmissionsList.map((row, idx) => {
                        const prof = row.participant.profiles;
                        const sub = row.submission;
                        return (
                          <tr
                            key={`${row.enrollmentId}-${row.lessonKey}`}
                            className="hover:bg-stone-50/80 dark:hover:bg-stone-900/30 transition-colors"
                          >
                            <td className="py-3.5 px-4 text-center text-stone-500 font-semibold">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                {prof?.avatar_url ? (
                                  <SmoothImage
                                    src={prof.avatar_url}
                                    alt={prof.full_name || "Peserta"}
                                    className="w-8 h-8 rounded-full object-cover border border-stone-200 dark:border-stone-700 shrink-0"
                                  />
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
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-stone-800 dark:text-stone-200 block">
                                {row.topicTitle}
                              </span>
                              <span className="text-[11px] text-stone-400">
                                Dikirim{" "}
                                {new Date(sub.updatedAt || sub.submittedAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <a
                                href={sub.driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-xs transition-colors"
                              >
                                <span>Buka Link Drive</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {sub.status === "reviewed" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Nilai {sub.score ?? 0}/100</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                                  <span>Menunggu Penilaian</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setProjectReviewModal({
                                    isOpen: true,
                                    enrollmentId: row.enrollmentId,
                                    participantName: prof?.full_name || "Mahasiswa Peserta",
                                    lessonKey: row.lessonKey,
                                    topicTitle: row.topicTitle,
                                    driveUrl: sub.driveUrl,
                                    score: typeof sub.score === "number" ? sub.score : 90,
                                    feedback: sub.feedback || "",
                                  })
                                }
                                className="text-xs font-bold rounded-xl"
                              >
                                <span>{sub.status === "reviewed" ? "Ubah Nilai" : "Beri Nilai"}</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            // tampilan daftar data pendaftaran peserta
            <div>
              {filteredParticipants.length === 0 ? (
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
                            <td className="py-3 px-4 text-center text-stone-400 font-medium text-xs">
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
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-[10px] border border-amber-500/20"
                                    title={p.review_text || "Ulasan peserta"}
                                  >
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
                              className={`w-3.5 h-3.5 ${s <= starRating
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

      {mounted && moduleModal.isOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModuleModal((p) => ({ ...p, isOpen: false }));
            }
          }}
        >
          <div
            ref={modalContainerRef}
            tabIndex={-1}
            className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 flex flex-col max-h-[88vh] overscroll-contain focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header modal silabus */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
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

            {/* area formulir modal dengan scroll mulus dan terisolasi */}
            <div className="flex-1 overflow-y-auto overscroll-contain py-3 pr-1 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-stone-700 dark:text-stone-300 block">
                  Judul Modul <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={moduleTitleInputRef}
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

                <div className="space-y-1.5 max-h-56 overflow-y-auto overscroll-contain pt-1 pr-1">
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
                        {/* tombol geser urutan topik naik */}
                        <button
                          type="button"
                          onClick={() => handleMoveLessonInModal(lIdx, lIdx - 1)}
                          disabled={lIdx === 0}
                          className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Geser Topik Naik"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>

                        {/* tombol geser urutan topik turun */}
                        <button
                          type="button"
                          onClick={() => handleMoveLessonInModal(lIdx, lIdx + 1)}
                          disabled={lIdx === moduleModal.lessons.length - 1}
                          className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Geser Topik Turun"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>

                        {moduleModal.moduleIndex !== null && (
                          <Link
                            href={`/admin/courses/${course.slug || course.id}/topics/${moduleModal.moduleIndex}/${lIdx}`}
                            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-400 hover:text-emerald-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                            title="Buka Halaman Edit Konten Topik"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveLessonInModal(lIdx)}
                          className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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

            {/* tombol aksi modal tetap diam di bawah tidak ikut tergulung */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2 shrink-0">
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
        </div>,
        document.body
      )}

      {/* modal penilaian tugas proyek google drive peserta */}
      {mounted &&
        projectReviewModal.isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-5">
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-xs uppercase tracking-wider">
                    <Award className="w-4 h-4" />
                    <span>Penilaian Tugas Proyek</span>
                  </div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {projectReviewModal.participantName}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {projectReviewModal.topicTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProjectReviewModal((p) => ({ ...p, isOpen: false }))}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">
                    Tautan Google Drive Proyek
                  </span>
                  <span className="text-xs text-stone-700 dark:text-stone-300 truncate block">
                    {projectReviewModal.driveUrl}
                  </span>
                </div>
                <a
                  href={projectReviewModal.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shrink-0 transition-colors"
                >
                  <span>Buka Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                  Nilai Proyek (Kelipatan 10)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[100, 90, 80, 70, 60, 50].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setProjectReviewModal((p) => ({ ...p, score: val }))}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        projectReviewModal.score === val
                          ? "bg-[#0F3E2E] text-white border-[#0F3E2E]"
                          : "bg-white dark:bg-stone-950 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/40"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                  Catatan / Umpan Balik Mentor (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={projectReviewModal.feedback}
                  onChange={(e) =>
                    setProjectReviewModal((p) => ({ ...p, feedback: e.target.value }))
                  }
                  placeholder="Tuliskan apresiasi atau catatan evaluasi hasil proyek peserta..."
                  className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProjectReviewModal((p) => ({ ...p, isOpen: false }))}
                  className="text-xs rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveProjectReview}
                  disabled={isSavingProjectReview}
                  className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs font-bold rounded-xl"
                >
                  {isSavingProjectReview ? "Menyimpan..." : "Simpan Nilai Proyek"}
                </Button>
              </div>
            </div>
          </div>,
          document.body
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
