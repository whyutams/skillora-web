import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { USER_ROLES } from "@/constants/roles";

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
      (user.email === "skillorastartup26@gmail.com" ? USER_ROLES.SUPERADMIN : USER_ROLES.STUDENT);

    if (role === USER_ROLES.SUPERADMIN) {
      redirect("/superadmin/dashboard");
    }

    if (role === USER_ROLES.ADMIN) {
      redirect("/admin/courses");
    }
  }

  // pengunjung publik dan mahasiswa diarahkan ke katalog kursus
  redirect("/#kursus");
}
