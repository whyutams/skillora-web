import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { Course, UserRole } from "@/types/database";
import CourseDetailClient from "./CourseDetailClient";

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
} {
  if (!rawDesc) {
    return {
      description: "",
      content: "",
      image_url: null,
      registration_start: null,
      registration_end: null,
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
    };
  }

  return {
    description: rawDesc.replace(/<[^>]*>?/gm, "").slice(0, 200).trim(),
    content: rawDesc,
    image_url: null,
    registration_start: null,
    registration_end: null,
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
      title: "Detail Kursus | Skillora",
      description: "Lihat detail modul dan bimbingan kursus online di platform Skillora.",
    };
  }

  const parsed = parseCourseDescription(course.description);
  const plainTextDesc = parsed.description || parsed.content.replace(/<[^>]*>?/gm, "").slice(0, 160);

  return {
    title: course.title,
    description: plainTextDesc || "Pelajari materi kursus ini di platform Skillora.",
    openGraph: {
      title: `${course.title} | Skillora`,
      description: plainTextDesc || "Pelajari materi kursus ini di platform Skillora.",
      images: parsed.image_url
        ? [{ url: parsed.image_url, width: 800, height: 450, alt: course.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${course.title} | Skillora`,
      description: plainTextDesc || "Pelajari materi kursus ini di platform Skillora.",
      images: parsed.image_url ? [parsed.image_url] : undefined,
    },
  };
}

export default async function CourseDetailPage({ params }: CoursePageProps) {
  const { slug } = await params;

  const adminClient = createAdminClient();
  const supabase = await createClient();

  // 1. Ambil data kursus dari database berdasarkan slug
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
  } | null = null;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, whatsapp_number")
      .eq("id", user.id)
      .maybeSingle();

    currentUser = {
      id: user.id,
      email: user.email,
      role: (profile?.role as UserRole) || "student",
      whatsapp_number: profile?.whatsapp_number || null,
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

  const finalCourse: Course = {
    ...course,
    description: parsed.description,
    content: parsed.content,
    image_url: parsed.image_url,
    registration_start: parsed.registration_start,
    registration_end: parsed.registration_end,
  };

  return (
    <CourseDetailClient
      course={finalCourse}
      currentUser={currentUser}
      initialEnrolledCount={enrolledCount || 0}
      initialViews={courseViews || 0}
      isEnrolled={isEnrolled}
      userEnrollmentId={userEnrollmentId}
    />
  );
}
