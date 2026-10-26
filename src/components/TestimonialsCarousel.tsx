"use client";

import * as React from "react";
import moment from "moment";
import "moment/locale/id";
import { Star, ChevronLeft, ChevronRight, Quote, MessageSquareDashed } from "lucide-react";
import { SmoothImage } from "@/components/ui/SmoothImage";

// Konfigurasi locale Bahasa Indonesia untuk Moment.js
moment.updateLocale("id", {
  relativeTime: {
    future: "dalam %s",
    past: "%s yang lalu",
    s: "Baru saja",
    ss: "Baru saja",
    m: "1 menit",
    mm: "%d menit",
    h: "1 jam",
    hh: "%d jam",
    d: "1 hari",
    dd: "%d hari",
    M: "1 bulan",
    MM: "%d bulan",
    y: "1 tahun",
    yy: "%d tahun",
  },
});

export function formatRelativeTime(dateString: string): string {
  const m = moment(dateString);
  const diffSeconds = moment().diff(m, "seconds");
  if (diffSeconds < 60) {
    return "Baru saja";
  }
  return m.fromNow();
}

export interface TestimonialItem {
  id: string;
  name: string;
  school: string;
  course: string;
  stars: number;
  content: string;
  createdAt: string;
  avatarUrl: string;
}

interface TestimonialsCarouselProps {
  testimonials?: TestimonialItem[];
}

export function TestimonialsCarousel({ testimonials = [] }: TestimonialsCarouselProps) {
  const items = testimonials;
  const baseCount = items.length;

  const [currentIndex, setCurrentIndex] = React.useState(baseCount);
  const [isTransitioning, setIsTransitioning] = React.useState(true);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    setCurrentIndex(baseCount);
  }, [baseCount]);

  React.useEffect(() => {
    if (isPaused || baseCount === 0) return;

    const timer = setInterval(() => {
      handleNext();
    }, 3500);

    return () => clearInterval(timer);
  }, [isPaused, currentIndex, baseCount]);

  const handleNext = () => {
    if (baseCount === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (baseCount === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  };

  const handleTransitionEnd = () => {
    if (baseCount === 0) return;
    if (currentIndex >= baseCount * 2) {
      setIsTransitioning(false);
      setCurrentIndex(currentIndex - baseCount);
    } else if (currentIndex < baseCount) {
      setIsTransitioning(false);
      setCurrentIndex(currentIndex + baseCount);
    }
  };

  // Jika belum ada data ulasan, sembunyikan carousel & pagination button dan tampilkan keterangan dengan icon
  if (baseCount === 0) {
    return (
      <div
        data-aos="fade-up"
        className="text-center py-14 px-6 rounded-3xl max-w-xl mx-auto space-y-3"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-[#0F3E2E] dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
          <MessageSquareDashed className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
          Belum Ada Ulasan
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
          Ulasan dan testimoni dari peserta akan tampil di sini setelah menyelesaikan kursus.
        </p>
      </div>
    );
  }

  const slides = [...items, ...items, ...items];
  const cardsPerView = isMobile ? 1 : 3;
  const activeDotIndex = baseCount > 0 ? currentIndex % baseCount : 0;

  return (
    <div
      className="relative w-full space-y-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Viewport Carousel Wrapper */}
      <div className="overflow-hidden w-full px-1 py-4 -my-4">
        <div
          className={`flex ${
            isTransitioning
              ? "transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
              : ""
          }`}
          style={{
            transform: `translateX(-${(currentIndex * 100) / cardsPerView}%)`,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {slides.map((item, idx) => {
            return (
              <div
                key={`${item.id}-${idx}`}
                className="w-full md:w-1/3 shrink-0 px-3 select-none flex"
              >
                <div className="w-full rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 backdrop-blur-sm p-6 flex flex-col justify-between space-y-4 hover:border-stone-300 dark:hover:border-stone-700 hover:-translate-y-1 transition-all duration-300 shadow-xs">
                  {/* Top: Stars, Kursus & Waktu */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800/60 pb-3">
                      {/* Bintang Rating */}
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[...Array(item.stars)].map((_, starIdx) => (
                          <Star
                            key={starIdx}
                            className="w-4 h-4 fill-amber-500 text-amber-500"
                          />
                        ))}
                      </div>

                      {/* Timestamp dengan Moment.js Bahasa Indonesia */}
                      <span className="text-[11px] font-medium text-stone-400">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    {/* Tag Nama Kursus */}
                    <div className="inline-block px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800/80 text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                      {item.course}
                    </div>

                    {/* Konten Testimoni */}
                    <div className="relative">
                      <Quote className="w-5 h-5 text-stone-300/40 dark:text-stone-700/40 absolute -top-1 -left-1 pointer-events-none" />
                      <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed italic pl-4 break-words whitespace-normal">
                        &quot;{item.content}&quot;
                      </p>
                    </div>
                  </div>

                  {/* Profil: Foto, Nama & Asal Sekolah/Instansi Saja */}
                  <div className="pt-3 border-t border-stone-100 dark:border-stone-800/60 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-stone-200 dark:border-stone-700 shrink-0">
                      <SmoothImage
                        src={item.avatarUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-stone-400 truncate">
                        {item.school}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kontrol Navigasi & Indikator Titik */}
      <div className="flex items-center justify-between pt-1">
        {/* Indikator Titik */}
        <div className="flex items-center gap-1.5">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => {
                setIsTransitioning(true);
                setCurrentIndex(baseCount + idx);
              }}
              aria-label={`Ulasan ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === activeDotIndex
                  ? "w-7 bg-[#0F3E2E] dark:bg-emerald-400"
                  : "w-2 bg-stone-300 dark:bg-stone-700 hover:bg-stone-400"
              }`}
            />
          ))}
        </div>

        {/* Tombol Panah Navigasi */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            aria-label="Ulasan Sebelumnya"
            className="w-8 h-8 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center transition-colors shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Ulasan Selanjutnya"
            className="w-8 h-8 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center transition-colors shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
