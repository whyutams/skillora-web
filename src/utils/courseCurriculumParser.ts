import { Course } from "@/types/database";

export interface CourseQuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

export interface CourseLessonItem {
  id?: string;
  title: string;
  type: "reading" | "practice" | "quiz" | "project";
  duration?: string;
  content?: string;
  video_url?: string;
  starter_code?: string;
  instructions?: string;
  quiz_data?: {
    question?: string;
    options?: string[];
    correct_index?: number;
    explanation?: string;
    questions?: CourseQuizQuestion[];
  };
  project_data?: {
    brief?: string;
    criteria?: string;
    starter_url?: string;
  };
}

export interface CourseModuleItem {
  moduleNumber: number;
  title: string;
  description: string;
  duration: string;
  lessons: CourseLessonItem[];
  isPreview?: boolean;
}

export interface CourseInstructor {
  name: string;
  title: string;
  avatarUrl: string;
  bio: string;
}

export interface CourseGradingScheme {
  moduleWeight: string;
  quizWeight: string;
  projectWeight: string;
  passingScore: number;
}

export interface CourseCurriculum {
  level: string;
  category: string;
  estimatedHours: number;
  totalModules: number;
  instructor: CourseInstructor;
  targetLearning: string[];
  prerequisites: string[];
  gradingScheme: CourseGradingScheme;
  modules: CourseModuleItem[];
}

export interface CourseReviewItem {
  id: string;
  userName: string;
  userSchool: string;
  avatarUrl: string;
  rating: number;
  comment: string;
  date: string;
  isVerified: boolean;
}

export const DEFAULT_TOPIC_CURRICULA: Record<string, any> = {};
export const DEFAULT_GENERAL_CURRICULUM: any = { modules: [] };

// mendeteksi topik kursus dari slug atau judul
export function detectCourseTopic(slugOrTitle: string): "python" | "cpp" | "web" | "general" {
  const lower = (slugOrTitle || "").toLowerCase();
  if (lower.includes("python")) return "python";
  if (lower.includes("c++") || lower.includes("cpp") || lower.includes("dasar-pemrograman-c")) return "cpp";
  if (lower.includes("web") || lower.includes("html") || lower.includes("frontend")) return "web";
  return "general";
}

/**
 * Ekstraksi modul silabus dari konten HTML kursus jika ada tag h2 / Pertemuan
 */
function extractModulesFromHtml(html: string): CourseModuleItem[] {
  if (!html) return [];

  // Match <h2>1. Judul</h2> atau <h2>Judul</h2>
  const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
  const matches: { title: string; index: number }[] = [];
  let match;

  while ((match = h2Regex.exec(html)) !== null) {
    const rawTitle = match[1].replace(/<[^>]+>/g, "").trim();
    if (rawTitle) {
      matches.push({ title: rawTitle, index: match.index });
    }
  }

  if (matches.length === 0) return [];

  const modules: CourseModuleItem[] = matches.map((m, idx) => {
    // Ambil snippet teks setelah h2 sampai h2 berikutnya
    const nextIndex = idx < matches.length - 1 ? matches[idx + 1].index : html.length;
    const sectionHtml = html.slice(m.index, nextIndex);
    const pMatch = sectionHtml.match(/<p[^>]*>(.*?)<\/p>/i);
    const desc = pMatch
      ? pMatch[1].replace(/<[^>]+>/g, "").trim()
      : "Pelajari konsep inti dan latihan praktik terstruktur pada modul pembelajaran ini.";

    // Bersihkan judul jika sudah ada nomor di depan
    const cleanTitle = m.title.replace(/^\d+[\.\-\s]*/, "").trim();

    return {
      moduleNumber: idx + 1,
      title: cleanTitle || m.title,
      description: desc.slice(0, 160),
      duration: "45-60 Menit",
      isPreview: idx < 2,
      lessons: [
        { title: `Konsep Dasar: ${cleanTitle || m.title}`, type: "reading", duration: "15m" },
        { title: `Praktik Terarah: ${cleanTitle || m.title}`, type: "practice", duration: "30m" },
        { title: `Kuis Pemahaman Modul ${idx + 1}`, type: "quiz", duration: "10m" },
      ],
    };
  });

  return modules;
}

/**
 * Parser utama kurikulum kursus mandiri (Self-Paced Course Curriculum)
 */
export function parseCourseCurriculum(
  course: Course,
  htmlContent?: string | null
): CourseCurriculum {
  // cek apakah ada metadata json yang tersimpan di description
  let parsedMeta: Record<string, unknown> = {};
  const rawDesc = course.description || "";
  const metaMatch = rawDesc.match(/^<!--meta:(.*?)-->\s*/);
  if (metaMatch) {
    try {
      parsedMeta = JSON.parse(metaMatch[1]);
    } catch {
      // fallback
    }
  }

  // 1. ekstraksi modul silabus
  let modules: CourseModuleItem[] = [];
  const rawSyllabus = (Array.isArray(course.syllabus) && course.syllabus.length > 0)
    ? course.syllabus
    : (Array.isArray(parsedMeta.syllabus) && (parsedMeta.syllabus as any[]).length > 0)
    ? (parsedMeta.syllabus as any[])
    : null;

  if (rawSyllabus && rawSyllabus.length > 0) {
    modules = rawSyllabus.map((m: any, idx: number) => ({
      moduleNumber: m.moduleNumber || m.module_number || idx + 1,
      title: m.title || `Modul ${idx + 1}`,
      description: m.description || "Rincian materi pembelajaran terstruktur.",
      duration: m.duration || "45 Menit",
      lessons: Array.isArray(m.lessons) ? m.lessons : [],
      isPreview: typeof m.isPreview === "boolean" ? m.isPreview : (typeof m.is_preview === "boolean" ? m.is_preview : idx < 2),
    }));
  } else {
    // coba ekstrak dari tag h2 html
    const contentToParse = htmlContent || course.content || rawDesc;
    const extractedFromHtml = extractModulesFromHtml(contentToParse);

    if (extractedFromHtml.length > 0) {
      modules = extractedFromHtml;
    } else {
      modules = [];
    }
  }

  // 2. instruktur
  const instructor: CourseInstructor = (parsedMeta.instructor as any) || {
    name: "Tim Mentor Skillora",
    title: "Instruktur & Tim Pengajar Skillora",
    avatarUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=skillora-instructor",
    bio: "Tim pengajar dan mentor berpengalaman yang menyusun materi praktikum dan modul kursus mandiri.",
  };

  // 3. target pembelajaran
  const targetLearning = (Array.isArray(course.target_learning) && course.target_learning.length > 0)
    ? course.target_learning
    : (Array.isArray(parsedMeta.target_learning) && (parsedMeta.target_learning as any[]).length > 0)
    ? (parsedMeta.target_learning as string[])
    : [];

  // 4. prasyarat
  const prerequisites = Array.isArray(parsedMeta.prerequisites)
    ? (parsedMeta.prerequisites as string[])
    : [];

  // 5. skema penilaian
  const gradingScheme: CourseGradingScheme = (parsedMeta.grading_scheme as any) || {
    moduleWeight: "30%",
    quizWeight: "30%",
    projectWeight: "40%",
    passingScore: 70,
  };

  return {
    level: (parsedMeta.level as string) || course.level || "Tingkat Pemula",
    category: (parsedMeta.category as string) || course.category || "Kursus Mandiri",
    estimatedHours: (parsedMeta.estimated_hours as number) || (modules.length > 0 ? modules.length * 1 : 0),
    totalModules: modules.length,
    instructor,
    targetLearning,
    prerequisites,
    gradingScheme,
    modules,
  };
}

// mengambil ulasan kursus dengan kalkulasi rating rata-rata dari database nyata
export function getCourseReviewsData(
  _slugOrTitle?: string,
  dbReviews?: CourseReviewItem[]
): {
  reviews: CourseReviewItem[];
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  recommendPercentage: number;
} {
  const allReviews = Array.isArray(dbReviews) ? dbReviews : [];
  const totalReviews = allReviews.length;

  if (totalReviews === 0) {
    return {
      reviews: [],
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      recommendPercentage: 0,
    };
  }

  const ratingSum = allReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
  const averageRating = parseFloat((ratingSum / totalReviews).toFixed(1));

  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  allReviews.forEach((r) => {
    const star = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
    distribution[star] = (distribution[star] || 0) + 1;
  });

  const satisfiedCount = (distribution[5] || 0) + (distribution[4] || 0);
  const recommendPercentage = Math.round((satisfiedCount / totalReviews) * 100);

  return {
    reviews: allReviews,
    averageRating,
    totalReviews,
    ratingDistribution: distribution,
    recommendPercentage,
  };
}

