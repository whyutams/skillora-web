import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/utils/supabase/activityLogger";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tableName, recordId, details, userEmail, userRole, userId } = body;

    if (!action || !tableName) {
      return NextResponse.json({ error: "Parameter action dan tableName wajib diisi." }, { status: 400 });
    }

    // Ambil IP client
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    let finalUserId = userId;
    let finalUserEmail = userEmail;
    let finalUserRole = userRole;

    // Jika tidak disediakan, coba ambil dari session aktif & profiles
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (!finalUserId) finalUserId = user.id;
        if (!finalUserEmail) finalUserEmail = user.email;
        if (!finalUserRole) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          finalUserRole = prof?.role || (user.email === "skillorastartup26@gmail.com" ? "superadmin" : "student");
        }
      }
    } catch {
      // ignore
    }

    await logActivity({
      userId: finalUserId,
      userEmail: finalUserEmail,
      userRole: finalUserRole,
      action,
      tableName,
      recordId: recordId || null,
      details: details || null,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in /api/logs:", err);
    return NextResponse.json({ error: "Gagal mencatat log aktivitas." }, { status: 500 });
  }
}
