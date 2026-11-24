import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { parseEnrollmentMeta, encodeEnrollmentMeta } from "@/utils/enrollmentMeta";

// post atau patch pembaruan progres belajar kursus peserta langsung ke database
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleProgressUpdate(request, params);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleProgressUpdate(request, params);
}

async function handleProgressUpdate(
  request: Request,
  paramsPromise: Promise<{ id: string }>
) {
  try {
    const { id } = await paramsPromise;
    const cleanId = decodeURIComponent(id || "").trim();
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
      completed_lessons,
      project_submission_url,
      quiz_result,
      last_accessed_lesson,
    } = body;

    const adminClient = createAdminClient();

    // cari pendaftaran berdasarkan id pendaftaran atau slug kursus
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let enrollment = null;

    if (isUUID) {
      const { data } = await adminClient
        .from("enrollments")
        .select("id, user_id, course_id, status, whatsapp_number")
        .eq("id", cleanId)
        .eq("user_id", user.id)
        .maybeSingle();
      enrollment = data;
    } else {
      const { data: c } = await adminClient
        .from("courses")
        .select("id")
        .ilike("slug", cleanId)
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
    const updatedLessons = Array.isArray(completed_lessons)
      ? Array.from(new Set(completed_lessons))
      : currentMeta.completed_lessons || [];

    if (quiz_result && typeof quiz_result.score === "number") {
      // pastikan skor kuis selalu dibulatkan ke kelipatan 10 terdekat
      quiz_result.score = Math.max(0, Math.min(100, Math.round(quiz_result.score / 10) * 10));
    }

    const updatedQuizResults = {
      ...(currentMeta.quiz_results || {}),
      ...(quiz_result && quiz_result.lessonKey ? { [quiz_result.lessonKey]: quiz_result } : {}),
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
      project_submission_url:
        project_submission_url !== undefined
          ? project_submission_url
          : currentMeta.project_submission_url,
      quiz_results: updatedQuizResults,
      total_score: totalScore,
      average_score: averageScore,
      last_accessed_lesson:
        last_accessed_lesson !== undefined
          ? last_accessed_lesson
          : currentMeta.last_accessed_lesson,
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

    // simpan log riwayat pembaruan progres ke tabel activity_logs
    try {
      await adminClient.from("activity_logs").insert({
        user_id: user.id,
        user_email: user.email,
        user_role: "student",
        action: "UPDATE_COURSE_PROGRESS",
        table_name: "enrollments",
        record_id: enrollment.id,
        details: {
          total_completed_lessons: updatedLessons.length,
          last_lesson: last_accessed_lesson,
          has_project: !!newMeta.project_submission_url,
        },
      });
    } catch {
      // non blocking
    }

    return NextResponse.json({
      success: true,
      completed_lessons: updatedLessons,
      project_submission_url: newMeta.project_submission_url,
      quiz_results: updatedQuizResults,
      last_accessed_lesson: newMeta.last_accessed_lesson,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

