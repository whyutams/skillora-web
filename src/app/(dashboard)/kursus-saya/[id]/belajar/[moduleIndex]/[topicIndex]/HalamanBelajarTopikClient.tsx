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
  const [copiedCode, setCopiedCode] = React.useState(false);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, [enrollmentOrSlug]);

  React.useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // sinkronkan progres dari local storage saat pendaftaran termuat
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

  // buka accordion modul saat indeks modul berubah
  React.useEffect(() => {
    setOpenModules((prev) => ({
      ...prev,
      [currentModIdx]: true,
    }));
    setCopiedCode(false);
  }, [currentModIdx, currentLesIdx]);

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
    if (
      currentLesson?.type === "practice" &&
      !currentLesson?.starter_code &&
      (currentLesson?.content?.includes("#include") || currentLesson?.content?.includes("def "))
    ) {
      return "";
    }
    return formatContentHtml(currentLesson?.content);
  }, [
    currentLesson?.instructions,
    currentLesson?.content,
    currentLesson?.type,
    currentLesson?.starter_code,
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

  const handleMarkAndContinue = () => {
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

  // kuis data
  const currentQuizQuestions: CourseQuizQuestion[] = React.useMemo(() => {
    if (!currentLesson || currentLesson.type !== "quiz") return [];
    const qData = currentLesson.quiz_data;
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
  }, [currentLesson]);

  // inisialisasi kuis interaktif dengan pengacakan opsi dan pemulihan riwayat nilai tersimpan
  React.useEffect(() => {
    if (!currentLesson || currentLesson.type !== "quiz" || currentQuizQuestions.length === 0) {
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
      setQuizScore(savedData.score ?? 0);
      setQuizCorrectCount(savedData.correctCount ?? 0);
      setQuizSubmitted(true);
    } else {
      // buat urutan acak baru untuk opsi setiap pertanyaan kuis
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
    }
  }, [currentLesson, currentQuizQuestions, currentLessonKey, enrollment?.id]);

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

    const score = Math.round((correct / shuffledQuestions.length) * 100);
    setQuizScore(score);
    setQuizCorrectCount(correct);
    setQuizSubmitted(true);

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
    if (!completedLessons.includes(currentLessonKey)) {
      toggleLessonCompletion(currentLessonKey);
    }
  };

  const handleSaveProjectSubmission = () => {
    if (!projectSubmissionUrl.trim() || !enrollment?.id) return;
    try {
      localStorage.setItem(`skillora_project_${enrollment.id}`, projectSubmissionUrl.trim());
      setProjectSubmittedUrl(projectSubmissionUrl.trim());
      setProjectSavedNotice(true);
      if (!completedLessons.includes(currentLessonKey)) {
        toggleLessonCompletion(currentLessonKey);
      }
      setTimeout(() => setProjectSavedNotice(false), 3000);
    } catch {
      // non blocking
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

                {/* konten materi teks bacaan yang dirender sempurna dengan styling typography */}
                {activeFormattedHtml && (
                  <div className="p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md shadow-xs space-y-4">
                    <div
                      className="learning-content w-full"
                      dangerouslySetInnerHTML={{ __html: activeFormattedHtml }}
                    />
                  </div>
                )}

                {/* kuis evaluasi materi */}
                {currentLesson.type === "quiz" && (
                  <div className="p-5 sm:p-7 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#161413] shadow-sm space-y-6">
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
                              <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm sm:text-base leading-relaxed flex-1">
                                {q.question}
                              </p>
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
                                      <span className="leading-snug break-words flex-1">
                                        {opt.text}
                                      </span>
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
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 block uppercase tracking-wider">
                              Hasil Evaluasi Anda
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-[#0F3E2E] dark:text-emerald-400">
                                {quizScore}
                              </span>
                              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                                / 100 ({quizCorrectCount} dari {shuffledQuestions.length} soal benar)
                              </span>
                            </div>
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
                {(currentLesson.type === "practice" || Boolean(currentLesson.starter_code)) && (
                  <WebCodeEditor
                    initialCode={
                      currentLesson.starter_code ||
                      (currentLesson.content?.includes("#include") ||
                      currentLesson.content?.includes("def ") ||
                      currentLesson.content?.includes("<html")
                        ? currentLesson.content
                        : "// tulis kode program anda di sini\n")
                    }
                    language={courseTopic === "general" ? "cpp" : courseTopic}
                    title={`Praktik: ${activeCleanTitle}`}
                    tips={
                      currentLesson.instructions &&
                      currentLesson.content &&
                      !currentLesson.content.includes("#include")
                        ? currentLesson.content
                        : undefined
                    }
                  />
                )}

                {/* pengumpulan tugas proyek */}
                {currentLesson.type === "project" && (
                  <div className="p-6 sm:p-7 rounded-2xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-500/10 space-y-4">
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-xs uppercase tracking-wider">
                      <Award className="w-4 h-4" />
                      <span>Pengumpulan Tugas Proyek</span>
                    </div>

                    <p className="text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                      Silakan cantumkan tautan repositori GitHub, link demo aplikasi, atau dokumen Google Drive hasil pengerjaan proyek mandiri Anda.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <input
                        type="url"
                        value={projectSubmissionUrl}
                        onChange={(e) => setProjectSubmissionUrl(e.target.value)}
                        placeholder="https://github.com/username/project"
                        className="flex-1 p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveProjectSubmission}
                        disabled={!projectSubmissionUrl.trim()}
                        className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs font-bold py-3 px-5 rounded-xl shrink-0"
                      >
                        <span>Simpan Proyek</span>
                      </Button>
                    </div>

                    {projectSavedNotice && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                        Tautan proyek Anda telah berhasil disimpan!
                      </p>
                    )}

                    {projectSubmittedUrl && !projectSavedNotice && (
                      <p className="text-xs text-stone-400 truncate">
                        Tersimpan:{" "}
                        <a
                          href={projectSubmittedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-emerald-600 hover:text-emerald-700"
                        >
                          {projectSubmittedUrl}
                        </a>
                      </p>
                    )}
                  </div>
                )}

                {/* bilah navigasi materi bawah */}
                <div className="p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleLessonCompletion(currentLessonKey)}
                    className={`gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors ${
                      isCurrentLessonCompleted
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300"
                    }`}
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

                  <div className="flex items-center gap-2">
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

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleMarkAndContinue}
                      className="gap-2 bg-[#0F3E2E] hover:bg-[#16533e] text-white text-xs font-bold py-2.5 px-4 rounded-xl"
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

              {/* tautan ke detail kursus di luar ruang belajar */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800/60">
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
      </div>
  );
}
