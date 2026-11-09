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
  Sparkles,
  Trophy,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TopicWorkspaceSkeleton } from "@/components/ui/Skeleton";
import { StudentEnrollmentItem } from "../../../../DashboardPesertaClient";
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

  // daftar kunci topik yang telah diselesaikan
  const [completedLessons, setCompletedLessons] = React.useState<string[]>([]);

  // status kuis interaktif
  const [quizAnswers, setQuizAnswers] = React.useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = React.useState(false);
  const [quizScore, setQuizScore] = React.useState<number | null>(null);

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
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
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

  // html konten yang siap dirender
  const activeFormattedHtml = React.useMemo(() => {
    return formatContentHtml(currentLesson?.content);
  }, [currentLesson?.content]);

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

  const handleQuizSubmit = () => {
    if (currentQuizQuestions.length === 0) return;
    let correct = 0;
    currentQuizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correct_index) correct++;
    });
    const score = Math.round((correct / currentQuizQuestions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);

    if (score >= 60 && !completedLessons.includes(currentLessonKey)) {
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
      <div className="min-h-screen bg-stone-50 dark:bg-[#0C0A09] text-stone-900 dark:text-stone-100 py-12 px-4 transition-colors flex items-center justify-center">
        <div className="text-center p-8 max-w-md w-full space-y-4 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
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
      <div className="min-h-screen bg-stone-50 dark:bg-[#0C0A09] text-stone-900 dark:text-stone-100 py-12 px-4 transition-colors flex items-center justify-center">
        <div className="text-center p-8 max-w-md w-full space-y-4 rounded-3xl border border-amber-500/30 bg-white dark:bg-stone-900 shadow-sm">
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

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0C0A09] text-stone-900 dark:text-stone-100 py-6 sm:py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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

          <div className="p-6 sm:p-7 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                  Ruang Belajar Mandiri
                </span>
                <span className="text-stone-300 dark:text-stone-700">&bull;</span>
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 truncate">
                  {course.title}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
                {activeCleanTitle}
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                Modul {currentModIdx + 1} &bull; {currentModule?.title || "Modul Belajar"}
              </p>
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
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-400 text-right">
                {completedCount} dari {totalLessons} topik selesai
              </p>
            </div>
          </div>
        </div>

        {/* tata letak grid dua kolom konsisten dengan seluruh halaman */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* kolom kiri konten materi dan interaksi belajar */}
          <main className="lg:col-span-8 space-y-6">
            {currentLesson ? (
              <div className="space-y-6">
                {/* tajuk status topik */}
                <div className="p-5 sm:p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md shadow-xs space-y-3">
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
                      {currentLesson.duration && (
                        <span className="text-xs text-stone-400 font-medium">
                          {currentLesson.duration}
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                    {activeCleanTitle}
                  </h2>
                </div>

                {/* video materi jika ada */}
                {currentLesson.video_url && (
                  <div className="relative aspect-video rounded-3xl overflow-hidden border border-stone-200/80 dark:border-stone-800/80 bg-black shadow-md">
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
                  <div className="p-6 sm:p-8 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md shadow-xs space-y-4">
                    <div
                      className="prose dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed text-stone-800 dark:text-stone-200 [&_h1]:text-xl sm:[&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-stone-900 dark:[&_h1]:text-stone-100 [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-lg sm:[&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-stone-900 dark:[&_h2]:text-stone-100 [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-base sm:[&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-stone-900 dark:[&_h3]:text-stone-100 [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3 [&_li]:my-1.5 [&_pre]:bg-stone-900 dark:[&_pre]:bg-black/90 [&_pre]:text-stone-100 [&_pre]:p-4 [&_pre]:rounded-2xl [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-stone-800 [&_code]:bg-stone-100 dark:[&_code]:bg-stone-800 [&_code]:text-emerald-700 dark:[&_code]:text-emerald-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-xs [&_table]:w-full [&_table]:my-4 [&_table]:border-collapse [&_th]:border [&_th]:border-stone-200 dark:[&_th]:border-stone-700 [&_th]:p-2.5 [&_th]:bg-stone-100 dark:[&_th]:bg-stone-800 [&_th]:text-left [&_th]:font-bold [&_td]:border [&_td]:border-stone-200 dark:[&_td]:border-stone-700 [&_td]:p-2.5 [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-600 [&_blockquote]:bg-emerald-50/50 dark:[&_blockquote]:bg-emerald-950/20 [&_blockquote]:p-4 [&_blockquote]:rounded-r-2xl [&_blockquote]:my-4"
                      dangerouslySetInnerHTML={{ __html: activeFormattedHtml }}
                    />
                  </div>
                )}

                {/* kuis evaluasi materi */}
                {currentLesson.type === "quiz" && (
                  <div className="p-6 sm:p-7 rounded-3xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-6">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>Kuis Evaluasi Pemahaman</span>
                    </div>

                    {currentQuizQuestions.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-3 p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800/80">
                        <p className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                          {qIdx + 1}. {q.question}
                        </p>
                        <div className="space-y-2 pt-1">
                          {q.options?.map((opt, optIdx) => {
                            const isSelected = quizAnswers[qIdx] === optIdx;
                            const isCorrect = optIdx === q.correct_index;
                            let btnStyle = "border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800";
                            if (quizSubmitted) {
                              if (isCorrect) btnStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold";
                              else if (isSelected && !isCorrect) btnStyle = "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-400";
                            } else if (isSelected) {
                              btnStyle = "border-[#0F3E2E] dark:border-emerald-400 bg-emerald-500/10 font-semibold";
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
                                className={`w-full p-3.5 rounded-xl border text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${btnStyle}`}
                              >
                                <span>{opt}</span>
                                {quizSubmitted && isCorrect && (
                                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-2">
                      {!quizSubmitted ? (
                        <Button
                          size="md"
                          onClick={handleQuizSubmit}
                          disabled={Object.keys(quizAnswers).length < currentQuizQuestions.length}
                          className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs gap-2 font-bold py-2.5 px-5 rounded-xl"
                        >
                          <Check className="w-4 h-4" />
                          <span>Kirim Jawaban Kuis</span>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                            Skor Anda: {quizScore}%
                          </span>
                          <Badge
                            variant={quizScore && quizScore >= 60 ? "approved" : "rejected"}
                            className="text-xs px-3 py-1 font-bold"
                          >
                            {quizScore && quizScore >= 60 ? "Lulus Kuis" : "Belum Lulus"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* praktik koding */}
                {currentLesson.type === "practice" && (
                  <div className="p-6 rounded-3xl bg-stone-900 text-stone-100 border border-stone-800 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                        <Code className="w-4 h-4" />
                        <span>Instruksi & Contoh Kode Praktik</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyCodeSnippet(
                            currentLesson.starter_code || currentLesson.content || ""
                          )
                        }
                        className="p-1.5 px-3 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? "Tersalin!" : "Salin Kode"}</span>
                      </button>
                    </div>

                    <pre className="p-4 sm:p-5 rounded-2xl bg-black/70 font-mono text-xs sm:text-sm overflow-x-auto text-emerald-300 whitespace-pre-wrap leading-relaxed border border-stone-800">
                      {currentLesson.starter_code || currentLesson.content || "// latihan kode program"}
                    </pre>
                  </div>
                )}

                {/* pengumpulan tugas proyek */}
                {currentLesson.type === "project" && (
                  <div className="p-6 sm:p-7 rounded-3xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-500/10 space-y-4">
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
                <div className="p-4 sm:p-5 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-xs">
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
              <div className="text-center py-20 space-y-4 p-8 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto text-stone-400">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                    Materi Pembelajaran Tidak Ditemukan
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Silakan pilih materi yang tersedia pada daftar silabus di sisi kanan.
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

          {/* kolom kanan daftar silabus modul navigator */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md p-5 sm:p-6 shadow-xs space-y-4">
              <div className="space-y-1 pb-2 border-b border-stone-100 dark:border-stone-800/60">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Daftar Silabus & Modul</span>
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  {modules.length} Modul &bull; {totalLessons} Topik Pembelajaran
                </p>
              </div>

              <div className="max-h-[calc(100vh-220px)] overflow-y-auto space-y-2.5 pr-1">
                {modules.map((mod, modIdx) => {
                  const isOpen = !!openModules[modIdx];
                  const isCurrentModule = modIdx === currentModIdx;

                  return (
                    <div
                      key={modIdx}
                      className="rounded-2xl overflow-hidden border border-stone-200/70 dark:border-stone-800/70 bg-stone-50/60 dark:bg-stone-900/40"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenModules((prev) => ({
                            ...prev,
                            [modIdx]: !prev[modIdx],
                          }))
                        }
                        className={`w-full p-3.5 flex items-start justify-between gap-2.5 text-left cursor-pointer transition-colors ${
                          isCurrentModule
                            ? "bg-emerald-500/10 dark:bg-emerald-500/15"
                            : "hover:bg-stone-100/70 dark:hover:bg-stone-800/50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg font-mono font-bold text-[11px] flex items-center justify-center shrink-0 ${
                              isCurrentModule
                                ? "bg-[#0F3E2E] text-white dark:bg-emerald-600"
                                : "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                            }`}
                          >
                            {String(modIdx + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              {mod.title}
                            </p>
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              {mod.lessons?.length || 0} Materi
                            </p>
                          </div>
                        </div>

                        <div className="p-1 rounded-md text-stone-400 shrink-0">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {isOpen && mod.lessons && (
                        <div className="divide-y divide-stone-100 dark:divide-stone-800/40 bg-white dark:bg-stone-900/60">
                          {mod.lessons.map((les, lesIdx) => {
                            const lessonKey = `mod-${modIdx}-les-${lesIdx}`;
                            const isCompleted = completedLessons.includes(lessonKey);
                            const isActive = modIdx === currentModIdx && lesIdx === currentLesIdx;
                            const lesCleanTitle = cleanTopicTitle(les.title, les.content);

                            return (
                              <Link
                                key={lesIdx}
                                href={`/kursus-saya/${enrollmentOrSlug}/belajar/${modIdx}/${lesIdx}`}
                                className={`p-3 px-3.5 flex items-center justify-between gap-2.5 text-xs transition-colors ${
                                  isActive
                                    ? "bg-emerald-500/15 dark:bg-emerald-500/20 text-[#0F3E2E] dark:text-emerald-300 font-bold border-l-4 border-[#0F3E2E] dark:border-emerald-400"
                                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/40"
                                }`}
                                title={lesCleanTitle}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="shrink-0">
                                    {les.type === "practice" ? (
                                      <Code className="w-3.5 h-3.5 text-blue-500" />
                                    ) : les.type === "quiz" ? (
                                      <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                                    ) : les.type === "project" ? (
                                      <Award className="w-3.5 h-3.5 text-purple-500" />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                    )}
                                  </div>
                                  <span className="truncate">{lesCleanTitle}</span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isCompleted && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
