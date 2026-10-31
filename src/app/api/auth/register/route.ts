import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

function getPhoneVariants(phone: string): string[] {
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return [];
  const variants = new Set<string>();
  variants.add(phone.trim());
  variants.add(digits);
  if (digits.startsWith("0")) {
    const withoutZero = digits.slice(1);
    variants.add(withoutZero);
    variants.add(`62${withoutZero}`);
    variants.add(`+62${withoutZero}`);
    variants.add(`0${withoutZero}`);
  } else if (digits.startsWith("62")) {
    const without62 = digits.slice(2);
    variants.add(without62);
    variants.add(`0${without62}`);
    variants.add(`62${without62}`);
    variants.add(`+62${without62}`);
  } else {
    variants.add(`0${digits}`);
    variants.add(`62${digits}`);
    variants.add(`+62${digits}`);
  }
  return Array.from(variants);
}

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

    // 7. Cek ketersediaan nomor WhatsApp/HP di tabel profiles
    const phoneVariants = getPhoneVariants(cleanPhone);
    const { data: existingPhone } = await adminClient
      .from("profiles")
      .select("id, whatsapp_number")
      .in("whatsapp_number", phoneVariants)
      .limit(1);

    if (existingPhone && existingPhone.length > 0) {
      return NextResponse.json(
        {
          error: `Nomor WhatsApp / HP "${cleanPhone}" sudah terdaftar pada akun lain. Silakan gunakan nomor WhatsApp lain atau masuk ke akun Anda.`,
        },
        { status: 400 }
      );
    }

    // 8. Cek apakah email sudah terdaftar di Supabase Auth
    try {
      const { data: existingUsersData } =
        await adminClient.auth.admin.listUsers();
      const emailExists = existingUsersData?.users?.some(
        (u) => u.email?.toLowerCase() === cleanEmail
      );
      if (emailExists) {
        return NextResponse.json(
          {
            error: `Alamat email "${cleanEmail}" sudah terdaftar. Silakan masuk menggunakan akun Anda.`,
          },
          { status: 400 }
        );
      }
    } catch (listErr) {
      console.error("Error checking existing email list:", listErr);
    }

    // 9. Buat akun di Supabase Auth via Admin Client (email_confirm: true otomatis aktif)
    const { data: authResult, error: authError } =
      await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim(),
          username: cleanUsername,
          school_origin: schoolOrigin?.trim() || "Mahasiswa",
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

    // Simpan record ke tabel public.profiles
    const { data: savedProfile, error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: newUserId,
        full_name: fullName.trim(),
        username: cleanUsername,
        school_origin: schoolOrigin?.trim() || "Mahasiswa",
        whatsapp_number: cleanPhone,
        role: "student",
      })
      .select()
      .single();

    if (profileError) {
      console.error("Gagal simpan profile saat registrasi:", profileError);
    }

    // Catat ke Activity Log
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
          school_origin: schoolOrigin?.trim() || "Mahasiswa",
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
