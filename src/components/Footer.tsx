"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { GraduationCap, MessageCircle, Heart, Eye } from "lucide-react";

interface CourseFooterItem {
  id: string;
  title: string;
  slug: string;
}

export function Footer() {
  const pathname = usePathname();
  const [courses, setCourses] = React.useState<CourseFooterItem[]>([]);
  const [totalVisitors, setTotalVisitors] = React.useState<number>(0);

  const isDashboardRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin") ||
    pathname === "/dashboard";

  const adminPhone =
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "6281234567890";

  React.useEffect(() => {
    if (isDashboardRoute) return;

    async function loadData() {
      try {
        const supabase = createClient();

        const { data: dbCourses } = await supabase
          .from("courses")
          .select("id, title, slug")
          .eq("is_published", true)
          .order("created_at", { ascending: true })
          .limit(5);

        if (dbCourses && dbCourses.length > 0) {
          setCourses(dbCourses);
        }

        const res = await fetch("/api/analytics/visitor");
        const visitorData = await res.json();
        if (typeof visitorData.totalVisitors === "number") {
          setTotalVisitors(visitorData.totalVisitors);
        }
      } catch (err) {
        console.error("Error loading footer data:", err);
      }
    }

    loadData();
  }, [isDashboardRoute]);

  if (isDashboardRoute) {
    return null;
  }

  return (
    <footer className="border-t border-stone-300/80 dark:border-stone-800/90 bg-[#F3F1EC] dark:bg-[#12100E] text-stone-600 dark:text-stone-400 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Visi */}
          <div className="space-y-3 md:col-span-1">
            <Link href="/" className="inline-flex items-center" title="Skillora">
              <img
                src="/logo.png"
                alt="Skillora"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Skillora adalah layanan platform kursus online yang menyediakan berbagai kelas praktikum dengan menyediakan biaya terjangkau bagi pelajar.
            </p>
          </div>

          {/* Daftar Kursus Dinamis dari Database */}
          <div className="space-y-3">
            <p className="font-bold text-xs uppercase tracking-wider text-stone-900 dark:text-stone-200">
              Kursus
            </p>
            <ul className="space-y-2 text-xs">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <li key={course.id}>
                    <Link
                      href={`/courses/${course.slug}`}
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors block truncate max-w-xs"
                    >
                      {course.title}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <Link href="/#kursus" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      Web Development Modern
                    </Link>
                  </li>
                  <li>
                    <Link href="/#kursus" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      Python Dasar & Otomasi
                    </Link>
                  </li>
                  <li>
                    <Link href="/#kursus" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      UI/UX Design Figma
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="font-bold text-xs uppercase tracking-wider text-stone-900 dark:text-stone-200">
              Quick Links
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#keunggulan" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Kenapa Skillora
                </Link>
              </li>
              <li>
                <Link href="/#visitor" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Aktivitas Pengunjung
                </Link>
              </li>
              <li>
                <Link href="/#alur" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Alur Pembayaran
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Tanya Jawab (FAQ)
                </Link>
              </li>
            </ul>
          </div>

          {/* Kontak Admin Resmi */}
          <div className="space-y-3">
            <p className="font-bold text-xs uppercase tracking-wider text-stone-900 dark:text-stone-200">
              Bantuan
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Butuh konsultasi mengenai layanan ini?
            </p>
            <a
              href={`https://wa.me/${adminPhone}?text=${encodeURIComponent(
                "Halo Admin Skillora, saya ingin konsultasi pendaftaran kelas."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors font-medium text-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Hubungi Admin</span>
            </a>
          </div>
        </div>

        {/* Bottom Bar Footer dengan Total Viewer di Bagian Tengah */}
        <div className="pt-8 border-t border-stone-300/60 dark:border-stone-800/60 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-stone-500 dark:text-stone-400">
          <p>© {new Date().getFullYear()} Skillora. All rights reserved.</p>

          {/* Total Viewer dengan Icon Eye & Animasi Counter di Bagian Tengah */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-200/70 dark:bg-stone-800/70 border border-stone-300/80 dark:border-stone-700/60 text-stone-700 dark:text-stone-300 font-medium shadow-xs">
            <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <div className="flex space-x-1">
              <span className="text-stone-900 dark:text-stone-100">
                Dikunjungi
              </span>
              <span className="font-extrabold text-stone-900 dark:text-stone-100">
                <AnimatedCounter value={totalVisitors} />x
              </span>
            </div>
          </div>

          <p className="flex items-center gap-1">
            Made with true <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> by Skillora Dev
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
