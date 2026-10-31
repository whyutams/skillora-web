"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Course, UserRole } from "@/types/database";
import { ModalPendaftaranKursus } from "@/components/ModalPendaftaranKursus";
import { AlertModal } from "@/components/ui/ModalKonfirmasi";
import { ImagePreviewModal } from "@/components/ui/ModalPreviewGambar";

// subkomponen detail kursus
import { KursusHeroHeader } from "@/components/course-detail/KursusHeroHeader";
import { NavTabKursus, CourseTabKey } from "@/components/course-detail/NavTabKursus";
import { TabTentangKursus } from "@/components/course-detail/TabTentangKursus";
import { TabSilabusKursus } from "@/components/course-detail/TabSilabusKursus";
import { TabUlasanKursus } from "@/components/course-detail/TabUlasanKursus";
import { KursusActionSidebar } from "@/components/course-detail/KursusActionSidebar";
import {
  parseCourseCurriculum,
  getCourseReviewsData,
  CourseReviewItem,
} from "@/utils/courseCurriculumParser";

interface DetailKursusClientProps {
  course: Course;
  currentUser: {
    id: string;
    email: string;
    role?: UserRole;
    whatsapp_number?: string | null;
    avatar_url?: string | null;
    school_origin?: string | null;
  } | null;
  initialEnrolledCount?: number;
  initialViews?: number;
  isEnrolled?: boolean;
  userEnrollmentId?: string | null;
  initialDbReviews?: CourseReviewItem[];
}

export default function DetailKursusClient({
  course,
  currentUser,
  initialEnrolledCount = 0,
  initialViews = 0,
  isEnrolled = false,
  userEnrollmentId = null,
  initialDbReviews = [],
}: DetailKursusClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<CourseTabKey>("about");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isLoginAlertOpen, setIsLoginAlertOpen] = React.useState(false);
  const [isAdminAlertOpen, setIsAdminAlertOpen] = React.useState(false);
  const [isProfileAlertOpen, setIsProfileAlertOpen] = React.useState(false);
  const [views, setViews] = React.useState(initialViews);
  const [enrolledCount] = React.useState(initialEnrolledCount);

  const [previewImage, setPreviewImage] = React.useState<{
    isOpen: boolean;
    url: string | null;
    title: string;
  }>({
    isOpen: false,
    url: null,
    title: "",
  });

  // Parse curriculum and reviews structure
  const curriculum = React.useMemo(() => {
    return parseCourseCurriculum(course);
  }, [course]);

  const reviewsData = React.useMemo(() => {
    return getCourseReviewsData(course.slug || course.title, initialDbReviews);
  }, [course.slug, course.title, initialDbReviews]);

  // Track Course View (Analytics)
  React.useEffect(() => {
    const trackView = async () => {
      try {
        const res = await fetch("/api/course-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: course.slug }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.views === "number") {
            setViews(data.views);
          }
        }
      } catch {
        // Silently fail view tracker if offline or error
      }
    };

    trackView();
  }, [course.slug]);

  const hasAvatar = Boolean(currentUser?.avatar_url && currentUser.avatar_url.trim().length > 0);
  const hasSchool = Boolean(
    currentUser?.school_origin &&
      currentUser.school_origin.trim().length > 0 &&
      currentUser.school_origin !== "-"
  );
  const isProfileComplete = !currentUser || (hasAvatar && hasSchool);

  const handleEnrollClick = () => {
    if (!currentUser) {
      setIsLoginAlertOpen(true);
      return;
    }

    if (currentUser.role === "admin" || currentUser.role === "superadmin") {
      setIsAdminAlertOpen(true);
      return;
    }

    if (!isProfileComplete) {
      setIsProfileAlertOpen(true);
      return;
    }

    setIsModalOpen(true);
  };

  const handleGoToLogin = () => {
    setIsLoginAlertOpen(false);
    const returnUrl = encodeURIComponent(`/courses/${course.slug}`);
    router.push(`/login?returnUrl=${returnUrl}`);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0C0A09] text-stone-900 dark:text-stone-100 py-6 sm:py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main 2-Column Grid Layout: Kolom Kiri (Header + Tabs) & Kolom Kanan (Card Sidebar di Atas) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Kolom Kiri: Header Judul & Konten Tab */}
          <main className="lg:col-span-8 space-y-8">
            <KursusHeroHeader
              title={course.title}
              shortDescription={course.description || ""}
            />

            <div className="space-y-6">
              <div className="sticky top-16 z-20 bg-stone-50/95 dark:bg-[#0C0A09]/95 backdrop-blur-md pt-2">
                <NavTabKursus
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  totalModules={curriculum.totalModules}
                  totalReviews={reviewsData.totalReviews}
                />
              </div>

              {/* Konten Sesuai Tab Aktif */}
              <div className="pt-2">
                {activeTab === "about" && (
                  <div data-aos="fade-in" className="animate-in fade-in duration-300">
                    <TabTentangKursus
                      courseTitle={course.title}
                      courseContentHtml={course.content}
                      curriculum={curriculum}
                      whatsappGroupUrl={course.whatsapp_group_url}
                    />
                  </div>
                )}

                {activeTab === "syllabus" && (
                  <div data-aos="fade-in" className="animate-in fade-in duration-300">
                    <TabSilabusKursus
                      modules={curriculum.modules}
                      isEnrolled={isEnrolled}
                      onEnrollClick={handleEnrollClick}
                    />
                  </div>
                )}

                {activeTab === "reviews" && (
                  <div data-aos="fade-in" className="animate-in fade-in duration-300">
                    <TabUlasanKursus
                      reviews={reviewsData.reviews}
                      averageRating={reviewsData.averageRating}
                      totalReviews={reviewsData.totalReviews}
                      ratingDistribution={reviewsData.ratingDistribution}
                      recommendPercentage={reviewsData.recommendPercentage}
                    />
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Kolom Kanan: Action Sidebar */}
          <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-6">
            <KursusActionSidebar
              course={course}
              level={curriculum.level}
              totalModules={curriculum.totalModules}
              enrolledCount={enrolledCount}
              averageRating={reviewsData.averageRating}
              totalReviews={reviewsData.totalReviews}
              views={views}
              isEnrolled={isEnrolled}
              userEnrollmentId={userEnrollmentId}
              currentUser={currentUser}
              onEnrollClick={handleEnrollClick}
              onPreviewImage={(url, title) => setPreviewImage({ isOpen: true, url, title })}
            />
          </aside>
        </div>
      </div>

      {/* Modal Preview Zoom Gambar */}
      <ImagePreviewModal
        isOpen={previewImage.isOpen}
        imageUrl={previewImage.url}
        title={previewImage.title}
        onClose={() => setPreviewImage({ isOpen: false, url: null, title: "" })}
      />

      {/* Modal Pendaftaran Kursus Mandiri */}
      <ModalPendaftaranKursus
        course={course}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={currentUser?.id}
        userEmail={currentUser?.email}
        userRole={currentUser?.role}
        userWhatsapp={currentUser?.whatsapp_number}
      />

      {/* Login Required Alert Modal */}
      <AlertModal
        isOpen={isLoginAlertOpen}
        title="Masuk Akun Diperlukan"
        message="Anda harus login terlebih dahulu sebelum mendaftar kursus mandiri ini."
        type="info"
        onClose={handleGoToLogin}
      />

      {/* Admin Warning Alert Modal */}
      <AlertModal
        isOpen={isAdminAlertOpen}
        title="Akses Ditolak untuk Admin"
        message="Akun administrator tidak dapat mendaftar kursus sebagai mahasiswa. Silakan gunakan akun mahasiswa atau logout terlebih dahulu."
        type="error"
        onClose={() => setIsAdminAlertOpen(false)}
      />

      {/* Profile Incomplete Alert Modal */}
      <AlertModal
        isOpen={isProfileAlertOpen}
        title="Lengkapi Profil Anda"
        message="Anda wajib melengkapi foto profil dan asal kampus di menu Profil terlebih dahulu agar dapat mendaftar kursus ini."
        type="info"
        onClose={() => {
          setIsProfileAlertOpen(false);
          router.push(`/profile?returnUrl=${encodeURIComponent(`/courses/${course.slug}`)}`);
        }}
      />
    </div>
  );
}

export const CourseDetailClient = DetailKursusClient;
