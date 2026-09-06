import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, value } = body;

    if (!type || !value || typeof value !== "string") {
      return NextResponse.json(
        { valid: false, message: "Input tidak valid." },
        { status: 400 }
      );
    }

    const cleanValue = value.trim().toLowerCase();
    const adminClient = createAdminClient();

    // 1. Validasi Username
    if (type === "username") {
      const usernameRegex = /^[a-z0-9_.]{3,20}$/;
      if (!usernameRegex.test(cleanValue)) {
        return NextResponse.json({
          valid: false,
          available: false,
          message: "Username harus 3-20 karakter (huruf kecil, angka, titik/underscore, tanpa spasi).",
        });
      }

      // Cek ketersediaan di database
      const { data: existing } = await adminClient
        .from("profiles")
        .select("id")
        .eq("username", cleanValue)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({
          valid: true,
          available: false,
          message: `Username "${cleanValue}" sudah terpakai. Gunakan username lain.`,
        });
      }

      return NextResponse.json({
        valid: true,
        available: true,
        message: `Username "${cleanValue}" tersedia!`,
      });
    }

    // 2. Validasi Email
    if (type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanValue)) {
        return NextResponse.json({
          valid: false,
          available: false,
          message: "Format alamat email tidak valid.",
        });
      }

      return NextResponse.json({
        valid: true,
        available: true,
        message: "Format email valid.",
      });
    }

    return NextResponse.json(
      { valid: false, message: "Tipe validasi tidak dikenal." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memvalidasi.";
    return NextResponse.json({ valid: false, message: msg }, { status: 500 });
  }
}
