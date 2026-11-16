"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  GraduationCap,
  Star,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { BannerKursusPlaceholder } from "@/components/ui/BannerKursusPlaceholder";
import { Skeleton } from "@/components/ui/Skeleton";
import { createClient } from "@/utils/supabase/client";
import { parseCourseDescription } from "@/utils/courseMeta";
import { parseEnrollmentMeta } from "@/utils/enrollmentMeta";

interface CatalogCourseItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  is_published: boolean;
  category?: string;
  level?: string;
  image_url?: string | null;
  participant_count?: number;
  discount_percent?: number;
  syllabus?: unknown[];
  average_rating?: number | null;
  total_reviews?: number;
}

export default function DashboardKatalogKursusPage() {
  const [courses, setCourses] = React.useState<CatalogCourseItem[]>([]);
  const [enrollmentMap, setEnrollmentMap] = React.useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("Semua");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const supabase = createClient();

        // ambil seluruh kursus yang telah dipublikasikan
        const { data: dbCourses, error } = await supabase
          .from("courses")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Gagal mengambil katalog kursus", error);
          return;
        }

        const formatted = (dbCourses || []).map((c) => {
          const meta = parseCourseDescription(c.description);
          return {
            id: c.id,
            title: c.title,
            slug: c.slug,
            description: meta.description || c.description || "",
            price: c.price,
            is_published: c.is_published,
            category: meta.category || c.category || "Pemrograman",
            level: meta.level || c.level || "Semua Tingkat",
            image_url: meta.imageUrl || c.image_url || null,
            discount_percent: meta.discountPercent || c.discount_percent || 0,
            syllabus: Array.isArray(meta.syllabus)
              ? meta.syllabus
              : Array.isArray(c.syllabus)
              ? c.syllabus
              : [],
            average_rating: c.average_rating || null,
            total_reviews: c.total_reviews || 0,
          };
        });
        setCourses(formatted);

        // ambil pendaftaran mahasiswa yang sedang login
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: enrollments } = await supabase
            .from("enrollments")
            .select("course_id, status")
            .eq("user_id", session.user.id);

          const mapping: Record<string, string> = {};
          (enrollments || []).forEach((e) => {
            mapping[e.course_id] = e.status;
          });
          setEnrollmentMap(mapping);
        }
      } catch (err) {
        console.error("Kesalahan memuat katalog", err);
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, []);

  // ambil daftar kategori unik dari kursus
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return ["Semua", ...Array.from(set)];
  }, [courses]);

  // filter kursus berdasarkan pencarian dan kategori
  const filteredCourses = React.useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory =
        selectedCategory === "Semua" || c.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [courses, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      {/* header halaman katalog kursus */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-200/80 dark:border-stone-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-[#0F3E2E] dark:text-emerald-400" />
            <span>Katalog Kursus</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Eksplorasi kelas kursus yang tersedia saat ini.
          </p>
        </div>

        <Link href="/kursus-saya" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold">
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Kursus Saya</span>
          </Button>
        </Link>
      </div>

      {/* alat pencarian dan filter kategori */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari materi atau topik kursus..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-200/90 dark:border-stone-800/90 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
          />
        </div>

        {/* daftar pilihan kategori */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-[#0F3E2E] text-white shadow-xs"
                  : "bg-white/80 dark:bg-stone-900/80 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* grid daftar kursus */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 overflow-hidden space-y-4 p-4 animate-pulse"
            >
              <Skeleton className="w-full h-40 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="w-1/3 h-4 rounded" />
                <Skeleton className="w-3/4 h-5 rounded" />
                <Skeleton className="w-full h-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/50 dark:bg-stone-900/30 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Tidak ada kursus yang sesuai dengan kriteria
          </p>
          <p className="text-xs text-stone-500">
            Coba gunakan kata kunci pencarian lain atau pilih kategori Semua.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((c) => {
            const status = enrollmentMap[c.id];
            const isApproved = status === "approved";
            const isPending = status === "pending_payment";

            const originalPrice = Number(c.price || 0);
            const discountPercent = Number(c.discount_percent || 0);
            const hasDiscount = discountPercent > 0 && originalPrice > 0;
            const discountedPrice = hasDiscount
              ? Math.round(originalPrice * (1 - discountPercent / 100))
              : originalPrice;

            return (
              <div
                key={c.id}
                className="group rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 backdrop-blur-sm overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-emerald-600/40 dark:hover:border-emerald-500/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/5"
              >
                <div>
                  {/* thumbnail banner kursus */}
                  <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-stone-100 dark:bg-stone-800">
                    {c.image_url ? (
                      <SmoothImage
                        src={c.image_url}
                        alt={c.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <BannerKursusPlaceholder
                        title={c.title}
                        slug={c.slug}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>

                  {/* konten kursus */}
                  <div className="p-5 sm:p-6 space-y-3">
                    {/* rating modul belajar dan status pendaftaran */}
                    <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
                      {c.average_rating ? (
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{c.average_rating}</span>
                          {c.total_reviews ? (
                            <span className="text-[11px] text-stone-400 font-normal">
                              ({c.total_reviews})
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Kursus Baru</span>
                        </div>
                      )}
                      <span className="text-stone-300 dark:text-stone-700">•</span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          {Array.isArray(c.syllabus) && c.syllabus.length > 0
                            ? `${c.syllabus.length} Modul Belajar`
                            : "Materi Terstruktur"}
                        </span>
                      </span>

                      {/* status pendaftaran peserta */}
                      {isApproved && (
                        <>
                          <span className="text-stone-300 dark:text-stone-700">•</span>
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Terdaftar</span>
                          </span>
                        </>
                      )}
                      {isPending && (
                        <>
                          <span className="text-stone-300 dark:text-stone-700">•</span>
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded-md">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Menunggu</span>
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {c.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      {(c.description || "").replace(/<[^>]*>?/gm, "").trim() ||
                        "Pelajari kurikulum terstruktur dan tingkatkan keahlian digital dengan panduan materi praktis."}
                    </p>
                  </div>
                </div>

                {/* footer card biaya dan tombol aksi */}
                <div className="p-5 sm:p-6 border-t border-stone-100 dark:border-stone-800/60 mt-auto flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                      Biaya Kursus
                    </span>
                    {hasDiscount ? (
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-sm sm:text-base font-extrabold text-[#0F3E2E] dark:text-emerald-400">
                          {discountedPrice === 0
                            ? "Gratis"
                            : `Rp ${discountedPrice.toLocaleString("id-ID")}`}
                        </span>
                        <span className="text-xs text-stone-400 dark:text-stone-500 font-normal">
                          /
                        </span>
                        <span className="text-xs text-stone-400 dark:text-stone-500 line-through font-normal">
                          Rp {originalPrice.toLocaleString("id-ID")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm sm:text-base font-extrabold text-[#0F3E2E] dark:text-emerald-400">
                        {originalPrice === 0
                          ? "Gratis"
                          : `Rp ${originalPrice.toLocaleString("id-ID")}`}
                      </span>
                    )}
                  </div>

                  {isApproved ? (
                    <Link href={`/kursus-saya/${c.slug}`}>
                      <Button
                        variant="primary"
                        size="sm"
                        className="gap-1.5 text-xs font-semibold bg-[#0F3E2E] hover:bg-[#16533e] text-white transition-colors"
                      >
                        <span>Buka Kursus</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  ) : isPending ? (
                    <Link href="/kursus-saya">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        <span>Cek Status</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/kursus/${c.slug}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs font-semibold hover:bg-[#0F3E2E] hover:text-white dark:hover:bg-emerald-600 transition-colors"
                      >
                        <span>Lihat Silabus</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
