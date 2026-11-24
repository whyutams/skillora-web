"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  BookOpen,
  FileText,
  Code,
  HelpCircle,
  Award,
  Play,
  Copy,
  Check,
  ExternalLink,
  Trophy,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Lock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ModalKonfirmasi";
import { TopicWorkspaceSkeleton } from "@/components/ui/Skeleton";
import { StudentEnrollmentItem } from "../../../../DashboardPesertaClient";
import {
  parseCourseCurriculum,
  detectCourseTopic,
  CourseModuleItem,
  CourseLessonItem,
  CourseQuizQuestion,
} from "@/utils/courseCurriculumParser";
import WebCodeEditor from "@/components/learning/WebCodeEditor";
import {
  getStarterCodePlaceholder,
  getTargetPracticeCode,
} from "@/utils/codeStarterTemplate";
import {
  isValidGoogleDriveUrl,
  ProjectSubmissionItem,
} from "@/utils/enrollmentMeta";

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
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

// ekstrak judul topik bersih dan ringkas tanpa penjelasan panjang
function cleanTopicTitle(rawTitle?: string, content?: string): string {
  if (!rawTitle) return "Materi Pembelajaran";

  // jika materi teks memiliki tag heading ambil teks dari heading pertama
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

  // jika ada pemisah baris baru gunakan baris pertama
  const firstLine = text.split(/[\r\n]+/)[0].trim();
  if (firstLine.length <= 75 && firstLine.length > 3) return firstLine;

  // cari pola penomoran seperti angka diikuti titik atau kurung
  const matchNumbered = text.match(/^(\d+[\.\:\)]\s*[^.\n\r?!●:]{3,65})/);
  if (matchNumbered && matchNumbered[1]) {
    return matchNumbered[1].trim();
  }

  // potong hingga batas kata yang wajar
  const slice = text.substring(0, 65);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 25 ? slice.substring(0, lastSpace) : slice).trim() + "...";
}

// siapkan konten html agar ter-render sempurna tanpa teks mentah
function formatContentHtml(rawContent?: string): string {
  if (!rawContent) return "";
  let content = rawContent.trim();
  // bersihkan karakter delimitasi kode tersembunyi bawaan eksternal jika ada
  content = content.replace(/[\uec00-\uec0f]/g, "");

  // jika tag html ter-encode unescape kembali
  if (
    content.includes("&lt;h") ||
    content.includes("&lt;p") ||
    content.includes("&lt;div") ||
    content.includes("&lt;ul") ||
    content.includes("&lt;ol") ||
    content.includes("&lt;table") ||
    content.includes("&lt;pre")
  ) {
    content = decodeHtmlEntities(content);
  }

  // bersihkan inline background dan color usang pada tag code agar seragam dengan tema
  content = content.replace(/<code\s+style="[^"]*background:[^"]*color:[^"]*"([^>]*)>/gi, "<code$1>");

  // jika murni teks tanpa tag html konversi newline menjadi paragraf
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);
  if (!hasHtmlTags) {
    return content
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
  }
  return content;
}

// fungsi untuk mengacak urutan array dengan algoritma fisher yates
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface HalamanBelajarTopikClientProps {
  enrollmentOrSlug: string;
  moduleIndexStr: string;
  topicIndexStr: string;
}

export default function HalamanBelajarTopikClient({
  enrollmentOrSlug,
  moduleIndexStr,
  topicIndexStr,
}: HalamanBelajarTopikClientProps) {
  const router = useRouter();
  const currentModIdx = parseInt(moduleIndexStr, 10) || 0;
  const currentLesIdx = parseInt(topicIndexStr, 10) || 0;

  const [enrollment, setEnrollment] = React.useState<StudentEnrollmentItem | null>(null);
  const [userProfile, setUserProfile] = React.useState<{
    full_name?: string | null;
    username?: string | null;
    school_origin?: string | null;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // accordion modul yang terbuka
  const [openModules, setOpenModules] = React.useState<Record<number, boolean>>({
    [currentModIdx]: true,
  });

  // kontrol keterbukaan panel silabus di atas materi
  const [isSyllabusExpanded, setIsSyllabusExpanded] = React.useState(true);

  // daftar kunci topik yang telah diselesaikan
  const [completedLessons, setCompletedLessons] = React.useState<string[]>([]);

  // status kuis interaktif
  const [quizAnswers, setQuizAnswers] = React.useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = React.useState(false);
  const [quizScore, setQuizScore] = React.useState<number | null>(null);
  const [quizCorrectCount, setQuizCorrectCount] = React.useState<number | null>(null);
  const [showQuizConfirmModal, setShowQuizConfirmModal] = React.useState(false);
  const [shuffledQuestions, setShuffledQuestions] = React.useState<{
    question: string;
    shuffledOptions: { text: string; originalIndex: number }[];
    correct_index: number;
    explanation?: string;
  }[]>([]);

  // status tugas proyek
  const [projectSubmissionUrl, setProjectSubmissionUrl] = React.useState("");
  const [projectSubmittedUrl, setProjectSubmittedUrl] = React.useState("");
  const [projectSavedNotice, setProjectSavedNotice] = React.useState(false);
  const [projectError, setProjectError] = React.useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState(false);

  // status evaluasi essay topik pemahaman
  const [essayAnswer, setEssayAnswer] = React.useState("");
  const [essaySubmitted, setEssaySubmitted] = React.useState(false);
  const [isSubmittingEssay, setIsSubmittingEssay] = React.useState(false);
  const [showEssayConfirmModal, setShowEssayConfirmModal] = React.useState(false);
  const [essayEvaluation, setEssayEvaluation] = React.useState<{
    score: number;
    score_reason: string;
    verdict: string;
    feedback: string;
    strengths?: string[];
    improvements?: string[];
  } | null>(null);

  // simpan pembaruan progres belajar ke database supabase
  const syncProgressToDatabase = React.useCallback(
    async (
      enrollmentId: string,
      lessons: string[],
      extra?: {
        project_submission_url?: string;
        quiz_result?: unknown;
        last_accessed_lesson?: { moduleIndex: number; topicIndex: number };
      }
    ) => {
      if (!enrollmentId) return;
      try {
        await fetch(`/api/student/enrollments/${enrollmentId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            completed_lessons: lessons,
            project_submission_url: extra?.project_submission_url,
            quiz_result: extra?.quiz_result,
            last_accessed_lesson: extra?.last_accessed_lesson || {
              moduleIndex: currentModIdx,
              topicIndex: currentLesIdx,
            },
          }),
        });
      } catch (err) {
        console.error("Gagal menyinkronkan progres ke database", err);
      }
    },
    [currentModIdx, currentLesIdx]
  );

  // ambil data pendaftaran kursus mahasiswa
  const fetchDetail = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/student/enrollments/${enrollmentOrSlug}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memuat detail pendaftaran kursus.");
      }
      setEnrollment(data.enrollment);
      if (data.user_profile) {
        setUserProfile(data.user_profile);
      }

      // sinkronisasi progres dari database sebagai sumber data utama
      const dbCompleted: string[] = Array.isArray(data.enrollment?.completed_lessons)
        ? data.enrollment.completed_lessons
        : [];
      let localCompleted: string[] = [];
      try {
        const saved = localStorage.getItem(`skillora_progress_${data.enrollment?.id}`);
        if (saved) localCompleted = JSON.parse(saved);
      } catch {
        // non blocking
      }
      const merged = Array.from(new Set([...dbCompleted, ...localCompleted]));
      setCompletedLessons(merged);
      try {
        localStorage.setItem(`skillora_progress_${data.enrollment?.id}`, JSON.stringify(merged));
      } catch {
        // non blocking
      }
      if (merged.length > dbCompleted.length && data.enrollment?.id) {
        syncProgressToDatabase(data.enrollment.id, merged);
      }

      const projectUrl = data.enrollment?.project_submission_url;
      if (projectUrl) {
        setProjectSubmittedUrl(projectUrl);
        setProjectSubmissionUrl(projectUrl);
        try {
          localStorage.setItem(`skillora_project_${data.enrollment?.id}`, projectUrl);
        } catch {
          // non blocking
        }
      } else {
        try {
          const savedProject = localStorage.getItem(`skillora_project_${data.enrollment?.id}`);
          if (savedProject) {
            setProjectSubmittedUrl(savedProject);
            setProjectSubmissionUrl(savedProject);
          }
        } catch {
          // non blocking
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, [enrollmentOrSlug, syncProgressToDatabase]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // buka accordion modul saat indeks modul berubah
  React.useEffect(() => {
    setOpenModules((prev) => ({
      ...prev,
      [currentModIdx]: true,
    }));
    setCopiedCode(false);
  }, [currentModIdx, currentLesIdx]);

  // proteksi teks materi pembelajaran dari aksi penyalinan atau copy
  React.useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      // izinkan copy cut hanya pada elemen input dan textarea pengetikan jawaban
      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement
      ) {
        return;
      }
      e.preventDefault();
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // cegah klik kanan salin pada materi pembelajaran yang dilindungi
      if (
        target?.closest(".learning-content") ||
        target?.closest(".topic-protected-content")
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const course = enrollment?.course;

  // uraikan kurikulum modul dan topik
  const curriculum = React.useMemo(() => {
    if (!course) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parseCourseCurriculum(course as any, course.content);
  }, [course]);

  const modules: CourseModuleItem[] = React.useMemo(() => {
    return curriculum?.modules || [];
  }, [curriculum]);

  const totalLessons = React.useMemo(() => {
    return modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  }, [modules]);

  const completedCount = React.useMemo(() => {
    return completedLessons.length;
  }, [completedLessons]);

  const progressPercentage =
    totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;
  const isAllCourseCompleted = totalLessons > 0 && completedCount >= totalLessons;

  const currentModule: CourseModuleItem | undefined = modules[currentModIdx];
  const currentLesson: CourseLessonItem | undefined = currentModule?.lessons?.[currentLesIdx];

  const currentLessonKey = `mod-${currentModIdx}-les-${currentLesIdx}`;
  const isCurrentLessonCompleted = completedLessons.includes(currentLessonKey);

  // judul topik bersih saat ini
  const activeCleanTitle = React.useMemo(() => {
    return cleanTopicTitle(currentLesson?.title, currentLesson?.content);
  }, [currentLesson?.title, currentLesson?.content]);

  // deteksi bahasa pemrograman kursus
  const courseTopic = React.useMemo(() => {
    return detectCourseTopic(course?.slug || course?.title || enrollmentOrSlug);
  }, [course?.slug, course?.title, enrollmentOrSlug]);

  // html konten yang siap dirender
  const activeFormattedHtml = React.useMemo(() => {
    if (currentLesson?.instructions) {
      return formatContentHtml(currentLesson.instructions);
    }
    return formatContentHtml(currentLesson?.content);
  }, [
    currentLesson?.instructions,
    currentLesson?.content,
  ]);

  // daftar materi modul saat ini
  const currentModuleLessons = currentModule?.lessons || [];

  // jumlah materi modul saat ini yang telah diselesaikan
  const completedLessonsInCurrentModule = React.useMemo(() => {
    return currentModuleLessons.filter((_, idx) =>
      completedLessons.includes(`mod-${currentModIdx}-les-${idx}`)
    ).length;
  }, [currentModuleLessons, completedLessons, currentModIdx]);

  // fungsi helper memeriksa apakah suatu topik dapat diakses tanpa melompati urutan
  const isTopicUnlocked = React.useCallback(
    (targetModIdx: number, targetLesIdx: number): boolean => {
      // topik pertama pada silabus pertama selalu terbuka
      if (targetModIdx === 0 && targetLesIdx === 0) return true;

      // jika topik sudah selesai dipelajari otomatis dapat diakses kembali
      const targetKey = `mod-${targetModIdx}-les-${targetLesIdx}`;
      if (completedLessons.includes(targetKey)) return true;

      // periksa topik tepat sebelumnya pada modul yang sama
      if (targetLesIdx > 0) {
        const prevKey = `mod-${targetModIdx}-les-${targetLesIdx - 1}`;
        return completedLessons.includes(prevKey);
      }

      // jika merupakan topik pertama pada modul baru pastikan modul sebelumnya selesai
      if (targetModIdx > 0) {
        const prevMod = modules[targetModIdx - 1];
        if (!prevMod || !prevMod.lessons || prevMod.lessons.length === 0) return true;
        const lastLesIdx = prevMod.lessons.length - 1;
        const prevKey = `mod-${targetModIdx - 1}-les-${lastLesIdx}`;
        return completedLessons.includes(prevKey);
      }

      return false;
    },
    [completedLessons, modules]
  );

  const isCurrentLessonUnlocked = isTopicUnlocked(currentModIdx, currentLesIdx);

  // cari pelajaran sebelumnya dan selanjutnya
  const navigationPointers = React.useMemo(() => {
    let prev: { modIdx: number; lesIdx: number; title: string } | null = null;
    let next: { modIdx: number; lesIdx: number; title: string } | null = null;

    if (!modules.length) return { prev, next };

    // jika ada pelajaran sebelumnya di modul yang sama
    if (currentLesIdx > 0 && currentModule?.lessons?.[currentLesIdx - 1]) {
      const pLes = currentModule.lessons[currentLesIdx - 1];
      prev = {
        modIdx: currentModIdx,
        lesIdx: currentLesIdx - 1,
        title: cleanTopicTitle(pLes.title, pLes.content),
      };
    } else if (currentModIdx > 0) {
      // jika di awal modul cari pelajaran terakhir di modul sebelumnya
      const prevMod = modules[currentModIdx - 1];
      if (prevMod?.lessons?.length) {
        const lastLes = prevMod.lessons[prevMod.lessons.length - 1];
        prev = {
          modIdx: currentModIdx - 1,
          lesIdx: prevMod.lessons.length - 1,
          title: cleanTopicTitle(lastLes.title, lastLes.content),
        };
      }
    }

    // jika ada pelajaran selanjutnya di modul yang sama
    if (currentModule?.lessons && currentLesIdx < currentModule.lessons.length - 1) {
      const nLes = currentModule.lessons[currentLesIdx + 1];
      next = {
        modIdx: currentModIdx,
        lesIdx: currentLesIdx + 1,
        title: cleanTopicTitle(nLes.title, nLes.content),
      };
    } else if (currentModIdx < modules.length - 1) {
      // jika di akhir modul cari pelajaran pertama di modul selanjutnya
      const nextMod = modules[currentModIdx + 1];
      if (nextMod?.lessons?.length) {
        const firstLes = nextMod.lessons[0];
        next = {
          modIdx: currentModIdx + 1,
          lesIdx: 0,
          title: cleanTopicTitle(firstLes.title, firstLes.content),
        };
      }
    }

    return { prev, next };
  }, [modules, currentModIdx, currentLesIdx, currentModule]);

  const toggleLessonCompletion = (lessonKey: string) => {
    // jika kuis atau essay evaluasi belum dikerjakan cegah menandai selesai
    if (isContinueDisabled && !completedLessons.includes(lessonKey)) {
      return;
    }
    setCompletedLessons((prev) => {
      const exists = prev.includes(lessonKey);
      const next = exists ? prev.filter((k) => k !== lessonKey) : [...prev, lessonKey];
      if (enrollment?.id) {
        try {
          localStorage.setItem(`skillora_progress_${enrollment.id}`, JSON.stringify(next));
        } catch {
          // non blocking
        }
        // simpan status selesai langsung ke database
        syncProgressToDatabase(enrollment.id, next);
      }
      return next;
    });
  };

  // kuis data khusus untuk tipe materi kuis
  const currentQuizQuestions: CourseQuizQuestion[] = React.useMemo(() => {
    if (!currentLesson || currentLesson.type !== "quiz") return [];
    const qData = currentLesson.quiz_data;
    if (!qData) return [];
    if (Array.isArray(qData.questions) && qData.questions.length > 0) {
      return qData.questions.filter((q) => {
        const t = (q?.question || "").replace(/<[^>]*>/g, "").trim();
        const hasImg = /<img[^>]*>/i.test(q?.question || "");
        return Boolean(t || hasImg);
      });
    }
    if (qData.question) {
      const t = (qData.question || "").replace(/<[^>]*>/g, "").trim();
      const hasImg = /<img[^>]*>/i.test(qData.question || "");
      if (t || hasImg) {
        return [
          {
            question: qData.question,
            options: qData.options || [],
            correct_index: qData.correct_index ?? 0,
            explanation: qData.explanation,
          },
        ];
      }
    }
    return [];
  }, [currentLesson]);

  // soal evaluasi essay untuk materi bacaan dan praktik
  const currentTopicEssayQuestion = React.useMemo(() => {
    if (!currentLesson || currentLesson.type === "quiz") return null;
    const qData = currentLesson.quiz_data;
    if (!qData || !qData.question) return null;
    const t = qData.question.replace(/<[^>]*>/g, "").trim();
    const hasImg = /<img[^>]*>/i.test(qData.question);
    if (!t && !hasImg) return null;
    return {
      question: qData.question,
      explanation: qData.explanation || "",
    };
  }, [currentLesson]);

  const hasTopicQuiz = currentLesson?.type === "quiz" && currentQuizQuestions.length > 0;
  const isTopicQuizUnanswered = hasTopicQuiz && !quizSubmitted;

  const hasTopicEssay = Boolean(currentTopicEssayQuestion);
  const isTopicEssayUnanswered = hasTopicEssay && !essaySubmitted;

  const currentProjectSubmission: ProjectSubmissionItem | null = React.useMemo(() => {
    if (!enrollment || currentLesson?.type !== "project") return null;
    const perTopic = enrollment.project_submissions?.[currentLessonKey];
    if (perTopic) return perTopic;
    if (enrollment.project_submission_url) {
      return {
        lessonKey: currentLessonKey,
        driveUrl: enrollment.project_submission_url,
        status: "submitted",
        submittedAt: enrollment.created_at,
      };
    }
    return null;
  }, [enrollment, currentLesson?.type, currentLessonKey]);

  const hasTopicProject = currentLesson?.type === "project";
  const isTopicProjectUnsubmitted =
    hasTopicProject && !projectSubmittedUrl && !currentProjectSubmission?.driveUrl;

  const isContinueDisabled =
    isTopicQuizUnanswered || isTopicEssayUnanswered || isTopicProjectUnsubmitted;

  const handleMarkAndContinue = () => {
    if (isContinueDisabled) return;
    if (!isCurrentLessonCompleted) {
      toggleLessonCompletion(currentLessonKey);
    }
    if (navigationPointers.next) {
      router.push(
        `/kursus-saya/${enrollmentOrSlug}/belajar/${navigationPointers.next.modIdx}/${navigationPointers.next.lesIdx}`
      );
    }
  };

  const handleCopyCodeSnippet = (codeText: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(codeText);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // pulihkan atau inisialisasi status essay topik
  React.useEffect(() => {
    if (!currentLesson || currentLesson.type === "quiz" || !currentTopicEssayQuestion) {
      setEssayAnswer("");
      setEssaySubmitted(false);
      setEssayEvaluation(null);
      return;
    }

    const essayStorageKey = enrollment?.id
      ? `skillora_essay_${enrollment.id}_${currentLessonKey}`
      : null;

    let savedEssay: {
      answer: string;
      submitted: boolean;
      evaluation?: {
        score: number;
        score_reason: string;
        verdict: string;
        feedback: string;
        strengths?: string[];
        improvements?: string[];
      };
    } | null = null;

    if (essayStorageKey && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(essayStorageKey);
        if (raw) savedEssay = JSON.parse(raw);
      } catch {
        // non blocking
      }
    }

    const remoteResult = (enrollment?.quiz_results as any)?.[currentLessonKey];

    // evaluasi essay hanya dianggap selesai jika benar-benar ada jawaban peserta yang tersimpan
    if (savedEssay?.submitted && savedEssay.answer) {
      setEssayAnswer(savedEssay.answer);
      setEssaySubmitted(true);
      if (savedEssay.evaluation) {
        const rawScore = typeof savedEssay.evaluation.score === "number" ? savedEssay.evaluation.score : 0;
        const normalizedScore = Math.max(0, Math.min(100, Math.round(rawScore / 10) * 10));
        let reason = savedEssay.evaluation.score_reason || "";
        if (rawScore !== normalizedScore) {
          reason = reason.replace(new RegExp(`\\b${rawScore}\\b`, "g"), String(normalizedScore));
        }
        setEssayEvaluation({
          ...savedEssay.evaluation,
          score: normalizedScore,
          score_reason: reason || savedEssay.evaluation.score_reason,
        });
      } else if (remoteResult && typeof remoteResult.score === "number") {
        const rawScore = remoteResult.score;
        const normalizedScore = Math.max(0, Math.min(100, Math.round(rawScore / 10) * 10));
        let reason = remoteResult.score_reason || "Jawaban Anda telah dinilai oleh sistem.";
        if (rawScore !== normalizedScore) {
          reason = reason.replace(new RegExp(`\\b${rawScore}\\b`, "g"), String(normalizedScore));
        }
        setEssayEvaluation({
          score: normalizedScore,
          score_reason: reason,
          verdict: remoteResult.verdict || "Hasil Evaluasi",
          feedback: remoteResult.feedback || "Jawaban telah berhasil terekam.",
          strengths: remoteResult.strengths || [],
          improvements: remoteResult.improvements || [],
        });
      }
    } else if (remoteResult?.student_answer) {
      setEssayAnswer(remoteResult.student_answer);
      setEssaySubmitted(true);
      const rawScore = typeof remoteResult.score === "number" ? remoteResult.score : 0;
      const normalizedScore = Math.max(0, Math.min(100, Math.round(rawScore / 10) * 10));
      let reason = remoteResult.score_reason || "Jawaban Anda telah dinilai oleh sistem.";
      if (rawScore !== normalizedScore) {
        reason = reason.replace(new RegExp(`\\b${rawScore}\\b`, "g"), String(normalizedScore));
      }
      setEssayEvaluation({
        score: normalizedScore,
        score_reason: reason,
        verdict: remoteResult.verdict || "Hasil Evaluasi",
        feedback: remoteResult.feedback || "Jawaban telah berhasil terekam.",
        strengths: remoteResult.strengths || [],
        improvements: remoteResult.improvements || [],
      });
    } else {
      // jika belum pernah mengirimkan jawaban essay form wajib terbuka dan belum terjawab
      setEssayAnswer("");
      setEssaySubmitted(false);
      setEssayEvaluation(null);
      if (completedLessons.includes(currentLessonKey)) {
        setCompletedLessons((prev) => prev.filter((k) => k !== currentLessonKey));
      }
    }
  }, [
    currentLesson,
    currentLessonKey,
    currentTopicEssayQuestion,
    enrollment?.id,
    enrollment?.quiz_results,
    completedLessons,
  ]);

  // buka modal konfirmasi sebelum pengiriman jawaban essay final
  const handleOpenEssayConfirm = () => {
    if (!essayAnswer.trim() || essayAnswer.trim().length < 10) return;
    setShowEssayConfirmModal(true);
  };

  // eksekusi pengiriman jawaban essay periksa nilai otomatis dan simpan permanen ke database
  const handleExecuteEssaySubmit = async () => {
    if (!essayAnswer.trim() || !enrollment?.id || !currentTopicEssayQuestion) return;
    setIsSubmittingEssay(true);
    const answerText = essayAnswer.trim();

    try {
      const res = await fetch("/api/student/evaluate-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          lessonKey: currentLessonKey,
          topicTitle: activeCleanTitle,
          topicContent: currentLesson?.content || currentLesson?.instructions,
          question: currentTopicEssayQuestion.question,
          mentorKey: currentTopicEssayQuestion.explanation,
          studentAnswer: answerText,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Gagal mengevaluasi jawaban essay.");
      }

      const evaluation = resData.evaluation;
      setEssayEvaluation(evaluation);
      setEssaySubmitted(true);

      // simpan ke penyimpanan lokal browser agar riwayat langsung persisten
      try {
        const payload = {
          answer: answerText,
          submitted: true,
          evaluation,
          submittedAt: new Date().toISOString(),
        };
        localStorage.setItem(
          `skillora_essay_${enrollment.id}_${currentLessonKey}`,
          JSON.stringify(payload)
        );
      } catch {
        // non blocking
      }

      // perbarui daftar materi yang telah diselesaikan
      const nextCompleted = Array.isArray(resData.completed_lessons)
        ? resData.completed_lessons
        : completedLessons.includes(currentLessonKey)
        ? completedLessons
        : [...completedLessons, currentLessonKey];

      setCompletedLessons(nextCompleted);

      // sinkronkan data pendaftaran kursus lokal
      setEnrollment((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          completed_lessons: nextCompleted,
          quiz_results: {
            ...(prev.quiz_results || {}),
            [currentLessonKey]: {
              lessonKey: currentLessonKey,
              type: "essay",
              question: currentTopicEssayQuestion.question,
              student_answer: answerText,
              score: evaluation.score,
              score_reason: evaluation.score_reason,
              verdict: evaluation.verdict,
              feedback: evaluation.feedback,
              strengths: evaluation.strengths,
              improvements: evaluation.improvements,
              submittedAt: new Date().toISOString(),
            },
          },
          total_score: typeof resData.total_score === "number" ? resData.total_score : prev.total_score,
          average_score: typeof resData.average_score === "number" ? resData.average_score : prev.average_score,
        };
      });
    } catch (err) {
      console.error("Gagal memeriksa jawaban essay", err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat memeriksa jawaban.");
    } finally {
      setIsSubmittingEssay(false);
    }
  };

  // inisialisasi kuis interaktif dengan pengacakan opsi dan pemulihan riwayat nilai tersimpan
  React.useEffect(() => {
    if (!currentLesson || currentQuizQuestions.length === 0) {
      setShuffledQuestions([]);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizScore(null);
      setQuizCorrectCount(null);
      return;
    }

    const quizStorageKey = enrollment?.id
      ? `skillora_quiz_${enrollment.id}_${currentLessonKey}`
      : null;

    let savedData: {
      score: number;
      correctCount: number;
      answers: Record<number, number>;
      shuffledOrders: number[][];
      submitted: boolean;
    } | null = null;

    if (quizStorageKey && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(quizStorageKey);
        if (raw) savedData = JSON.parse(raw);
      } catch {
        // non blocking
      }
    }

    const remoteQuizResult = (enrollment?.quiz_results as any)?.[currentLessonKey];
    const isLessonAlreadyCompleted = completedLessons.includes(currentLessonKey);

    if (savedData && Array.isArray(savedData.shuffledOrders)) {
      // pulihkan urutan opsi yang diacak sebelumnya dan jawaban yang telah tersimpan
      const restored = currentQuizQuestions.map((q, qIdx) => {
        const order = savedData!.shuffledOrders[qIdx];
        const rawOpts = q.options || [];
        let shuffledOpts: { text: string; originalIndex: number }[] = [];

        if (Array.isArray(order) && order.length === rawOpts.length) {
          shuffledOpts = order.map((origIdx) => ({
            text: rawOpts[origIdx] ?? "",
            originalIndex: origIdx,
          }));
        } else {
          shuffledOpts = rawOpts.map((text, origIdx) => ({ text, originalIndex: origIdx }));
        }

        return {
          question: q.question,
          shuffledOptions: shuffledOpts,
          correct_index: q.correct_index,
          explanation: q.explanation,
        };
      });

      setShuffledQuestions(restored);
      setQuizAnswers(savedData.answers || {});
      const rawSavedScore = typeof savedData.score === "number" ? savedData.score : 0;
      const normalizedSavedScore = Math.max(0, Math.min(100, Math.round(rawSavedScore / 10) * 10));
      setQuizScore(normalizedSavedScore);
      setQuizCorrectCount(savedData.correctCount ?? 0);
      setQuizSubmitted(Boolean(savedData.submitted));
    } else if (remoteQuizResult && typeof remoteQuizResult.score === "number") {
      // pulihkan hanya jika hasil kuis benar-benar sudah ada di database
      const restored = currentQuizQuestions.map((q) => {
        const optsWithIdx = (q.options || []).map((text, origIdx) => ({
          text,
          originalIndex: origIdx,
        }));
        return {
          question: q.question,
          shuffledOptions: optsWithIdx,
          correct_index: q.correct_index,
          explanation: q.explanation,
        };
      });

      setShuffledQuestions(restored);
      setQuizAnswers({});
      const rawScore = remoteQuizResult.score;
      const normalizedScore = Math.max(0, Math.min(100, Math.round(rawScore / 10) * 10));
      setQuizScore(normalizedScore);
      setQuizCorrectCount(
        typeof remoteQuizResult?.correctCount === "number"
          ? remoteQuizResult.correctCount
          : Math.round((normalizedScore / 100) * currentQuizQuestions.length)
      );
      setQuizSubmitted(true);
    } else {
      // jika belum pernah mengirimkan jawaban kuis form kuis wajib terbuka dan belum selesai
      const freshShuffled = currentQuizQuestions.map((q) => {
        const optsWithIdx = (q.options || []).map((text, origIdx) => ({
          text,
          originalIndex: origIdx,
        }));
        return {
          question: q.question,
          shuffledOptions: shuffleArray(optsWithIdx),
          correct_index: q.correct_index,
          explanation: q.explanation,
        };
      });

      setShuffledQuestions(freshShuffled);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizScore(null);
      setQuizCorrectCount(null);
      if (completedLessons.includes(currentLessonKey)) {
        setCompletedLessons((prev) => prev.filter((k) => k !== currentLessonKey));
      }
    }
  }, [currentLesson, currentQuizQuestions, currentLessonKey, enrollment?.id, enrollment?.quiz_results, completedLessons]);

  // kirim jawaban kuis hitung nilai dan simpan secara permanen
  const handleQuizSubmit = () => {
    if (shuffledQuestions.length === 0) return;
    let correct = 0;
    shuffledQuestions.forEach((q, qIdx) => {
      const chosenOptIdx = quizAnswers[qIdx];
      if (chosenOptIdx !== undefined) {
        const chosenOpt = q.shuffledOptions[chosenOptIdx];
        if (chosenOpt && chosenOpt.originalIndex === q.correct_index) {
          correct++;
        }
      }
    });

    const totalQuestions = shuffledQuestions.length;
    // bobot tiap soal kuis dihitung dari 100 dibagi jumlah kuis
    const pointsPerQuestion = totalQuestions > 0 ? 100 / totalQuestions : 0;
    // nilai dihitung dari jumlah jawaban benar dikali bobot per soal
    const rawScore = correct * pointsPerQuestion;
    // bulatkan nilai kuis selalu ke kelipatan 10 terdekat
    const score = Math.max(0, Math.min(100, Math.round(rawScore / 10) * 10));
    setQuizScore(score);
    setQuizCorrectCount(correct);
    setQuizSubmitted(true);
    setShowQuizConfirmModal(false);

    // simpan riwayat kuis ke penyimpanan lokal agar nilai tersimpan permanen
    if (enrollment?.id) {
      try {
        const payload = {
          score,
          correctCount: correct,
          totalQuestions: shuffledQuestions.length,
          answers: quizAnswers,
          shuffledOrders: shuffledQuestions.map((q) =>
            q.shuffledOptions.map((o) => o.originalIndex)
          ),
          submitted: true,
          submittedAt: new Date().toISOString(),
        };
        localStorage.setItem(
          `skillora_quiz_${enrollment.id}_${currentLessonKey}`,
          JSON.stringify(payload)
        );
      } catch {
        // non blocking
      }
    }

    // berapapun nilainya topik langsung ditandai selesai agar peserta dapat melanjutkan
    const nextCompleted = completedLessons.includes(currentLessonKey)
      ? completedLessons
      : [...completedLessons, currentLessonKey];
    if (!completedLessons.includes(currentLessonKey)) {
      setCompletedLessons(nextCompleted);
    }

    if (enrollment?.id) {
      syncProgressToDatabase(enrollment.id, nextCompleted, {
        quiz_result: {
          lessonKey: currentLessonKey,
          score,
          correctCount: correct,
          totalQuestions: shuffledQuestions.length,
          submittedAt: new Date().toISOString(),
        },
      });
    }
  };

  // sinkronkan tautan drive proyek per topik saat berpindah materi
  React.useEffect(() => {
    if (currentLesson?.type === "project") {
      const savedDriveUrl = currentProjectSubmission?.driveUrl || "";
      setProjectSubmissionUrl(savedDriveUrl);
      setProjectSubmittedUrl(savedDriveUrl);
      setProjectError(null);
      setProjectSavedNotice(false);
    }
  }, [currentLesson?.type, currentLessonKey, currentProjectSubmission?.driveUrl]);

  const handleSaveProjectSubmission = async () => {
    if (!projectSubmissionUrl.trim() || !enrollment?.id) return;
    const url = projectSubmissionUrl.trim();

    if (!isValidGoogleDriveUrl(url)) {
      setProjectError(
        "Harap masukkan tautan Google Drive yang valid (contoh https://drive.google.com/drive/folders/...)."
      );
      return;
    }

    setProjectError(null);
    setIsSavingProject(true);

    try {
      const nextCompleted = completedLessons.includes(currentLessonKey)
        ? completedLessons
        : [...completedLessons, currentLessonKey];

      const res = await fetch(`/api/student/enrollments/${enrollment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed_lessons: nextCompleted,
          project_submission: {
            lessonKey: currentLessonKey,
            driveUrl: url,
          },
          last_accessed_lesson: {
            moduleIndex: currentModIdx,
            topicIndex: currentLesIdx,
          },
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Gagal menyimpan tautan Google Drive proyek.");
      }

      if (!completedLessons.includes(currentLessonKey)) {
        setCompletedLessons(nextCompleted);
      }

      setProjectSubmittedUrl(url);
      setProjectSavedNotice(true);
      setEnrollment((prev) =>
        prev
          ? {
              ...prev,
              project_submission_url: url,
              project_submissions: resData.project_submissions || prev.project_submissions,
            }
          : prev
      );

      try {
        localStorage.setItem(`skillora_project_${enrollment.id}_${currentLessonKey}`, url);
      } catch {
        // non blocking
      }

      setTimeout(() => setProjectSavedNotice(false), 3500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal menyimpan tautan Google Drive proyek.";
      setProjectError(msg);
    } finally {
      setIsSavingProject(false);
    }
  };

  // jika sedang memuat data tampilkan kerangka skeleton
  if (loading) {
    return <TopicWorkspaceSkeleton />;
  }

  // jika gagal atau data tidak ditemukan
  if (error || !enrollment || !course) {
    return (
      <div className="w-full py-12 flex items-center justify-center">
        <div className="text-center p-8 max-w-md w-full space-y-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              Gagal Memuat Materi Kursus
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              {error || "Pendaftaran kursus tidak ditemukan."}
            </p>
          </div>
          <Link href={`/kursus-saya/${enrollmentOrSlug}`} className="inline-block pt-2">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Detail Kursus</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // jika status pendaftaran belum disetujui
  if (enrollment.status !== "approved") {
    return (
      <div className="w-full py-12 flex items-center justify-center">
        <div className="text-center p-8 max-w-md w-full space-y-4 rounded-2xl border border-amber-500/30 bg-white dark:bg-stone-900 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              Pendaftaran Belum Disetujui
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              Materi dan ruang belajar hanya dapat diakses setelah pendaftaran Anda disetujui oleh admin.
            </p>
          </div>
          <Link href={`/kursus-saya/${enrollmentOrSlug}`} className="inline-block pt-2">
            <Button variant="primary" size="sm" className="gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white text-xs">
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Status Pendaftaran</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // jika materi ini masih terkunci dan pengguna melompati urutan
  if (!isCurrentLessonUnlocked) {
    return (
      <div className="w-full py-12 flex items-center justify-center">
        <div className="text-center p-8 max-w-md w-full space-y-4 rounded-2xl border border-amber-500/30 bg-white dark:bg-stone-900 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              Materi Belum Terbuka
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              Topik ini masih terkunci. Anda harus menyelesaikan materi sebelumnya secara berurutan agar pemahaman Anda optimal.
            </p>
          </div>
          <Link href={`/kursus-saya/${enrollmentOrSlug}`} className="inline-block pt-2">
            <Button variant="primary" size="sm" className="gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white text-xs">
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Detail Kursus</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-12">
        {/* bagian header navigasi atas */}
        <div className="space-y-4">
          <div>
            <Link
              href={`/kursus-saya/${enrollmentOrSlug}`}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800/80 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:border-stone-300 dark:hover:border-stone-700 shadow-2xs transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-stone-500" />
              <span>Kembali ke Detail Kursus</span>
            </Link>
          </div>

          <div className="p-6 sm:p-7 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">
                <span>{course.title}</span>
                <span>&bull;</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  Modul {currentModIdx + 1}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
                {currentModule?.title || `Modul ${currentModIdx + 1}`}
              </h1>
              {currentModule?.description && (
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 line-clamp-2">
                  {currentModule.description}
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700/60 shrink-0 space-y-2 sm:w-64">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Progres Belajar</span>
                </span>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                  {progressPercentage}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-400 text-right">
                {completedCount} dari {totalLessons} topik selesai
              </p>
            </div>
          </div>
        </div>

        {/* tata letak dua kolom dengan panel silabus ramping di sisi kanan */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start w-full">
          {/* kolom kiri konten materi belajar lebar utama */}
          <main className="flex-1 min-w-0 w-full space-y-6">
            {currentLesson ? (
              <div className="space-y-6">
                {/* tajuk status topik */}
                <div className="p-5 sm:p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      <span>
                        Modul {currentModIdx + 1} &bull; Topik {currentLesIdx + 1} dari {currentModule?.lessons?.length || 0}
                      </span>
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="neutral" className="text-xs capitalize font-semibold">
                        {currentLesson.type}
                      </Badge>
                    </div>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                    {activeCleanTitle}
                  </h2>
                </div>

                {/* video materi jika ada */}
                {currentLesson.video_url && (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800/80 bg-black shadow-md">
                    <iframe
                      src={getYouTubeEmbedUrl(currentLesson.video_url) || currentLesson.video_url}
                      title={activeCleanTitle}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* konten materi teks bacaan yang dilindungi dari penyalinan teks */}
                {activeFormattedHtml && (
                  <div
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    className="p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md shadow-xs space-y-4 select-none topic-protected-content"
                  >
                    <div
                      className="learning-content w-full select-none"
                      dangerouslySetInnerHTML={{ __html: activeFormattedHtml }}
                    />
                  </div>
                )}

                {/* kuis evaluasi materi */}
                {currentLesson.type === "quiz" && (
                  <div
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    className="p-5 sm:p-7 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#161413] shadow-sm space-y-6 select-none topic-protected-content"
                  >
                    {/* header kuis evaluasi pemahaman */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 dark:border-stone-800/80">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <HelpCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
                            Kuis Evaluasi Pemahaman
                          </h3>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            Pilihlah salah satu opsi jawaban yang paling tepat untuk setiap soal berikut.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="px-3 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-xs border border-stone-200 dark:border-stone-700">
                          {shuffledQuestions.length} Soal
                        </span>
                        {quizSubmitted && quizScore !== null && (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            Nilai {quizScore}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* daftar pertanyaan kuis dengan opsi yang diacak */}
                    <div className="space-y-6">
                      {shuffledQuestions.map((q, qIdx) => {
                        const userAnswer = quizAnswers[qIdx];
                        return (
                          <div
                            key={qIdx}
                            className="space-y-4 p-5 sm:p-6 rounded-2xl bg-[#FAF9F6] dark:bg-stone-900/60 border border-stone-200/90 dark:border-stone-800"
                          >
                            <div className="flex items-start gap-3">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs shrink-0">
                                Soal {qIdx + 1}
                              </span>
                              <div
                                className="font-semibold text-stone-900 dark:text-stone-100 text-sm sm:text-base leading-relaxed flex-1 prose dark:prose-invert max-w-none prose-p:my-0 prose-p:leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: formatContentHtml(q.question) }}
                              />
                            </div>

                            <div className="space-y-2.5 pt-1">
                              {q.shuffledOptions.map((opt, optIdx) => {
                                const optionLetter = String.fromCharCode(65 + optIdx);
                                const isSelected = userAnswer === optIdx;
                                const isCorrect = opt.originalIndex === q.correct_index;

                                let cardClasses =
                                  "border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-950/70 hover:bg-stone-100/70 dark:hover:bg-stone-800/60 text-stone-800 dark:text-stone-200 hover:border-stone-300 dark:hover:border-stone-600";
                                let letterBadgeClasses =
                                  "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700";

                                if (quizSubmitted) {
                                  if (isCorrect) {
                                    cardClasses =
                                      "border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500/40";
                                    letterBadgeClasses = "bg-emerald-600 text-white font-bold";
                                  } else if (isSelected && !isCorrect) {
                                    cardClasses =
                                      "border-rose-500 bg-rose-500/15 text-rose-900 dark:text-rose-100 font-semibold ring-1 ring-rose-500/40";
                                    letterBadgeClasses = "bg-rose-600 text-white font-bold";
                                  } else {
                                    cardClasses =
                                      "border-stone-200/60 dark:border-stone-800/60 bg-stone-50/50 dark:bg-stone-950/40 text-stone-400 dark:text-stone-500 opacity-60";
                                  }
                                } else if (isSelected) {
                                  cardClasses =
                                    "border-emerald-600 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-stone-900 dark:text-white font-medium ring-1.5 ring-emerald-600 dark:ring-emerald-500 shadow-2xs";
                                  letterBadgeClasses =
                                    "bg-emerald-600 text-white font-bold shadow-2xs";
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    disabled={quizSubmitted}
                                    onClick={() =>
                                      setQuizAnswers((prev) => ({
                                        ...prev,
                                        [qIdx]: optIdx,
                                      }))
                                    }
                                    className={`w-full p-3.5 sm:p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${cardClasses}`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <span
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${letterBadgeClasses}`}
                                      >
                                        {optionLetter}
                                      </span>
                                      <span
                                        className="leading-snug break-words flex-1"
                                        dangerouslySetInnerHTML={{ __html: formatContentHtml(opt.text) }}
                                      />
                                    </div>

                                    {quizSubmitted ? (
                                      isCorrect ? (
                                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs shrink-0">
                                          <span className="hidden sm:inline">Jawaban Benar</span>
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                      ) : isSelected ? (
                                        <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold text-xs shrink-0">
                                          <span className="hidden sm:inline">Jawaban Anda</span>
                                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                        </div>
                                      ) : null
                                    ) : (
                                      <div
                                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                          isSelected
                                            ? "border-emerald-600 dark:border-emerald-500 bg-emerald-600"
                                            : "border-stone-300 dark:border-stone-600"
                                        }`}
                                      >
                                        {isSelected && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                        )}
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* pembahasan kuis jika ada */}
                            {quizSubmitted && q.explanation && (
                              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 text-xs text-stone-700 dark:text-stone-300 space-y-1 mt-3">
                                <span className="font-bold text-emerald-800 dark:text-emerald-400 block">
                                  Pembahasan Jawaban
                                </span>
                                <p className="leading-relaxed">{q.explanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* aksi kuis kirim atau hasil nilai tersimpan */}
                    <div className="pt-4 border-t border-stone-100 dark:border-stone-800/80">
                      {!quizSubmitted ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            {Object.keys(quizAnswers).length} dari {shuffledQuestions.length} pertanyaan telah dijawab
                          </span>
                          <Button
                            size="md"
                            onClick={() => setShowQuizConfirmModal(true)}
                            disabled={Object.keys(quizAnswers).length < shuffledQuestions.length}
                            className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs gap-2 font-bold py-2.5 px-6 rounded-xl cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            <span>Kirim Jawaban Kuis</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#FAF9F6] dark:bg-stone-900/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                          <div className="space-y-1.5">
                            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 block uppercase tracking-wider">
                              Hasil Evaluasi Kuis Anda
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-[#0F3E2E] dark:text-emerald-400">
                                {quizScore}
                              </span>
                              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                                / 100 ({quizCorrectCount} dari {shuffledQuestions.length} soal benar)
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 dark:text-stone-400">
                              Bobot tiap soal: {(100 / (shuffledQuestions.length || 1)).toFixed(1).replace(".0", "")} poin • {quizCorrectCount ?? 0} benar, {shuffledQuestions.length - (quizCorrectCount ?? 0)} salah
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium pt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>Nilai telah tersimpan permanen dan materi dinyatakan selesai</span>
                            </div>
                          </div>

                          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold self-start md:self-center shrink-0">
                            Kuis Selesai
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* editor praktik koding dan eksekusi kode interaktif */}
                {(currentLesson.type === "practice" || Boolean(currentLesson.starter_code)) && (() => {
                  const practiceLang = courseTopic === "general" ? "cpp" : courseTopic;
                  const dynamicName = userProfile?.full_name || "Mahasiswa";
                  const targetCode = getTargetPracticeCode(
                    practiceLang,
                    currentLesson.starter_code,
                    activeCleanTitle,
                    currentLesson.content,
                    dynamicName
                  );
                  const starterCode = getStarterCodePlaceholder(
                    practiceLang,
                    currentLesson.starter_code,
                    activeCleanTitle,
                    currentLesson.content,
                    dynamicName
                  );
                  const dynamicValues = [
                    dynamicName,
                    userProfile?.username || "",
                  ].filter(Boolean);

                  return (
                    <WebCodeEditor
                      key={`code-editor-${currentModIdx}-${currentLesIdx}`}
                      initialCode={starterCode}
                      targetCode={targetCode}
                      dynamicValues={dynamicValues}
                      language={practiceLang}
                      title={`Praktik ${activeCleanTitle}`}
                      tips={
                        currentLesson.instructions
                          ? currentLesson.instructions
                          : currentLesson.content && !currentLesson.content.includes("#include")
                          ? currentLesson.content
                          : undefined
                      }
                    />
                  );
                })()}

                {/* pengumpulan tugas proyek link google drive */}
                {currentLesson.type === "project" && (
                  <div className="w-full p-6 sm:p-7 rounded-2xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-500/10 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-xs uppercase tracking-wider">
                        <Award className="w-4 h-4" />
                        <span>Pengumpulan Tugas Proyek (Link Google Drive)</span>
                      </div>

                      {currentProjectSubmission?.status === "reviewed" ? (
                        <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                          Sudah Dinilai ({currentProjectSubmission.score ?? 0}/100)
                        </span>
                      ) : projectSubmittedUrl ? (
                        <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Link Drive Terkirim</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
                          Wajib Mengirim Link Drive
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                      Unggah file atau folder proyek Anda ke Google Drive, lalu tempelkan tautan Google Drive pada kolom di bawah ini. Pastikan akses tautan diatur ke{" "}
                      <span className="font-semibold text-stone-800 dark:text-stone-100">
                        Siapa saja yang memiliki link (Anyone with the link)
                      </span>{" "}
                      agar mentor dapat memeriksa hasil karya Anda.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                      <input
                        type="url"
                        value={projectSubmissionUrl}
                        onChange={(e) => {
                          setProjectSubmissionUrl(e.target.value);
                          if (projectError) setProjectError(null);
                        }}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="flex-1 p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveProjectSubmission}
                        disabled={!projectSubmissionUrl.trim() || isSavingProject}
                        className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs font-bold py-3 px-5 rounded-xl shrink-0"
                      >
                        <span>
                          {isSavingProject
                            ? "Menyimpan..."
                            : projectSubmittedUrl
                            ? "Perbarui Link Drive"
                            : "Simpan Link Drive"}
                        </span>
                      </Button>
                    </div>

                    {projectError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{projectError}</span>
                      </div>
                    )}

                    {projectSavedNotice && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Tautan Google Drive proyek Anda berhasil disimpan! Anda dapat melanjutkan ke materi berikutnya.</span>
                      </p>
                    )}

                    {projectSubmittedUrl && !projectSavedNotice && (
                      <div className="p-3.5 rounded-xl bg-white/80 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">
                            Link Google Drive Tersimpan
                          </span>
                          <a
                            href={projectSubmittedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm font-medium underline text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 truncate block"
                          >
                            {projectSubmittedUrl}
                          </a>
                        </div>
                        <a
                          href={projectSubmittedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 transition-colors"
                        >
                          <span>Buka Link Drive</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {currentProjectSubmission?.status === "reviewed" &&
                      currentProjectSubmission.feedback && (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                            Catatan Penilaian Mentor (Nilai {currentProjectSubmission.score ?? 0}/100)
                          </span>
                          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                            {currentProjectSubmission.feedback}
                          </p>
                        </div>
                      )}
                  </div>
                )}

                {/* soal evaluasi pemahaman essay untuk materi bacaan dan praktik */}
                {hasTopicEssay && currentTopicEssayQuestion && (
                  <div className="p-5 sm:p-7 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#161413] shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 dark:border-stone-800/80">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <HelpCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
                            Evaluasi Pemahaman Topik
                          </h3>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            Jawablah pertanyaan essay uraian berikut. Tombol lanjut materi akan aktif setelah jawaban Anda dikirimkan.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {essaySubmitted ? (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Jawaban Terekam</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Wajib Diisi</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* konten pertanyaan essay yang dilindungi */}
                    <div
                      onCopy={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                      onContextMenu={(e) => e.preventDefault()}
                      className="space-y-4 p-5 sm:p-6 rounded-2xl bg-[#FAF9F6] dark:bg-stone-900/60 border border-stone-200/90 dark:border-stone-800 select-none topic-protected-content"
                    >
                      <div className="flex items-start gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs shrink-0 select-none">
                          Soal Essay
                        </span>
                        <div
                          className="font-semibold text-stone-900 dark:text-stone-100 text-sm sm:text-base leading-relaxed flex-1 learning-content select-none"
                          dangerouslySetInnerHTML={{ __html: formatContentHtml(currentTopicEssayQuestion.question) }}
                        />
                      </div>

                      {/* area pengetikan atau jawaban tersimpan */}
                      {!essaySubmitted ? (
                        <div className="space-y-3 pt-2">
                          <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                            Tuliskan Uraian Jawaban Anda
                          </label>
                          <textarea
                            rows={5}
                            value={essayAnswer}
                            onChange={(e) => setEssayAnswer(e.target.value)}
                            disabled={isSubmittingEssay}
                            placeholder="Ketikkan uraian jawaban Anda di sini dengan lengkap..."
                            className="w-full p-4 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] resize-y leading-relaxed disabled:opacity-60"
                          />

                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>
                              Perhatian: Jawaban essay bersifat permanen dan tidak dapat diganti setelah dikirim. Pastikan jawaban Anda sudah lengkap dan benar.
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                            <span className="text-[11px] text-stone-400">
                              {essayAnswer.trim().length} karakter tertulis {essayAnswer.trim().length < 10 && "(minimal 10 karakter)"}
                            </span>
                            <Button
                              size="sm"
                              onClick={handleOpenEssayConfirm}
                              disabled={!essayAnswer.trim() || essayAnswer.trim().length < 10 || isSubmittingEssay}
                              className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs gap-2 font-bold py-2.5 px-5 rounded-xl cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" />
                              <span>{isSubmittingEssay ? "Memeriksa & Menilai..." : "Kirim & Periksa Jawaban"}</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-2">
                          {/* kartu nilai hasil pemeriksaan otomatis */}
                          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
                              <div>
                                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                                  Hasil Pemeriksaan Sistem
                                </span>
                                <div className="flex items-baseline gap-2 mt-0.5">
                                  <span className="text-3xl font-black text-[#0F3E2E] dark:text-emerald-400">
                                    {essayEvaluation?.score ?? 0}
                                  </span>
                                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                                    / 100
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-auto">
                                <span
                                  className={`px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs ${
                                    (essayEvaluation?.score ?? 0) >= 80
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                                      : (essayEvaluation?.score ?? 0) >= 60
                                      ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                                      : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                                  }`}
                                >
                                  {essayEvaluation?.verdict || "Hasil Evaluasi"}
                                </span>
                              </div>
                            </div>

                            {/* alasan perolehan nilai */}
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                                Alasan Penilaian:
                              </span>
                              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                                {essayEvaluation?.score_reason ||
                                  "Evaluasi pemahaman materi topik telah selesai dinilai oleh sistem."}
                              </p>
                            </div>

                            {/* umpan balik edukatif */}
                            {essayEvaluation?.feedback && (
                              <div className="p-3 rounded-xl bg-white/70 dark:bg-stone-900/60 border border-emerald-500/20 text-xs text-stone-700 dark:text-stone-300 space-y-1">
                                <span className="font-bold text-emerald-800 dark:text-emerald-400 block">
                                  Umpan Balik:
                                </span>
                                <p className="leading-relaxed">{essayEvaluation.feedback}</p>
                              </div>
                            )}

                            {/* catatan kekuatan dan peningkatan jika ada */}
                            {((essayEvaluation?.strengths && essayEvaluation.strengths.length > 0) ||
                              (essayEvaluation?.improvements && essayEvaluation.improvements.length > 0)) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                {essayEvaluation?.strengths && essayEvaluation.strengths.length > 0 && (
                                  <div className="p-2.5 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                                    <span className="font-bold block">Poin Positif:</span>
                                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                                      {essayEvaluation.strengths.map((str, idx) => (
                                        <li key={idx}>{str}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {essayEvaluation?.improvements && essayEvaluation.improvements.length > 0 && (
                                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                                    <span className="font-bold block">Ruang Peningkatan:</span>
                                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                                      {essayEvaluation.improvements.map((imp, idx) => (
                                        <li key={idx}>{imp}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* uraian jawaban peserta yang tersimpan dengan opsi perbaiki */}
                          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                                Jawaban Essay Anda:
                              </span>
                              <div className="flex items-center gap-2">
                                {(essayEvaluation?.score ?? 0) >= 100 ? (
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Nilai Maksimal (100)</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEssaySubmitted(false)}
                                    className="px-3 py-1 rounded-xl bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                    title="Buka kembali form untuk memperbarui atau mengevaluasi ulang jawaban essay"
                                  >
                                    <span>Perbaiki / Evaluasi Ulang</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed">
                              {essayAnswer}
                            </p>
                          </div>

                          {/* kunci acuan atau pembahasan jika tersedia */}
                          {currentTopicEssayQuestion.explanation && (
                            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-1.5">
                              <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                                Kunci Acuan / Pembahasan Mentor:
                              </span>
                              <div
                                className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed font-sans prose dark:prose-invert max-w-none prose-p:my-0.5"
                                dangerouslySetInnerHTML={{ __html: formatContentHtml(currentTopicEssayQuestion.explanation) }}
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-bold pt-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Nilai telah tersimpan permanen ke database untuk silabus ini. Anda dapat melanjutkan ke materi berikutnya.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* bilah navigasi materi bawah */}
                <div className="p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isContinueDisabled}
                    onClick={() => {
                      if (!isContinueDisabled) {
                        toggleLessonCompletion(currentLessonKey);
                      }
                    }}
                    className={`gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors ${
                      isCurrentLessonCompleted
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300"
                    } ${isContinueDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        isCurrentLessonCompleted ? "text-emerald-600" : "text-stone-400"
                      }`}
                    />
                    <span>
                      {isCurrentLessonCompleted ? "Telah Diselesaikan" : "Tandai Selesai"}
                    </span>
                  </Button>

                  <div className="flex items-center gap-2 flex-wrap">
                    {navigationPointers.prev && (
                      <Link
                        href={`/kursus-saya/${enrollmentOrSlug}/belajar/${navigationPointers.prev.modIdx}/${navigationPointers.prev.lesIdx}`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs font-semibold py-2.5 px-3 rounded-xl"
                          title={navigationPointers.prev.title}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span className="hidden sm:inline max-w-[140px] truncate">
                            {navigationPointers.prev.title}
                          </span>
                        </Button>
                      </Link>
                    )}

                    {isContinueDisabled && (
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {hasTopicEssay
                            ? "Jawab soal essay pemahaman untuk lanjut"
                            : "Selesaikan kuis untuk lanjut"}
                        </span>
                      </span>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleMarkAndContinue}
                      disabled={isContinueDisabled}
                      className={`gap-2 text-xs font-bold py-2.5 px-4 rounded-xl transition-all ${
                        isContinueDisabled
                          ? "bg-stone-300 dark:bg-stone-800 text-stone-500 dark:text-stone-400 cursor-not-allowed opacity-75 shadow-none"
                          : "bg-[#0F3E2E] hover:bg-[#16533e] text-white shadow-xs"
                      }`}
                      title={
                        isContinueDisabled
                          ? hasTopicEssay
                            ? "Kirimkan jawaban essay pemahaman terlebih dahulu"
                            : "Selesaikan kuis terlebih dahulu"
                          : undefined
                      }
                    >
                      <span className="max-w-[140px] truncate">
                        {navigationPointers.next ? "Selesai & Lanjut" : "Selesai Mempelajari"}
                      </span>
                      {navigationPointers.next && <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 space-y-4 p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto text-stone-400">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                    Materi Pembelajaran Tidak Ditemukan
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Silakan pilih materi yang tersedia pada panel silabus di sebelah kanan.
                  </p>
                </div>
                <Link href={`/kursus-saya/${enrollmentOrSlug}/belajar/0/0`}>
                  <Button variant="primary" size="sm" className="gap-2 bg-[#0F3E2E] text-white text-xs">
                    <span>Buka Materi Pertama</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </main>

          {/* kolom kanan panel silabus ramping dan fokus per modul aktif */}
          <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-20 space-y-4">
            <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md p-4 sm:p-5 shadow-xs space-y-4">
              <div className="space-y-1 pb-3 border-b border-stone-100 dark:border-stone-800/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Silabus {currentModIdx + 1} dari {modules.length}</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-semibold">
                    {completedLessonsInCurrentModule}/{currentModuleLessons.length}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-2">
                  {currentModule?.title || "Silabus Pembelajaran"}
                </h3>
              </div>

              {/* daftar topik silabus aktif */}
              <div className="max-h-[calc(100vh-260px)] overflow-y-auto space-y-1.5 pr-1">
                {currentModuleLessons.map((les, lesIdx) => {
                  const lessonKey = `mod-${currentModIdx}-les-${lesIdx}`;
                  const isCompleted = completedLessons.includes(lessonKey);
                  const isActive = lesIdx === currentLesIdx;
                  const isUnlocked = isTopicUnlocked(currentModIdx, lesIdx);
                  const lesCleanTitle = cleanTopicTitle(les.title, les.content);

                  const itemContent = (
                    <div className="flex items-center justify-between gap-2.5 min-w-0 w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-md font-bold text-[10px] flex items-center justify-center shrink-0 ${
                            isActive
                              ? "bg-[#0F3E2E] text-white dark:bg-emerald-600"
                              : isCompleted
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : isUnlocked
                              ? "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                              : "bg-stone-100 dark:bg-stone-800/60 text-stone-400"
                          }`}
                        >
                          {lesIdx + 1}
                        </span>

                        <div className="shrink-0">
                          {les.type === "practice" ? (
                            <Code className="w-3 h-3 text-blue-500" />
                          ) : les.type === "quiz" ? (
                            <HelpCircle className="w-3 h-3 text-amber-500" />
                          ) : les.type === "project" ? (
                            <Award className="w-3 h-3 text-purple-500" />
                          ) : (
                            <FileText className="w-3 h-3 text-emerald-500" />
                          )}
                        </div>

                        <span className="truncate text-xs font-medium">{lesCleanTitle}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : isActive ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                        ) : !isUnlocked ? (
                          <Lock className="w-3 h-3 text-stone-400 dark:text-stone-500" />
                        ) : null}
                      </div>
                    </div>
                  );

                  if (isUnlocked) {
                    return (
                      <Link
                        key={lesIdx}
                        href={`/kursus-saya/${enrollmentOrSlug}/belajar/${currentModIdx}/${lesIdx}`}
                        className={`p-2.5 px-3 rounded-xl border text-xs transition-colors flex items-center ${
                          isActive
                            ? "bg-emerald-500/15 dark:bg-emerald-500/20 text-[#0F3E2E] dark:text-emerald-300 font-bold border-emerald-500/40"
                            : "bg-white/60 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800/60 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60 hover:border-stone-300"
                        }`}
                        title={lesCleanTitle}
                      >
                        {itemContent}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={lesIdx}
                      className="p-2.5 px-3 rounded-xl border border-stone-200/40 dark:border-stone-800/40 bg-stone-100/30 dark:bg-stone-900/20 text-stone-400 text-xs cursor-not-allowed flex items-center opacity-60"
                      title="Topik terkunci. Selesaikan materi sebelumnya terlebih dahulu."
                    >
                      {itemContent}
                    </div>
                  );
                })}
              </div>

              {/* tautan ke detail kursus dan papan peringkat kelas */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800/60 space-y-1">
                {isAllCourseCompleted ? (
                  <Link
                    href={`/kursus-saya/${enrollmentOrSlug}?tab=leaderboard`}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-600" />
                      <span>Lihat Peringkat Kelas</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    href={`/kursus-saya/${enrollmentOrSlug}?tab=leaderboard`}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-stone-400" />
                      <span>Peringkat Kelas (Terkunci)</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}

                <Link
                  href={`/kursus-saya/${enrollmentOrSlug}`}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors"
                >
                  <span>Lihat Semua Silabus</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* modal konfirmasi kirim jawaban kuis */}
        <ConfirmModal
          isOpen={showQuizConfirmModal}
          onClose={() => setShowQuizConfirmModal(false)}
          onConfirm={() => {
            setShowQuizConfirmModal(false);
            handleQuizSubmit();
          }}
          title="Kirim Jawaban Kuis"
          description="Apakah Anda yakin ingin mengirimkan jawaban kuis ini? Pastikan seluruh soal telah Anda jawab dengan teliti, karena setelah terkirim jawaban tidak dapat diubah lagi dan nilai kuis bersifat final."
          confirmText="Ya, Kirim Sekarang"
          cancelText="Periksa Kembali"
          variant="primary"
        />

        {/* modal konfirmasi kirim jawaban essay */}
        <ConfirmModal
          isOpen={showEssayConfirmModal}
          onClose={() => setShowEssayConfirmModal(false)}
          onConfirm={() => {
            setShowEssayConfirmModal(false);
            handleExecuteEssaySubmit();
          }}
          title="Kirim Jawaban Evaluasi Essay?"
          description="Jawaban essay Anda akan dinilai langsung secara objektif oleh sistem dalam rentang nilai 0-100 beserta alasan penilaian. Apakah Anda yakin ingin mengirimkan jawaban ini?"
          confirmText="Ya, Kirim Jawaban"
          cancelText="Periksa Lagi"
          variant="primary"
        />
      </div>
  );
}
