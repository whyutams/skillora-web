export interface ProjectSubmissionItem {
  lessonKey: string;
  driveUrl: string;
  status: "submitted" | "reviewed";
  score?: number | null;
  feedback?: string | null;
  submittedAt: string;
  updatedAt?: string;
  reviewedAt?: string | null;
}

export interface EnrollmentMetadata {
  payment_proof_url?: string | null;
  rejection_reason?: string | null;
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
  last_accessed_lesson?: { moduleIndex: number; topicIndex: number } | null;
  updated_at?: string;
}

export interface ParsedEnrollmentMeta extends EnrollmentMetadata {
  phone: string;
}

// validasi apakah tautan merupakan url google drive atau google docs yang sah
export function isValidGoogleDriveUrl(url: string): boolean {
  try {
    const parsed = new URL((url || "").trim());
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === "drive.google.com" ||
      host === "docs.google.com" ||
      host.endsWith(".drive.google.com")
    );
  } catch {
    return false;
  }
}

// hitung akumulasi skor dan rata rata dari kuis essay maupun penilaian proyek
export function calculateCombinedScores(
  quizResults: Record<string, unknown> = {},
  projectSubmissions: Record<string, ProjectSubmissionItem> = {}
): { totalScore: number; averageScore: number } {
  const quizScores = Object.values(quizResults)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((entry: any) => (typeof entry?.score === "number" ? entry.score : null))
    .filter((s): s is number => s !== null);

  const projectScores = Object.values(projectSubmissions)
    .map((entry) => (typeof entry?.score === "number" ? entry.score : null))
    .filter((s): s is number => s !== null);

  const allScores = [...quizScores, ...projectScores];
  if (allScores.length === 0) {
    return { totalScore: 0, averageScore: 0 };
  }
  const totalScore = allScores.reduce((acc, s) => acc + s, 0);
  const averageScore = Math.round(totalScore / allScores.length);
  return { totalScore, averageScore };
}

// membaca nomor whatsapp murni dan metadata pendaftaran yang tersimpan di kolom whatsapp_number
export function parseEnrollmentMeta(
  rawWhatsapp: string | null | undefined
): ParsedEnrollmentMeta {
  if (!rawWhatsapp) {
    return {
      phone: "-",
      payment_proof_url: null,
      rejection_reason: null,
      certificate_url: null,
      review_rating: null,
      review_text: null,
      reviewed_at: null,
      completed_lessons: [],
      project_submission_url: null,
      project_submissions: {},
      quiz_results: {},
      last_accessed_lesson: null,
    };
  }

  const metaMatch = rawWhatsapp.match(/<!--meta:(.*?)-->$/);
  if (!metaMatch) {
    return {
      phone: rawWhatsapp.trim() || "-",
      payment_proof_url: null,
      rejection_reason: null,
      certificate_url: null,
      review_rating: null,
      review_text: null,
      reviewed_at: null,
      completed_lessons: [],
      project_submission_url: null,
      project_submissions: {},
      quiz_results: {},
      last_accessed_lesson: null,
    };
  }

  const phone = rawWhatsapp.replace(metaMatch[0], "").trim() || "-";
  try {
    const meta: EnrollmentMetadata = JSON.parse(metaMatch[1]);
    const quizResults =
      meta.quiz_results && typeof meta.quiz_results === "object" ? meta.quiz_results : {};
    const projectSubmissions =
      meta.project_submissions && typeof meta.project_submissions === "object"
        ? meta.project_submissions
        : {};

    // hitung akumulasi skor dan rata rata secara otomatis jika belum tersimpan
    let totalScore = typeof meta.total_score === "number" ? meta.total_score : null;
    let averageScore = typeof meta.average_score === "number" ? meta.average_score : null;

    if (
      totalScore === null &&
      (Object.keys(quizResults).length > 0 || Object.keys(projectSubmissions).length > 0)
    ) {
      const combined = calculateCombinedScores(quizResults, projectSubmissions);
      if (combined.totalScore > 0 || combined.averageScore > 0) {
        totalScore = combined.totalScore;
        averageScore = combined.averageScore;
      }
    }

    return {
      phone,
      payment_proof_url: meta.payment_proof_url || null,
      rejection_reason: meta.rejection_reason || null,
      certificate_url: meta.certificate_url || null,
      review_rating:
        typeof meta.review_rating === "number" ? meta.review_rating : null,
      review_text: meta.review_text || null,
      reviewed_at: meta.reviewed_at || null,
      completed_lessons: Array.isArray(meta.completed_lessons)
        ? meta.completed_lessons
        : [],
      project_submission_url: meta.project_submission_url || null,
      project_submissions: projectSubmissions,
      quiz_results: quizResults,
      total_score: totalScore,
      average_score: averageScore,
      last_accessed_lesson: meta.last_accessed_lesson || null,
      updated_at: meta.updated_at || undefined,
    };
  } catch {
    return {
      phone,
      payment_proof_url: null,
      rejection_reason: null,
      certificate_url: null,
      review_rating: null,
      review_text: null,
      reviewed_at: null,
      completed_lessons: [],
      project_submission_url: null,
      project_submissions: {},
      quiz_results: {},
      total_score: null,
      average_score: null,
      last_accessed_lesson: null,
    };
  }
}

// menggabungkan nomor whatsapp dan metadata pendaftaran ke dalam satu string format
export function encodeEnrollmentMeta(
  phone: string,
  meta: EnrollmentMetadata
): string {
  const cleanPhone = (phone || "").replace(/<!--meta:.*?-->/g, "").trim();
  const cleanMeta: Record<string, unknown> = {};

  if (meta.payment_proof_url && meta.payment_proof_url.trim()) {
    cleanMeta.payment_proof_url = meta.payment_proof_url.trim();
  }
  if (meta.rejection_reason && meta.rejection_reason.trim()) {
    cleanMeta.rejection_reason = meta.rejection_reason.trim();
  }
  if (meta.certificate_url && meta.certificate_url.trim()) {
    cleanMeta.certificate_url = meta.certificate_url.trim();
  }
  if (typeof meta.review_rating === "number" && meta.review_rating > 0) {
    cleanMeta.review_rating = meta.review_rating;
  }
  if (meta.review_text && meta.review_text.trim()) {
    cleanMeta.review_text = meta.review_text.trim();
  }
  if (meta.reviewed_at && meta.reviewed_at.trim()) {
    cleanMeta.reviewed_at = meta.reviewed_at.trim();
  }
  if (Array.isArray(meta.completed_lessons) && meta.completed_lessons.length > 0) {
    cleanMeta.completed_lessons = Array.from(new Set(meta.completed_lessons));
  }
  if (meta.project_submission_url && meta.project_submission_url.trim()) {
    cleanMeta.project_submission_url = meta.project_submission_url.trim();
  }
  if (
    meta.project_submissions &&
    typeof meta.project_submissions === "object" &&
    Object.keys(meta.project_submissions).length > 0
  ) {
    cleanMeta.project_submissions = meta.project_submissions;
  }
  if (meta.quiz_results && typeof meta.quiz_results === "object" && Object.keys(meta.quiz_results).length > 0) {
    cleanMeta.quiz_results = meta.quiz_results;
  }
  if (typeof meta.total_score === "number") {
    cleanMeta.total_score = meta.total_score;
  }
  if (typeof meta.average_score === "number") {
    cleanMeta.average_score = meta.average_score;
  }
  if (meta.last_accessed_lesson && typeof meta.last_accessed_lesson === "object") {
    cleanMeta.last_accessed_lesson = meta.last_accessed_lesson;
  }
  if (meta.updated_at) {
    cleanMeta.updated_at = meta.updated_at;
  }

  if (Object.keys(cleanMeta).length === 0) {
    return cleanPhone;
  }

  return `${cleanPhone}<!--meta:${JSON.stringify(cleanMeta)}-->`;
}
