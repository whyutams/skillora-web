"use client";

import * as React from "react";
import { Star, MessageSquare } from "lucide-react";
import { CourseReviewItem } from "@/utils/courseCurriculumParser";
import { SmoothImage } from "@/components/ui/SmoothImage";

interface TabUlasanKursusProps {
  reviews: CourseReviewItem[];
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  recommendPercentage: number;
}

export function TabUlasanKursus({
  reviews,
  averageRating,
  totalReviews,
  ratingDistribution,
}: TabUlasanKursusProps) {
  const [selectedStarFilter, setSelectedStarFilter] = React.useState<number | null>(null);

  const filteredReviews = React.useMemo(() => {
    if (selectedStarFilter === null) return reviews;
    return reviews.filter((r) => Math.round(r.rating) === selectedStarFilter);
  }, [reviews, selectedStarFilter]);

  return (
    <div className="space-y-8">
      <div className="p-6 sm:p-7 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 backdrop-blur-md shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Ringkasan Skor */}
          <div className="md:col-span-4 text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-stone-200/80 dark:border-stone-800/80 pb-5 md:pb-0 md:pr-6">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
              Rating & Ulasan Peserta
            </span>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-4xl sm:text-5xl font-black text-stone-900 dark:text-stone-100">
                {averageRating}
              </span>
              <span className="text-stone-400 font-semibold text-lg">/ 5.0</span>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.round(averageRating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-stone-300 dark:text-stone-700"
                  }`}
                />
              ))}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 pt-1">
              Berdasarkan <span className="font-semibold text-stone-700 dark:text-stone-300">{totalReviews} ulasan</span> peserta kursus
            </p>
          </div>

          {/* Distribusi Bintang */}
          <div className="md:col-span-8 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star] || 0;
              const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 w-12 shrink-0 font-medium text-stone-600 dark:text-stone-400">
                    <span>{star}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </div>

                  <div className="flex-1 h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="w-10 text-right text-stone-400 font-mono text-[11px]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Bintang */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedStarFilter(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedStarFilter === null
              ? "bg-[#0F3E2E] text-white dark:bg-emerald-600 shadow-2xs"
              : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
          }`}
        >
          Semua Ulasan ({totalReviews})
        </button>

        {[5, 4].map((star) => {
          const count = ratingDistribution[star] || 0;
          if (count === 0) return null;

          return (
            <button
              key={star}
              type="button"
              onClick={() => setSelectedStarFilter(star)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                selectedStarFilter === star
                  ? "bg-[#0F3E2E] text-white dark:bg-emerald-600 shadow-2xs"
                  : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
              }`}
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>Bintang {star} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Daftar Kartu Ulasan */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/30 space-y-2">
          <MessageSquare className="w-8 h-8 text-stone-400 mx-auto" />
          <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300">
            Tidak ada ulasan dengan filter ini
          </h4>
          <p className="text-xs text-stone-500">
            Pilih opsi &ldquo;Semua Ulasan&rdquo; untuk melihat seluruh ulasan peserta.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 backdrop-blur-sm flex flex-col justify-between space-y-3.5 shadow-2xs hover:border-stone-300 dark:hover:border-stone-700 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-500/10 shrink-0 border border-emerald-500/20">
                    <SmoothImage
                      src={rev.avatarUrl}
                      alt={rev.userName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">
                      {rev.userName}
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      {rev.userSchool}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] text-stone-400 shrink-0">
                  {rev.date}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 border-t border-stone-100 dark:border-stone-800/60">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < rev.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-stone-300 dark:text-stone-700"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
                &ldquo;{rev.comment}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const CourseReviewsTab = TabUlasanKursus;

