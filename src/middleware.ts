import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { checkRateLimit } from "@/lib/ratelimit";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rate Limiting untuk auth & sensitive API routes
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

  // 2. Refresh Supabase Session & Ambil User Role
  const { supabaseResponse, user, role } = await updateSession(request);

  // 3. Role Guard & Route Protection
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isKursusSayaRoute = pathname.startsWith("/kursus-saya");
  const isAdminRoute = pathname.startsWith("/admin");
  const isSuperadminRoute = pathname.startsWith("/superadmin");
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  // A. Akses tanpa login ke protected routes
  if ((isDashboardRoute || isKursusSayaRoute || isAdminRoute || isSuperadminRoute) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // B. Role-based restrictions
  if (user && role) {
    // 1. Superadmin TIDAK BOLEH mengakses route Admin (/admin/*) atau endpoint admin kursus langsung
    if (role === "superadmin" && (isAdminRoute || pathname === "/courses")) {
      return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
    }

    // 2. Admin TIDAK BOLEH mengakses route Superadmin (/superadmin/*)
    if (role === "admin" && isSuperadminRoute) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    // 3. Student TIDAK BOLEH mengakses route Admin ataupun Superadmin
    if (role === "student" && (isAdminRoute || isSuperadminRoute)) {
      return NextResponse.redirect(new URL("/kursus-saya", request.url));
    }

    // 4. Pengguna yang sudah login mengakses halaman auth (login/register)
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
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, icons, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
