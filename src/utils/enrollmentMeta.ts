export interface EnrollmentMetadata {
  payment_proof_url?: string | null;
  rejection_reason?: string | null;
  certificate_url?: string | null;
  review_rating?: number | null;
  review_text?: string | null;
  reviewed_at?: string | null;
}

export interface ParsedEnrollmentMeta extends EnrollmentMetadata {
  phone: string;
}

/**
 * Membaca nomor WhatsApp murni dan metadata enrollment yang tersimpan di kolom whatsapp_number.
 */
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
    };
  }
}

/**
 * Menggabungkan nomor WhatsApp dan metadata enrollment ke dalam satu string format.
 */
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

  if (Object.keys(cleanMeta).length === 0) {
    return cleanPhone;
  }

  return `${cleanPhone}<!--meta:${JSON.stringify(cleanMeta)}-->`;
}
