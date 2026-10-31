import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function CoursesRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
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
      redirect("/admin/courses");
    }
  }

  // pengunjung publik dan mahasiswa diarahkan ke katalog kursus
  redirect("/#kursus");
}
