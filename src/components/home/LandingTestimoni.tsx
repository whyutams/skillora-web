import { createAdminClient } from "@/utils/supabase/server";
import { parseEnrollmentMeta } from "@/utils/enrollmentMeta";
import { CarouselTestimoni, TestimonialItem } from "@/components/CarouselTestimoni";

export async function LandingTestimoni() {
  let testimonials: TestimonialItem[] = [];

  try {
    const adminClient = createAdminClient();

    const { data: dbEnrollmentsWithReviews } = await adminClient
      .from("enrollments")
      .select(`
        id,
        whatsapp_number,
        created_at,
        profiles (
          full_name,
          school_origin,
          avatar_url
        ),
        courses (
          title
        )
      `);

    if (dbEnrollmentsWithReviews) {
      testimonials = dbEnrollmentsWithReviews
        .map((item) => {
          const meta = parseEnrollmentMeta(item.whatsapp_number);
          if (!meta.review_rating || !meta.review_text) return null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prof = item.profiles as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const crs = item.courses as any;
          return {
            id: item.id,
            name: prof?.full_name || "Peserta Skillora",
            school: prof?.school_origin || "Mahasiswa",
            course: crs?.title || "Kursus Online",
            stars: meta.review_rating,
            content: meta.review_text,
            createdAt: meta.reviewed_at || item.created_at,
            avatarUrl: prof?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.id}`,
          };
        })
        .filter((item): item is TestimonialItem => item !== null);
    }
  } catch (err) {
    console.error("Error fetching testimonials for landing page:", err);
  }

  return <CarouselTestimoni testimonials={testimonials} />;
}

export const LandingTestimonials = LandingTestimoni;

