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
    const { type, value } = body;

    if (!type || !value || typeof value !== "string") {
      return NextResponse.json(
        { valid: false, message: "Input tidak valid." },
        { status: 400 }
      );
    }

    const cleanValue = value.trim();
    const adminClient = createAdminClient();

    // 1. Validasi Username
    if (type === "username") {
      const lower = cleanValue.toLowerCase();
      const usernameRegex = /^[a-z0-9_.]{3,20}$/;
      if (!usernameRegex.test(lower)) {
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
        .eq("username", lower)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({
          valid: true,
          available: false,
          message: `Username "${lower}" sudah terpakai. Gunakan username lain.`,
        });
      }

      return NextResponse.json({
        valid: true,
        available: true,
        message: `Username "${lower}" tersedia!`,
      });
    }

    // 2. Validasi Email
    if (type === "email") {
      const lower = cleanValue.toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(lower)) {
        return NextResponse.json({
          valid: false,
          available: false,
          message: "Format alamat email tidak valid.",
        });
      }

      // Cek apakah email sudah terdaftar di Supabase Auth
      try {
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const emailExists = usersData?.users?.some(
          (u) => u.email?.toLowerCase() === lower
        );

        if (emailExists) {
          return NextResponse.json({
            valid: true,
            available: false,
            message: `Alamat email "${lower}" sudah terdaftar. Silakan gunakan email lain atau masuk.`,
          });
        }
      } catch (authErr) {
        console.error("Error checking email in auth:", authErr);
      }

      return NextResponse.json({
        valid: true,
        available: true,
        message: "Email valid dan dapat digunakan.",
      });
    }

    // 3. Validasi WhatsApp / Nomor HP
    if (type === "whatsapp" || type === "phone") {
      const cleanDigits = cleanValue.replace(/[^0-9]/g, "");
      if (cleanDigits.length < 9 || cleanDigits.length > 15) {
        return NextResponse.json({
          valid: false,
          available: false,
          message: "Nomor WhatsApp harus terdiri dari 9-15 digit angka.",
        });
      }

      // Cek apakah nomor WhatsApp sudah terdaftar di database profiles
      const phoneVariants = getPhoneVariants(cleanValue);
      const { data: existingPhone } = await adminClient
        .from("profiles")
        .select("id, whatsapp_number")
        .in("whatsapp_number", phoneVariants)
        .limit(1);

      if (existingPhone && existingPhone.length > 0) {
        return NextResponse.json({
          valid: true,
          available: false,
          message: `Nomor WhatsApp "${cleanValue}" sudah terdaftar pada akun lain.`,
        });
      }

      return NextResponse.json({
        valid: true,
        available: true,
        message: "Nomor WhatsApp dapat digunakan.",
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
