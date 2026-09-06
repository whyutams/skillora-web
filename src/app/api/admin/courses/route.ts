import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { logActivity } from "@/utils/supabase/activityLogger";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function parseCourseDescription(rawDesc: string | null): {
  description: string;
  content: string;
  image_url: string | null;
  registration_start: string | null;
  registration_end: string | null;
  event_start: string | null;
  event_end: string | null;
} {
  if (!rawDesc) {
    return {
      description: "",
      content: "",
      image_url: null,
      registration_start: null,
      registration_end: null,
      event_start: null,
      event_end: null,
    };
  }

  // Check JSON meta format
  const metaMatch = rawDesc.match(/^<!--meta:(.*?)-->\s*/);
  if (metaMatch) {
    try {
      const parsedMeta = JSON.parse(metaMatch[1]);
      const htmlContent = rawDesc.replace(metaMatch[0], "").trim();
      return {
        description: parsedMeta.description || "",
        content: htmlContent || parsedMeta.content || "",
        image_url: parsedMeta.image_url || null,
        registration_start: parsedMeta.registration_start || null,
        registration_end: parsedMeta.registration_end || null,
        event_start: parsedMeta.event_start || null,
        event_end: parsedMeta.event_end || null,
      };
    } catch {
      // fallback
    }
  }

  // Check legacy <!--image:...--> format
  const imgMatch = rawDesc.match(/^<!--image:(.*?)-->\s*/);
  if (imgMatch) {
    const htmlContent = rawDesc.replace(imgMatch[0], "").trim();
    return {
      description: "",
      content: htmlContent,
      image_url: imgMatch[1],
      registration_start: null,
      registration_end: null,
      event_start: null,
      event_end: null,
    };
  }

  return {
    description: rawDesc,
    content: rawDesc,
    image_url: null,
    registration_start: null,
    registration_end: null,
    event_start: null,
    event_end: null,
  };
}

function encodeCourseDescription(
  description: string,
  content: string,
  imageUrl?: string | null,
  registrationStart?: string | null,
  registrationEnd?: string | null,
  eventStart?: string | null,
  eventEnd?: string | null
): string {
  const cleanDesc = (description || "").trim();
  const cleanContent = (content || "").trim();
  const meta: {
    description?: string;
    image_url?: string | null;
    registration_start?: string | null;
    registration_end?: string | null;
    event_start?: string | null;
    event_end?: string | null;
  } = {};

  if (cleanDesc) meta.description = cleanDesc;
  if (imageUrl && imageUrl.trim()) meta.image_url = imageUrl.trim();
  if (registrationStart && registrationStart.trim()) meta.registration_start = registrationStart.trim();
  if (registrationEnd && registrationEnd.trim()) meta.registration_end = registrationEnd.trim();
  if (eventStart && eventStart.trim()) meta.event_start = eventStart.trim();
  if (eventEnd && eventEnd.trim()) meta.event_end = eventEnd.trim();

  return `<!--meta:${JSON.stringify(meta)}-->\n${cleanContent}`;
}

// GET: Ambil daftar seluruh kursus (untuk Admin & Superadmin)
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || (user.email === "skillorastartup26@gmail.com" ? "superadmin" : "student");
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json({ error: "Akses ditolak. Khusus Admin dan Superadmin." }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { data: rawCourses, error } = await adminClient
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ambil rekap pendaftaran untuk statistik per kursus
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("course_id, status");

    const enrollmentStatsMap: Record<string, { total: number; approved: number; pending: number }> = {};
    if (enrollments) {
      for (const e of enrollments) {
        if (!e.course_id) continue;
        if (!enrollmentStatsMap[e.course_id]) {
          enrollmentStatsMap[e.course_id] = { total: 0, approved: 0, pending: 0 };
        }
        enrollmentStatsMap[e.course_id].total += 1;
        if (e.status === "approved") {
          enrollmentStatsMap[e.course_id].approved += 1;
        } else if (e.status === "pending_payment") {
          enrollmentStatsMap[e.course_id].pending += 1;
        }
      }
    }

    const courses = (rawCourses || []).map((c) => {
      const parsed = parseCourseDescription(c.description);
      const stats = enrollmentStatsMap[c.id] || { total: 0, approved: 0, pending: 0 };
      return {
        ...c,
        description: parsed.description,
        content: parsed.content,
        image_url: parsed.image_url,
        registration_start: parsed.registration_start,
        registration_end: parsed.registration_end,
        event_start: parsed.event_start,
        event_end: parsed.event_end,
        enrolled_count: stats.total,
        approved_count: stats.approved,
        pending_count: stats.pending,
      };
    });

    const totalEnrollments = enrollments ? enrollments.length : 0;
    const totalApprovedStudents = enrollments
      ? enrollments.filter((e) => e.status === "approved").length
      : 0;

    return NextResponse.json({
      courses,
      stats: {
        totalCourses: courses.length,
        publishedCourses: courses.filter((c) => c.is_published).length,
        draftCourses: courses.filter((c) => !c.is_published).length,
        totalEnrollments,
        totalApprovedStudents,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Tambah Kursus Baru
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || (user.email === "skillorastartup26@gmail.com" ? "superadmin" : "student");
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json({ error: "Akses ditolak. Khusus Admin dan Superadmin." }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      slug: customSlug,
      description,
      content,
      price = 0,
      whatsapp_group_url,
      image_url,
      registration_start,
      registration_end,
      is_published = true,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Judul kursus wajib diisi." }, { status: 400 });
    }

    let finalSlug = slugify(customSlug || title);
    if (!finalSlug) {
      finalSlug = `kursus-${Date.now()}`;
    }

    const adminClient = createAdminClient();

    // Periksa keunikan slug
    const { data: existingCourse } = await adminClient
      .from("courses")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();

    if (existingCourse) {
      finalSlug = `${finalSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const finalDescription = encodeCourseDescription(
      description || "",
      content || "",
      image_url || null,
      registration_start || null,
      registration_end || null,
      body.event_start || null,
      body.event_end || null
    );
    const numPrice = Math.max(0, parseInt(String(price), 10) || 0);

    const { data: newCourse, error: insertError } = await adminClient
      .from("courses")
      .insert({
        title: title.trim(),
        slug: finalSlug,
        description: finalDescription,
        price: numPrice,
        whatsapp_group_url: whatsapp_group_url?.trim() || null,
        is_published: !!is_published,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Catat ke Activity Log
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userRole: role,
      action: "CREATE_COURSE",
      tableName: "courses",
      recordId: newCourse.id,
      details: {
        title: newCourse.title,
        slug: newCourse.slug,
        price: newCourse.price,
        is_published: newCourse.is_published,
      },
    });

    const parsed = parseCourseDescription(newCourse.description);
    return NextResponse.json({
      success: true,
      course: {
        ...newCourse,
        description: parsed.description,
        content: parsed.content,
        image_url: parsed.image_url,
        registration_start: parsed.registration_start,
        registration_end: parsed.registration_end,
        event_start: parsed.event_start,
        event_end: parsed.event_end,
      },
      message: `Kursus "${newCourse.title}" berhasil ditambahkan.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Update Kursus
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || (user.email === "skillorastartup26@gmail.com" ? "superadmin" : "student");
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json({ error: "Akses ditolak. Khusus Admin dan Superadmin." }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      title,
      slug: customSlug,
      description,
      content,
      price,
      whatsapp_group_url,
      image_url,
      registration_start,
      registration_end,
      is_published,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID kursus wajib diisi." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Cek kursus lama
    const { data: existing, error: fetchErr } = await adminClient
      .from("courses")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Kursus tidak ditemukan." }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {};

    if (title !== undefined) updatePayload.title = title.trim();
    if (price !== undefined) updatePayload.price = Math.max(0, parseInt(String(price), 10) || 0);
    if (whatsapp_group_url !== undefined) updatePayload.whatsapp_group_url = whatsapp_group_url?.trim() || null;
    if (is_published !== undefined) updatePayload.is_published = !!is_published;

    if (customSlug !== undefined && customSlug.trim() && customSlug !== existing.slug) {
      const candidateSlug = slugify(customSlug);
      const { data: slugDup } = await adminClient
        .from("courses")
        .select("id")
        .eq("slug", candidateSlug)
        .neq("id", id)
        .maybeSingle();

      if (slugDup) {
        return NextResponse.json({ error: `Slug "${candidateSlug}" telah digunakan kursus lain.` }, { status: 400 });
      }
      updatePayload.slug = candidateSlug;
    }

    if (
      description !== undefined ||
      content !== undefined ||
      image_url !== undefined ||
      registration_start !== undefined ||
      registration_end !== undefined ||
      body.event_start !== undefined ||
      body.event_end !== undefined
    ) {
      const currentParsed = parseCourseDescription(existing.description);
      const newDesc = description !== undefined ? description : currentParsed.description;
      const newContent = content !== undefined ? content : currentParsed.content;
      // Jika image_url dikirimkan (termasuk string kosong atau null), jadikan null agar benar-benar terhapus
      const newImg = image_url !== undefined ? (image_url ? String(image_url).trim() : null) : currentParsed.image_url;
      const newRegStart = registration_start !== undefined ? (registration_start ? String(registration_start).trim() : null) : currentParsed.registration_start;
      const newRegEnd = registration_end !== undefined ? (registration_end ? String(registration_end).trim() : null) : currentParsed.registration_end;
      const newEventStart = body.event_start !== undefined ? (body.event_start ? String(body.event_start).trim() : null) : currentParsed.event_start;
      const newEventEnd = body.event_end !== undefined ? (body.event_end ? String(body.event_end).trim() : null) : currentParsed.event_end;

      updatePayload.description = encodeCourseDescription(newDesc, newContent, newImg, newRegStart, newRegEnd, newEventStart, newEventEnd);
    }

    const { data: updated, error: updateErr } = await adminClient
      .from("courses")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Catat ke Activity Log
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userRole: role,
      action: "UPDATE_COURSE",
      tableName: "courses",
      recordId: id,
      details: {
        title: updated.title,
        updated_fields: Object.keys(updatePayload),
      },
    });

    const parsed = parseCourseDescription(updated.description);
    return NextResponse.json({
      success: true,
      course: {
        ...updated,
        description: parsed.description,
        content: parsed.content,
        image_url: parsed.image_url,
        registration_start: parsed.registration_start,
        registration_end: parsed.registration_end,
      },
      message: `Kursus "${updated.title}" berhasil diperbarui.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Hapus Kursus
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || (user.email === "skillorastartup26@gmail.com" ? "superadmin" : "student");
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json({ error: "Akses ditolak. Khusus Admin dan Superadmin." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID kursus wajib disertakan." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Cek apakah ada enrollment untuk kursus ini
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("id")
      .eq("course_id", id)
      .limit(1);

    if (enrollments && enrollments.length > 0) {
      return NextResponse.json(
        {
          error:
            "Kursus ini memiliki data pendaftaran siswa aktif. Anda dapat menonaktifkan status publikasi kursus ini daripada menghapusnya.",
        },
        { status: 400 }
      );
    }

    // Ambil info kursus sebelum dihapus untuk log
    const { data: toDelete } = await adminClient
      .from("courses")
      .select("title, slug")
      .eq("id", id)
      .single();

    const { error: delErr } = await adminClient.from("courses").delete().eq("id", id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // Catat ke Activity Log
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userRole: role,
      action: "DELETE_COURSE",
      tableName: "courses",
      recordId: id,
      details: {
        title: toDelete?.title || id,
        slug: toDelete?.slug || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Kursus "${toDelete?.title || id}" berhasil dihapus.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
