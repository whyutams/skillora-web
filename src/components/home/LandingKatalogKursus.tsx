import { createClient, createAdminClient } from "@/utils/supabase/server";
import { Course, UserRole, USER_ROLES } from "@/types/database";
import { parseEnrollmentMeta } from "@/utils/enrollmentMeta";
import KatalogKursusClient from "@/app/KatalogKursusClient";

export async function LandingKatalogKursus() {
  let courses: Course[] = [];
  let currentUser: { id: string; email: string; role?: UserRole } | null = null;
  let enrolledCourseIds: string[] = [];

  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("role, avatar_url, school_origin")
        .eq("id", user.id)
        .maybeSingle();

      const userRole =
        (profile?.role as UserRole) ||
        (user.email === "skillorastartup26@gmail.com" ? USER_ROLES.SUPERADMIN : USER_ROLES.STUDENT);

      currentUser = {
        id: user.id,
        email: user.email,
        role: userRole,
      };

      const { data: userEnrolls } = await adminClient
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id);

      enrolledCourseIds = (userEnrolls || []).map((e) => e.course_id);
    }

    // ambil ulasan nyata peserta dari database
    const { data: dbEnrollments } = await adminClient
      .from("enrollments")
      .select("course_id, whatsapp_number")
      .eq("status", "approved");

    const reviewsByCourse: Record<string, { count: number; totalRating: number }> = {};
    if (dbEnrollments) {
      for (const e of dbEnrollments) {
        if (!e.course_id) continue;
        const meta = parseEnrollmentMeta(e.whatsapp_number);
        if (meta.review_rating) {
          if (!reviewsByCourse[e.course_id]) {
            reviewsByCourse[e.course_id] = { count: 0, totalRating: 0 };
          }
          reviewsByCourse[e.course_id].count += 1;
          reviewsByCourse[e.course_id].totalRating += Number(meta.review_rating);
        }
      }
    }

    const { data: dbCourses } = await adminClient
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: true });

    if (dbCourses && dbCourses.length > 0) {
      courses = dbCourses.map((c) => {
        let rawDesc = c.description || "";
        let descSummary = "";
        let htmlContent = "";
        let img: string | null = null;
        let regStart: string | null = null;
        let regEnd: string | null = null;
        let discountPercent = 0;
        let parsedSyllabus: any[] = [];

        const metaMatch = rawDesc.match(/^<!--meta:(.*?)-->\s*/);
        if (metaMatch) {
          try {
            const parsedMeta = JSON.parse(metaMatch[1]);
            img = parsedMeta.image_url || null;
            descSummary = parsedMeta.description || "";
            regStart = parsedMeta.registration_start || null;
            regEnd = parsedMeta.registration_end || null;
            discountPercent = typeof parsedMeta.discount_percent === "number" ? parsedMeta.discount_percent : 0;
            if (Array.isArray(parsedMeta.syllabus)) {
              parsedSyllabus = parsedMeta.syllabus;
            }
            htmlContent = rawDesc.replace(metaMatch[0], "").trim();
          } catch {
            // fallback bila parsing gagal
          }
        } else {
          const match = rawDesc.match(/^<!--image:(.*?)-->\s*/);
          if (match) {
            img = match[1];
            htmlContent = rawDesc.replace(match[0], "").trim();
          } else {
            htmlContent = rawDesc;
          }
        }

        if (!descSummary) {
          descSummary = htmlContent.replace(/<[^>]*>?/gm, "").trim();
        }

        const revStat = reviewsByCourse[c.id];
        const avgRating = revStat && revStat.count > 0 ? Number((revStat.totalRating / revStat.count).toFixed(1)) : null;
        const reviewCount = revStat ? revStat.count : 0;

        return {
          ...c,
          description: descSummary,
          content: htmlContent,
          image_url: img,
          registration_start: regStart,
          registration_end: regEnd,
          discount_percent: discountPercent,
          syllabus: parsedSyllabus,
          average_rating: avgRating,
          total_reviews: reviewCount,
        };
      });
    }
  } catch (err) {
    console.error("Error fetching courses for landing catalog:", err);
  }

  return (
    <KatalogKursusClient
      courses={courses}
      currentUser={currentUser}
      enrolledCourseIds={enrolledCourseIds}
    />
  );
}

export const LandingCourseCatalog = LandingKatalogKursus;

