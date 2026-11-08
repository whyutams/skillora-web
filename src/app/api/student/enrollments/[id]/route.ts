import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { parseEnrollmentMeta } from "@/utils/enrollmentMeta";
import { parseCourseDescription } from "@/utils/courseMeta";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. ambil data enrollment berdasarkan id pendaftaran atau slug kursus
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
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
        content,
        image_url,
        price,
        is_published,
        whatsapp_group_url,
        target_learning,
        syllabus,
        created_at
      )
    `;

    if (isUUID) {
      const res = await adminClient
        .from("enrollments")
        .select(enrollmentSelectQuery)
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      enrollment = res.data;
      error = res.error;
    } else {
      // jika parameter berupa slug kursus cari pendaftaran kursus milik pengguna
      const { data: c } = await adminClient.from("courses").select("id").eq("slug", id).maybeSingle();
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
        { error: "Pendaftaran kursus tidak ditemukan." },
        { status: 404 }
      );
    }

    // 2. Parse metadata enrollment & course
    const parsedMeta = parseEnrollmentMeta(enrollment.whatsapp_number);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCourse = enrollment.courses as any;
    let parsedCourse = null;

    if (rawCourse) {
      const courseParsed = parseCourseDescription(rawCourse.description);
      
      // Ambil total peserta yang disetujui untuk kursus ini
      const { count: participantCount } = await adminClient
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", rawCourse.id)
        .eq("status", "approved");

      parsedCourse = {
        ...rawCourse,
        description: courseParsed.description || rawCourse.description,
        content: courseParsed.content,
        image_url: courseParsed.imageUrl,
        registration_start: courseParsed.registrationStart,
        registration_end: courseParsed.registrationEnd,
        event_start: courseParsed.eventStart,
        event_end: courseParsed.eventEnd,
        participant_count: participantCount || 0,
      };
    }

    // 3. Ambil rekening aktif
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

    return NextResponse.json({
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
        course: parsedCourse,
      },
      payment_accounts: activeAccounts || [],
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
