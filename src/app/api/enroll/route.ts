import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { logActivity } from "@/utils/supabase/activityLogger";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sesi login berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, avatar_url, school_origin")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && (profile.role === "admin" || profile.role === "superadmin")) {
      return NextResponse.json(
        {
          error: `Akun dengan role ${profile.role.toUpperCase()} tidak diizinkan mendaftar sebagai peserta kursus. Gunakan akun Mahasiswa (Student) untuk mendaftar.`,
        },
        { status: 403 }
      );
    }

    const hasAvatar = Boolean(profile?.avatar_url && profile.avatar_url.trim().length > 0);
    const hasSchool = Boolean(profile?.school_origin && profile.school_origin.trim().length > 0 && profile.school_origin !== "-");

    if (!hasAvatar || !hasSchool) {
      return NextResponse.json(
        {
          error: "Anda wajib melengkapi foto profil dan asal kampus di menu Profil terlebih dahulu sebelum mendaftar kursus.",
          requiresProfileCompletion: true,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { courseId, whatsappNumber } = body;

    if (!courseId || !whatsappNumber) {
      return NextResponse.json(
        { error: "ID Kursus dan Nomor WhatsApp wajib diisi." },
        { status: 400 }
      );
    }

    // Cek apakah kursus valid dan aktif
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("id, title, price, description")
      .eq("id", courseId)
      .single();

    if (courseErr || !course) {
      return NextResponse.json(
        { error: "Kursus tidak ditemukan atau sudah tidak tersedia." },
        { status: 404 }
      );
    }

    // 2. Periksa apakah pengguna sudah pernah mendaftar di kursus ini
    const { data: existingEnrollment } = await supabase
      .from("enrollments")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existingEnrollment) {
      return NextResponse.json(
        {
          error:
            "Anda sudah terdaftar pada kursus ini. Silakan periksa status pendaftaran di menu Kursus Saya.",
        },
        { status: 409 }
      );
    }

    // Validasi Waktu Pendaftaran Kursus
    let regStart: string | null = null;
    let regEnd: string | null = null;

    if (course.description) {
      const metaMatch = course.description.match(/^<!--meta:(.*?)-->\s*/);
      if (metaMatch) {
        try {
          const parsed = JSON.parse(metaMatch[1]);
          regStart = parsed.registration_start || null;
          regEnd = parsed.registration_end || null;
        } catch {
          // ignore
        }
      }
    }

    if (regStart && regEnd) {
      const now = new Date();
      const startDate = new Date(regStart);
      if (regStart.length <= 10) startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(regEnd);
      if (regEnd.length <= 10) endDate.setHours(23, 59, 59, 999);

      if (now < startDate) {
        return NextResponse.json(
          {
            error: `Pendaftaran kursus ini belum dibuka. Pendaftaran akan dimulai pada ${startDate.toLocaleDateString(
              "id-ID"
            )}.`,
          },
          { status: 400 }
        );
      }

      if (now > endDate) {
        return NextResponse.json(
          {
            error: `Pendaftaran kursus ini telah berakhir pada ${endDate.toLocaleDateString(
              "id-ID"
            )}.`,
          },
          { status: 400 }
        );
      }
    }

    // Insert pendaftaran baru
    const { data: enrollment, error: enrollErr } = await supabase
      .from("enrollments")
      .insert({
        user_id: user.id,
        course_id: courseId,
        whatsapp_number: whatsappNumber,
        status: "pending_payment",
      })
      .select()
      .single();

    if (enrollErr) {
      if (enrollErr.code === "23505") {
        // Unique constraint violation
        return NextResponse.json(
          {
            error:
              "Anda sudah terdaftar di kursus ini. Silakan periksa status pendaftaran di dashboard Anda.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: enrollErr.message || "Gagal menyimpan data pendaftaran." },
        { status: 500 }
      );
    }

    // Catat ke Activity Log via service role
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userRole: profile?.role || "student",
      action: "ENROLL_COURSE",
      tableName: "enrollments",
      recordId: enrollment.id,
      details: {
        course_id: courseId,
        course_title: course.title,
        price: course.price,
        whatsapp_number: whatsappNumber,
      },
    });

    return NextResponse.json({
      success: true,
      enrollment,
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
