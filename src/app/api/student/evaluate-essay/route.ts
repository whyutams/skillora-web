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
  if (cleanAnswer.length < 10) {
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
      score: 20,
      verdict: "Belum Tepat",
      score_reason:
        "Peserta memperoleh nilai 20 karena sistem mendeteksi adanya pengulangan karakter atau susunan kata yang belum membentuk kalimat penjelasan yang bermakna.",
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

  // sistem penilaian apresiatif dan fleksibel tidak terlalu ketat
  // jawaban mahasiswa yang wajar mendapatkan nilai dasar yang apresiatif
  let rawScore = 60;

  // evaluasi kedalaman uraian dan kelengkapan penjelas
  if (words.length >= 22 || cleanAnswer.length >= 130) {
    rawScore += 20;
  } else if (words.length >= 10 || cleanAnswer.length >= 60) {
    rawScore += 10;
  }

  // apresiasi kecocokan istilah atau keterkaitan konsep materi
  if (matchedTerms.length >= 2) {
    rawScore += 20;
  } else if (matchedTerms.length >= 1) {
    rawScore += 10;
  }

  // apresiasi struktur kalimat yang rapi
  if (/[.!?]/.test(cleanAnswer) && words.length >= 6) {
    rawScore += 10;
  }

  // jika uraian jawaban sangat singkat di bawah 6 kata kurangi nilai ke batas aman
  if (words.length < 6 && matchedTerms.length === 0) {
    rawScore = 50;
  }

  // wajib dibulatkan ke kelipatan 10 terdekat dalam rentang 0 sampai 100
  const totalScore = Math.max(0, Math.min(100, Math.round(rawScore / 10) * 10));

  // tentukan kategori penilaian berbasis nilai kelipatan 10
  let verdict = "Belum Tepat";
  if (totalScore >= 90) {
    verdict = "Sangat Memahami Konsep";
  } else if (totalScore >= 70) {
    verdict = "Cukup Memahami Konsep";
  } else if (totalScore >= 50) {
    verdict = "Pemahaman Kurang Lengkap";
  }

  // susun alasan perolehan nilai yang transparan mendidik dan memotivasi
  let scoreReason = "";
  if (totalScore >= 90) {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena uraian jawaban sangat komprehensif, memiliki relevansi tinggi terhadap materi, serta berhasil menjelaskan konsep inti dengan penalaran yang jelas.`;
  } else if (totalScore >= 70) {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena konsep utama telah dijawab dengan baik. Terus tingkatkan rincian teknis dan kedalaman analisis pada materi berikutnya.`;
  } else if (totalScore >= 50) {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena jawaban telah menyentuh sebagian topik bahasan, namun masih dapat dielaborasi lebih lanjut agar mencakup aspek materi secara lebih mendalam.`;
  } else {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena substansi uraian jawaban masih sangat terbatas dan memerlukan pemahaman konsep topik yang lebih utuh.`;
  }

  const strengths: string[] = [];
  if (matchedTerms.length > 0) {
    strengths.push(
      `Menyebutkan istilah dan konsep terkait seperti ${matchedTerms.slice(0, 3).join(", ")}`
    );
  }
  if (words.length >= 12) {
    strengths.push("Menguraikan argumen dengan struktur kalimat yang runtut");
  }

  const improvements: string[] = [];
  if (missingTerms.length > 0 && totalScore < 90) {
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
Tugas Anda adalah menilai jawaban essay peserta secara objektif, ramah, apresiatif, adil, transparan, dan mendidik.

Konteks Materi Pembelajaran:
- Judul Topik: ${params.topicTitle}
- Ringkasan Materi: ${params.topicContent ? params.topicContent.substring(0, 500) : "-"}
- Pertanyaan Essay: ${params.question}
- Kunci Acuan / Pembahasan Mentor: ${params.mentorKey || "-"}
- Jawaban Tertulis Peserta: ${params.studentAnswer}

Pedoman & Aturan Penilaian:
1. JANGAN TERLALU KETAT: Penilaian harus bersifat apresiatif, fleksibel, dan mendukung proses belajar mahasiswa. Hargai usaha penalaran mahasiswa meskipun mereka menggunakan bahasa atau analogi mereka sendiri (tidak harus sama persis kata demi kata dengan acuan mentor).
2. Jika jawaban peserta sudah menyentuh substansi materi atau menunjukkan pemahaman dasar yang baik, berikan apresiasi nilai tinggi (rentang 70, 80, 90, atau 100).
3. NILAI WAJIB KELIPATAN 10: Nilai numerik (score) WAJIB SELALU berupa bilangan bulat kelipatan 10 dalam rentang 0 sampai 100 (hanya boleh: 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, atau 100). DILARANG KERAS memberikan nilai di luar kelipatan 10 seperti 46, 55, 68, 73, 85. Contoh jika layak bernilai sekitar 46 maka bulatkan menjadi 50.
4. Tentukan verdict berdasarkan skor kelipatan 10:
   - "Sangat Memahami Konsep" (skor 90 - 100)
   - "Cukup Memahami Konsep" (skor 70 - 80)
   - "Pemahaman Kurang Lengkap" (skor 50 - 60)
   - "Belum Tepat" (skor <= 40)
5. Berikan alasan penilaian (score_reason) yang transparan dan mendidik yang menyebutkan nilai kelipatan 10 tersebut secara konsisten (2-3 kalimat).
6. Berikan feedback yang positif, memotivasi, dan konstruktif bagi mahasiswa.

Keluaran WAJIB format JSON murni tanpa markdown pembungkus:
{
  "score": 80,
  "verdict": "Cukup Memahami Konsep",
  "score_reason": "Peserta memperoleh nilai 80 karena uraian jawaban berhasil menjelaskan konsep utama materi dengan baik dan runtut.",
  "feedback": "Jawaban Anda sudah baik. Terus tingkatkan penalaran pada topik selanjutnya.",
  "strengths": ["Menjelaskan konsep utama materi secara logis"],
  "improvements": ["Dapat menambahkan rincian implementasi teknis"]
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
    const rawScore = !isNaN(scoreNum) ? scoreNum : 80;

    // paksa pembulatan ke kelipatan 10 terdekat dalam rentang 0 sampai 100
    const roundedScore = Math.max(0, Math.min(100, Math.round(rawScore / 10) * 10));

    // pastikan teks alasan nilai sinkron dengan nilai kelipatan 10
    let scoreReason =
      parsed.score_reason ||
      `Peserta memperoleh nilai ${roundedScore} berdasarkan penilaian komprehensif sistem.`;
    scoreReason = scoreReason.replace(/\b\d{1,3}\b/, String(roundedScore));

    let verdict = parsed.verdict || "Cukup Memahami Konsep";
    if (roundedScore >= 90) verdict = "Sangat Memahami Konsep";
    else if (roundedScore >= 70) verdict = "Cukup Memahami Konsep";
    else if (roundedScore >= 50) verdict = "Pemahaman Kurang Lengkap";
    else verdict = "Belum Tepat";

    return {
      score: roundedScore,
      score_reason: scoreReason,
      verdict,
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

    // jaminan nilai evaluasi akhir selalu kelipatan 10 dalam rentang 0 sampai 100
    evaluation.score = Math.max(0, Math.min(100, Math.round(evaluation.score / 10) * 10));

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

