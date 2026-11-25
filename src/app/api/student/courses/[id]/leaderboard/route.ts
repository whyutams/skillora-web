import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { parseEnrollmentMeta } from "@/utils/enrollmentMeta";
import { parseCourseCurriculum } from "@/utils/courseCurriculumParser";

// mengambil data leaderboard peringkat kelas untuk peserta yang telah menyelesaikan seluruh silabus
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const adminClient = createAdminClient();

    // temukan kursus terkait berdasarkan id pendaftaran, slug kursus, atau id kursus
    let targetCourseId: string | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentUserEnrollment: any = null;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    if (isUUID) {
      // periksa apakah cleanId adalah enrollment id
      const { data: enrollById } = await adminClient
        .from("enrollments")
        .select("id, user_id, course_id, status, whatsapp_number")
        .eq("id", cleanId)
        .maybeSingle();

      if (enrollById) {
        targetCourseId = enrollById.course_id;
        if (enrollById.user_id === user.id) {
          currentUserEnrollment = enrollById;
        }
      } else {
        // cleanId adalah course id
        targetCourseId = cleanId;
      }
    } else {
      // cleanId adalah slug kursus
      const { data: courseBySlug } = await adminClient
        .from("courses")
        .select("id")
        .ilike("slug", cleanId)
        .maybeSingle();

      if (courseBySlug) {
        targetCourseId = courseBySlug.id;
      }
    }

    if (!targetCourseId) {
      return NextResponse.json(
        { error: "Kursus tidak ditemukan." },
        { status: 404 }
      );
    }

    // jika belum mendapatkan enrollment peserta saat ini, ambil dari database
    if (!currentUserEnrollment) {
      const { data: enroll } = await adminClient
        .from("enrollments")
        .select("id, user_id, course_id, status, whatsapp_number")
        .eq("course_id", targetCourseId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      currentUserEnrollment = enroll;
    }

    if (!currentUserEnrollment || currentUserEnrollment.status !== "approved") {
      return NextResponse.json(
        { error: "Anda belum terdaftar atau pendaftaran kursus Anda belum disetujui." },
        { status: 403 }
      );
    }

    // ambil data kursus untuk menghitung total silabus
    const { data: courseData } = await adminClient
      .from("courses")
      .select("id, title, slug, content, description")
      .eq("id", targetCourseId)
      .maybeSingle();

    if (!courseData) {
      return NextResponse.json(
        { error: "Data kursus tidak ditemukan." },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const curriculum = parseCourseCurriculum(courseData as any, courseData.content);
    const totalLessons = (curriculum?.modules || []).reduce(
      (acc, m) => acc + (m.lessons?.length || 0),
      0
    );

    const evaluationKeys: string[] = [];
    (curriculum?.modules || []).forEach((mod, mIdx) => {
      (mod.lessons || []).forEach((les, lIdx) => {
        const qData = les.quiz_data;
        const hasQuizQuestions =
          les.type === "quiz" &&
          ((Array.isArray(qData?.questions) && qData.questions.length > 0) ||
            Boolean(qData?.question));
        const hasEssayQuestion =
          les.type !== "quiz" &&
          Boolean(qData?.question && qData.question.replace(/<[^>]*>/g, "").trim());
        const isPractice = les.type === "practice" || Boolean(les.starter_code);
        const isProject = les.type === "project";
        if (hasQuizQuestions || hasEssayQuestion || isPractice || isProject) {
          evaluationKeys.push(`mod-${mIdx}-les-${lIdx}`);
        }
      });
    });

    const userMeta = parseEnrollmentMeta(currentUserEnrollment.whatsapp_number);
    const completedCount = userMeta.completed_lessons?.length || 0;
    const isCompleted = totalLessons > 0 && completedCount >= totalLessons;

    // jika belum menyelesaikan seluruh silabus, ranking masih terkunci
    if (!isCompleted) {
      return NextResponse.json({
        is_unlocked: false,
        completed_count: completedCount,
        total_lessons: totalLessons,
        progress_percentage:
          totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0,
        message:
          "Papan peringkat kelas masih terkunci. Selesaikan seluruh materi silabus dan soal evaluasi kursus ini untuk membuka dan melihat peringkat kelas Anda bersama peserta lain.",
      });
    }

    // jika sudah selesai seluruhnya, ambil seluruh peserta yang disetujui pada kursus ini
    const { data: allApproved } = await adminClient
      .from("enrollments")
      .select(`
        id,
        user_id,
        whatsapp_number,
        created_at,
        profiles (
          id,
          full_name,
          username,
          school_origin,
          avatar_url
        )
      `)
      .eq("course_id", targetCourseId)
      .eq("status", "approved");

    const participantsRanked = (allApproved || []).map((item) => {
      const meta = parseEnrollmentMeta(item.whatsapp_number);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prof = Array.isArray(item.profiles) ? item.profiles[0] : (item.profiles as any);

      const answeredEvaluations =
        evaluationKeys.length > 0
          ? evaluationKeys.filter(
              (k) =>
                Boolean(meta.quiz_results && meta.quiz_results[k]) ||
                Boolean(meta.project_submissions && meta.project_submissions[k]?.driveUrl)
            ).length
          : Object.keys(meta.quiz_results || {}).length +
            Object.keys(meta.project_submissions || {}).length;

      return {
        enrollment_id: item.id,
        user_id: item.user_id,
        name: prof?.full_name || "Mahasiswa Peserta",
        username: prof?.username || null,
        avatar_url: prof?.avatar_url || null,
        school_origin: prof?.school_origin || null,
        average_score: meta.average_score ?? 0,
        total_score: meta.total_score ?? 0,
        completed_count: meta.completed_lessons?.length || 0,
        total_lessons: totalLessons,
        answered_evaluations_count: answeredEvaluations,
        total_evaluations_count: evaluationKeys.length,
        is_course_completed: totalLessons > 0 && (meta.completed_lessons?.length || 0) >= totalLessons,
        is_current_user: item.user_id === user.id,
        created_at: item.created_at,
      };
    });

    // urutkan berdasarkan nilai rata rata tertinggi lalu nilai total lalu jumlah topik selesai
    participantsRanked.sort((a, b) => {
      if (b.average_score !== a.average_score) {
        return b.average_score - a.average_score;
      }
      if (b.total_score !== a.total_score) {
        return b.total_score - a.total_score;
      }
      return b.completed_count - a.completed_count;
    });

    // tetapkan nomor peringkat
    const leaderboard = participantsRanked.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    const currentUserRank = leaderboard.find((item) => item.is_current_user)?.rank || null;

    return NextResponse.json({
      is_unlocked: true,
      total_participants: leaderboard.length,
      current_user_rank: currentUserRank,
      completed_count: completedCount,
      total_lessons: totalLessons,
      progress_percentage: 100,
      leaderboard,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

