import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { StudentCourseDetailClient } from "./StudentCourseDetailClient";

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
    (user.email === "skillorastartup26@gmail.com" ? "superadmin" : "student");

  if (role === "superadmin") {
    redirect("/superadmin/dashboard");
  }

  if (role === "admin") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0C0A09]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <StudentCourseDetailClient enrollmentId={id} />
      </div>
    </div>
  );
}
