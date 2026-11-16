import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { USER_ROLES } from "@/constants/roles";
import { DashboardPesertaOverview } from "./DashboardPesertaOverview";

export const metadata = {
  title: "Dashboard Peserta | Skillora",
  description: "Pusat belajar peserta Skillora pantau progres materi dan sertifikat",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
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

  // untuk akun peserta tampilkan ringkasan beranda dashboard peserta
  return <DashboardPesertaOverview />;
}
