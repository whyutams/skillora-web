import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { parseEnrollmentMeta, encodeEnrollmentMeta } from "@/utils/enrollmentMeta";

interface EvaluationResult {
  score: number;
  score_reason: string;
  verdict: string;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

// daftar kata hubung dan kata umum bahasa indonesia yang diabaikan saat ekstraksi kata kunci
const INDONESIAN_STOPWORDS = new Set([
  "yang", "dan", "di", "dari", "untuk", "pada", "adalah", "itu", "ini", "dengan",
  "ke", "oleh", "dalam", "bisa", "dapat", "akan", "juga", "sebagai", "karena",
  "atau", "tentang", "seperti", "lebih", "secara", "sudah", "ada", "tidak", "jika",
  "saat", "agar", "supaya", "kita", "kamu", "saya", "mereka", "ia", "dia", "nya",
]);

// fungsi evaluasi semantik cerdas bawaan sebagai evaluator lokal dan fallback
function evaluateEssayLocal(params: {
  topicTitle: string;
  question: string;
  mentorKey?: string;
  studentAnswer: string;
}): EvaluationResult {
  const { topicTitle, question, mentorKey, studentAnswer } = params;
  const cleanAnswer = studentAnswer.trim();
  const lowerAnswer = cleanAnswer.toLowerCase();

  // deteksi jawaban terlalu pendek atau teks acak
  if (cleanAnswer.length < 15) {
    return {
      score: 20,
      verdict: "Belum Tepat",
      score_reason:
        "Peserta memperoleh nilai 20 karena uraian jawaban terlalu singkat dan belum memuat substansi konsep yang cukup untuk menjawab pertanyaan materi.",
      feedback:
        "Jawaban masih sangat singkat. Silakan pelajari kembali materi topik dan jelaskan pemahaman Anda dengan kalimat yang lebih lengkap.",
      strengths: [],
      improvements: ["Uraikan jawaban dengan minimal 1-2 kalimat penjelasan yang utuh"],
    };
  }

  // deteksi karakter berulang atau teks spam
  const repetitiveMatch = /(.)\1{5,}/.test(cleanAnswer);
  const words = cleanAnswer.split(/\s+/).filter((w) => w.length > 0);
  if (repetitiveMatch || words.length < 3) {
    return {
      score: 15,
      verdict: "Belum Tepat",
      score_reason:
        "Peserta memperoleh nilai 15 karena sistem mendeteksi adanya pengulangan karakter atau susunan kata yang tidak membentuk kalimat penjelasan yang bermakna.",
      feedback:
        "Mohon berikan uraian jawaban yang bermakna dan relevan dengan topik pembelajaran.",
      strengths: [],
      improvements: ["Gunakan kalimat baku yang menjelaskan konsep pembelajaran secara logis"],
    };
  }

  // ekstrak kata kunci penting dari pertanyaan dan acuan mentor
  const combinedContext = `${topicTitle} ${question} ${mentorKey || ""}`.toLowerCase();
  const rawContextWords = combinedContext
    .replace(/[^a-z0-9_]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !INDONESIAN_STOPWORDS.has(w));

  const uniqueKeyTerms = Array.from(new Set(rawContextWords));
  const matchedTerms: string[] = [];
  const missingTerms: string[] = [];

  uniqueKeyTerms.forEach((term) => {
    if (lowerAnswer.includes(term)) {
      matchedTerms.push(term);
    } else {
      missingTerms.push(term);
    }
  });

  // hitung rasio ketercakupan kata kunci konsep
  const coverageRatio =
    uniqueKeyTerms.length > 0 ? matchedTerms.length / uniqueKeyTerms.length : 0.5;

  // evaluasi kedalaman uraian berdasarkan jumlah kata dan panjang karakter
  let depthScore = 20;
  if (words.length >= 25 || cleanAnswer.length >= 150) {
    depthScore = 30;
  } else if (words.length >= 12 || cleanAnswer.length >= 70) {
    depthScore = 25;
  }

  // evaluasi relevansi konsep
  let conceptScore = Math.round(coverageRatio * 50);
  if (conceptScore > 50) conceptScore = 50;
  if (matchedTerms.length >= 2 && conceptScore < 30) conceptScore = 35;

  // evaluasi ketepatan struktur kalimat
  let structureScore = 15;
  if (/[.!?]/.test(cleanAnswer) && words.length >= 8) {
    structureScore = 20;
  }

  // total skor kumulatif
  let totalScore = conceptScore + depthScore + structureScore;
  if (totalScore > 100) totalScore = 100;
  if (totalScore < 25 && matchedTerms.length === 0) totalScore = 25;

  // tentukan kategori penilaian
  let verdict = "Belum Tepat";
  if (totalScore >= 85) {
    verdict = "Sangat Memahami Konsep";
  } else if (totalScore >= 70) {
    verdict = "Cukup Memahami Konsep";
  } else if (totalScore >= 50) {
    verdict = "Pemahaman Kurang Lengkap";
  }

  // susun alasan perolehan nilai yang transparan dan mendidik
  let scoreReason = "";
  if (totalScore >= 85) {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena uraian jawaban sangat komprehensif, memiliki relevansi tinggi terhadap pertanyaan materi, serta berhasil menjelaskan konsep inti dengan penalaran yang jelas.`;
  } else if (totalScore >= 70) {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena konsep utama telah dijawab dengan benar. Terdapat sedikit ruang penyempurnaan pada rincian teknis atau pendalaman argumentasi agar lebih lengkap.`;
  } else if (totalScore >= 50) {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena jawaban telah menyentuh sebagian topik bahasan, namun masih memerlukan elaborasi lebih lanjut agar mencakup seluruh aspek yang ditanyakan pada materi.`;
  } else {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena substansi jawaban belum fokus menjawab inti pertanyaan topik atau penjelasan konsep yang diberikan masih sangat terbatas.`;
  }

  const strengths: string[] = [];
  if (matchedTerms.length > 0) {
    strengths.push(
      `Menyebutkan istilah dan konsep terkait seperti ${matchedTerms.slice(0, 3).join(", ")}`
    );
  }
  if (words.length >= 15) {
    strengths.push("Menguraikan argumen dengan struktur kalimat yang runtut");
  }

  const improvements: string[] = [];
  if (missingTerms.length > 0 && totalScore < 85) {
    improvements.push(
      `Dapat memperkaya pembahasan dengan konsep ${missingTerms.slice(0, 2).join(", ")}`
    );
  }
  if (words.length < 15) {
    improvements.push("Tingkatkan uraian penjelasan dengan contoh atau analogi teknis");
  }

  const feedback =
    totalScore >= 70
      ? "Pemahaman Anda terhadap materi topik ini sudah baik. Terus pertahankan ketelitian dan kedalaman analisis pada topik berikutnya."
      : "Terima kasih atas jawaban yang telah dikirimkan. Pelajari kembali poin-poin acuan pembahasan untuk memperkuat pemahaman Anda.";

  return {
    score: totalScore,
    score_reason: scoreReason,
    verdict,
    feedback,
    strengths,
    improvements,
  };
}

// evaluasi menggunakan gemini api jika kunci api tersedia di konfigurasi server
async function evaluateEssayWithGemini(params: {
  topicTitle: string;
  topicContent?: string;
  question: string;
  mentorKey?: string;
  studentAnswer: string;
}): Promise<EvaluationResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `Anda adalah evaluator akademik platform Skillora untuk mahasiswa perguruan tinggi.
Tugas Anda adalah menilai jawaban essay peserta secara objektif, adil, transparan, dan mendidik.

Konteks Materi Pembelajaran:
- Judul Topik: ${params.topicTitle}
- Ringkasan Materi: ${params.topicContent ? params.topicContent.substring(0, 500) : "-"}
- Pertanyaan Essay: ${params.question}
- Kunci Acuan / Pembahasan Mentor: ${params.mentorKey || "-"}
- Jawaban Tertulis Peserta: ${params.studentAnswer}

Aturan Penilaian Wajib:
1. Berikan nilai numerik berupa bilangan bulat dalam rentang 0 sampai 100 (score).
2. Berikan alasan penilaian (score_reason) yang objektif dan transparan menjelaskan mengapa nilai yang didapatkan seperti itu (2-3 kalimat lugas).
3. Tentukan verdict: "Sangat Memahami Konsep" (skor >= 85), "Cukup Memahami Konsep" (skor 70-84), "Pemahaman Kurang Lengkap" (skor 50-69), atau "Belum Tepat" (skor < 50).
4. Berikan feedback ramah untuk memotivasi mahasiswa.

Keluaran WAJIB format JSON murni tanpa markdown pembungkus:
{
  "score": 85,
  "verdict": "Sangat Memahami Konsep",
  "score_reason": "Peserta memperoleh nilai 85 karena...",
  "feedback": "Jawaban Anda sudah baik...",
  "strengths": ["poin 1", "poin 2"],
  "improvements": ["poin 1"]
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const parsed = JSON.parse(candidateText.trim());
    const scoreNum = parseInt(parsed.score, 10);
    const validScore = !isNaN(scoreNum) ? Math.max(0, Math.min(100, scoreNum)) : 75;

    return {
      score: validScore,
      score_reason: parsed.score_reason || `Peserta memperoleh nilai ${validScore} berdasarkan penilaian komprehensif sistem.`,
      verdict: parsed.verdict || "Cukup Memahami Konsep",
      feedback: parsed.feedback || "Jawaban Anda telah berhasil dinilai.",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    };
  } catch (err) {
    console.error("Gagal memanggil gemini api untuk evaluasi essay", err);
    return null;
  }
}

// endpoint penanganan evaluasi essay otomatis peserta kursus
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Silakan masuk ke akun Anda terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      enrollmentId,
      lessonKey,
      topicTitle,
      topicContent,
      question,
      mentorKey,
      studentAnswer,
    } = body;

    if (!enrollmentId || !lessonKey || !question || !studentAnswer) {
      return NextResponse.json(
        { error: "Parameter evaluasi essay tidak lengkap." },
        { status: 400 }
      );
    }

    const cleanAnswer = String(studentAnswer).trim();
    if (cleanAnswer.length < 5) {
      return NextResponse.json(
        { error: "Jawaban essay terlalu singkat. Harap ketikkan uraian pemahaman Anda." },
        { status: 400 }
      );
    }

    // jalankan evaluasi otomatis (gemini api jika ada, atau evaluator cerdas lokal)
    let evaluation = await evaluateEssayWithGemini({
      topicTitle: topicTitle || "Topik Materi",
      topicContent,
      question,
      mentorKey,
      studentAnswer: cleanAnswer,
    });

    if (!evaluation) {
      evaluation = evaluateEssayLocal({
        topicTitle: topicTitle || "Topik Materi",
        question,
        mentorKey,
        studentAnswer: cleanAnswer,
      });
    }

    const adminClient = createAdminClient();

    // verifikasi kepemilikan pendaftaran kursus
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(enrollmentId);
    let enrollment = null;

    if (isUUID) {
      const { data } = await adminClient
        .from("enrollments")
        .select("id, user_id, course_id, status, whatsapp_number")
        .eq("id", enrollmentId)
        .eq("user_id", user.id)
        .maybeSingle();
      enrollment = data;
    } else {
      const { data: c } = await adminClient
        .from("courses")
        .select("id")
        .ilike("slug", enrollmentId)
        .maybeSingle();
      if (c?.id) {
        const { data } = await adminClient
          .from("enrollments")
          .select("id, user_id, course_id, status, whatsapp_number")
          .eq("course_id", c.id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        enrollment = data;
      }
    }

    if (!enrollment) {
      return NextResponse.json(
        { error: "Pendaftaran kursus tidak ditemukan." },
        { status: 404 }
      );
    }

    const currentMeta = parseEnrollmentMeta(enrollment.whatsapp_number);

    // tandai materi topik ini selesai
    const existingLessons = currentMeta.completed_lessons || [];
    const updatedLessons = Array.from(new Set([...existingLessons, lessonKey]));

    // perbarui hasil kuis dan nilai topik
    const updatedQuizResults = {
      ...(currentMeta.quiz_results || {}),
      [lessonKey]: {
        lessonKey,
        type: "essay",
        question,
        student_answer: cleanAnswer,
        score: evaluation.score,
        score_reason: evaluation.score_reason,
        verdict: evaluation.verdict,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        submittedAt: new Date().toISOString(),
      },
    };

    // hitung akumulasi skor dan rata rata nilai untuk fitur ranking atau leaderboard
    const quizEntries = Object.values(updatedQuizResults) as Record<string, unknown>[];
    const validScores = quizEntries
      .map((entry) => (typeof entry?.score === "number" ? entry.score : null))
      .filter((s): s is number => s !== null);
    const totalScore = validScores.reduce((acc, s) => acc + s, 0);
    const averageScore = validScores.length > 0 ? Math.round(totalScore / validScores.length) : 0;

    const newMeta = {
      ...currentMeta,
      completed_lessons: updatedLessons,
      quiz_results: updatedQuizResults,
      total_score: totalScore,
      average_score: averageScore,
      updated_at: new Date().toISOString(),
    };

    const updatedWhatsapp = encodeEnrollmentMeta(currentMeta.phone, newMeta);

    const { error: updateErr } = await adminClient
      .from("enrollments")
      .update({
        whatsapp_number: updatedWhatsapp,
      })
      .eq("id", enrollment.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      evaluation,
      completed_lessons: updatedLessons,
      total_score: totalScore,
      average_score: averageScore,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server saat menilai essay.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

