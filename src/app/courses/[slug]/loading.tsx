import { Skeleton } from "@/components/ui/Skeleton";

export default function CourseDetailLoading() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0C0A09] py-6 sm:py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Kolom Kiri: Header & Konten Tab */}
          <main className="lg:col-span-8 space-y-8">
            {/* Header Hero */}
            <div className="space-y-4">
              <Skeleton className="w-24 h-8 rounded-xl" />
              <div className="space-y-3">
                <Skeleton className="w-4/5 h-10 rounded-xl" />
                <Skeleton className="w-full h-4 rounded" />
                <Skeleton className="w-2/3 h-4 rounded" />
              </div>
            </div>

            {/* Tab Navigasi */}
            <div className="flex items-center gap-2 border-b border-stone-200/80 dark:border-stone-800/80 pb-2">
              <Skeleton className="w-24 h-9 rounded-xl" />
              <Skeleton className="w-24 h-9 rounded-xl" />
              <Skeleton className="w-24 h-9 rounded-xl" />
            </div>

            {/* Konten Tab */}
            <div className="space-y-6 pt-2">
              <div className="space-y-3">
                <Skeleton className="w-48 h-6 rounded-md" />
                <Skeleton className="w-full h-4 rounded" />
                <Skeleton className="w-full h-4 rounded" />
                <Skeleton className="w-3/4 h-4 rounded" />
              </div>

              <div className="pt-6 border-t border-stone-200/80 dark:border-stone-800/80 space-y-4">
                <Skeleton className="w-56 h-6 rounded-md" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          </main>

          {/* Kolom Kanan: Sidebar Aksi Kursus */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 backdrop-blur-md p-6 sm:p-7 space-y-6 shadow-xs">
              {/* Banner Kursus Skeleton */}
              <Skeleton className="w-full h-44 sm:h-48 rounded-2xl" />

              {/* Harga */}
              <div className="space-y-2 pb-4 border-b border-stone-100 dark:border-stone-800/60">
                <Skeleton className="w-36 h-9 rounded-lg" />
                <Skeleton className="w-full h-3 rounded" />
              </div>

              {/* Tombol Aksi */}
              <div className="space-y-3">
                <Skeleton className="w-full h-12 rounded-xl" />
                <Skeleton className="w-full h-9 rounded-xl" />
              </div>

              {/* Fakta Kursus */}
              <div className="space-y-2.5 pt-2 border-t border-stone-100 dark:border-stone-800/60">
                <Skeleton className="w-28 h-3 rounded" />
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <Skeleton className="w-24 h-4 rounded" />
                      <Skeleton className="w-16 h-4 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
