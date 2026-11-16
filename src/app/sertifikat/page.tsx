import { redirect } from "next/navigation";

// pengalihan rute sertifikat ke dashboard sertifikat peserta
export default function SertifikatRedirectPage() {
  redirect("/dashboard/sertifikat");
}

