import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { USER_ROLES } from "@/constants/roles";
import { DetailKursusPesertaClient } from "./DetailKursusPesertaClient";

export const metadata = {
  title: "Detail Kursus Saya | Skillora",
  description:
    "Halaman detail kursus, status pendaftaran, materi & modul, bukti pembayaran, grup kelas, dan e-sertifikat.",
};

export default async function StudentCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/kursus-saya/${id}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    profile?.role ||
    (user.email === "skillorastartup26@gmail.com" ? USER_ROLES.SUPERADMIN : USER_ROLES.STUDENT);

  if (role === USER_ROLES.SUPERADMIN) {
    redirect("/superadmin/dashboard");
  }

  if (role === USER_ROLES.ADMIN) {
    redirect("/admin/dashboard");
  }

  return <DetailKursusPesertaClient enrollmentId={id} />;
}
