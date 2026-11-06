import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { USER_ROLES } from "@/constants/roles";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. verifikasi superadmin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Autentikasi diperlukan." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isSuperadminUser =
      profile?.role === USER_ROLES.SUPERADMIN ||
      user.email === "skillorastartup26@gmail.com";

    if (!isSuperadminUser) {
      return NextResponse.json(
        { error: "Hanya Superadmin yang memiliki akses ke Activity Logs." },
        { status: 403 }
      );
    }

    // 2. query params filter per tabel dan pencarian
    const searchParams = request.nextUrl.searchParams;
    const tableFilter = searchParams.get("table") || "all";
    const searchQuery = searchParams.get("q") || "";

    const adminClient = createAdminClient();
    let query = adminClient
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (tableFilter && tableFilter !== "all") {
      query = query.eq("table_name", tableFilter);
    }

    if (searchQuery) {
      query = query.or(
        `action.ilike.%${searchQuery}%,user_email.ilike.%${searchQuery}%,record_id.ilike.%${searchQuery}%`
      );
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error("Error fetching activity logs:", logsError);
      return NextResponse.json(
        { error: "Gagal mengambil activity logs dari database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      logs: logs || [],
      total: logs?.length || 0,
    });
  } catch (error) {
    console.error("Unhandled error in /api/superadmin/logs:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
