import { redirect } from "next/navigation";

// pengalihan rute warisan courses ke rute kursus
export default function LegacyCoursesPage() {
  redirect("/kursus");
}
