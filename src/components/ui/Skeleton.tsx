import * as React from "react";

export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-stone-200/90 dark:bg-stone-800/90 ${className}`}
      {...props}
    />
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 overflow-hidden flex flex-col justify-between shadow-xs">
      <div>
        <Skeleton className="w-full h-44 sm:h-48 rounded-none" />
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-12 h-3.5 rounded" />
            <Skeleton className="w-24 h-3.5 rounded" />
          </div>
          <Skeleton className="w-4/5 h-5 rounded-md" />
          <div className="space-y-1.5 pt-0.5">
            <Skeleton className="w-full h-3.5 rounded" />
            <Skeleton className="w-3/4 h-3.5 rounded" />
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6 border-t border-stone-100 dark:border-stone-800/60 mt-auto flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="w-16 h-3 rounded" />
          <Skeleton className="w-24 h-5 rounded-md" />
        </div>
        <Skeleton className="w-28 h-9 rounded-xl" />
      </div>
    </div>
  );
}

export function EnrollmentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 p-6 space-y-4 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="w-24 h-3.5 rounded-full" />
          <Skeleton className="w-3/4 h-5 rounded-md" />
          <Skeleton className="w-full h-3 rounded" />
        </div>
        <Skeleton className="w-20 h-6 rounded-md shrink-0" />
      </div>
      <Skeleton className="w-full h-12 rounded-xl" />
      <div className="flex items-center gap-2 pt-2">
        <Skeleton className="flex-1 h-9 rounded-xl" />
        <Skeleton className="w-24 h-9 rounded-xl" />
      </div>
    </div>
  );
}

export function StudentCourseDetailSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-36 h-8 rounded-xl" />
        <Skeleton className="w-24 h-8 rounded-xl" />
      </div>

      {/* Header banner skeleton */}
      <div className="p-6 sm:p-8 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-28 h-6 rounded-full" />
          <Skeleton className="w-20 h-6 rounded-full" />
          <Skeleton className="w-36 h-4 rounded" />
        </div>
        <Skeleton className="w-3/4 h-8 sm:h-10 rounded-lg" />
        <Skeleton className="w-full max-w-2xl h-4 rounded" />
        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-4">
          <Skeleton className="w-44 h-4 rounded" />
          <Skeleton className="w-44 h-4 rounded" />
        </div>
      </div>

      {/* 2-column grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="w-full h-64 sm:h-80 rounded-3xl" />
          <div className="p-6 sm:p-8 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 space-y-4">
            <Skeleton className="w-48 h-6 rounded-md" />
            <Skeleton className="w-full h-4 rounded" />
            <Skeleton className="w-full h-4 rounded" />
            <Skeleton className="w-4/5 h-4 rounded" />
            <Skeleton className="w-full h-24 rounded-2xl" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 space-y-4">
            <Skeleton className="w-36 h-5 rounded-md" />
            <Skeleton className="w-full h-20 rounded-2xl" />
            <Skeleton className="w-full h-10 rounded-xl" />
          </div>

          <div className="p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 space-y-3">
            <Skeleton className="w-44 h-5 rounded-md" />
            <Skeleton className="w-full h-14 rounded-2xl" />
            <Skeleton className="w-full h-14 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function VisitorStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="w-20 h-4 rounded" />
            <Skeleton className="w-9 h-9 rounded-xl" />
          </div>
          <Skeleton className="w-28 h-9 rounded-md" />
          <Skeleton className="w-32 h-3.5 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TestimonialsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800/60">
            <Skeleton className="w-24 h-4 rounded" />
            <Skeleton className="w-16 h-3 rounded" />
          </div>
          <Skeleton className="w-32 h-5 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="w-full h-3.5 rounded" />
            <Skeleton className="w-full h-3.5 rounded" />
            <Skeleton className="w-3/4 h-3.5 rounded" />
          </div>
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800/60 flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="w-28 h-3.5 rounded" />
              <Skeleton className="w-20 h-3 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NavbarUserSkeleton() {
  return (
    <div className="flex items-center gap-2.5">
      <Skeleton className="w-9 h-9 rounded-full" />
      <Skeleton className="w-24 h-8 rounded-lg" />
    </div>
  );
}

export function CourseCatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200/80 dark:border-stone-800/80">
        <div className="space-y-2">
          <Skeleton className="w-48 h-8 rounded-lg" />
          <Skeleton className="w-72 h-4 rounded" />
        </div>
        <Skeleton className="w-24 h-8 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        <div className="p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 space-y-4 text-center">
          <Skeleton className="w-28 h-28 rounded-full mx-auto" />
          <div className="space-y-2">
            <Skeleton className="w-32 h-5 rounded mx-auto" />
            <Skeleton className="w-24 h-4 rounded mx-auto" />
            <Skeleton className="w-20 h-5 rounded-full mx-auto" />
          </div>
        </div>

        <div className="md:col-span-2 p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 space-y-4">
          <Skeleton className="w-40 h-6 rounded" />
          <Skeleton className="w-full h-10 rounded-lg" />
          <Skeleton className="w-full h-10 rounded-lg" />
          <Skeleton className="w-full h-10 rounded-lg" />
          <Skeleton className="w-full h-10 rounded-lg" />
          <Skeleton className="w-36 h-9 rounded-lg ml-auto" />
        </div>
      </div>
    </div>
  );
}

// skeleton halaman utama dashboard
export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60">
        <div className="space-y-2">
          <Skeleton className="w-48 h-7 rounded-xl" />
          <Skeleton className="w-72 h-4 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-24 h-9 rounded-xl" />
          <Skeleton className="w-32 h-9 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="w-24 h-4 rounded" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
            <Skeleton className="w-20 h-7 rounded-lg" />
            <Skeleton className="w-28 h-3 rounded" />
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <Skeleton className="w-36 h-5 rounded-lg" />
          <Skeleton className="w-24 h-8 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="w-40 h-4 rounded" />
                  <Skeleton className="w-24 h-3 rounded" />
                </div>
              </div>
              <Skeleton className="w-20 h-6 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// skeleton halaman detail kursus admin
export function AdminCourseDetailSkeleton() {
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60">
        <div className="space-y-3">
          <Skeleton className="w-36 h-7 rounded-xl" />
          <div className="flex items-center gap-3">
            <Skeleton className="w-64 h-8 rounded-xl" />
            <Skeleton className="w-16 h-6 rounded-full" />
          </div>
          <Skeleton className="w-44 h-4 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-28 h-9 rounded-xl" />
          <Skeleton className="w-36 h-9 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 space-y-2"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="w-20 h-3.5 rounded" />
              <Skeleton className="w-6 h-6 rounded-lg" />
            </div>
            <Skeleton className="w-24 h-6 rounded-md" />
            <Skeleton className="w-28 h-3 rounded" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-stone-200/80 dark:border-stone-800/80 pb-3">
        <Skeleton className="w-32 h-9 rounded-xl" />
        <Skeleton className="w-28 h-9 rounded-xl" />
        <Skeleton className="w-28 h-9 rounded-xl" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-xl" />
                <div className="space-y-1">
                  <Skeleton className="w-48 h-5 rounded-md" />
                  <Skeleton className="w-32 h-3.5 rounded" />
                </div>
              </div>
              <Skeleton className="w-20 h-7 rounded-lg" />
            </div>
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800/60 space-y-2">
              <Skeleton className="w-full h-8 rounded-xl" />
              <Skeleton className="w-full h-8 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// skeleton formulir edit atau buat kursus
export function AdminCourseFormSkeleton() {
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60">
        <div className="flex items-center gap-3">
          <Skeleton className="w-20 h-8 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="w-40 h-6 rounded-lg" />
            <Skeleton className="w-64 h-3.5 rounded" />
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 space-y-6">
        <div className="space-y-2">
          <Skeleton className="w-28 h-4 rounded" />
          <Skeleton className="w-full h-10 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="w-32 h-4 rounded" />
          <Skeleton className="w-full h-20 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="w-24 h-4 rounded" />
            <Skeleton className="w-full h-10 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="w-28 h-4 rounded" />
            <Skeleton className="w-full h-10 rounded-xl" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="w-36 h-4 rounded" />
          <Skeleton className="w-full h-44 rounded-xl" />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
          <Skeleton className="w-24 h-9 rounded-xl" />
          <Skeleton className="w-36 h-9 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// skeleton formulir edit topik
export function AdminTopicEditSkeleton() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80 dark:border-stone-800/80">
        <div className="space-y-2">
          <Skeleton className="w-40 h-7 rounded-xl" />
          <Skeleton className="w-64 h-7 rounded-xl" />
          <Skeleton className="w-48 h-4 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-20 h-8 rounded-xl" />
          <Skeleton className="w-36 h-8 rounded-xl" />
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 space-y-6">
        <div className="space-y-2">
          <Skeleton className="w-28 h-4 rounded" />
          <Skeleton className="w-full h-10 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="w-36 h-4 rounded" />
          <Skeleton className="w-full h-56 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// skeleton tabel data admin
export function DataTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4 w-full animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60">
        <Skeleton className="w-full sm:w-72 h-9 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-24 h-9 rounded-xl" />
          <Skeleton className="w-28 h-9 rounded-xl" />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 overflow-hidden">
        <div className="p-4 border-b border-stone-100 dark:border-stone-800/60 flex items-center justify-between">
          <Skeleton className="w-32 h-4 rounded" />
          <Skeleton className="w-20 h-4 rounded" />
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="w-48 h-4 rounded" />
                  <Skeleton className="w-32 h-3 rounded" />
                </div>
              </div>
              <Skeleton className="w-24 h-6 rounded-full shrink-0" />
              <Skeleton className="w-20 h-8 rounded-xl shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// skeleton baris tabel
export function TableRowsSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-stone-100 dark:divide-stone-800/60 animate-in fade-in duration-150">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="w-48 h-4 rounded" />
              <Skeleton className="w-32 h-3 rounded" />
            </div>
          </div>
          {cols >= 3 && <Skeleton className="w-24 h-5 rounded-full shrink-0" />}
          {cols >= 4 && <Skeleton className="w-20 h-7 rounded-lg shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// skeleton halaman pengaturan sistem
export function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className="space-y-2">
              <Skeleton className="w-56 h-6 rounded-lg" />
              <Skeleton className="w-72 h-3.5 rounded" />
            </div>
            <Skeleton className="w-14 h-8 rounded-full" />
          </div>
          <Skeleton className="w-full h-16 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// skeleton halaman pendaftaran admin
export function AdminPendaftaranSkeleton() {
  return (
    <div className="space-y-8 w-full pb-12 max-w-7xl mx-auto animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 shadow-xs">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-64 h-7 rounded-xl" />
              <Skeleton className="w-32 h-6 rounded-full" />
            </div>
            <Skeleton className="w-96 max-w-full h-4 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <Skeleton className="w-28 h-9 rounded-xl" />
          <Skeleton className="w-44 h-9 rounded-xl" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="w-72 h-6 rounded-lg" />
          <Skeleton className="w-96 max-w-full h-3.5 rounded-md" />
        </div>
        <Skeleton className="w-48 h-4 rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 space-y-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="w-3/4 h-5 rounded-md" />
              <Skeleton className="w-16 h-5 rounded-md" />
            </div>
            <Skeleton className="w-48 h-3.5 rounded" />
            <div className="grid grid-cols-4 gap-2 p-3 rounded-2xl bg-stone-100/70 dark:bg-stone-800/60">
              {[1, 2, 3, 4].map((c) => (
                <div key={c} className="space-y-1 text-center">
                  <Skeleton className="w-8 h-2.5 mx-auto rounded" />
                  <Skeleton className="w-6 h-4 mx-auto rounded" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Skeleton className="h-9 rounded-xl" />
              <Skeleton className="h-9 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// skeleton halaman katalog kursus admin
export function AdminCoursesSkeleton() {
  return (
    <div className="space-y-8 w-full pb-12 max-w-7xl mx-auto animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 shadow-xs">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-56 h-7 rounded-xl" />
              <Skeleton className="w-28 h-6 rounded-full" />
            </div>
            <Skeleton className="w-96 max-w-full h-4 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <Skeleton className="w-24 h-9 rounded-xl" />
          <Skeleton className="w-36 h-9 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/50 dark:bg-stone-900/40 space-y-2"
          >
            <Skeleton className="w-24 h-3.5 rounded" />
            <Skeleton className="w-16 h-7 rounded-md" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-stone-200/80 dark:border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Skeleton className="w-48 h-6 rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-64 h-9 rounded-xl" />
            <Skeleton className="w-28 h-9 rounded-xl" />
          </div>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="w-14 h-10 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="w-48 h-4 rounded" />
                  <Skeleton className="w-32 h-3 rounded" />
                </div>
              </div>
              <Skeleton className="w-20 h-4 rounded" />
              <Skeleton className="w-16 h-6 rounded-full" />
              <Skeleton className="w-28 h-8 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// skeleton halaman rekening pembayaran admin
export function AdminRekeningSkeleton() {
  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-12 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60">
        <div className="flex items-center gap-3.5">
          <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="w-56 h-7 rounded-xl" />
            <Skeleton className="w-96 max-w-full h-3.5 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="w-24 h-9 rounded-xl" />
          <Skeleton className="w-36 h-9 rounded-xl" />
        </div>
      </div>

      <Skeleton className="w-full h-12 rounded-xl" />

      <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/60 overflow-hidden">
        <div className="p-5 border-b border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between">
          <Skeleton className="w-48 h-5 rounded-md" />
          <Skeleton className="w-32 h-4 rounded" />
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800/60 p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="w-40 h-4 rounded" />
                  <Skeleton className="w-28 h-3 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-16 h-6 rounded-full" />
                <Skeleton className="w-16 h-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// skeleton ruang belajar materi kursus mandiri
export function TopicWorkspaceSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0C0A09] text-stone-900 dark:text-stone-100 py-6 sm:py-10 transition-colors animate-in fade-in duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        {/* bagian navigasi atas dan tajuk */}
        <div className="space-y-4">
          <Skeleton className="w-48 h-8 rounded-xl" />

          <div className="p-6 sm:p-7 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="w-32 h-5 rounded-md" />
                <Skeleton className="w-40 h-4 rounded" />
              </div>
              <Skeleton className="w-3/4 sm:w-1/2 h-8 rounded-xl" />
              <Skeleton className="w-48 h-4 rounded-md" />
            </div>
            <Skeleton className="w-full md:w-64 h-20 rounded-2xl shrink-0" />
          </div>
        </div>

        {/* tata letak dua kolom */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* kolom kiri konten topik */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="w-48 h-4 rounded-md" />
                <Skeleton className="w-20 h-5 rounded-md" />
              </div>
              <Skeleton className="w-2/3 h-7 rounded-xl" />
            </div>

            <Skeleton className="w-full aspect-video rounded-3xl" />

            <div className="p-6 sm:p-8 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 space-y-4">
              <Skeleton className="w-full h-4 rounded" />
              <Skeleton className="w-5/6 h-4 rounded" />
              <Skeleton className="w-4/5 h-4 rounded" />
              <Skeleton className="w-2/3 h-4 rounded" />
              <Skeleton className="w-1/2 h-4 rounded" />
            </div>

            <div className="p-4 sm:p-5 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 flex items-center justify-between">
              <Skeleton className="w-36 h-10 rounded-xl" />
              <div className="flex items-center gap-2">
                <Skeleton className="w-28 h-10 rounded-xl" />
                <Skeleton className="w-36 h-10 rounded-xl" />
              </div>
            </div>
          </div>

          {/* kolom kanan daftar modul */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/60 p-5 sm:p-6 space-y-4">
              <div className="space-y-2 pb-2 border-b border-stone-100 dark:border-stone-800/60">
                <Skeleton className="w-44 h-5 rounded-md" />
                <Skeleton className="w-32 h-3.5 rounded" />
              </div>

              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-stone-200/70 dark:border-stone-800/70 bg-stone-50/60 dark:bg-stone-900/40 p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-1">
                        <Skeleton className="w-6 h-6 rounded-lg shrink-0" />
                        <Skeleton className="w-3/4 h-4 rounded" />
                      </div>
                      <Skeleton className="w-4 h-4 rounded shrink-0" />
                    </div>
                    {i === 1 && (
                      <div className="pt-2 border-t border-stone-100 dark:border-stone-800/60 space-y-2 pl-8">
                        <Skeleton className="w-full h-3 rounded" />
                        <Skeleton className="w-4/5 h-3 rounded" />
                        <Skeleton className="w-3/4 h-3 rounded" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
