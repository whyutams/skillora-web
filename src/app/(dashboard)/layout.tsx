"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ModalKonfirmasi";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { UserRole, USER_ROLES, getRoleLabel } from "@/types/database";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  ShieldCheck,
  ScrollText,
  LogOut,
  Menu,
  X,
  User,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Heart,
  CreditCard,
  Settings,
  Award,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/config/app";
import { BreadcrumbProvider, useBreadcrumb } from "@/context/BreadcrumbContext";

function formatSlugToTitle(slug: string): string {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  if (isUUID) return "Detail Kursus";
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getBreadcrumbData(pathname: string, customTitle?: string | null) {
  const dashboardHomeHref = pathname.startsWith("/superadmin")
    ? "/superadmin/dashboard"
    : pathname.startsWith("/admin")
    ? "/admin/dashboard"
    : "/dashboard";

  const isDashboardHome = pathname === dashboardHomeHref;

  if (isDashboardHome) {
    return {
      title: "Dashboard",
      breadcrumbs: [{ label: "Dashboard", href: dashboardHomeHref }],
    };
  }

  // untuk halaman selain beranda dashboard posisi pertama selalu dashboard
  const breadcrumbs: { label: string; href?: string }[] = [
    { label: "Dashboard", href: dashboardHomeHref },
  ];

  let title = "Dashboard";

  if (pathname.startsWith("/admin/courses")) {
    if (pathname === "/admin/courses") {
      title = "Manajemen Kursus";
      breadcrumbs.push({ label: "Kursus" });
    } else if (pathname === "/admin/courses/create") {
      title = "Tambah Kursus";
      breadcrumbs.push({ label: "Kursus", href: "/admin/courses" });
      breadcrumbs.push({ label: "Tambah Kursus" });
    } else if (pathname.includes("/edit")) {
      title = "Edit Kursus";
      const courseSegment = pathname.split("/")[3] || "";
      const displayTitle = customTitle || formatSlugToTitle(courseSegment);
      breadcrumbs.push({ label: "Kursus", href: "/admin/courses" });
      if (courseSegment) {
        breadcrumbs.push({ label: displayTitle, href: `/admin/courses/${courseSegment}` });
      }
      breadcrumbs.push({ label: "Edit Kursus" });
    } else if (pathname.includes("/topics")) {
      title = "Kurikulum Kursus";
      const courseSegment = pathname.split("/")[3] || "";
      const displayTitle = customTitle || formatSlugToTitle(courseSegment);
      breadcrumbs.push({ label: "Kursus", href: "/admin/courses" });
      if (courseSegment) {
        breadcrumbs.push({ label: displayTitle, href: `/admin/courses/${courseSegment}` });
      }
      breadcrumbs.push({ label: "Kurikulum Kursus" });
    } else {
      // halaman detail kursus
      const courseSegment = pathname.split("/")[3] || "";
      const displayTitle = customTitle || formatSlugToTitle(courseSegment);
      title = displayTitle || "Detail Kursus";
      breadcrumbs.push({ label: "Kursus", href: "/admin/courses" });
      breadcrumbs.push({ label: displayTitle });
    }
  } else if (pathname.startsWith("/admin/pendaftaran")) {
    title = "Pendaftaran Peserta";
    breadcrumbs.push({ label: "Pendaftaran" });
  } else if (pathname.startsWith("/admin/rekening")) {
    title = "Rekening Pembayaran";
    breadcrumbs.push({ label: "Rekening" });
  } else if (pathname.startsWith("/superadmin/users")) {
    if (pathname === "/superadmin/users/create") {
      title = "Tambah Pengguna";
      breadcrumbs.push({ label: "Users", href: "/superadmin/users" });
      breadcrumbs.push({ label: "Tambah Pengguna" });
    } else {
      title = "Manajemen Pengguna";
      breadcrumbs.push({ label: "Users Management" });
    }
  } else if (pathname.startsWith("/superadmin/logs")) {
    title = "Activity Logs";
    breadcrumbs.push({ label: "Activity Logs" });
  } else if (pathname.startsWith("/superadmin/pengaturan")) {
    title = "Pengaturan Sistem";
    breadcrumbs.push({ label: "Pengaturan Sistem" });
  } else if (pathname.startsWith("/kursus-saya")) {
    const courseSegment = pathname.split("/")[2] || "";
    if (!courseSegment) {
      title = "Kursus Saya";
      breadcrumbs.push({ label: "Kursus Saya" });
    } else {
      const displayTitle = customTitle || formatSlugToTitle(courseSegment);
      breadcrumbs.push({ label: "Kursus Saya", href: "/kursus-saya" });
      if (pathname.includes("/belajar")) {
        title = "Ruang Belajar";
        breadcrumbs.push({ label: displayTitle, href: `/kursus-saya/${courseSegment}` });
        breadcrumbs.push({ label: "Ruang Belajar" });
      } else {
        title = displayTitle || "Detail Kursus";
        breadcrumbs.push({ label: displayTitle });
      }
    }
  } else if (pathname === "/dashboard/kursus" || pathname === "/kursus") {
    title = "Katalog Kursus";
    breadcrumbs.push({ label: "Kursus" });
  } else if (pathname.startsWith("/dashboard/sertifikat") || pathname.startsWith("/sertifikat")) {
    title = "Sertifikat Kelulusan";
    breadcrumbs.push({ label: "Sertifikat" });
  } else if (pathname.includes("/profile") || pathname.includes("/profil")) {
    title = "Pengaturan Profil";
    breadcrumbs.push({ label: "Pengaturan Profil" });
  } else {
    title = "Dashboard";
    breadcrumbs.push({ label: "Halaman" });
  }

  return { title, breadcrumbs };
}

function NavbarPageTitle() {
  const pathname = usePathname();
  const { customTitle } = useBreadcrumb();
  const { title } = getBreadcrumbData(pathname, customTitle);

  return (
    <span className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 truncate">
      {title}
    </span>
  );
}

function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const { customTitle } = useBreadcrumb();
  const { breadcrumbs } = getBreadcrumbData(pathname, customTitle);

  // jika hanya berada tepat di beranda dashboard sembunyikan breadcrumb
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 sm:gap-2 text-xs overflow-x-auto pb-3 mb-2 flex-wrap font-medium"
    >
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <span className="text-emerald-600/40 dark:text-emerald-500/40 font-semibold select-none">
                /
              </span>
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-[#0F3E2E] dark:text-emerald-400 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = React.useState<{ id: string; email?: string } | null>(null);
  const [role, setRole] = React.useState<UserRole>("student");
  const [fullName, setFullName] = React.useState<string>("");
  const [username, setUsername] = React.useState<string>("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = React.useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // muat preferensi sidebar minimize desktop dari penyimpanan lokal
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("skillora_sidebar_minimized");
      if (saved !== null) {
        setIsSidebarMinimized(saved === "true");
      }
    } catch {
      // non blocking
    }
  }, []);

  // fungsi toggle untuk memperluas atau mengecilkan sidebar desktop
  const toggleSidebarMinimize = () => {
    setIsSidebarMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("skillora_sidebar_minimized", String(next));
      } catch {
        // non blocking
      }
      return next;
    });
  };

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // tutup menu dropdown profil saat pengguna mengklik di luar area
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    async function fetchUserData() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email });

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, username, role, avatar_url")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile) {
            setFullName(profile.full_name || "");
            setUsername(profile.username || "");
            setAvatarUrl(profile.avatar_url || null);
            setRole(profile.role as UserRole);
          } else if (session.user.email === "skillorastartup26@gmail.com") {
            setRole(USER_ROLES.SUPERADMIN);
          }
        }
      } catch (err) {
        console.error("Error in DashboardLayout:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [supabase]);

  // penjagaan proteksi rute di sisi client
  React.useEffect(() => {
    if (loading) return;

    if (role === USER_ROLES.SUPERADMIN && (pathname.startsWith("/admin") || pathname === "/courses" || pathname === "/kursus")) {
      router.replace("/superadmin/dashboard");
    } else if (role === USER_ROLES.ADMIN && pathname.startsWith("/superadmin")) {
      router.replace("/admin/dashboard");
    } else if (role === USER_ROLES.STUDENT && (pathname.startsWith("/admin") || pathname.startsWith("/superadmin"))) {
      router.replace("/dashboard");
    }
  }, [role, pathname, loading, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      try {
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "USER_LOGOUT",
            tableName: "auth.users",
            recordId: user?.id,
            userId: user?.id,
            userEmail: user?.email,
            userRole: role,
            details: { full_name: fullName, username },
          }),
        });
      } catch {
        // non-blocking
      }

      await supabase.auth.signOut();
      setIsLogoutModalOpen(false);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // tautan navigasi berdasarkan peran pengguna
  const getNavLinks = () => {
    if (role === USER_ROLES.SUPERADMIN) {
      return [
        {
          label: "Dashboard",
          href: "/superadmin/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "Users",
          href: "/superadmin/users",
          icon: Users,
        },
        {
          label: "Logs",
          href: "/superadmin/logs",
          icon: ScrollText,
        },
        {
          label: "Pengaturan",
          href: "/superadmin/pengaturan",
          icon: Settings,
        },
      ];
    }

    if (role === USER_ROLES.ADMIN) {
      return [
        {
          label: "Dashboard",
          href: "/admin/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "Pendaftaran",
          href: "/admin/pendaftaran",
          icon: ShieldCheck,
        },
        {
          label: "Kursus",
          href: "/admin/courses",
          icon: BookOpen,
        },
        {
          label: "Rekening",
          href: "/admin/rekening",
          icon: CreditCard,
        },
      ];
    }

    // navigasi khusus akun peserta
    return [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Kursus",
        href: "/dashboard/kursus",
        icon: BookOpen,
      },
      {
        label: "Kursus Saya",
        href: "/kursus-saya",
        icon: GraduationCap,
      },
      {
        label: "Sertifikat",
        href: "/dashboard/sertifikat",
        icon: Award,
      },
    ];
  };

  const navLinks = getNavLinks();
  const adminPhone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "6281356578805";

  const editProfileHref =
    role === USER_ROLES.SUPERADMIN
      ? "/superadmin/profile"
      : role === USER_ROLES.ADMIN
      ? "/admin/profile"
      : "/profil";

  return (
    <div className="min-h-screen flex bg-[#FAF9F6] dark:bg-[#0C0A09] text-stone-900 dark:text-stone-100">
      {/* latar belakang redup sidebar mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-stone-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* bilah samping desktop dan mobile drawer */}
      <aside
        className={`fixed lg:sticky top-0 z-50 h-screen border-r border-stone-200/80 dark:border-stone-800/80 bg-[#FAF9F6]/95 dark:bg-[#0C0A09]/95 backdrop-blur-md flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isSidebarMinimized ? "lg:w-20" : "lg:w-64"
        } w-64 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* bagian atas sidebar */}
        <div>
          {/* header sidebar */}
          <div
            className={`h-16 border-b border-stone-200/80 dark:border-stone-800/80 flex items-center transition-all duration-300 ${
              isSidebarMinimized
                ? "lg:px-3 lg:justify-center px-6 justify-between"
                : "px-6 justify-between"
            }`}
          >
            {/* logo dan nama aplikasi */}
            {(!isSidebarMinimized || isSidebarOpen) && (
              <Link href="/" className="flex items-center min-w-0" title="Skillora">
                <img
                  src="/logo.png"
                  alt="Skillora"
                  className="h-8 w-auto object-contain"
                />
              </Link>
            )}

            {/* tombol minimize atau expand sidebar khusus tampilan desktop */}
            <button
              type="button"
              onClick={toggleSidebarMinimize}
              className={`p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors hidden lg:flex items-center justify-center cursor-pointer ${
                isSidebarMinimized ? "mx-auto" : ""
              }`}
              title={isSidebarMinimized ? "Perluas Sidebar" : "Kecilkan Sidebar"}
              aria-label={isSidebarMinimized ? "Perluas Sidebar" : "Kecilkan Sidebar"}
            >
              {isSidebarMinimized ? (
                <PanelLeftOpen className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              ) : (
                <PanelLeftClose className="w-5 h-5 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200" />
              )}
            </button>

            {/* tombol tutup drawer khusus mobile */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg lg:hidden text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              aria-label="Tutup Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* tautan navigasi */}
          <nav
            className={`py-4 transition-all duration-300 ${
              isSidebarMinimized ? "lg:px-2 px-4" : "p-4"
            } space-y-2`}
          >
            {(!isSidebarMinimized || isSidebarOpen) && (
              <span className="text-[11px] uppercase font-bold tracking-wider text-stone-400 dark:text-stone-500 px-3.5 block mb-2 transition-opacity">
                Menu Navigasi
              </span>
            )}

            {navLinks.map((link) => {
              // menu dashboard utama hanya aktif saat berada tepat di rutenya
              const isDashboardHome =
                link.href === "/admin/dashboard" ||
                link.href === "/superadmin/dashboard" ||
                link.href === "/dashboard";

              // menu lainnya tetap aktif meskipun berada di sub halaman atau detail
              const isActive = isDashboardHome
                ? pathname === link.href
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`group flex items-center rounded-xl text-sm transition-all cursor-pointer ${
                    isSidebarMinimized
                      ? "lg:justify-center lg:px-0 lg:w-12 lg:h-12 lg:mx-auto px-4 py-3 justify-between"
                      : "justify-between px-4 py-3"
                  } ${
                    isActive
                      ? "bg-[#0F3E2E] text-white shadow-xs font-semibold"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-900 hover:text-stone-900 dark:hover:text-stone-100 font-medium"
                  }`}
                >
                  <div
                    className={`flex items-center ${
                      isSidebarMinimized ? "lg:justify-center gap-0 lg:gap-0" : "gap-3"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive
                          ? "text-white"
                          : "text-stone-500 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100"
                      }`}
                    />
                    <span className={isSidebarMinimized ? "lg:hidden ml-3" : "ml-3"}>
                      {link.label}
                    </span>
                  </div>
                  {isActive && !isSidebarMinimized && (
                    <ChevronRight className="w-4 h-4 opacity-80 shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* bagian bawah sidebar navigasi */}
        <div className="p-4 pb-4 border-t border-stone-200/80 dark:border-stone-800/80 flex justify-center items-center">
          {isSidebarMinimized ? (
            <div
              className="text-[10px] font-semibold text-stone-400 hidden lg:block"
              title={`${APP_NAME} v${APP_VERSION}`}
            >
              v{APP_VERSION}
            </div>
          ) : null}
          <div
            className={`text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase ${
              isSidebarMinimized ? "lg:hidden" : "block"
            }`}
          >
            {APP_NAME}&nbsp; <span className="font-medium lowercase">v{APP_VERSION}</span>
          </div>
        </div>
      </aside>

      {/* area konten utama dengan header dan footer */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* bilah atas navigasi dashboard */}
        <header className="h-16 border-b border-stone-200/80 dark:border-stone-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between bg-[#FAF9F6]/90 dark:bg-[#0C0A09]/90 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 lg:hidden text-stone-600 dark:text-stone-300 shrink-0"
              aria-label="Buka Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <NavbarPageTitle />
          </div>

          <div className="flex items-center gap-3">
            {/* Tema Gelap/Terang tepat di sebelah Profil */}
            <ThemeToggle />

            {/* Profile Dropdown Navbar Dashboard */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-2 pr-3 rounded-xl border border-stone-200/90 dark:border-stone-800/90 bg-white/80 dark:bg-stone-900/80 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all shadow-xs active:scale-[0.98]"
                aria-expanded={isProfileDropdownOpen}
                aria-haspopup="true"
              >
                {avatarUrl ? (
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-emerald-500/30 shrink-0">
                    <SmoothImage
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#0F3E2E] text-emerald-300 font-bold text-xs flex items-center justify-center uppercase">
                    {fullName ? fullName.charAt(0) : "A"}
                  </div>
                )}
                <div className="flex flex-col text-left hidden sm:flex">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 leading-tight max-w-[120px] truncate">
                    {fullName || "Administrator"}
                  </span>
                  <span className="text-[10px] text-stone-500 capitalize leading-none">
                    {getRoleLabel(role)}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                    isProfileDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Popover Dropdown Profil Dashboard */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-stone-200/90 dark:border-stone-800/90 bg-white/95 dark:bg-[#0C0A09]/95 backdrop-blur-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
                  {/* Header Informasi Profil (Termasuk Nama Role Akun) */}
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-100 dark:border-stone-800 mb-2 flex items-start gap-3">
                    {avatarUrl ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-500/30 shrink-0 mt-0.5">
                        <SmoothImage
                          src={avatarUrl}
                          alt="Foto Profil"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#0F3E2E] text-emerald-300 font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5 uppercase">
                        {fullName ? fullName.charAt(0) : "A"}
                      </div>
                    )}
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {fullName || "Administrator"}
                      </p>
                      <p className="text-[11px] text-stone-500 truncate">
                        {user?.email || username}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Badge
                          variant={
                            role === USER_ROLES.SUPERADMIN
                              ? "role-superadmin"
                              : role === USER_ROLES.ADMIN
                              ? "role-admin"
                              : "role-student"
                          }
                          className="text-[9px] uppercase px-1.5 py-0.2"
                        >
                          {getRoleLabel(role)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Menu Options Dropdown */}
                  <div className="space-y-1">
                    {/* 1. Edit Profil */}
                    <Link
                      href={editProfileHref}
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      <User className="w-4 h-4 text-stone-500" />
                      <span>Edit Profil</span>
                    </Link>

                    {/* 2. Landing Page */}
                    <Link
                      href="/"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-stone-500" />
                      <span>Landing Page</span>
                    </Link>

                    <div className="my-1 border-t border-stone-100 dark:border-stone-800" />

                    {/* 3. Logout */}
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        setIsLogoutModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* konten isi dashboard */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <DashboardBreadcrumbs />
          {children}
        </main>

        {/* footer khusus dashboard */}
        <footer className="border-t border-stone-200/80 dark:border-stone-800/80 px-6 py-4 bg-white/40 dark:bg-stone-950/40 text-stone-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="w-full flex space-x-1 gap-1 items-center">© {new Date().getFullYear()} Skillora. All rights reserved. </div>
          <div className="w-full flex space-x-1 gap-1 items-center justify-end">Made with true <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> by Skillora Dev</div>
        </footer>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        isLoading={isLoggingOut}
        title="Konfirmasi Keluar Akun"
        description="Apakah Anda yakin ingin keluar dari sesi Dashboard Skillora Anda?"
        confirmText="Ya, Keluar Akun"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BreadcrumbProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </BreadcrumbProvider>
  );
}
