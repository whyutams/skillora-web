import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { StudentDashboardClient } from "./StudentDashboardClient";

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
    (user.email === "skillorastartup26@gmail.com" ? "superadmin" : "student");

  // Admin & superadmin tidak perlu dashboard peserta
  if (role === "superadmin") {
    redirect("/superadmin/dashboard");
  }

  if (role === "admin") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0C0A09]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <StudentDashboardClient />
      </div>
    </div>
  );
}
