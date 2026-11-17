export interface EnrollmentMetadata {
  payment_proof_url?: string | null;
  rejection_reason?: string | null;
  certificate_url?: string | null;
  review_rating?: number | null;
  review_text?: string | null;
  reviewed_at?: string | null;
  completed_lessons?: string[];
  project_submission_url?: string | null;
  quiz_results?: Record<string, unknown>;
  last_accessed_lesson?: { moduleIndex: number; topicIndex: number } | null;
  updated_at?: string;
}

export interface ParsedEnrollmentMeta extends EnrollmentMetadata {
  phone: string;
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
      quiz_results: {},
      last_accessed_lesson: null,
    };
  }

  const phone = rawWhatsapp.replace(metaMatch[0], "").trim() || "-";
  try {
    const meta: EnrollmentMetadata = JSON.parse(metaMatch[1]);
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
      quiz_results: meta.quiz_results && typeof meta.quiz_results === "object" ? meta.quiz_results : {},
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
      quiz_results: {},
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
  if (meta.quiz_results && typeof meta.quiz_results === "object" && Object.keys(meta.quiz_results).length > 0) {
    cleanMeta.quiz_results = meta.quiz_results;
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
