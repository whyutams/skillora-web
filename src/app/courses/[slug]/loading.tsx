import { Skeleton } from "@/components/ui/Skeleton";

export default function CourseDetailLoading() {
  return (
    <div className="min-h-screen py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      {/* Breadcrumb Skeleton */}
      <Skeleton className="w-36 h-4 rounded" />

      {/* Hero Header Skeleton */}
      <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 p-6 sm:p-10 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="w-32 h-6 rounded-full" />
          <Skeleton className="w-28 h-6 rounded-md" />
        </div>

        <div className="space-y-3">
          <Skeleton className="w-3/4 h-10 rounded-xl" />
          <Skeleton className="w-full h-5 rounded" />
          <Skeleton className="w-5/6 h-5 rounded" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>

        <div className="pt-4 flex items-center gap-3">
          <Skeleton className="w-48 h-12 rounded-xl" />
          <Skeleton className="w-48 h-12 rounded-xl" />
        </div>
      </div>

      {/* Syllabus Grid Skeleton */}
      <div className="space-y-4">
        <Skeleton className="w-56 h-8 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
