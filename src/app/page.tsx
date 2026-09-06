import { createClient, createAdminClient } from "@/utils/supabase/server";
import { Course, UserRole } from "@/types/database";
import { parseEnrollmentMeta } from "@/utils/enrollmentMeta";
import CourseCatalogClient from "./CourseCatalogClient";
import { TestimonialsCarousel, TestimonialItem } from "@/components/TestimonialsCarousel";
import { VisitorStatsSection } from "@/components/VisitorStatsSection";

export const dynamic = "force-dynamic";
import {
  Code,
  Terminal,
  Palette,
  Clock,
  Wallet,
  Users,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  HelpCircle,
  Star,
  MessageCircle,
  ChevronDown,
  BookOpen,
} from "lucide-react";



export default async function HomePage() {
  let courses: Course[] = [];
  let currentUser: { id: string; email: string; role?: UserRole } | null = null;
  let enrolledCourseIds: string[] = [];
  let testimonials: TestimonialItem[] = [];
  let activeStudentCount = 0;
  let totalEnrollmentCount = 0;

  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const userRole =
        (profile?.role as UserRole) ||
        (user.email === "skillorastartup26@gmail.com" ? "superadmin" : "student");

      currentUser = { id: user.id, email: user.email, role: userRole };

      // Ambil daftar ID kursus yang sudah didaftari oleh user yang sedang login
      const { data: userEnrolls } = await adminClient
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id);

      enrolledCourseIds = (userEnrolls || []).map((e) => e.course_id);
    }

    const { data: dbCourses } = await adminClient
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: true });

    if (dbCourses && dbCourses.length > 0) {
      courses = dbCourses.map((c) => {
        let rawDesc = c.description || "";
        let descSummary = "";
        let htmlContent = "";
        let img: string | null = null;
        let regStart: string | null = null;
        let regEnd: string | null = null;

        const metaMatch = rawDesc.match(/^<!--meta:(.*?)-->\s*/);
        if (metaMatch) {
          try {
            const parsedMeta = JSON.parse(metaMatch[1]);
            img = parsedMeta.image_url || null;
            descSummary = parsedMeta.description || "";
            regStart = parsedMeta.registration_start || null;
            regEnd = parsedMeta.registration_end || null;
            htmlContent = rawDesc.replace(metaMatch[0], "").trim();
          } catch {
            // fallback
          }
        } else {
          const match = rawDesc.match(/^<!--image:(.*?)-->\s*/);
          if (match) {
            img = match[1];
            htmlContent = rawDesc.replace(match[0], "").trim();
          } else {
            htmlContent = rawDesc;
          }
        }

        if (!descSummary) {
          descSummary = htmlContent.replace(/<[^>]*>?/gm, "").trim();
        }

        return {
          ...c,
          description: descSummary,
          content: htmlContent,
          image_url: img,
          registration_start: regStart,
          registration_end: regEnd,
        };
      });
    } else {
      courses = [];
    }

    // Ambil ulasan nyata dari database (tabel enrollments)
    const { data: dbEnrollmentsWithReviews } = await adminClient
      .from("enrollments")
      .select(`
        id,
        whatsapp_number,
        created_at,
        profiles (
          full_name,
          school_origin,
          avatar_url
        ),
        courses (
          title
        )
      `);

    if (dbEnrollmentsWithReviews) {
      testimonials = dbEnrollmentsWithReviews
        .map((item) => {
          const meta = parseEnrollmentMeta(item.whatsapp_number);
          if (!meta.review_rating || !meta.review_text) return null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prof = item.profiles as any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const crs = item.courses as any;
          return {
            id: item.id,
            name: prof?.full_name || "Peserta Skillora",
            school: prof?.school_origin || "Pelajar",
            course: crs?.title || "Kursus Online",
            stars: meta.review_rating,
            content: meta.review_text,
            createdAt: meta.reviewed_at || item.created_at,
            avatarUrl: prof?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.id}`,
          };
        })
        .filter((item): item is TestimonialItem => item !== null);
    }

    const { count: studentCount } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    const { count: enrollCount } = await adminClient
      .from("enrollments")
      .select("*", { count: "exact", head: true });

    activeStudentCount = studentCount || 0;
    totalEnrollmentCount = enrollCount || 0;
  } catch (err) {
    console.error("Error fetching live data for landing page:", err);
  }

  const adminPhone =
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "6281234567890";

  const lowestPrice =
    courses.length > 0
      ? Math.min(...courses.map((c) => Number(c.price)))
      : 39000;

  return (
    <div className="space-y-24 sm:space-y-36 pb-24 overflow-hidden">
      <section id="hero" className="scroll-mt-24 relative pt-14 sm:pt-24 lg:pt-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Gradient Blur Ambient Background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[680px] lg:w-[880px] h-[250px] sm:h-[420px] bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-emerald-400/20 dark:from-emerald-600/25 dark:via-emerald-400/10 dark:to-teal-500/20 rounded-full blur-[80px] sm:blur-[130px] pointer-events-none -z-10" />
        <div className="absolute -top-6 left-6 sm:left-12 w-48 sm:w-80 h-48 sm:h-80 bg-emerald-400/15 dark:bg-emerald-700/15 rounded-full blur-[80px] pointer-events-none -z-10" />
        <div className="absolute top-16 right-6 sm:right-12 w-56 sm:w-96 h-56 sm:h-96 bg-teal-400/15 dark:bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none -z-10" />

        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 -z-10 opacity-[0.035] dark:opacity-[0.06] pointer-events-none [background-image:radial-gradient(#1c1917_1.2px,transparent_1.2px)] dark:[background-image:radial-gradient(#f5f5f4_1.2px,transparent_1.2px)] [background-size:24px_24px]" />

        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8"> 

          {/* Heading */}
          <h1
            data-aos="fade-up"
            data-aos-delay="100"
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-[1.14]"
          >
            Kuasai Keterampilan Digital Masa Depan.{" "}
            <span className="relative inline-block text-[#0F3E2E] dark:text-emerald-400">
              Harga Ramah Pelajar.
              <svg
                className="absolute -bottom-2 left-0 w-full text-emerald-500/40 dark:text-emerald-400/50"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 9.5C65 2.5 185 -0.5 298 9.5"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p
            data-aos="fade-up"
            data-aos-delay="200"
            className="text-base sm:text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto leading-relaxed"
          >
            Mulai dari <span className="font-bold text-stone-900 dark:text-stone-100">Rp{lowestPrice.toLocaleString("id-ID")}</span>.
            Pelajari {courses.map((c) => c.title.split(":")[0]).join(", ")} dengan jadwal ramah di luar jam sekolah. Konfirmasi praktis via WhatsApp tanpa ribet.
          </p>

          {/* Hero CTAs */}
          <div
            data-aos="fade-up"
            data-aos-delay="300"
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <a
              href="#kursus"
              className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-sm bg-[#0F3E2E] hover:bg-[#16533e] text-white border border-[#1d5849]/50 shadow-sm transition-all duration-150 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Jelajahi Kursus</span>
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </a>
            <a
              href={`https://wa.me/${adminPhone}?text=${encodeURIComponent(
                "Halo Admin Skillora, saya ingin bertanya seputar kelas kursus."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-sm border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-900/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 transition-all duration-150 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Hubungi Admin via WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      <section id="kursus" className="scroll-mt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div data-aos="fade-up" className="space-y-3 mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F3E2E] dark:text-emerald-400 uppercase tracking-wider">
            <span>Kursus</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Berbagai Pilihan Kursus yang Tersedia Saat Ini
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-2xl">
            Pilih kursus yang ingin Anda kuasai. Klik &quot;Lihat Detail&quot; untuk melihat detail dan pendaftaran kursus
          </p>
        </div>

        <CourseCatalogClient
          courses={courses}
          currentUser={currentUser}
          enrolledCourseIds={enrolledCourseIds}
        />
      </section>

      <section id="keunggulan" className="scroll-mt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div
          data-aos="fade-up"
          className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/40 dark:bg-stone-900/20 p-6 sm:p-12 backdrop-blur-sm"
        >
          <div className="max-w-2xl mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
              Mengapa Skillora Berbeda dari Bootcamp Biasa?
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-2">
              Kami menyadari pelajar tidak membutuhkan sertifikat ribet jutaan rupiah, melainkan bimbingan ramah, tugas aplikatif, dan biaya yang tidak membebani uang jajan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              data-aos="fade-up"
              data-aos-delay="100"
              className="p-6 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 space-y-3"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Code className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                100% Proyek Nyata
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                Langsung praktek membuat landing page, script otomasi Python, dan desain aplikasi mobile di Figma yang siap Anda cantumkan di CV magang.
              </p>
            </div>

            <div
              data-aos="fade-up"
              data-aos-delay="200"
              className="p-6 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 space-y-3"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Belajar Santai Sesuai Ritme
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                Tersedia panduan langkah-demi-langkah yang dapat dibuka kapan saja di akhir pekan atau malam hari tanpa mengganggu jam sekolah.
              </p>
            </div>

            <div
              data-aos="fade-up"
              data-aos-delay="300"
              className="p-6 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 space-y-3"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-400 flex items-center justify-center">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Jejaring Sesama Pelajar
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                Setelah pembayaran di-approve oleh admin, Anda langsung mendapatkan link masuk ke Grup WhatsApp kelas untuk saling tukar review kode dan desain.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="ulasan" className="scroll-mt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div data-aos="fade-up" className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F3E2E] dark:text-emerald-400 uppercase tracking-wider"> 
            <span>Ulasan</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Ulasan Peserta Kursus
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
            Testimoni dari peserta pelajar yang telah menyelesaikan kursus
          </p>
        </div>

        <TestimonialsCarousel testimonials={testimonials} />
      </section>

      <VisitorStatsSection />

      <section id="alur" className="scroll-mt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div data-aos="fade-up" className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F3E2E] dark:text-emerald-400 uppercase tracking-wider">
            <span>Sistem Pendaftaran</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Alur Konfirmasi Manual via WhatsApp
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-xl mx-auto">
            Tanpa sistem kartu kredit atau gateway rumit. Cukup transfer langsung dan kirimkan bukti ke Admin.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            data-aos="fade-up"
            data-aos-delay="100"
            className="p-6 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60"
          >
            <span className="text-3xl font-extrabold text-[#0F3E2E]/20 dark:text-emerald-500/20 mb-2 block">
              01
            </span>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Daftar Akun Pelajar
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Isi nama lengkap, username unik, asal sekolah, dan nomor WhatsApp aktif Anda.
            </p>
          </div>

          <div
            data-aos="fade-up"
            data-aos-delay="200"
            className="p-6 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60"
          >
            <span className="text-3xl font-extrabold text-[#0F3E2E]/20 dark:text-emerald-500/20 mb-2 block">
              02
            </span>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Pilih Kursus
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Pilih kursus yang ingin Anda pelajari dan klik tombol &quot;Daftar Kursus&quot;.
            </p>
          </div>

          <div
            data-aos="fade-up"
            data-aos-delay="300"
            className="p-6 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60"
          >
            <span className="text-3xl font-extrabold text-[#0F3E2E]/20 dark:text-emerald-500/20 mb-2 block">
              03
            </span>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Kirim Bukti Transfer
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Sistem membuka WhatsApp resmi Admin dengan template pesan pendaftaran terisi otomatis.
            </p>
          </div>

          <div
            data-aos="fade-up"
            data-aos-delay="400"
            className="p-6 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60"
          >
            <span className="text-3xl font-extrabold text-[#0F3E2E]/20 dark:text-emerald-500/20 mb-2 block">
              04
            </span>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Masuk Grup WhatsApp
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Admin menyetujui pendaftaran dan link grup WhatsApp kelas langsung aktif di dashboard Anda.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div data-aos="fade-up" className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F3E2E] dark:text-emerald-400 uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Pertanyaan yang Sering Diajukan
          </h2>
        </div>

        <div className="space-y-4">
          <details
            data-aos="fade-up"
            className="group rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 p-5 transition-colors cursor-pointer"
          >
            <summary className="font-bold text-sm text-stone-900 dark:text-stone-100 list-none flex items-center justify-between">
              <span>Apakah pemula tanpa dasar coding sama sekali bisa ikut?</span>
              <ChevronDown className="w-4 h-4 text-emerald-600 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-3 leading-relaxed">
              Tentu saja! Materi di Skillora dirancang ramah untuk pemula dari level 0. Anda akan dibimbing dari pengenalan konsep dasar hingga praktik studi kasus nyata.
            </p>
          </details>

          <details
            data-aos="fade-up"
            className="group rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 p-5 transition-colors cursor-pointer"
          >
            <summary className="font-bold text-sm text-stone-900 dark:text-stone-100 list-none flex items-center justify-between">
              <span>Bagaimana jika saya sibuk sekolah atau kuliah sampai sore?</span>
              <ChevronDown className="w-4 h-4 text-emerald-600 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-3 leading-relaxed">
              Semua modul materi dapat diakses secara mandiri dan fleksibel 24/7. Anda bisa belajar di malam hari atau akhir pekan tanpa terikat jam sekolah.
            </p>
          </details>

          <details
            data-aos="fade-up"
            className="group rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 p-5 transition-colors cursor-pointer"
          >
            <summary className="font-bold text-sm text-stone-900 dark:text-stone-100 list-none flex items-center justify-between">
              <span>Berapa lama proses verifikasi transfer bukti pembayaran?</span>
              <ChevronDown className="w-4 h-4 text-emerald-600 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-3 leading-relaxed">
              Admin Skillora memverifikasi bukti transfer secara cepat (umumnya 5-30 menit pada jam kerja). Setelah di-approve, dashboard Anda otomatis mengaktifkan link grup kelas.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
