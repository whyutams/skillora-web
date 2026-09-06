import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";

// Helper verifikasi superadmin
async function verifySuperadmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role || (user.email === "skillorastartup26@gmail.com" ? "superadmin" : null);
  if (role !== "superadmin") return { error: "Akses ditolak. Khusus Superadmin.", status: 403 };
  return { user, role };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await verifySuperadmin(supabase);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const adminClient = createAdminClient();

    const { data: users, error: userError } = await adminClient
      .from("profiles")
      .select("id, full_name, username, school_origin, whatsapp_number, role, avatar_url, created_at")
      .order("created_at", { ascending: false });

    if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("id, status, courses(price)");

    const totalEnrollments = enrollments?.length || 0;
    const pendingEnrollments = enrollments?.filter((e) => e.status === "pending_payment").length || 0;
    const approvedEnrollments = enrollments?.filter((e) => e.status === "approved").length || 0;

    let estimatedRevenue = 0;
    enrollments?.forEach((e: unknown) => {
      const item = e as { status: string; courses?: { price?: number } | null };
      if (item.status === "approved" && item.courses?.price) {
        estimatedRevenue += Number(item.courses.price);
      }
    });

    return NextResponse.json({
      users,
      metrics: { totalUsers: users?.length || 0, totalEnrollments, pendingEnrollments, approvedEnrollments, estimatedRevenue },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Terjadi kesalahan." }, { status: 500 });
  }
}

// POST — Buat user baru (tetap ada)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await verifySuperadmin(supabase);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { fullName, username, email, password, schoolOrigin, whatsappNumber, role = "student" } = body;

    if (!fullName?.trim()) return NextResponse.json({ error: "Nama lengkap wajib diisi." }, { status: 400 });
    if (!username?.trim()) return NextResponse.json({ error: "Username wajib diisi." }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: "Email wajib diisi." }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ error: "Kata sandi minimal 6 karakter." }, { status: 400 });
    if (role === "superadmin") return NextResponse.json({ error: "Akun Superadmin bersifat tunggal." }, { status: 400 });
    if (!["admin", "student"].includes(role)) return NextResponse.json({ error: "Role tidak valid." }, { status: 400 });

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "");
    const adminClient = createAdminClient();

    const { data: existingUser } = await adminClient.from("profiles").select("id").eq("username", cleanUsername).maybeSingle();
    if (existingUser) return NextResponse.json({ error: `Username "${cleanUsername}" sudah digunakan.` }, { status: 400 });

    const { data: authResult, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim(), username: cleanUsername },
    });

    if (authError || !authResult.user) {
      return NextResponse.json({ error: authError?.message || "Gagal membuat akun." }, { status: 400 });
    }

    const newUserId = authResult.user.id;
    const { data: savedProfile, error: profileError } = await adminClient.from("profiles").upsert({
      id: newUserId, full_name: fullName.trim(), username: cleanUsername,
      school_origin: schoolOrigin?.trim() || "Sekolah / Kampus Umum",
      whatsapp_number: whatsappNumber?.trim() || null, role,
    }).select().single();

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    try {
      await adminClient.from("activity_logs").insert({
        user_id: auth.user.id, user_email: auth.user.email, user_role: "superadmin",
        action: "CREATE_USER_MANUAL", table_name: "profiles", record_id: newUserId,
        details: { created_username: cleanUsername, created_email: email.trim().toLowerCase(), assigned_role: role },
      });
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, user: savedProfile, message: `Pengguna "${fullName.trim()}" berhasil ditambahkan.` });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Terjadi kesalahan." }, { status: 500 });
  }
}

// PUT — Reset password user (superadmin only)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await verifySuperadmin(supabase);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { userId, newPassword } = body;

    if (!userId) return NextResponse.json({ error: "User ID wajib diisi." }, { status: 400 });
    if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: "Password baru minimal 6 karakter." }, { status: 400 });

    const adminClient = createAdminClient();

    // Cegah superadmin ubah password dirinya sendiri via halaman ini
    if (userId === auth.user.id) {
      return NextResponse.json({ error: "Gunakan fitur Edit Profil untuk mengubah password sendiri." }, { status: 400 });
    }

    // Dapatkan info target user
    const { data: targetProfile } = await adminClient.from("profiles").select("full_name, username, role").eq("id", userId).maybeSingle();
    if (!targetProfile) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });

    const { error: resetError } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });
    if (resetError) return NextResponse.json({ error: resetError.message }, { status: 500 });

    try {
      await adminClient.from("activity_logs").insert({
        user_id: auth.user.id, user_email: auth.user.email, user_role: "superadmin",
        action: "RESET_USER_PASSWORD", table_name: "auth.users", record_id: userId,
        details: { target_username: targetProfile.username, target_name: targetProfile.full_name },
      });
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, message: `Password untuk "${targetProfile.full_name}" berhasil direset.` });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Terjadi kesalahan." }, { status: 500 });
  }
}

// DELETE — Hapus akun user (superadmin only)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await verifySuperadmin(supabase);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) return NextResponse.json({ error: "User ID wajib diisi." }, { status: 400 });

    // Cegah superadmin hapus dirinya sendiri
    if (userId === auth.user.id) {
      return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Dapatkan info user sebelum dihapus
    const { data: targetProfile } = await adminClient.from("profiles").select("full_name, username, role").eq("id", userId).maybeSingle();

    // Proteksi: jangan hapus superadmin lain
    if (targetProfile?.role === "superadmin") {
      return NextResponse.json({ error: "Akun Superadmin tidak dapat dihapus." }, { status: 400 });
    }

    // Hapus dari auth (cascade hapus profile juga melalui trigger DB)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    // Hapus profile manual jika trigger tidak berjalan
    await adminClient.from("profiles").delete().eq("id", userId).maybeSingle();

    try {
      await adminClient.from("activity_logs").insert({
        user_id: auth.user.id, user_email: auth.user.email, user_role: "superadmin",
        action: "DELETE_USER", table_name: "auth.users", record_id: userId,
        details: { deleted_username: targetProfile?.username, deleted_name: targetProfile?.full_name, deleted_role: targetProfile?.role },
      });
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, message: `Akun "${targetProfile?.full_name || userId}" berhasil dihapus.` });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Terjadi kesalahan." }, { status: 500 });
  }
}
