import { StudentCourseDetailSkeleton } from "@/components/ui/Skeleton";

export default function KursusSayaDetailLoading() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0C0A09]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <StudentCourseDetailSkeleton />
      </div>
    </div>
  );
}

