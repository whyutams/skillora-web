import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { logActivity } from "@/utils/supabase/activityLogger";
import { parseEnrollmentMeta } from "@/utils/enrollmentMeta";

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

interface ParsedCourseMeta {
  description: string;
  content: string;
  image_url: string | null;
  registration_start: string | null;
  registration_end: string | null;
  event_start: string | null;
  event_end: string | null;
  target_learning: string[];
  syllabus: any[];
  level: string | null;
  category: string | null;
  raw_meta: Record<string, unknown>;
}

function parseCourseDescription(rawDesc: string | null): ParsedCourseMeta {
  if (!rawDesc) {
    return {
      description: "",
      content: "",
      image_url: null,
      registration_start: null,
      registration_end: null,
      event_start: null,
      event_end: null,
      target_learning: [],
      syllabus: [],
      level: null,
      category: null,
      raw_meta: {},
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
        target_learning: Array.isArray(parsedMeta.target_learning) ? parsedMeta.target_learning : [],
        syllabus: Array.isArray(parsedMeta.syllabus) ? parsedMeta.syllabus : [],
        level: parsedMeta.level || null,
        category: parsedMeta.category || null,
        raw_meta: parsedMeta,
      };
    } catch {
      // fallback
    }
  }

  // format gambar lama
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
      target_learning: [],
      syllabus: [],
      level: null,
      category: null,
      raw_meta: {},
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
    target_learning: [],
    syllabus: [],
    level: null,
    category: null,
    raw_meta: {},
  };
}

function encodeCourseDescription(
  description: string,
  content: string,
  imageUrl?: string | null,
  registrationStart?: string | null,
  registrationEnd?: string | null,
  eventStart?: string | null,
  eventEnd?: string | null,
  targetLearning?: string[] | null,
  syllabus?: any[] | null,
  level?: string | null,
  category?: string | null,
  existingMeta?: Record<string, unknown>
): string {
  const cleanDesc = (description || "").trim();
  const cleanContent = (content || "").trim();
  const meta: Record<string, unknown> = {
    ...(existingMeta || {}),
  };

  if (cleanDesc) meta.description = cleanDesc;
  if (imageUrl !== undefined) {
    if (imageUrl && imageUrl.trim()) {
      meta.image_url = imageUrl.trim();
    } else {
      delete meta.image_url;
    }
  }
  if (registrationStart !== undefined) {
    if (registrationStart && registrationStart.trim()) {
      meta.registration_start = registrationStart.trim();
    } else {
      delete meta.registration_start;
    }
  }
  if (registrationEnd !== undefined) {
    if (registrationEnd && registrationEnd.trim()) {
      meta.registration_end = registrationEnd.trim();
    } else {
      delete meta.registration_end;
    }
  }
  if (eventStart !== undefined) {
    if (eventStart && eventStart.trim()) {
      meta.event_start = eventStart.trim();
    } else {
      delete meta.event_start;
    }
  }
  if (eventEnd !== undefined) {
    if (eventEnd && eventEnd.trim()) {
      meta.event_end = eventEnd.trim();
    } else {
      delete meta.event_end;
    }
  }
  if (targetLearning !== undefined) {
    if (Array.isArray(targetLearning)) {
      meta.target_learning = targetLearning.filter((t) => typeof t === "string" && t.trim().length > 0);
    } else {
      delete meta.target_learning;
    }
  }
  if (syllabus !== undefined) {
    if (Array.isArray(syllabus)) {
      meta.syllabus = syllabus;
    } else {
      delete meta.syllabus;
    }
  }
  if (level !== undefined) {
    if (level && level.trim()) {
      meta.level = level.trim();
    } else {
      delete meta.level;
    }
  }
  if (category !== undefined) {
    if (category && category.trim()) {
      meta.category = category.trim();
    } else {
      delete meta.category;
    }
  }

  return `<!--meta:${JSON.stringify(meta)}-->\n${cleanContent}`;
}

// ambil daftar seluruh kursus
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

    // Ambil rekap pendaftaran dan ulasan untuk statistik per kursus
    const { data: enrollments } = await adminClient
      .from("enrollments")
      .select("course_id, status, whatsapp_number");

    const enrollmentStatsMap: Record<string, { total: number; approved: number; pending: number }> = {};
    const reviewsMap: Record<string, { total: number; count: number }> = {};

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

        const meta = parseEnrollmentMeta(e.whatsapp_number);
        if (meta.review_rating) {
          if (!reviewsMap[e.course_id]) {
            reviewsMap[e.course_id] = { total: 0, count: 0 };
          }
          reviewsMap[e.course_id].total += Number(meta.review_rating);
          reviewsMap[e.course_id].count += 1;
        }
      }
    }

    // Ambil rekap view per kursus dari activity_logs
    const { data: viewLogs } = await adminClient
      .from("activity_logs")
      .select("table_name")
      .eq("action", "COURSE_VIEW");

    const viewsMap: Record<string, number> = {};
    let totalViewsCount = 0;
    if (viewLogs) {
      for (const log of viewLogs) {
        totalViewsCount += 1;
        const slug = (log.table_name || "").replace(/^course:/, "");
        if (slug) {
          viewsMap[slug] = (viewsMap[slug] || 0) + 1;
        }
      }
    }

    const courses = (rawCourses || []).map((c) => {
      const parsed = parseCourseDescription(c.description);
      const stats = enrollmentStatsMap[c.id] || { total: 0, approved: 0, pending: 0 };
      const reviewStat = reviewsMap[c.id];
      const avgRating = reviewStat && reviewStat.count > 0
        ? Number((reviewStat.total / reviewStat.count).toFixed(1))
        : null;

      return {
        ...c,
        description: parsed.description,
        content: parsed.content,
        image_url: parsed.image_url,
        registration_start: parsed.registration_start,
        registration_end: parsed.registration_end,
        event_start: parsed.event_start,
        event_end: parsed.event_end,
        target_learning: parsed.target_learning,
        syllabus: parsed.syllabus,
        level: parsed.level,
        category: parsed.category,
        enrolled_count: stats.total,
        approved_count: stats.approved,
        pending_count: stats.pending,
        views_count: viewsMap[c.slug] || 0,
        average_rating: avgRating,
        reviews_count: reviewStat?.count || 0,
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
        totalViews: totalViewsCount,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// tambah kursus baru
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
      target_learning,
      syllabus,
      level,
      category,
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
      body.event_end || null,
      target_learning || [],
      syllabus || [],
      level || null,
      category || null
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
        target_learning: parsed.target_learning,
        syllabus: parsed.syllabus,
        level: parsed.level,
        category: parsed.category,
      },
      message: `Kursus "${newCourse.title}" berhasil ditambahkan.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// update kursus
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
      target_learning,
      syllabus,
      level,
      category,
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
      body.event_end !== undefined ||
      target_learning !== undefined ||
      syllabus !== undefined ||
      level !== undefined ||
      category !== undefined
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
      const newTarget = target_learning !== undefined ? target_learning : currentParsed.target_learning;
      const newSyllabus = syllabus !== undefined ? syllabus : currentParsed.syllabus;
      const newLevel = level !== undefined ? level : currentParsed.level;
      const newCat = category !== undefined ? category : currentParsed.category;

      updatePayload.description = encodeCourseDescription(
        newDesc,
        newContent,
        newImg,
        newRegStart,
        newRegEnd,
        newEventStart,
        newEventEnd,
        newTarget,
        newSyllabus,
        newLevel,
        newCat,
        currentParsed.raw_meta
      );
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
        event_start: parsed.event_start,
        event_end: parsed.event_end,
        target_learning: parsed.target_learning,
        syllabus: parsed.syllabus,
        level: parsed.level,
        category: parsed.category,
      },
      message: `Kursus "${updated.title}" berhasil diperbarui.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// hapus kursus
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
            "Kursus ini memiliki data pendaftaran peserta aktif. Anda dapat menonaktifkan status publikasi kursus ini daripada menghapusnya.",
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
