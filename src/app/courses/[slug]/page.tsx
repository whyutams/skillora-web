import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { Course, UserRole } from "@/types/database";
import DetailKursusClient from "./DetailKursusClient";
import { CourseReviewItem } from "@/utils/courseCurriculumParser";
import { parseEnrollmentMeta } from "@/utils/enrollmentMeta";

export const dynamic = "force-dynamic";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

function parseCourseDescription(rawDesc: string | null): {
  description: string;
  content: string;
  image_url: string | null;
  registration_start: string | null;
  registration_end: string | null;
  target_learning?: string[];
  syllabus?: any[];
  level?: string | null;
  category?: string | null;
} {
  if (!rawDesc) {
    return {
      description: "",
      content: "",
      image_url: null,
      registration_start: null,
      registration_end: null,
      target_learning: [],
      syllabus: [],
      level: null,
      category: null,
    };
  }

  // Check JSON meta format
  const metaMatch = rawDesc.match(/^<!--meta:(.*?)-->\s*/);
  if (metaMatch) {
    try {
      const parsedMeta = JSON.parse(metaMatch[1]);
      const htmlContent = rawDesc.replace(metaMatch[0], "").trim();
      const descSummary =
        parsedMeta.description || htmlContent.replace(/<[^>]*>?/gm, "").slice(0, 200).trim();
      return {
        description: descSummary,
        content: htmlContent || parsedMeta.content || "",
        image_url: parsedMeta.image_url || null,
        registration_start: parsedMeta.registration_start || null,
        registration_end: parsedMeta.registration_end || null,
        target_learning: Array.isArray(parsedMeta.target_learning) ? parsedMeta.target_learning : [],
        syllabus: Array.isArray(parsedMeta.syllabus) ? parsedMeta.syllabus : [],
        level: parsedMeta.level || null,
        category: parsedMeta.category || null,
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
      description: htmlContent.replace(/<[^>]*>?/gm, "").slice(0, 200).trim(),
      content: htmlContent,
      image_url: imgMatch[1],
      registration_start: null,
      registration_end: null,
      target_learning: [],
      syllabus: [],
      level: null,
      category: null,
    };
  }

  return {
    description: rawDesc.replace(/<[^>]*>?/gm, "").slice(0, 200).trim(),
    content: rawDesc,
    image_url: null,
    registration_start: null,
    registration_end: null,
    target_learning: [],
    syllabus: [],
    level: null,
    category: null,
  };
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const adminClient = createAdminClient();
  const { data: course } = await adminClient
    .from("courses")
    .select("title, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!course) {
    return {
      title: "Detail Kursus Mandiri | Skillora",
      description: "Pelajari materi kursus mandiri online di platform Skillora.",
    };
  }

  const parsed = parseCourseDescription(course.description);
  const plainTextDesc = parsed.description || parsed.content.replace(/<[^>]*>?/gm, "").slice(0, 160);

  return {
    title: `${course.title} - Kursus Mandiri`,
    description: plainTextDesc || "Pelajari materi kursus mandiri ini di platform Skillora.",
    openGraph: {
      title: `${course.title} - Kursus Mandiri | Skillora`,
      description: plainTextDesc || "Pelajari materi kursus mandiri ini di platform Skillora.",
      images: parsed.image_url
        ? [{ url: parsed.image_url, width: 800, height: 450, alt: course.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${course.title} - Kursus Mandiri | Skillora`,
      description: plainTextDesc || "Pelajari materi kursus mandiri ini di platform Skillora.",
      images: parsed.image_url ? [parsed.image_url] : undefined,
    },
  };
}

export default async function CourseDetailPage({ params }: CoursePageProps) {
  const { slug } = await params;

  const adminClient = createAdminClient();
  const supabase = await createClient();

  const { data: course, error } = await adminClient
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !course) {
    notFound();
  }

  let currentUser: {
    id: string;
    email: string;
    role?: UserRole;
    whatsapp_number?: string | null;
    avatar_url?: string | null;
    school_origin?: string | null;
  } | null = null;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, whatsapp_number, avatar_url, school_origin")
      .eq("id", user.id)
      .maybeSingle();

    currentUser = {
      id: user.id,
      email: user.email,
      role: (profile?.role as UserRole) || "student",
      whatsapp_number: profile?.whatsapp_number || null,
      avatar_url: profile?.avatar_url || null,
      school_origin: profile?.school_origin || null,
    };
  }

  let isEnrolled = false;
  let userEnrollmentId: string | null = null;

  if (currentUser) {
    const { data: existingEnroll } = await adminClient
      .from("enrollments")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("course_id", course.id)
      .maybeSingle();

    if (existingEnroll) {
      isEnrolled = true;
      userEnrollmentId = existingEnroll.id;
    }
  }

  const parsed = parseCourseDescription(course.description);

  // Ambil jumlah peserta yang terdaftar dan disetujui
  const { count: enrolledCount } = await adminClient
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("course_id", course.id)
    .eq("status", "approved");

  // Ambil data view kursus ini
  const { count: courseViews } = await adminClient
    .from("activity_logs")
    .select("*", { count: "exact", head: true })
    .eq("action", "COURSE_VIEW")
    .eq("table_name", `course:${course.slug}`);

  // ambil ulasan nyata jika ada peserta yang memberi rating
  const { data: rawEnrollmentReviews } = await adminClient
    .from("enrollments")
    .select(`
      id,
      whatsapp_number,
      created_at,
      profiles ( full_name, school_origin, avatar_url )
    `)
    .eq("course_id", course.id)
    .eq("status", "approved")
    .limit(20);

  const initialDbReviews: CourseReviewItem[] = [];
  if (rawEnrollmentReviews && rawEnrollmentReviews.length > 0) {
    for (const enroll of rawEnrollmentReviews) {
      const parsedMeta = parseEnrollmentMeta(enroll.whatsapp_number);
      if (parsedMeta.review_rating) {
        const profile = Array.isArray(enroll.profiles)
          ? enroll.profiles[0]
          : (enroll.profiles as any);
        const userName = profile?.full_name || "Mahasiswa Peserta";
        const userSchool = profile?.school_origin || "Mahasiswa Terverifikasi";
        initialDbReviews.push({
          id: `db-${enroll.id}`,
          userName,
          userSchool,
          avatarUrl:
            profile?.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`,
          rating: Number(parsedMeta.review_rating),
          comment:
            parsedMeta.review_text ||
            "Materi kursus mandiri sangat lengkap dan mudah dipahami.",
          date: parsedMeta.reviewed_at
            ? new Date(parsedMeta.reviewed_at).toLocaleDateString("id-ID")
            : "Baru saja",
          isVerified: true,
        });
      }
    }
  }

  const finalCourse: Course = {
    ...course,
    description: parsed.description,
    content: parsed.content,
    image_url: parsed.image_url,
    registration_start: parsed.registration_start,
    registration_end: parsed.registration_end,
    target_learning: parsed.target_learning,
    syllabus: parsed.syllabus,
    level: parsed.level,
    category: parsed.category,
  };

  return (
    <DetailKursusClient
      course={finalCourse}
      currentUser={currentUser}
      initialEnrolledCount={enrolledCount || 0}
      initialViews={courseViews || 0}
      isEnrolled={isEnrolled}
      userEnrollmentId={userEnrollmentId}
      initialDbReviews={initialDbReviews}
    />
  );
}
