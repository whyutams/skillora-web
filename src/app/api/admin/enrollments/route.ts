import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { parseEnrollmentMeta, encodeEnrollmentMeta } from "@/utils/enrollmentMeta";
import { parseCourseDescription } from "@/utils/courseMeta";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course_id");
    const statusParam = searchParams.get("status");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // periksa role pengguna
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
      return NextResponse.json(
        { error: "Akses ditolak. Khusus Admin & Superadmin." },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();
    let query = adminClient
      .from("enrollments")
      .select(`
        id,
        user_id,
        course_id,
        status,
        whatsapp_number,
        created_at,
        profiles (
          id,
          full_name,
          username,
          school_origin,
          avatar_url,
          role,
          whatsapp_number
        ),
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
      `)
      .order("created_at", { ascending: false });

    if (courseId) {
      query = query.eq("course_id", courseId);
    }

    if (statusParam) {
      query = query.eq("status", statusParam);
    }

    const { data: enrollments, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format metadata untuk setiap enrollment & kursus
    const formattedEnrollments = (enrollments || []).map((item) => {
      const parsedMeta = parseEnrollmentMeta(item.whatsapp_number);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawCourse = item.courses as any;
      let parsedCourse = null;

      if (rawCourse) {
        const courseParsed = parseCourseDescription(rawCourse.description);
        parsedCourse = {
          ...rawCourse,
          description: courseParsed.description || rawCourse.description,
          content: courseParsed.content,
          image_url: courseParsed.imageUrl,
          registration_start: courseParsed.registrationStart,
          registration_end: courseParsed.registrationEnd,
          event_start: courseParsed.eventStart,
          event_end: courseParsed.eventEnd,
        };
      }

      return {
        id: item.id,
        user_id: item.user_id,
        course_id: item.course_id,
        status: item.status,
        created_at: item.created_at,
        whatsapp_number: parsedMeta.phone,
        payment_proof_url: parsedMeta.payment_proof_url,
        rejection_reason: parsedMeta.rejection_reason,
        certificate_url: parsedMeta.certificate_url,
        review_rating: parsedMeta.review_rating,
        review_text: parsedMeta.review_text,
        reviewed_at: parsedMeta.reviewed_at,
        profiles: item.profiles,
        courses: parsedCourse,
      };
    });

    return NextResponse.json({ enrollments: formattedEnrollments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
      return NextResponse.json(
        { error: "Akses ditolak. Khusus Admin & Superadmin." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { enrollmentId, status, rejection_reason, certificate_url } = body;

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "Parameter ID pendaftaran wajib diisi." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Ambil data enrollment saat ini
    const { data: currentEnrollment, error: fetchErr } = await adminClient
      .from("enrollments")
      .select("id, whatsapp_number, status, course_id, user_id")
      .eq("id", enrollmentId)
      .single();

    if (fetchErr || !currentEnrollment) {
      return NextResponse.json(
        { error: "Data pendaftaran tidak ditemukan." },
        { status: 404 }
      );
    }

    const currentMeta = parseEnrollmentMeta(currentEnrollment.whatsapp_number);

    const updatePayload: { status?: string; whatsapp_number?: string } = {};

    // 1. Update Status (dan rejection_reason jika ditolak)
    if (status) {
      if (!["approved", "rejected", "pending_payment"].includes(status)) {
        return NextResponse.json(
          { error: "Status pendaftaran tidak valid." },
          { status: 400 }
        );
      }

      updatePayload.status = status;

      if (status === "rejected") {
        if (!rejection_reason || !rejection_reason.trim()) {
          return NextResponse.json(
            { error: "Alasan penolakan pendaftaran wajib diisi oleh Admin." },
            { status: 400 }
          );
        }
        currentMeta.rejection_reason = rejection_reason.trim();
      } else if (status === "approved") {
        // Hapus alasan penolakan jika sebelumnya ditolak lalu disetujui
        currentMeta.rejection_reason = null;
      }
    }

    // 2. Update / Upload E-Sertifikat
    if (certificate_url !== undefined) {
      currentMeta.certificate_url = certificate_url ? certificate_url.trim() : null;
    }

    // Encode kembali ke kolom whatsapp_number
    updatePayload.whatsapp_number = encodeEnrollmentMeta(currentMeta.phone, currentMeta);

    const { data: updated, error: updateErr } = await adminClient
      .from("enrollments")
      .update(updatePayload)
      .eq("id", enrollmentId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Catat Activity Log
    try {
      let actionName = "UPDATE_ENROLLMENT";
      if (certificate_url !== undefined) {
        actionName = "UPLOAD_STUDENT_CERTIFICATE";
      } else if (status === "approved") {
        actionName = "APPROVE_ENROLLMENT";
      } else if (status === "rejected") {
        actionName = "REJECT_ENROLLMENT";
      }

      await adminClient.from("activity_logs").insert({
        user_id: user.id,
        user_email: user.email,
        user_role: profile.role,
        action: actionName,
        table_name: "enrollments",
        record_id: enrollmentId,
        details: {
          new_status: status || currentEnrollment.status,
          rejection_reason: currentMeta.rejection_reason,
          certificate_url: currentMeta.certificate_url,
          admin_email: user.email,
          actor_role: profile.role,
        },
      });
    } catch (logErr) {
      console.error("Failed to log enrollment action:", logErr);
    }

    return NextResponse.json({
      success: true,
      updated: {
        ...updated,
        ...currentMeta,
        whatsapp_number: currentMeta.phone,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
