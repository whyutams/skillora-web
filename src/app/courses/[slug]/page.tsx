import { redirect } from "next/navigation";

// pengalihan rute warisan courses ke rute baku bahasa indonesia kursus
export default async function LegacyCourseSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/kursus/${slug}`);
}
