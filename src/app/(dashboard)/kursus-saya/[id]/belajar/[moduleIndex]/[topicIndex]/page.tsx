import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import HalamanBelajarTopikClient from "./HalamanBelajarTopikClient";

export const metadata = {
  title: "Belajar Kursus | Skillora",
  description: "Ruang belajar mandiri interaktif, materi modul, kuis, praktik koding, dan tugas proyek.",
};

export default async function BelajarTopikPage({
  params,
}: {
  params: Promise<{ id: string; moduleIndex: string; topicIndex: string }>;
}) {
  const { id, moduleIndex, topicIndex } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/kursus-saya/${id}/belajar/${moduleIndex}/${topicIndex}`);
  }

  return (
    <HalamanBelajarTopikClient
      enrollmentOrSlug={id}
      moduleIndexStr={moduleIndex}
      topicIndexStr={topicIndex}
    />
  );
}

