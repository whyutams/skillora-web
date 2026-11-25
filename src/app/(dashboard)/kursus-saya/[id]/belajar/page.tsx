import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { parseEnrollmentMeta } from "@/utils/enrollmentMeta";
import { parseCourseDescription } from "@/utils/courseMeta";
import {
  parseCourseCurriculum,
  getNextIncompleteLesson,
} from "@/utils/courseCurriculumParser";

export default async function BelajarKursusRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cleanId = decodeURIComponent(id || "").trim();

  let targetMod = 0;
  let targetLes = 0;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && cleanId) {
      const adminClient = createAdminClient();
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          cleanId
        );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let enrollment: any = null;

      if (isUUID) {
        const { data } = await adminClient
          .from("enrollments")
          .select("id, whatsapp_number, courses (id, description, content)")
          .eq("id", cleanId)
          .eq("user_id", user.id)
          .maybeSingle();
        enrollment = data;
      } else {
        const { data: c } = await adminClient
          .from("courses")
          .select("id")
          .ilike("slug", cleanId)
          .maybeSingle();
        if (c?.id) {
          const { data } = await adminClient
            .from("enrollments")
            .select("id, whatsapp_number, courses (id, description, content)")
            .eq("course_id", c.id)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          enrollment = data;
        }
      }

      if (enrollment) {
        const meta = parseEnrollmentMeta(enrollment.whatsapp_number);
        const rawCourse = Array.isArray(enrollment.courses)
          ? enrollment.courses[0]
          : enrollment.courses;

        if (rawCourse) {
          const courseParsed = parseCourseDescription(rawCourse.description);
          const curriculum = parseCourseCurriculum(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { ...rawCourse, description: courseParsed.description, content: courseParsed.content } as any,
            courseParsed.content
          );
          const next = getNextIncompleteLesson(
            curriculum.modules,
            meta.completed_lessons || []
          );
          targetMod = next.moduleIndex;
          targetLes = next.topicIndex;
        }
      }
    }
  } catch {
    // fallback ke topik awal jika gagal memuat
  }

  redirect(`/kursus-saya/${id}/belajar/${targetMod}/${targetLes}`);
}
