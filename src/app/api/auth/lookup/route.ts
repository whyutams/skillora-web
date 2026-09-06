import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier } = body;

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { error: "Username wajib diisi." },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Jika user menginput email langsung
    if (cleanIdentifier.includes("@")) {
      return NextResponse.json({ email: cleanIdentifier });
    }

    const adminClient = createAdminClient();

    // Cari user profile berdasarkan username
    const { data: profile, error } = await adminClient
      .from("profiles")
      .select("id, username")
      .eq("username", cleanIdentifier)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json(
        { error: `Username "${cleanIdentifier}" tidak ditemukan. Pastikan Anda telah mendaftar.` },
        { status: 404 }
      );
    }

    // Ambil data auth.users untuk mendapatkan email login
    const { data: userData, error: userError } =
      await adminClient.auth.admin.getUserById(profile.id);

    if (userError || !userData?.user?.email) {
      return NextResponse.json(
        { error: "Gagal menemukan akun yang terhubung dengan username ini." },
        { status: 404 }
      );
    }

    // Jika akun lama belum terkonfirmasi emailnya, konfirmasi otomatis agar bisa login
    if (!userData.user.email_confirmed_at) {
      try {
        await adminClient.auth.admin.updateUserById(profile.id, {
          email_confirm: true,
        });
      } catch (err) {
        console.error("Gagal auto-confirm email:", err);
      }
    }

    return NextResponse.json({ email: userData.user.email });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
