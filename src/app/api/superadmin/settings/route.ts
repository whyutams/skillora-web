import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

interface MaintenanceSettings {
  maintenance_mode: boolean;
  message: string;
  estimated_finish?: string;
  updated_at?: string;
  updated_by?: string;
}

const DEFAULT_SETTINGS: MaintenanceSettings = {
  maintenance_mode: false,
  message: "Platform Skillora sedang dalam pemeliharaan sistem berkala untuk peningkatan fitur dan kualitas layanan. Kami akan segera kembali online.",
  estimated_finish: "",
  updated_at: new Date().toISOString(),
  updated_by: "System",
};

// ambil pengaturan sistem
export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("activity_logs")
      .select("details, created_at, user_email")
      .eq("table_name", "system_settings")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.details && typeof data.details === "object") {
      const details = data.details as Record<string, unknown>;
      return NextResponse.json({
        settings: {
          maintenance_mode: Boolean(details.maintenance_mode),
          message: typeof details.message === "string" ? details.message : DEFAULT_SETTINGS.message,
          estimated_finish: typeof details.estimated_finish === "string" ? details.estimated_finish : "",
          updated_at: data.created_at || DEFAULT_SETTINGS.updated_at,
          updated_by: data.user_email || DEFAULT_SETTINGS.updated_by,
        },
      });
    }

    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat pengaturan sistem.";
    return NextResponse.json({ error: message, settings: DEFAULT_SETTINGS }, { status: 500 });
  }
}

// simpan pengaturan sistem khusus superadmin
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login kembali." }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const isSuperadmin =
      profile?.role === "superadmin" ||
      user.email === "skillorastartup26@gmail.com";

    if (!isSuperadmin) {
      return NextResponse.json(
        { error: "Akses ditolak. Fitur ini hanya untuk Superadmin." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const maintenance_mode = Boolean(body.maintenance_mode);
    const customMessage =
      typeof body.message === "string" && body.message.trim() !== ""
        ? body.message.trim()
        : DEFAULT_SETTINGS.message;
    const estimated_finish = typeof body.estimated_finish === "string" ? body.estimated_finish.trim() : "";

    const updatedSettings: MaintenanceSettings = {
      maintenance_mode,
      message: customMessage,
      estimated_finish,
      updated_at: new Date().toISOString(),
      updated_by: user.email || profile?.full_name || "Superadmin",
    };

    // simpan ke tabel activity_logs sebagai rekam jejak audit
    const { error: insertError } = await adminClient.from("activity_logs").insert({
      user_id: user.id,
      user_email: user.email,
      user_role: "superadmin",
      action: maintenance_mode ? "ENABLE_MAINTENANCE_MODE" : "DISABLE_MAINTENANCE_MODE",
      table_name: "system_settings",
      record_id: "maintenance",
      details: updatedSettings,
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: maintenance_mode
        ? "Mode pemeliharaan berhasil diaktifkan. Akses publik kini dialihkan ke halaman pemeliharaan."
        : "Mode pemeliharaan berhasil dinonaktifkan. Akses publik telah kembali normal.",
      settings: updatedSettings,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui pengaturan sistem.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

