import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { checkRateLimit } from "@/lib/ratelimit";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. pembatasan laju request rate limiting untuk rute sensitif
  const isRateLimitedPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/enroll");

  if (isRateLimitedPath) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const { success, reset } = await checkRateLimit(`ip:${ip}`);
    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: "Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi.",
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }
  }

  // 2. segarkan sesi supabase ambil peran pengguna dan status pemeliharaan
  const { supabaseResponse, user, role, isMaintenanceMode } = await updateSession(request);

  // 3. penanganan mode pemeliharaan maintenance mode
  const host = request.headers.get("host") || "";
  const isLocalhost =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.startsWith("::1");

  const isMaintenancePath = pathname.startsWith("/maintenance");
  const isExcludedApi =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/system/maintenance") ||
    pathname.startsWith("/api/superadmin/settings");

  // mode pemeliharaan tidak berlaku jika diakses pada lingkungan localhost
  if (isMaintenanceMode && !isLocalhost) {
    const isManager = role === "superadmin" || role === "admin";

    // jika pengguna bukan pengelola publik atau mahasiswa
    if (!isManager) {
      // izinkan hanya halaman pemeliharaan dan endpoint api otentikasi
      if (!isMaintenancePath && !isExcludedApi) {
        const maintenanceUrl = new URL("/maintenance", request.url);
        return NextResponse.redirect(maintenanceUrl);
      }
    } else {
      // jika pengelola yang sudah login membuka portal login pemeliharaan arahkan ke dashboard
      if (pathname === "/maintenance/login") {
        if (role === "superadmin") {
          return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
        }
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }
  }

  // 4. penjagaan peran dan proteksi rute dashboard
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isKursusSayaRoute = pathname.startsWith("/kursus-saya");
  const isAdminRoute = pathname.startsWith("/admin");
  const isSuperadminRoute = pathname.startsWith("/superadmin");
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  // akses tanpa login ke rute yang dilindungi
  if ((isDashboardRoute || isKursusSayaRoute || isAdminRoute || isSuperadminRoute) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // pembatasan berdasarkan peran akun
  if (user && role) {
    // superadmin tidak boleh mengakses rute admin kursus langsung
    if (role === "superadmin" && (isAdminRoute || pathname === "/courses")) {
      return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
    }

    // admin tidak boleh mengakses rute superadmin
    if (role === "admin" && isSuperadminRoute) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    // mahasiswa tidak boleh mengakses rute admin ataupun superadmin
    if (role === "student" && (isAdminRoute || isSuperadminRoute)) {
      return NextResponse.redirect(new URL("/kursus-saya", request.url));
    }

    // pengguna yang sudah login mengakses halaman auth login atau register
    if (isAuthRoute) {
      if (role === "superadmin") {
        return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
      }
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/kursus-saya", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
