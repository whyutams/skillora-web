import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      username,
      email,
      password,
      schoolOrigin,
      whatsappNumber,
    } = body;

    // 1. Validasi Nama Lengkap
    if (!fullName?.trim()) {
      return NextResponse.json(
        { error: "Nama lengkap wajib diisi." },
        { status: 400 }
      );
    }

    // 2. Validasi Username
    if (!username?.trim()) {
      return NextResponse.json(
        { error: "Username wajib diisi." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "");
    const usernameRegex = /^[a-z0-9_.]{3,20}$/;
    if (!usernameRegex.test(cleanUsername)) {
      return NextResponse.json(
        {
          error:
            "Username harus 3-20 karakter (hanya huruf kecil, angka, titik, atau underscore tanpa spasi).",
        },
        { status: 400 }
      );
    }

    // 3. Validasi Email
    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Alamat email aktif wajib diisi." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Format alamat email tidak valid." },
        { status: 400 }
      );
    }

    // 4. Validasi Kata Sandi
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Kata sandi minimal terdiri dari 6 karakter." },
        { status: 400 }
      );
    }

    // 5. Validasi WhatsApp
    const cleanPhone = whatsappNumber?.trim().replace(/[^0-9+]/g, "") || "";
    if (!cleanPhone || cleanPhone.length < 9) {
      return NextResponse.json(
        { error: "Nomor WhatsApp aktif wajib diisi (minimal 9 digit)." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 6. Cek ketersediaan username di tabel profiles
    const { data: existingUser } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        {
          error: `Username "${cleanUsername}" sudah digunakan oleh akun lain. Silakan pilih username lain.`,
        },
        { status: 400 }
      );
    }

    // 7. Buat akun di Supabase Auth via Admin Client (email_confirm: true otomatis aktif)
    const { data: authResult, error: authError } =
      await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim(),
          username: cleanUsername,
          school_origin: schoolOrigin?.trim() || "Pelajar / Mahasiswa",
          whatsapp_number: cleanPhone,
        },
      });

    if (authError || !authResult.user) {
      const errMsg = authError?.message || "";
      if (
        errMsg.toLowerCase().includes("already registered") ||
        errMsg.toLowerCase().includes("already been registered") ||
        errMsg.toLowerCase().includes("user already exists")
      ) {
        return NextResponse.json(
          {
            error: `Alamat email "${cleanEmail}" sudah terdaftar. Silakan masuk menggunakan akun Anda.`,
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: errMsg || "Gagal mendaftarkan akun pengguna baru." },
        { status: 400 }
      );
    }

    const newUserId = authResult.user.id;

    // 8. Simpan/Upsert record ke tabel public.profiles
    const { data: savedProfile, error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: newUserId,
        full_name: fullName.trim(),
        username: cleanUsername,
        school_origin: schoolOrigin?.trim() || "Pelajar / Mahasiswa",
        whatsapp_number: cleanPhone,
        role: "student",
      })
      .select()
      .single();

    if (profileError) {
      console.error("Gagal simpan profile saat registrasi:", profileError);
    }

    // 9. Catat ke Activity Log
    try {
      await adminClient.from("activity_logs").insert({
        user_id: newUserId,
        user_email: cleanEmail,
        user_role: "student",
        action: "USER_REGISTER",
        table_name: "profiles",
        record_id: newUserId,
        details: {
          full_name: fullName.trim(),
          username: cleanUsername,
          school_origin: schoolOrigin?.trim() || "Pelajar / Mahasiswa",
          whatsapp_number: cleanPhone,
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      user: savedProfile || {
        id: newUserId,
        username: cleanUsername,
        email: cleanEmail,
      },
      message: "Akun peserta berhasil didaftarkan.",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
