import { redirect } from "next/navigation";

export default async function BelajarKursusRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/kursus-saya/${id}/belajar/0/0`);
}

