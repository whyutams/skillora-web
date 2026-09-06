import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const adminClient = createAdminClient();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 1. Pengunjung Harian (Hari Ini) langsung dari tabel database
    const { count: dbDaily } = await adminClient
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "SITE_VISIT")
      .gte("created_at", startOfDay);

    // 2. Pengunjung Bulanan (Bulan Ini) langsung dari tabel database
    const { count: dbMonthly } = await adminClient
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "SITE_VISIT")
      .gte("created_at", startOfMonth);

    // 3. Total Keseluruhan Pengunjung langsung dari tabel database
    const { count: dbTotal } = await adminClient
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "SITE_VISIT");

    return NextResponse.json({
      dailyVisitors: dbDaily || 0,
      monthlyVisitors: dbMonthly || 0,
      totalVisitors: dbTotal || 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json(
      {
        error: message,
        dailyVisitors: 0,
        monthlyVisitors: 0,
        totalVisitors: 0,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let ip = body.ip;

    if (!ip) {
      const forwarded = request.headers.get("x-forwarded-for");
      ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    }

    const adminClient = createAdminClient();

    // Cek apakah IP ini sudah berkunjung hari ini (mencegah duplikasi log dalam satu hari)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: existingToday } = await adminClient
      .from("activity_logs")
      .select("id")
      .eq("action", "SITE_VISIT")
      .eq("ip_address", ip)
      .gte("created_at", startOfDay)
      .limit(1)
      .maybeSingle();

    let isNew = false;

    if (!existingToday) {
      const { error: insertErr } = await adminClient
        .from("activity_logs")
        .insert({
          action: "SITE_VISIT",
          table_name: "site_visitors",
          ip_address: ip,
          details: {
            user_agent: request.headers.get("user-agent") || "unknown",
            referer: request.headers.get("referer") || null,
          },
        });

      if (!insertErr) {
        isNew = true;
      }
    }

    // Ambil statistik real-time dari tabel
    const { count: dbDaily } = await adminClient
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "SITE_VISIT")
      .gte("created_at", startOfDay);

    const { count: dbMonthly } = await adminClient
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "SITE_VISIT")
      .gte("created_at", startOfMonth);

    const { count: dbTotal } = await adminClient
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "SITE_VISIT");

    return NextResponse.json({
      success: true,
      isNew,
      dailyVisitors: dbDaily || 0,
      monthlyVisitors: dbMonthly || 0,
      totalVisitors: dbTotal || 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json(
      {
        error: message,
        dailyVisitors: 0,
        monthlyVisitors: 0,
        totalVisitors: 0,
      },
      { status: 500 }
    );
  }
}
