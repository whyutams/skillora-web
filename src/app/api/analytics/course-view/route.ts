import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

// GET: Ambil jumlah view untuk kursus tertentu
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const courseId = searchParams.get("courseId");

    if (!slug && !courseId) {
      return NextResponse.json({ error: "Parameter slug atau courseId diperlukan." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    let query = adminClient
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "COURSE_VIEW");

    if (courseId) {
      query = query.eq("record_id", courseId);
    } else if (slug) {
      query = query.eq("table_name", `course:${slug}`);
    }

    const { count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message, views: 0 }, { status: 500 });
    }

    return NextResponse.json({ views: count || 0 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: msg, views: 0 }, { status: 500 });
  }
}

// POST: Rekam kunjungan halaman kursus spesifik
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { slug, courseId, ip: providedIp } = body;

    if (!slug && !courseId) {
      return NextResponse.json({ error: "Parameter slug atau courseId diperlukan." }, { status: 400 });
    }

    let ip = providedIp;
    if (!ip) {
      const forwarded = request.headers.get("x-forwarded-for");
      ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    }

    const adminClient = createAdminClient();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const targetTable = slug ? `course:${slug}` : "courses";
    const targetRecordId = courseId || null;

    // Cek apakah IP sudah merekam kunjungan ke kursus ini hari ini
    let checkQuery = adminClient
      .from("activity_logs")
      .select("id")
      .eq("action", "COURSE_VIEW")
      .eq("ip_address", ip)
      .eq("table_name", targetTable)
      .gte("created_at", startOfDay);

    if (targetRecordId) {
      checkQuery = checkQuery.eq("record_id", targetRecordId);
    }

    const { data: existingToday } = await checkQuery.limit(1).maybeSingle();

    if (!existingToday) {
      await adminClient.from("activity_logs").insert({
        action: "COURSE_VIEW",
        table_name: targetTable,
        record_id: targetRecordId,
        ip_address: ip,
        details: {
          slug,
          user_agent: request.headers.get("user-agent") || "unknown",
          referer: request.headers.get("referer") || null,
        },
      });
    }

    // Ambil total view kursus ini
    let countQuery = adminClient
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "COURSE_VIEW")
      .eq("table_name", targetTable);

    if (targetRecordId) {
      countQuery = countQuery.eq("record_id", targetRecordId);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      success: true,
      views: count || 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: msg, views: 0 }, { status: 500 });
  }
}
