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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    try {
      const restUrl = `${supabaseUrl}/rest/v1/activity_logs?table_name=eq.system_settings&select=details&order=created_at.desc&limit=1`;
      const res = await fetch(restUrl, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      });

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.details) {
          isMaintenanceMode = Boolean(rows[0].details.maintenance_mode);
        }
      }
    } catch {
      // abaikan jika fetch mengalami kendala jaringan
    }
  }

  return { supabaseResponse, user, role, isMaintenanceMode };
}
