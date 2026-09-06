import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

// Helper: verifikasi superadmin atau admin (kedua role bisa kelola rekening)
async function verifyAdminOrSuperadmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role || (user.email === "skillorastartup26@gmail.com" ? "superadmin" : null);
  if (!role || !["admin", "superadmin"].includes(role)) {
    return { error: "Akses ditolak. Khusus Admin.", status: 403 };
  }
  return { user, role };
}

// GET — Ambil semua rekening aktif (bisa diakses siapapun untuk tampil di modal peserta)
export async function GET() {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("payment_accounts")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ accounts: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — Tambah rekening baru (admin/superadmin)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await verifyAdminOrSuperadmin(supabase);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { bank_name, account_number, account_holder } = body;

    if (!bank_name?.trim() || !account_number?.trim() || !account_holder?.trim()) {
      return NextResponse.json({ error: "Nama bank, nomor rekening, dan nama pemilik wajib diisi." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("payment_accounts")
      .insert({ bank_name: bank_name.trim(), account_number: account_number.trim(), account_holder: account_holder.trim() })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, account: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — Edit rekening (admin/superadmin)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await verifyAdminOrSuperadmin(supabase);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { id, bank_name, account_number, account_holder, is_active } = body;

    if (!id) return NextResponse.json({ error: "ID rekening wajib diisi." }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (bank_name !== undefined) updates.bank_name = bank_name.trim();
    if (account_number !== undefined) updates.account_number = account_number.trim();
    if (account_holder !== undefined) updates.account_holder = account_holder.trim();
    if (is_active !== undefined) updates.is_active = is_active;

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("payment_accounts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, account: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — Hapus rekening (admin/superadmin)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await verifyAdminOrSuperadmin(supabase);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID rekening wajib diisi." }, { status: 400 });

    const adminClient = createAdminClient();
    const { error } = await adminClient.from("payment_accounts").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
