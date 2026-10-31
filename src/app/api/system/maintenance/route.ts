import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// endpoint publik status pemeliharaan
export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("activity_logs")
      .select("details, created_at")
      .eq("table_name", "system_settings")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.details && typeof data.details === "object") {
      const details = data.details as Record<string, unknown>;
      return NextResponse.json({
        maintenance_mode: Boolean(details.maintenance_mode),
        message: typeof details.message === "string" ? details.message : "",
        estimated_finish: typeof details.estimated_finish === "string" ? details.estimated_finish : "",
      });
    }

    return NextResponse.json({
      maintenance_mode: false,
      message: "",
      estimated_finish: "",
    });
  } catch {
    return NextResponse.json({
      maintenance_mode: false,
      message: "",
      estimated_finish: "",
    });
  }
}

