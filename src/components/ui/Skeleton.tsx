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
      <Skeleton className="w-9 h-9 rounded-xl" />
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
          <Skeleton className="w-28 h-28 rounded-2xl mx-auto" />
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
