import { createAdminClient } from "@/utils/supabase/server";

// catat kunjungan pengunjung ke tabel log aktivitas
export async function recordSiteVisitServer(
  ip: string,
  userAgent: string = "unknown",
  referer: string | null = null
) {
  try {
    const adminClient = createAdminClient();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // periksa apakah ip sudah tercatat berkunjung hari ini
    const { data: existingToday } = await adminClient
      .from("activity_logs")
      .select("id")
      .eq("action", "SITE_VISIT")
      .eq("ip_address", ip)
      .gte("created_at", startOfDay)
      .limit(1)
      .maybeSingle();

    if (!existingToday) {
      await adminClient.from("activity_logs").insert({
        action: "SITE_VISIT",
        table_name: "site_visitors",
        ip_address: ip,
        details: {
          user_agent: userAgent,
          referer: referer,
        },
      });
      return true;
    }
    return false;
  } catch {
    // non blocking jika terjadi kendala logging
    return false;
  }
}

