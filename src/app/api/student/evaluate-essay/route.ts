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

// daftar kata henti dan kata umum yang diabaikan saat ekstraksi kata kunci
const INDONESIAN_STOPWORDS = new Set([
  "yang", "dan", "di", "dari", "untuk", "pada", "adalah", "itu", "ini", "dengan",
  "ke", "oleh", "dalam", "bisa", "dapat", "akan", "juga", "sebagai", "karena",
  "atau", "tentang", "seperti", "lebih", "secara", "sudah", "ada", "tidak", "jika",
  "saat", "agar", "supaya", "kita", "kamu", "saya", "mereka", "ia", "dia", "nya",
  "apa", "apakah", "bagaimana", "mengapa", "kapan", "dimana", "siapa", "menurut",
  "anda", "jelaskan", "sebutkan", "uraikan", "tuliskan", "berikan", "contoh",
  "pendahuluan", "bab", "modul", "topik", "materi", "kursus", "silabus", "soal",
  "essay", "style", "class", "div", "span", "html", "head", "body", "title",
  "table", "tr", "td", "br", "hr", "href", "src", "img", "strong", "em", "code"
]);

// kumpulan konsep inti dan istilah teknis pemrograman yang bernilai positif
const TECHNICAL_DOMAIN_TERMS = new Set([
  "bahasa", "pemrograman", "program", "kode", "koding", "coding", "software",
  "aplikasi", "komputer", "sistem", "data", "fungsi", "function", "method",
  "variabel", "variable", "algoritma", "objek", "object", "class", "oop",
  "tingkat", "tinggi", "rendah", "high", "level", "low", "kompiler", "compiler",
  "interpret", "eksekusi", "sintaks", "syntax", "struktur", "input", "output",
  "cin", "cout", "print", "loop", "perulangan", "kondisi", "percabangan",
  "logika", "teknologi", "perangkat", "lunak", "web", "server", "turunan",
  "diturunkan", "dasar", "tipe", "array", "pointer", "memori", "memory",
  "efisien", "kecepatan", "cepat", "sumber", "mesin", "instruksi", "deklarasi",
  "operator", "nilai", "parameter", "return", "kembalian", "pengembangan", "developer",
  "c++", "cpp", "python", "javascript", "java", "html", "css", "database", "sql"
]);

// helper pembersih kata kunci esensial tanpa tag html dan kata henti
function extractCleanTerms(rawText?: string): string[] {
  if (!rawText) return [];
  const noHtml = rawText.replace(/<[^>]+>/g, " ");
  const sanitized = noHtml.replace(/[^a-zA-Z0-9+_]/g, " ").toLowerCase();
  return sanitized
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !INDONESIAN_STOPWORDS.has(w));
}

// fungsi evaluasi semantik cerdas bawaan sebagai evaluator lokal dan fallback
function evaluateEssayLocal(params: {
  topicTitle: string;
  topicContent?: string;
  question: string;
  mentorKey?: string;
  studentAnswer: string;
}): EvaluationResult {
  const { topicTitle, topicContent, question, mentorKey, studentAnswer } = params;
  const cleanAnswer = studentAnswer.trim();
  const lowerAnswer = cleanAnswer.toLowerCase();
  const words = cleanAnswer.split(/\s+/).filter((w) => w.length > 0);

  // deteksi jawaban terlalu pendek atau teks acak
  if (cleanAnswer.length < 5 || words.length < 2) {
    return {
      score: 20,
      verdict: "Perlu Pendalaman Materi",
      score_reason:
        "Peserta memperoleh nilai 20 karena uraian jawaban terlalu singkat dan belum memuat penjelasan konsep materi.",
      feedback:
        "Jawaban masih sangat singkat. Silakan pelajari kembali materi topik dan jelaskan pemahaman Anda dengan kalimat yang lebih lengkap.",
      strengths: [],
      improvements: ["Uraikan jawaban dengan minimal 1-2 kalimat penjelasan yang utuh"],
    };
  }

  // deteksi karakter berulang atau teks spam
  const repetitiveMatch = /(.)\1{5,}/.test(cleanAnswer);
  if (repetitiveMatch) {
    return {
      score: 20,
      verdict: "Perlu Pendalaman Materi",
      score_reason:
        "Peserta memperoleh nilai 20 karena terdeteksi adanya pengulangan karakter yang belum membentuk kalimat penjelasan yang bermakna.",
      feedback:
        "Mohon berikan uraian jawaban yang bermakna dan relevan dengan topik pembelajaran.",
      strengths: [],
      improvements: ["Gunakan kalimat baku yang menjelaskan konsep pembelajaran secara logis"],
    };
  }

  // ekstrak istilah dari jawaban peserta
  const answerTerms = extractCleanTerms(cleanAnswer);

  // ekstrak kata kunci pertanyaan konteks materi dan acuan mentor
  const questionTerms = extractCleanTerms(question);
  const contextText = `${topicTitle} ${mentorKey || ""} ${topicContent ? topicContent.substring(0, 400) : ""}`;
  const contextTerms = extractCleanTerms(contextText);
  const combinedContext = new Set([...questionTerms, ...contextTerms]);

  // cari kecocokan istilah materi dan istilah teknis pemrograman umum
  const matchedContextTerms = Array.from(
    new Set(answerTerms.filter((term) => combinedContext.has(term)))
  );
  const matchedDomainTerms = Array.from(
    new Set(answerTerms.filter((term) => TECHNICAL_DOMAIN_TERMS.has(term)))
  );
  const allMatchedTerms = Array.from(
    new Set([...matchedContextTerms, ...matchedDomainTerms])
  );

  // sistem penilaian apresiatif dan fleksibel
  // jawaban mahasiswa yang menjawab esensi topik dengan benar berhak mendapat nilai tinggi 90-100
  let rawScore = 80;

  if (allMatchedTerms.length >= 3 || (allMatchedTerms.length >= 1 && words.length >= 8)) {
    rawScore = 100;
  } else if (allMatchedTerms.length >= 2 || words.length >= 6) {
    rawScore = 90;
  } else if (allMatchedTerms.length >= 1 || words.length >= 4) {
    rawScore = 80;
  } else if (words.length >= 3) {
    rawScore = 70;
  } else {
    rawScore = 60;
  }

  // wajib dibulatkan ke kelipatan 10 terdekat dalam rentang 0 sampai 100
  const totalScore = Math.max(0, Math.min(100, Math.round(rawScore / 10) * 10));

  // tentukan kategori penilaian berbasis nilai kelipatan 10
  let verdict = "Cukup Memahami Konsep";
  if (totalScore >= 90) {
    verdict = "Sangat Memahami Konsep";
  } else if (totalScore >= 80) {
    verdict = "Memahami Konsep dengan Baik";
  } else if (totalScore >= 70) {
    verdict = "Cukup Memahami Konsep";
  } else if (totalScore >= 50) {
    verdict = "Pemahaman Cukup";
  } else {
    verdict = "Perlu Pendalaman Materi";
  }

  // susun alasan perolehan nilai yang transparan mendidik dan memotivasi
  let scoreReason = "";
  if (totalScore >= 90) {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena uraian jawaban sangat tepat, relevan dengan materi topik, serta berhasil menjelaskan konsep inti dengan baik.`;
  } else if (totalScore >= 80) {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena jawaban telah menjelaskan konsep pokok topik dengan benar dan relevan.`;
  } else if (totalScore >= 70) {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena jawaban sudah menyentuh konsep dasar topik dengan baik.`;
  } else if (totalScore >= 50) {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena jawaban telah menyentuh sebagian topik bahasan, namun masih dapat dielaborasi lebih lanjut.`;
  } else {
    scoreReason = `Peserta memperoleh nilai ${totalScore} karena substansi uraian jawaban masih terbatas dan memerlukan pemahaman materi yang lebih utuh.`;
  }

  const strengths: string[] = [];
  if (allMatchedTerms.length > 0) {
    strengths.push(
      `Menyebutkan istilah dan konsep kunci seperti ${allMatchedTerms.slice(0, 4).join(", ")}`
    );
  }
  if (words.length >= 6) {
    strengths.push("Menguraikan argumen dengan struktur kalimat yang runtut dan jelas");
  }
  if (totalScore >= 90 && strengths.length === 0) {
    strengths.push("Menjelaskan inti konsep materi topik dengan penalaran yang baik");
  }

  const improvements: string[] = [];
  if (totalScore >= 90) {
    improvements.push("Pertahankan pemahaman konsep yang sangat baik ini untuk materi dan praktik berikutnya");
  } else if (totalScore >= 80) {
    improvements.push("Dapat memperkaya pembahasan dengan contoh kasus penerapan atau sintaks pendukung");
  } else {
    improvements.push("Tingkatkan uraian penjelasan dengan mengaitkan konsep utama materi topik");
  }

  const feedback =
    totalScore >= 80
      ? "Pemahaman Anda terhadap materi topik ini sangat baik. Terus pertahankan ketelitian dan kedalaman analisis pada topik berikutnya."
      : totalScore >= 60
      ? "Jawaban Anda sudah baik dan menyentuh konsep topik. Pelajari kembali materi untuk memperkuat pemahaman teknis Anda."
      : "Terima kasih atas jawaban yang telah dikirimkan. Pelajari kembali materi topik untuk memperkuat pemahaman Anda.";

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
1. JANGAN TERLALU KETAT: Penilaian harus bersifat sangat apresiatif, fleksibel, dan mendukung proses belajar mahasiswa. Jawaban peserta yang menjelaskan konsep secara lugas, ringkas, atau menggunakan gaya bahasa sendiri (contoh: "C++ adalah bahasa pemrograman tingkat tinggi yang diturunkan dari bahasa C") WAJIB dinilai TINGGI (rentang 90 - 100) karena secara konsep dan definisi adalah BENAR.
2. Skor 90 - 100: Jawaban menjelaskan konsep inti topik dengan benar dan relevan meskipun ringkas.
3. Skor 80: Jawaban relevan dan menunjukkan pemahaman konsep yang baik.
4. Skor 70: Jawaban menyentuh konsep dasar.
5. Hanya berikan skor di bawah 70 jika jawaban benar-benar tidak menjawab pertanyaan atau tidak ada kaitan dengan materi topik.
6. NILAI WAJIB KELIPATAN 10: Nilai numerik (score) WAJIB SELALU berupa bilangan bulat kelipatan 10 dalam rentang 0 sampai 100 (0, 10, 20, 30, 40, 50, 60, 70, 80, 90, atau 100). DILARANG KERAS memberikan nilai ganjil seperti 46, 55, 68, 73, 85.
7. Tentukan verdict berdasarkan skor kelipatan 10:
   - "Sangat Memahami Konsep" (skor 90 - 100)
   - "Memahami Konsep dengan Baik" (skor 80)
   - "Cukup Memahami Konsep" (skor 70)
   - "Pemahaman Cukup" (skor 50 - 60)
   - "Perlu Pendalaman Materi" (skor <= 40)
8. Berikan alasan penilaian (score_reason) yang transparan dan mendidik yang menyebutkan nilai kelipatan 10 tersebut secara konsisten (1-2 kalimat).
9. Berikan feedback yang positif, memotivasi, dan konstruktif bagi mahasiswa.

Keluaran WAJIB format JSON murni tanpa markdown pembungkus:
{
  "score": 90,
  "verdict": "Sangat Memahami Konsep",
  "score_reason": "Peserta memperoleh nilai 90 karena uraian jawaban berhasil menjelaskan konsep utama materi dengan tepat dan runtut.",
  "feedback": "Jawaban Anda sudah sangat baik. Pertahankan pemahaman ini pada topik selanjutnya.",
  "strengths": ["Menjelaskan konsep utama materi secara logis"],
  "improvements": ["Pertahankan pemahaman yang baik ini untuk materi berikutnya"]
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
    const rawScore = !isNaN(scoreNum) ? scoreNum : 90;

    // paksa pembulatan ke kelipatan 10 terdekat dalam rentang 0 sampai 100
    const roundedScore = Math.max(0, Math.min(100, Math.round(rawScore / 10) * 10));

    // pastikan teks alasan nilai sinkron dengan nilai kelipatan 10
    let scoreReason =
      parsed.score_reason ||
      `Peserta memperoleh nilai ${roundedScore} berdasarkan hasil evaluasi pemahaman materi.`;
    scoreReason = scoreReason.replace(/\b\d{1,3}\b/, String(roundedScore));

    let verdict = parsed.verdict || "Cukup Memahami Konsep";
    if (roundedScore >= 90) verdict = "Sangat Memahami Konsep";
    else if (roundedScore >= 80) verdict = "Memahami Konsep dengan Baik";
    else if (roundedScore >= 70) verdict = "Cukup Memahami Konsep";
    else if (roundedScore >= 50) verdict = "Pemahaman Cukup";
    else verdict = "Perlu Pendalaman Materi";

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
        topicContent,
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

