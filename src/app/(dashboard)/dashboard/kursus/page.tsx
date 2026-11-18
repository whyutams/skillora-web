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
  Compass,
  X,
  Award,
  RotateCcw,
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
  const [selectedLevel, setSelectedLevel] = React.useState("Semua Tingkat");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const supabase = createClient();

        // ambil seluruh data kursus yang telah dipublikasikan
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

        // ambil riwayat pendaftaran akun yang sedang aktif
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
        console.error("Kesalahan memuat katalog kursus", err);
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, []);

  // kumpulkan kategori unik beserta jumlah kursus masing masing
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { Semua: courses.length };
    courses.forEach((c) => {
      const cat = c.category || "Umum";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [courses]);

  const categories = React.useMemo(() => {
    return Object.keys(categoryCounts);
  }, [categoryCounts]);

  // kumpulkan pilihan tingkat kesulitan kursus
  const levelOptions = React.useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.level) set.add(c.level);
    });
    return ["Semua Tingkat", ...Array.from(set)];
  }, [courses]);

  // filter kursus berdasarkan kata kunci kategori dan tingkat kesulitan
  const filteredCourses = React.useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory =
        selectedCategory === "Semua" || c.category === selectedCategory;
      const matchLevel =
        selectedLevel === "Semua Tingkat" || c.level === selectedLevel;
      return matchSearch && matchCategory && matchLevel;
    });
  }, [courses, searchQuery, selectedCategory, selectedLevel]);

  // hitung statistik ringkas pendaftaran kursus
  const approvedCount = React.useMemo(() => {
    return Object.values(enrollmentMap).filter((s) => s === "approved").length;
  }, [enrollmentMap]);

  const pendingCount = React.useMemo(() => {
    return Object.values(enrollmentMap).filter((s) => s === "pending_payment").length;
  }, [enrollmentMap]);

  const hasActiveFilters = searchQuery !== "" || selectedCategory !== "Semua" || selectedLevel !== "Semua Tingkat";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("Semua");
    setSelectedLevel("Semua Tingkat");
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      {/* banner panel utama katalog kursus bernuansa hijau pinus skillora */}
      <div className="rounded-2xl bg-[#0F3E2E] text-white p-6 sm:p-8 shadow-xs border border-emerald-900/60 relative overflow-hidden">
        {/* ornamen latar belakang visual yang bersih dan elegan */}
        <div className="absolute -right-12 -bottom-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        <div className="absolute right-36 -top-12 w-48 h-48 rounded-full bg-emerald-400/5 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 text-emerald-300 border border-white/15 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5" />
              <span>Katalog Kursus & Kurikulum Resmi</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Eksplorasi Katalog Kursus & Sertifikasi
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Tingkatkan kompetensi digital dengan silabus terstruktur, materi interaktif berbasis kode, dan peroleh sertifikat kompetensi resmi perguruan tinggi.
            </p>

            {/* indikator keunggulan pembelajaran */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-emerald-200">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>{courses.length} Kelas Tersedia</span>
              </span>
              <span className="text-white/20">•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{approvedCount} Kursus Aktif</span>
              </span>
              <span className="text-white/20">•</span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Sertifikat Terverifikasi</span>
              </span>
            </div>
          </div>

          {/* aksi navigasi cepat ke kursus yang telah didaftarkan */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link href="/kursus-saya">
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-bold text-xs gap-2 shadow-sm py-2.5 px-4 rounded-xl"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Kursus Saya {approvedCount > 0 ? `(${approvedCount})` : ""}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* panel kontrol pencarian dan penyaringan kategori kursus */}
      <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* kolom pencarian kata kunci dengan tombol bersihkan */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari materi, silabus, atau topik kursus..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200/90 dark:border-stone-800/90 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0F3E2E]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* penyaring tingkat kesulitan */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-semibold text-stone-400 shrink-0 hidden sm:inline">
              Tingkat:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {levelOptions.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedLevel === lvl
                      ? "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 border border-transparent"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* baris pembagi dan daftar kategori */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-stone-400 shrink-0">
              Kategori:
            </span>
            {categories.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#0F3E2E] text-white shadow-xs"
                      : "bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800/80 hover:bg-stone-200/60 dark:hover:bg-stone-700/60"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ringkasan jumlah hasil dan tombol reset filter */}
          <div className="flex items-center gap-3 justify-between sm:justify-end text-xs text-stone-500 dark:text-stone-400">
            <span>
              Menampilkan <strong>{filteredCourses.length}</strong> dari {courses.length} kursus
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* grid daftar kursus interaktif */}
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
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white/50 dark:bg-stone-900/30 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Tidak ada kursus yang sesuai dengan kriteria
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Cobalah gunakan kata kunci lain, atau reset pilihan filter kategori dan tingkat untuk melihat semua kursus yang tersedia.
            </p>
          </div>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="gap-2 text-xs font-semibold mx-auto rounded-xl"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tampilkan Semua Kursus</span>
            </Button>
          )}
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
                className="group rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-sm overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-emerald-600/40 dark:hover:border-emerald-500/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/5"
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
                    
                    {/* label kategori dan tingkat di atas banner */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-900/80 backdrop-blur-sm text-stone-200 border border-white/10">
                        {c.category}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0F3E2E]/90 backdrop-blur-sm text-emerald-200 border border-emerald-400/20">
                        {c.level}
                      </span>
                    </div>
                  </div>

                  {/* konten ringkasan kursus */}
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

                {/* bagian bawah kartu memuat biaya dan tombol aksi */}
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
                        className="gap-1.5 text-xs font-semibold bg-[#0F3E2E] hover:bg-[#16533e] text-white transition-colors rounded-xl"
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
                        className="gap-1.5 text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors rounded-xl"
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
                        className="gap-1.5 text-xs font-semibold hover:!bg-[#0F3E2E] hover:!text-white hover:!border-[#0F3E2E] dark:hover:!bg-emerald-600 dark:hover:!border-emerald-600 dark:hover:!text-white transition-colors rounded-xl"
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
