"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Save,
  RefreshCw,
  FileText,
  Code,
  HelpCircle,
  Award,
  Video,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { HtmlEditor } from "@/components/ui/HtmlEditor";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AlertModal } from "@/components/ui/ModalKonfirmasi";
import {
  CourseLessonItem,
  CourseModuleItem,
  CourseQuizQuestion,
} from "@/utils/courseCurriculumParser";

interface HalamanEditTopikClientProps {
  courseId: string;
  moduleIndexStr: string;
  topicIndexStr: string;
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export default function HalamanEditTopikClient({
  courseId,
  moduleIndexStr,
  topicIndexStr,
}: HalamanEditTopikClientProps) {
  const router = useRouter();
  const moduleIndex = parseInt(moduleIndexStr, 10);
  const topicIndex = parseInt(topicIndexStr, 10);

  const [loading, setLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [course, setCourse] = React.useState<any>(null);
  const [syllabus, setSyllabus] = React.useState<CourseModuleItem[]>([]);
  const [currentModule, setCurrentModule] = React.useState<CourseModuleItem | null>(null);

  // form state topik
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<CourseLessonItem["type"]>("reading");
  const [duration, setDuration] = React.useState("15 Menit");
  const [content, setContent] = React.useState("");
  const [videoUrl, setVideoUrl] = React.useState("");
  const [starterCode, setStarterCode] = React.useState("");
  const [instructions, setInstructions] = React.useState("");

  // kuis dengan banyak soal
  const [quizQuestions, setQuizQuestions] = React.useState<CourseQuizQuestion[]>([
    {
      question: "",
      options: ["", "", "", ""],
      correct_index: 0,
      explanation: "",
    },
  ]);

  // data proyek
  const [projectBrief, setProjectBrief] = React.useState("");
  const [projectCriteria, setProjectCriteria] = React.useState("");
  const [projectStarterUrl, setProjectStarterUrl] = React.useState("");

  // modal notifikasi
  const [alertData, setAlertData] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
    redirectOnClose?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    redirectOnClose: false,
  });

  // muat rincian kursus dan silabus
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data kursus.");

      const found = (data.courses || []).find((c: { id: string }) => c.id === courseId);
      if (!found) throw new Error("Kursus tidak ditemukan.");

      setCourse(found);

      const parsedSyllabus: CourseModuleItem[] = Array.isArray(found.syllabus)
        ? found.syllabus
        : [];
      setSyllabus(parsedSyllabus);

      const targetMod = parsedSyllabus[moduleIndex];
      if (!targetMod) {
        throw new Error(`Modul ke-${moduleIndex + 1} tidak ditemukan.`);
      }
      setCurrentModule(targetMod);

      const targetLesson = (targetMod.lessons || [])[topicIndex];
      if (!targetLesson) {
        throw new Error(`Topik ke-${topicIndex + 1} tidak ditemukan pada modul ini.`);
      }

      // inisialisasi form
      setTitle(targetLesson.title || "");
      setType(targetLesson.type || "reading");
      setDuration(targetLesson.duration || "15 Menit");
      setContent(targetLesson.content || "");
      setVideoUrl(targetLesson.video_url || "");
      setStarterCode(targetLesson.starter_code || "");
      setInstructions(targetLesson.instructions || "");

      // inisialisasi kuis banyak soal
      if (targetLesson.quiz_data) {
        const qd = targetLesson.quiz_data;
        if (Array.isArray(qd.questions) && qd.questions.length > 0) {
          setQuizQuestions(
            qd.questions.map((q) => ({
              question: q.question || "",
              options:
                Array.isArray(q.options) && q.options.length >= 4
                  ? q.options.slice(0, 4)
                  : [q.options?.[0] || "", q.options?.[1] || "", q.options?.[2] || "", q.options?.[3] || ""],
              correct_index: typeof q.correct_index === "number" ? q.correct_index : 0,
              explanation: q.explanation || "",
            }))
          );
        } else if (qd.question) {
          // konversi soal tunggal lawas ke list soal
          setQuizQuestions([
            {
              question: qd.question || "",
              options:
                Array.isArray(qd.options) && qd.options.length >= 4
                  ? qd.options.slice(0, 4)
                  : ["", "", "", ""],
              correct_index: typeof qd.correct_index === "number" ? qd.correct_index : 0,
              explanation: qd.explanation || "",
            },
          ]);
        }
      }

      // inisialisasi proyek
      if (targetLesson.project_data) {
        setProjectBrief(targetLesson.project_data.brief || "");
        setProjectCriteria(targetLesson.project_data.criteria || "");
        setProjectStarterUrl(targetLesson.project_data.starter_url || "");
      }
    } catch (err: unknown) {
      setAlertData({
        isOpen: true,
        title: "Gagal Membuka Topik",
        message: err instanceof Error ? err.message : "Terjadi kesalahan server.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [courseId, moduleIndex, topicIndex]);

  React.useEffect(() => {
    if (courseId && !isNaN(moduleIndex) && !isNaN(topicIndex)) {
      loadData();
    }
  }, [courseId, moduleIndex, topicIndex, loadData]);

  // tambah soal kuis baru
  const handleAddQuestion = () => {
    setQuizQuestions((prev) => [
      ...prev,
      {
        question: "",
        options: ["", "", "", ""],
        correct_index: 0,
        explanation: "",
      },
    ]);
  };

  // hapus satu soal kuis
  const handleRemoveQuestion = (idx: number) => {
    if (quizQuestions.length <= 1) {
      setAlertData({
        isOpen: true,
        title: "Perhatian",
        message: "Kuis wajib memiliki minimal 1 pertanyaan soal.",
        type: "info",
      });
      return;
    }
    setQuizQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // ubah pertanyaan kuis
  const handleQuestionChange = (idx: number, field: keyof CourseQuizQuestion, value: any) => {
    setQuizQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // ubah salah satu opsi jawaban (A, B, C, D)
  const handleOptionChange = (qIdx: number, optIdx: number, val: string) => {
    setQuizQuestions((prev) => {
      const copy = [...prev];
      const newOpts = [...copy[qIdx].options];
      newOpts[optIdx] = val;
      copy[qIdx] = { ...copy[qIdx], options: newOpts };
      return copy;
    });
  };

  // simpan seluruh perubahan topik ke kursus
  const handleSave = async () => {
    if (!title.trim()) {
      setAlertData({
        isOpen: true,
        title: "Validasi Gagal",
        message: "Judul topik materi wajib diisi.",
        type: "error",
      });
      return;
    }

    if (type === "quiz") {
      const emptyQ = quizQuestions.find((q) => !q.question.trim());
      if (emptyQ) {
        setAlertData({
          isOpen: true,
          title: "Validasi Kuis",
          message: "Terdapat pertanyaan soal kuis yang masih kosong. Mohon lengkapi seluruh pertanyaan.",
          type: "error",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      // salin silabus dan perbarui item topik ini
      const updatedSyllabus = syllabus.map((mod, mIdx) => {
        if (mIdx !== moduleIndex) return mod;

        const updatedLessons = (mod.lessons || []).map((les, lIdx) => {
          if (lIdx !== topicIndex) return les;

          const updatedItem: CourseLessonItem = {
            ...les,
            title: title.trim(),
            type,
            duration: duration.trim() || "15 Menit",
          };

          if (type === "reading") {
            updatedItem.content = content;
            updatedItem.video_url = videoUrl.trim();
            delete updatedItem.starter_code;
            delete updatedItem.instructions;
            delete updatedItem.quiz_data;
            delete updatedItem.project_data;
          } else if (type === "practice") {
            updatedItem.instructions = instructions;
            updatedItem.starter_code = starterCode;
            updatedItem.content = content;
            delete updatedItem.video_url;
            delete updatedItem.quiz_data;
            delete updatedItem.project_data;
          } else if (type === "quiz") {
            const firstQ = quizQuestions[0] || {
              question: "",
              options: ["", "", "", ""],
              correct_index: 0,
              explanation: "",
            };
            updatedItem.quiz_data = {
              question: firstQ.question,
              options: firstQ.options,
              correct_index: firstQ.correct_index,
              explanation: firstQ.explanation,
              questions: quizQuestions,
            };
            delete updatedItem.content;
            delete updatedItem.video_url;
            delete updatedItem.starter_code;
            delete updatedItem.instructions;
            delete updatedItem.project_data;
          } else if (type === "project") {
            updatedItem.project_data = {
              brief: projectBrief,
              criteria: projectCriteria,
              starter_url: projectStarterUrl.trim(),
            };
            delete updatedItem.content;
            delete updatedItem.video_url;
            delete updatedItem.starter_code;
            delete updatedItem.instructions;
            delete updatedItem.quiz_data;
          }

          return updatedItem;
        });

        return {
          ...mod,
          lessons: updatedLessons,
        };
      });

      const res = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: courseId,
          syllabus: updatedSyllabus,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Gagal menyimpan topik.");

      setAlertData({
        isOpen: true,
        title: "Perubahan Topik Berhasil Disimpan",
        message: `Materi "${title}" pada Modul ${moduleIndex + 1} telah berhasil diperbarui ke database.`,
        type: "success",
        redirectOnClose: true,
      });
    } catch (err: unknown) {
      setAlertData({
        isOpen: true,
        title: "Gagal Menyimpan",
        message: err instanceof Error ? err.message : "Terjadi kesalahan server.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getLessonIcon = (t: CourseLessonItem["type"]) => {
    switch (t) {
      case "reading":
        return <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "practice":
        return <Code className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "quiz":
        return <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "project":
        return <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-stone-400 space-y-2">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
        <p>Memuat editor topik materi...</p>
      </div>
    );
  }

  if (!course || !currentModule) {
    return (
      <div className="p-12 text-center text-stone-500 space-y-3">
        <p>Topik materi tidak ditemukan.</p>
        <Link href={`/admin/courses/${courseId}`}>
          <Button variant="outline" size="sm">
            Kembali ke Detail Kursus
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80 dark:border-stone-800/80">
        <div className="space-y-2">
          <Link
            href={`/admin/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 shadow-2xs transition-all w-fit"
          >
            <ChevronLeft className="w-4 h-4 text-stone-500" />
            <span>Kembali ke Detail Kursus</span>
          </Link>

          <div className="pt-1">
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
              <span>Edit Topik Materi Pembelajaran</span>
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {course.title} • Modul {moduleIndex + 1}: <span className="font-semibold text-stone-700 dark:text-stone-300">{currentModule.title}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/admin/courses/${courseId}`}>
            <Button variant="outline" size="sm" className="text-xs">
              Batal
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs font-bold gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan Topik"}</span>
          </Button>
        </div>
      </div>

      {/* Form Informasi Dasar Topik */}
      <Card className="p-6 border-stone-200/80 dark:border-stone-800/80 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
            Informasi Pokok Topik
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Tentukan judul dan mode tipe pembelajaran materi ini.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
              Judul Topik Materi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pengenalan Variabel dan Tipe Data Dasar"
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
              Mode / Tipe Topik Pembelajaran
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CourseLessonItem["type"])}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
            >
              <option value="reading">Bacaan Teori & Video (HTML Editor)</option>
              <option value="practice">Latihan Koding Praktik (Monospace Starter Code)</option>
              <option value="quiz">Kuis Pilihan Ganda (Banyak Soal)</option>
              <option value="project">Tugas Proyek Mandiri (Brief & Kriteria)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Editor Konten Berdasarkan Tipe Topik */}
      {type === "reading" && (
        <Card className="p-6 border-stone-200/80 dark:border-stone-800/80 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Konten Bacaan & Video Pembelajaran
              </h2>
              <p className="text-xs text-stone-500">
                Tuliskan materi pembelajaran lengkap dengan dukungan tipografi teks, tautan, gambar, dan video YouTube.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-red-500" />
                <span>Tautan Video YouTube (Opsional)</span>
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
              />
              {getYouTubeEmbedUrl(videoUrl) && (
                <div className="relative aspect-video max-w-md rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 mt-2 bg-black shadow-md">
                  <iframe
                    src={getYouTubeEmbedUrl(videoUrl)!}
                    title="Pratinjau Video YouTube"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Naskah Konten Materi (HTML Editor)
              </label>
              <HtmlEditor
                value={content}
                onChange={(val) => setContent(val)}
                placeholder="Tuliskan naskah materi lengkap di sini. Anda dapat memformat paragraf, judul, daftar butir, dan menyisipkan media..."
                minHeight="350px"
              />
            </div>
          </div>
        </Card>
      )}

      {type === "practice" && (
        <Card className="p-6 border-stone-200/80 dark:border-stone-800/80 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Latihan Koding Interaktif
              </h2>
              <p className="text-xs text-stone-500">
                Sediakan instruksi tugas praktik dan template kode awal untuk dikerjakan mahasiswa.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Instruksi & Panduan Pengerjaan
              </label>
              <HtmlEditor
                value={instructions}
                onChange={(val) => setInstructions(val)}
                placeholder="Tuliskan instruksi langkah demi langkah apa yang harus dikerjakan oleh mahasiswa..."
                minHeight="200px"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Kerangka Kode Awal (Starter Code Monospace)
              </label>
              <textarea
                rows={8}
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                placeholder="// Tuliskan starter code atau fungsi awal di sini..."
                className="w-full p-4 font-mono text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-900 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Catatan Solusi / Tips Pendukung (Opsional)
              </label>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tips pemecahan masalah atau catatan penting untuk mahasiswa..."
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] resize-none"
              />
            </div>
          </div>
        </Card>
      )}

      {type === "quiz" && (
        <Card className="p-6 border-stone-200/80 dark:border-stone-800/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Daftar Soal Kuis ({quizQuestions.length} Soal)
                </h2>
                <p className="text-xs text-stone-500">
                  Kelola soal-soal kuis pilihan ganda, pilihan jawaban A-D, dan tentukan kunci jawaban yang benar.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddQuestion}
              className="gap-1.5 text-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Soal Baru</span>
            </Button>
          </div>

          <div className="space-y-6">
            {quizQuestions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 space-y-4 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 dark:border-stone-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#0F3E2E] text-white font-bold text-xs flex items-center justify-center">
                      {qIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Soal Kuis #{qIdx + 1}
                    </span>
                  </div>

                  {quizQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Hapus Soal Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Soal</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                    Kalimat Pertanyaan Soal <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={q.question}
                    onChange={(e) => handleQuestionChange(qIdx, "question", e.target.value)}
                    placeholder={`Tuliskan pertanyaan untuk soal nomor ${qIdx + 1}...`}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] resize-none"
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                      Opsi Pilihan Jawaban & Kunci Benar
                    </label>
                    <span className="text-[11px] text-stone-400">
                      Tandai radio button untuk jawaban yang benar
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {["A", "B", "C", "D"].map((letter, optIdx) => {
                      const isCorrect = q.correct_index === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                            isCorrect
                              ? "border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/20"
                              : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950"
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="radio"
                              name={`correct_q_${qIdx}`}
                              checked={isCorrect}
                              onChange={() => handleQuestionChange(qIdx, "correct_index", optIdx)}
                              className="accent-emerald-600 w-4 h-4 cursor-pointer"
                            />
                            <span
                              className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                                isCorrect
                                  ? "bg-emerald-600 text-white"
                                  : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                              }`}
                            >
                              {letter}
                            </span>
                          </label>

                          <input
                            type="text"
                            value={q.options[optIdx] || ""}
                            onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                            placeholder={`Teks pilihan ${letter}`}
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-transparent focus:border-stone-300 dark:focus:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                    Penjelasan / Pembahasan Jawaban (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={q.explanation || ""}
                    onChange={(e) => handleQuestionChange(qIdx, "explanation", e.target.value)}
                    placeholder="Jelaskan alasan mengapa opsi tersebut benar..."
                    className="w-full px-4 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E] resize-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddQuestion}
              className="gap-1.5 text-xs border-dashed"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Soal Kuis Selanjutnya</span>
            </Button>
          </div>
        </Card>
      )}

      {type === "project" && (
        <Card className="p-6 border-stone-200/80 dark:border-stone-800/80 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Tugas Proyek Mandiri
              </h2>
              <p className="text-xs text-stone-500">
                Tentukan skenario proyek praktikum nyata dan kriteria kelulusan mahasiswa.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Skenario & Penugasan Proyek
              </label>
              <HtmlEditor
                value={projectBrief}
                onChange={(val) => setProjectBrief(val)}
                placeholder="Jelaskan skenario proyek yang harus diselesaikan mahasiswa..."
                minHeight="200px"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Kriteria Penilaian & Syarat Kelulusan (Tiap Baris)
              </label>
              <textarea
                rows={4}
                value={projectCriteria}
                onChange={(e) => setProjectCriteria(e.target.value)}
                placeholder="- Responsif di perangkat ponsel dan desktop&#10;- Bebas error pada console browser&#10;- Struktur kode bersih dan modular"
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Tautan Starter Repository / Dokumen Acuan (Opsional)
              </label>
              <input
                type="url"
                value={projectStarterUrl}
                onChange={(e) => setProjectStarterUrl(e.target.value)}
                placeholder="https://github.com/... atau https://drive.google.com/..."
                className="w-full px-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Floating / Bottom Action Bar */}
      <div className="sticky bottom-6 z-20 p-4 rounded-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 shadow-xl flex items-center justify-between gap-4">
        <Link
          href={`/admin/courses/${courseId}`}
          className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
        >
          ← Batalkan & Kembali ke Detail Kursus
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#0F3E2E] hover:bg-[#15523d] text-white text-xs font-bold gap-1.5 px-5 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Menyimpan Perubahan..." : "Simpan Perubahan Topik"}</span>
          </Button>
        </div>
      </div>

      {/* Modal Notifikasi */}
      <AlertModal
        isOpen={alertData.isOpen}
        onClose={() => {
          setAlertData((prev) => ({ ...prev, isOpen: false }));
          if (alertData.redirectOnClose) {
            router.push(`/admin/courses/${courseId}`);
          }
        }}
        title={alertData.title}
        message={alertData.message}
        type={alertData.type}
      />
    </div>
  );
}

