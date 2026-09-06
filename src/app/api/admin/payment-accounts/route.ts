import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

interface PaymentAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_active: boolean;
  created_at: string;
}

// Helper: verifikasi superadmin atau admin
async function verifyAdminOrSuperadmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
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

// Fallback helper: Ambil accounts dari activity_logs jika tabel SQL tidak tersedia
async function getAccountsFromFallback(): Promise<PaymentAccount[]> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("activity_logs")
      .select("details")
      .eq("table_name", "payment_accounts")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.details && typeof data.details === "object" && Array.isArray((data.details as Record<string, unknown>).accounts)) {
      return (data.details as Record<string, unknown>).accounts as PaymentAccount[];
    }
  } catch (err) {
    console.error("Error reading payment accounts from fallback:", err);
  }
  return [];
}

// Fallback helper: Simpan accounts ke activity_logs
async function saveAccountsToFallback(accounts: PaymentAccount[]): Promise<boolean> {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("activity_logs").insert({
      action: "SYNC_PAYMENT_ACCOUNTS",
      table_name: "payment_accounts",
      details: { accounts },
    });
    return !error;
  } catch (err) {
    console.error("Error saving payment accounts to fallback:", err);
    return false;
  }
}

// GET — Ambil semua rekening (aktif maupun nonaktif)
export async function GET() {
  try {
    const adminClient = createAdminClient();

    // Coba ambil dari tabel payment_accounts
    const { data, error } = await adminClient
      .from("payment_accounts")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      return NextResponse.json({ accounts: data });
    }

    // Fallback jika tabel SQL belum ada di Supabase
    const fallbackAccounts = await getAccountsFromFallback();
    return NextResponse.json({ accounts: fallbackAccounts });
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

    // 1. Coba insert ke tabel payment_accounts
    const { data, error } = await adminClient
      .from("payment_accounts")
      .insert({
        bank_name: bank_name.trim(),
        account_number: account_number.trim(),
        account_holder: account_holder.trim(),
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      return NextResponse.json({ success: true, account: data });
    }

    // 2. Fallback jika tabel SQL payment_accounts belum tersedia
    const existing = await getAccountsFromFallback();
    const newAccount: PaymentAccount = {
      id: "acc-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      bank_name: bank_name.trim(),
      account_number: account_number.trim(),
      account_holder: account_holder.trim(),
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const updated = [...existing, newAccount];
    const saved = await saveAccountsToFallback(updated);
    if (!saved) throw new Error("Gagal menyimpan data rekening.");

    return NextResponse.json({ success: true, account: newAccount });
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

    const adminClient = createAdminClient();
    const updates: Record<string, unknown> = {};
    if (bank_name !== undefined) updates.bank_name = bank_name.trim();
    if (account_number !== undefined) updates.account_number = account_number.trim();
    if (account_holder !== undefined) updates.account_holder = account_holder.trim();
    if (is_active !== undefined) updates.is_active = is_active;

    // 1. Coba update ke tabel SQL payment_accounts
    const { data, error } = await adminClient
      .from("payment_accounts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      return NextResponse.json({ success: true, account: data });
    }

    // 2. Fallback update di activity_logs
    const existing = await getAccountsFromFallback();
    let updatedAccount: PaymentAccount | null = null;
    const updatedList = existing.map((acc) => {
      if (acc.id === id) {
        updatedAccount = {
          ...acc,
          ...(bank_name !== undefined ? { bank_name: bank_name.trim() } : {}),
          ...(account_number !== undefined ? { account_number: account_number.trim() } : {}),
          ...(account_holder !== undefined ? { account_holder: account_holder.trim() } : {}),
          ...(is_active !== undefined ? { is_active } : {}),
        };
        return updatedAccount;
      }
      return acc;
    });

    if (!updatedAccount) {
      return NextResponse.json({ error: "Rekening tidak ditemukan." }, { status: 404 });
    }

    const saved = await saveAccountsToFallback(updatedList);
    if (!saved) throw new Error("Gagal memperbarui data rekening.");

    return NextResponse.json({ success: true, account: updatedAccount });
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

    // 1. Coba delete dari tabel SQL payment_accounts
    const { error } = await adminClient.from("payment_accounts").delete().eq("id", id);
    if (!error) {
      return NextResponse.json({ success: true });
    }

    // 2. Fallback delete dari activity_logs
    const existing = await getAccountsFromFallback();
    const updatedList = existing.filter((acc) => acc.id !== id);
    const saved = await saveAccountsToFallback(updatedList);
    if (!saved) throw new Error("Gagal menghapus data rekening.");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
