import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { logActivity } from "@/utils/supabase/activityLogger";

export async function GET() {
  try {
    const supabase = await createClient();

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      profile,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat mengambil profil." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    const body = await request.json();
    const { fullName, schoolOrigin, whatsappNumber, avatarUrl } = body;

    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: "Nama lengkap minimal 2 karakter." },
        { status: 400 }
      );
    }

    const updateData: {
      full_name: string;
      school_origin?: string;
      whatsapp_number?: string;
      avatar_url?: string;
    } = {
      full_name: fullName.trim(),
    };

    if (schoolOrigin !== undefined) {
      updateData.school_origin = schoolOrigin.trim();
    }

    if (whatsappNumber !== undefined) {
      const cleanPhone = whatsappNumber.replace(/[^0-9]/g, "");
      updateData.whatsapp_number = cleanPhone;
    }

    if (avatarUrl !== undefined) {
      updateData.avatar_url = avatarUrl;
    }

    // 1. Update ke Supabase
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return NextResponse.json(
        { error: "Gagal memperbarui profil: " + updateError.message },
        { status: 500 }
      );
    }

    // 2. Catat ke Activity Log
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userRole: updatedProfile.role,
      action: "UPDATE_PROFILE",
      tableName: "profiles",
      recordId: user.id,
      details: {
        updated_fields: Object.keys(updateData),
        avatar_changed: !!avatarUrl,
      },
    });

    return NextResponse.json({
      message: "Profil berhasil diperbarui.",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memperbarui profil." },
      { status: 500 }
    );
  }
}
