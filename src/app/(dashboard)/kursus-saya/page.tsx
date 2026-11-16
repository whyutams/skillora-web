import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { USER_ROLES } from "@/constants/roles";
import { DashboardPesertaClient } from "./DashboardPesertaClient";

export const metadata = {
  title: "Kursus Saya",
  description:
    "Dashboard peserta Skillora. Kelola pendaftaran kursus, unggah bukti pembayaran, akses grup WhatsApp kelas, dan unduh e-sertifikat.",
};

export default async function KursusSayaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/kursus-saya");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    profile?.role ||
    (user.email === "skillorastartup26@gmail.com" ? USER_ROLES.SUPERADMIN : USER_ROLES.STUDENT);

  // pengelola tidak perlu dashboard peserta
  if (role === USER_ROLES.SUPERADMIN) {
    redirect("/superadmin/dashboard");
  }

  if (role === USER_ROLES.ADMIN) {
    redirect("/admin/dashboard");
  }

  // untuk peserta tampilkan manajemen kursus saya
  return (
    <div className="space-y-6">
      <DashboardPesertaClient />
    </div>
  );
}
