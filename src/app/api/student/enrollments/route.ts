import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { parseEnrollmentMeta, encodeEnrollmentMeta } from "@/utils/enrollmentMeta";
import { parseCourseDescription } from "@/utils/courseMeta";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Ambil data profil
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Ambil data enrollments milik siswa
    const { data: enrollmentsData, error } = await adminClient
      .from("enrollments")
      .select(`
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
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Parse metadata untuk setiap enrollment dan course
    const formattedEnrollments = (enrollmentsData || []).map((item) => {
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
        course: parsedCourse,
      };
    });

    return NextResponse.json({
      profile,
      enrollments: formattedEnrollments,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Unggah / kirim bukti transfer pembayaran
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { enrollmentId, payment_proof_url } = body;

    if (!enrollmentId || !payment_proof_url) {
      return NextResponse.json(
        { error: "ID pendaftaran dan URL bukti transfer wajib diisi." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verifikasi enrollment milik user
    const { data: enrollment, error: fetchErr } = await adminClient
      .from("enrollments")
      .select("id, user_id, whatsapp_number, status")
      .eq("id", enrollmentId)
      .single();

    if (fetchErr || !enrollment || enrollment.user_id !== user.id) {
      return NextResponse.json(
        { error: "Pendaftaran tidak ditemukan atau bukan milik Anda." },
        { status: 404 }
      );
    }

    const parsed = parseEnrollmentMeta(enrollment.whatsapp_number);
    const updatedWhatsapp = encodeEnrollmentMeta(parsed.phone, {
      ...parsed,
      payment_proof_url: payment_proof_url.trim(),
      rejection_reason: null, // Reset alasan penolakan saat upload ulang
    });

    const { error: updateErr } = await adminClient
      .from("enrollments")
      .update({
        status: "pending_payment", // Reset status menjadi pending_payment agar admin dapat meninjau kembali
        whatsapp_number: updatedWhatsapp,
      })
      .eq("id", enrollmentId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Catat activity log
    try {
      await adminClient.from("activity_logs").insert({
        user_id: user.id,
        user_email: user.email,
        user_role: "student",
        action: "UPLOAD_PAYMENT_PROOF",
        table_name: "enrollments",
        record_id: enrollmentId,
        details: {
          payment_proof_url,
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      message: "Bukti transfer berhasil disimpan. Menunggu validasi admin.",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Kirim ulasan dan rating kursus oleh peserta (setelah tanggal pelaksanaan kursus selesai)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { enrollmentId, rating, reviewText } = body;

    const numRating = Number(rating);
    if (!enrollmentId || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: "Rating bintang (1-5) wajib dipilih." },
        { status: 400 }
      );
    }

    if (!reviewText || !reviewText.trim()) {
      return NextResponse.json(
        { error: "Teks ulasan kursus wajib diisi." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verifikasi enrollment milik user
    const { data: enrollment, error: fetchErr } = await adminClient
      .from("enrollments")
      .select(`
        id,
        user_id,
        whatsapp_number,
        status,
        courses (
          id,
          title,
          description
        )
      `)
      .eq("id", enrollmentId)
      .single();

    if (fetchErr || !enrollment || enrollment.user_id !== user.id) {
      return NextResponse.json(
        { error: "Pendaftaran tidak ditemukan atau bukan milik Anda." },
        { status: 404 }
      );
    }

    if (enrollment.status !== "approved") {
      return NextResponse.json(
        { error: "Hanya peserta kursus yang telah disetujui yang dapat memberikan ulasan." },
        { status: 400 }
      );
    }

    // Periksa apakah kursus sudah selesai pelaksanaan (event_end)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCourse = enrollment.courses as any;
    if (rawCourse?.description) {
      const parsedCourse = parseCourseDescription(rawCourse.description);
      if (parsedCourse.eventEnd) {
        const eventEndDate = new Date(parsedCourse.eventEnd);
        // Validasi jika saat ini belum melewati tanggal pelaksanaan
        if (new Date() < eventEndDate) {
          return NextResponse.json(
            {
              error: `Ulasan hanya dapat diberikan setelah periode pelaksanaan kursus selesai (${eventEndDate.toLocaleDateString("id-ID")}).`,
            },
            { status: 400 }
          );
        }
      }
    }

    const parsed = parseEnrollmentMeta(enrollment.whatsapp_number);
    const updatedWhatsapp = encodeEnrollmentMeta(parsed.phone, {
      ...parsed,
      review_rating: numRating,
      review_text: reviewText.trim(),
      reviewed_at: new Date().toISOString(),
    });

    const { error: updateErr } = await adminClient
      .from("enrollments")
      .update({
        whatsapp_number: updatedWhatsapp,
      })
      .eq("id", enrollmentId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Catat activity log
    try {
      await adminClient.from("activity_logs").insert({
        user_id: user.id,
        user_email: user.email,
        user_role: "student",
        action: "SUBMIT_COURSE_REVIEW",
        table_name: "enrollments",
        record_id: enrollmentId,
        details: {
          rating: numRating,
          review_text: reviewText.trim(),
          course_id: rawCourse?.id,
          course_title: rawCourse?.title,
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      message: "Ulasan berhasil disimpan! Sekarang Anda dapat mengunduh E-Sertifikat.",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
