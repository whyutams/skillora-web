import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import {
  parseEnrollmentMeta,
  encodeEnrollmentMeta,
  isValidGoogleDriveUrl,
  calculateCombinedScores,
} from "@/utils/enrollmentMeta";
import { parseCourseDescription } from "@/utils/courseMeta";

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
        { error: "Silakan masuk ke akun Anda terlebih dahulu untuk mengakses kursus." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // ambil data pendaftaran berdasarkan id pendaftaran atau slug kursus
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let enrollment = null;
    let error = null;

    const enrollmentSelectQuery = `
      id,
      user_id,
      course_id,
      status,
      whatsapp_number,
      created_at,
      courses (
        id,
        title,
        slug,
        description,
        price,
        is_published,
        whatsapp_group_url,
        created_at
      )
    `;

    if (isUUID) {
      const res = await adminClient
        .from("enrollments")
        .select(enrollmentSelectQuery)
        .eq("id", cleanId)
        .eq("user_id", user.id)
        .maybeSingle();
      enrollment = res.data;
      error = res.error;
    } else {
      // jika parameter berupa slug kursus cari pendaftaran kursus milik pengguna
      const { data: c } = await adminClient
        .from("courses")
        .select("id")
        .ilike("slug", cleanId)
        .maybeSingle();
      if (c?.id) {
        const res = await adminClient
          .from("enrollments")
          .select(enrollmentSelectQuery)
          .eq("course_id", c.id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        enrollment = res.data;
        error = res.error;
      }
    }

    if (error || !enrollment) {
      return NextResponse.json(
        { error: "Pendaftaran kursus tidak ditemukan atau akun Anda belum terdaftar pada kursus ini." },
        { status: 404 }
      );
    }

    // uraikan metadata pendaftaran dan data kursus
    const parsedMeta = parseEnrollmentMeta(enrollment.whatsapp_number);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCourse = enrollment.courses as any;
    let parsedCourse = null;
    let courseViewsCount = 0;
    const initialDbReviews: Array<{
      id: string;
      userName: string;
      userSchool: string;
      avatarUrl: string;
      rating: number;
      comment: string;
      date: string;
      isVerified: boolean;
    }> = [];

    if (rawCourse) {
      const courseParsed = parseCourseDescription(rawCourse.description);
      
      // ambil total peserta yang disetujui untuk kursus ini
      const { count: participantCount } = await adminClient
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", rawCourse.id)
        .eq("status", "approved");

      // ambil total viewer kursus dari log aktivitas
      const { count: viewsCount } = await adminClient
        .from("activity_logs")
        .select("*", { count: "exact", head: true })
        .eq("action", "COURSE_VIEW")
        .eq("table_name", `course_${rawCourse.slug}`);
      if (viewsCount) courseViewsCount = viewsCount;

      // ambil ulasan nyata dari peserta yang telah memberikan rating
      const { data: rawEnrollmentReviews } = await adminClient
        .from("enrollments")
        .select(`
          id,
          whatsapp_number,
          created_at,
          profiles ( full_name, school_origin, avatar_url )
        `)
        .eq("course_id", rawCourse.id)
        .eq("status", "approved")
        .limit(20);

      if (rawEnrollmentReviews && rawEnrollmentReviews.length > 0) {
        for (const enroll of rawEnrollmentReviews) {
          const revMeta = parseEnrollmentMeta(enroll.whatsapp_number);
          if (revMeta.review_rating) {
            const profile = Array.isArray(enroll.profiles)
              ? enroll.profiles[0]
              : (enroll.profiles as any);
            const userName = profile?.full_name || "Mahasiswa Peserta";
            const userSchool = profile?.school_origin || "Mahasiswa Terverifikasi";
            initialDbReviews.push({
              id: `db-${enroll.id}`,
              userName,
              userSchool,
              avatarUrl:
                profile?.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`,
              rating: Number(revMeta.review_rating),
              comment: revMeta.review_text || "Memberikan penilaian bintang.",
              date: revMeta.reviewed_at
                ? new Date(revMeta.reviewed_at).toLocaleDateString("id-ID")
                : "Baru saja",
              isVerified: true,
            });
          }
        }
      }

      parsedCourse = {
        ...rawCourse,
        description: courseParsed.description || rawCourse.description,
        content: courseParsed.content,
        image_url: courseParsed.imageUrl || rawCourse.image_url,
        registration_start: courseParsed.registrationStart,
        registration_end: courseParsed.registrationEnd,
        event_start: courseParsed.eventStart,
        event_end: courseParsed.eventEnd,
        participant_count: participantCount || 0,
        discount_percent: rawCourse.discount_percent ?? courseParsed.discountPercent ?? 0,
        level: rawCourse.level || courseParsed.level || "Tingkat Pemula",
        category: rawCourse.category || courseParsed.category || "Kursus Mandiri",
        target_learning: rawCourse.target_learning || courseParsed.targetLearning || null,
        syllabus: rawCourse.syllabus || courseParsed.syllabus || null,
      };
    }

    // 3. ambil rekening aktif
    let activeAccounts: unknown[] = [];
    const { data: accounts, error: accErr } = await adminClient
      .from("payment_accounts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (!accErr && accounts) {
      activeAccounts = accounts;
    } else {
      const { data: fallbackLog } = await adminClient
        .from("activity_logs")
        .select("details")
        .eq("table_name", "payment_accounts")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackLog?.details && typeof fallbackLog.details === "object" && Array.isArray((fallbackLog.details as Record<string, unknown>).accounts)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activeAccounts = ((fallbackLog.details as Record<string, unknown>).accounts as any[]).filter((a) => a.is_active);
      }
    }

    const { data: userProfile } = await adminClient
      .from("profiles")
      .select("full_name, username, school_origin")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      user_profile: userProfile || null,
      enrollment: {
        id: enrollment.id,
        user_id: enrollment.user_id,
        course_id: enrollment.course_id,
        status: enrollment.status,
        created_at: enrollment.created_at,
        whatsapp_number: parsedMeta.phone,
        payment_proof_url: parsedMeta.payment_proof_url,
        rejection_reason: parsedMeta.rejection_reason,
        certificate_url: parsedMeta.certificate_url,
        review_rating: parsedMeta.review_rating,
        review_text: parsedMeta.review_text,
        reviewed_at: parsedMeta.reviewed_at,
        completed_lessons: parsedMeta.completed_lessons || [],
        project_submission_url: parsedMeta.project_submission_url || null,
        project_submissions: parsedMeta.project_submissions || {},
        quiz_results: parsedMeta.quiz_results || {},
        total_score: typeof parsedMeta.total_score === "number" ? parsedMeta.total_score : null,
        average_score: typeof parsedMeta.average_score === "number" ? parsedMeta.average_score : null,
        last_accessed_lesson: parsedMeta.last_accessed_lesson || null,
        course: parsedCourse,
      },
      payment_accounts: activeAccounts || [],
      views: courseViewsCount,
      reviews: initialDbReviews,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// patch simpan atau perbarui progres belajar kursus mahasiswa ke database
export async function PATCH(
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

    const body = await request.json();
    const {
      completed_lessons,
      project_submission_url,
      project_submission,
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
    let updatedLessons = Array.isArray(completed_lessons)
      ? Array.from(new Set(completed_lessons))
      : currentMeta.completed_lessons || [];

    const updatedQuizResults = {
      ...(currentMeta.quiz_results || {}),
      ...(quiz_result && quiz_result.lessonKey ? { [quiz_result.lessonKey]: quiz_result } : {}),
    };

    const updatedProjectSubmissions = {
      ...(currentMeta.project_submissions || {}),
    };

    let resolvedLegacyProjectUrl =
      project_submission_url !== undefined
        ? project_submission_url
        : currentMeta.project_submission_url;

    // tangani pengumpulan tautan google drive proyek per topik
    if (project_submission && project_submission.lessonKey) {
      const cleanDriveUrl = String(project_submission.driveUrl || "").trim();
      if (!isValidGoogleDriveUrl(cleanDriveUrl)) {
        return NextResponse.json(
          {
            error:
              "Harap masukkan tautan Google Drive yang valid (contoh https://drive.google.com/drive/folders/...).",
          },
          { status: 400 }
        );
      }
      const nowIso = new Date().toISOString();
      const existingItem = updatedProjectSubmissions[project_submission.lessonKey];
      updatedProjectSubmissions[project_submission.lessonKey] = {
        lessonKey: project_submission.lessonKey,
        driveUrl: cleanDriveUrl,
        status: "submitted",
        score: existingItem?.score ?? null,
        feedback: existingItem?.feedback ?? null,
        submittedAt: existingItem?.submittedAt || nowIso,
        updatedAt: nowIso,
        reviewedAt: existingItem?.reviewedAt || null,
      };
      resolvedLegacyProjectUrl = cleanDriveUrl;
      updatedLessons = Array.from(new Set([...updatedLessons, project_submission.lessonKey]));
    }

    // hitung akumulasi skor dan rata rata nilai untuk fitur ranking atau leaderboard
    const { totalScore, averageScore } = calculateCombinedScores(
      updatedQuizResults,
      updatedProjectSubmissions
    );

    const newMeta = {
      ...currentMeta,
      completed_lessons: updatedLessons,
      project_submission_url: resolvedLegacyProjectUrl,
      project_submissions: updatedProjectSubmissions,
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

    // catat log pembaruan progres belajar ke database
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
      project_submissions: newMeta.project_submissions,
      quiz_results: updatedQuizResults,
      last_accessed_lesson: newMeta.last_accessed_lesson,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
