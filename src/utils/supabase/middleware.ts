import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { UserRole } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { supabaseResponse, user: null, role: null };
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ambil data pengguna terverifikasi dari supabase auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: UserRole | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    role = (profile?.role as UserRole) || "student";
  }

  // periksa status mode pemeliharaan dari variabel lingkungan atau database
  let isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
  try {
    const { data: settingData } = await supabase
      .from("activity_logs")
      .select("details")
      .eq("table_name", "system_settings")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingData?.details && typeof settingData.details === "object") {
      isMaintenanceMode = Boolean((settingData.details as Record<string, unknown>).maintenance_mode);
    }
  } catch {
    // abaikan jika tabel belum dapat diakses
  }

  return { supabaseResponse, user, role, isMaintenanceMode };
}
