"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { UserRole } from "@/types/database";
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
} from "lucide-react";

export default function DashboardLayout({
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
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
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
            setRole("superadmin");
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

  // Client-Side Route Protection Guard
  React.useEffect(() => {
    if (loading) return;

    if (role === "superadmin" && (pathname.startsWith("/admin") || pathname === "/courses")) {
      router.replace("/superadmin/dashboard");
    } else if (role === "admin" && pathname.startsWith("/superadmin")) {
      router.replace("/admin/dashboard");
    } else if (role === "student" && (pathname.startsWith("/admin") || pathname.startsWith("/superadmin"))) {
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

  // Nav Links berdasarkan Role:
  // - Superadmin: Dashboard, Users, Logs
  // - Admin: Dashboard, Pendaftaran, Kursus
  const getNavLinks = () => {
    if (role === "superadmin") {
      return [
        {
          label: "Dashboard",
          href: "/superadmin/dashboard",
          icon: <LayoutDashboard className="w-4 h-4 text-emerald-500" />,
        },
        {
          label: "Users",
          href: "/superadmin/users",
          icon: <Users className="w-4 h-4 text-blue-500" />,
        },
        {
          label: "Logs",
          href: "/superadmin/logs",
          icon: <ScrollText className="w-4 h-4 text-amber-500" />,
        },
      ];
    }

    if (role === "admin") {
      return [
        {
          label: "Dashboard",
          href: "/admin/dashboard",
          icon: <LayoutDashboard className="w-4 h-4 text-emerald-500" />,
        },
        {
          label: "Pendaftaran",
          href: "/admin/pendaftaran",
          icon: <ShieldCheck className="w-4 h-4 text-purple-500" />,
        },
        {
          label: "Kursus",
          href: "/admin/courses",
          icon: <BookOpen className="w-4 h-4 text-emerald-500" />,
        },
        {
          label: "Rekening",
          href: "/admin/rekening",
          icon: <CreditCard className="w-4 h-4 text-blue-500" />,
        },
      ];
    }

    // Default Fallback
    return [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <LayoutDashboard className="w-4 h-4 text-emerald-500" />,
      },
    ];
  };

  const navLinks = getNavLinks();

  const editProfileHref =
    role === "superadmin"
      ? "/superadmin/profile"
      : role === "admin"
      ? "/admin/profile"
      : "/profile";

  return (
    <div className="min-h-screen flex bg-[#FAF9F6] dark:bg-[#0C0A09] text-stone-900 dark:text-stone-100">
      {/* Sidebar Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-stone-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={`fixed lg:sticky top-0 z-50 h-screen w-64 border-r border-stone-200/80 dark:border-stone-800/80 bg-[#FAF9F6]/95 dark:bg-[#0C0A09]/95 backdrop-blur-md flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header (Tanpa Role Badge) */}
        <div>
          <div className="h-16 px-6 border-b border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0F3E2E] dark:bg-[#134e38] flex items-center justify-center text-emerald-300 border border-emerald-600/30 shadow-xs">
                <GraduationCap className="w-5 h-5 text-emerald-300" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-stone-900 dark:text-stone-100">
                Skillora
              </span>
            </Link>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg lg:hidden text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-stone-500 px-3 block mb-2">
              Menu Navigasi
            </span>

            {navLinks.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#0F3E2E] text-white shadow-xs font-semibold"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-900 hover:text-stone-900 dark:hover:text-stone-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {link.icon}
                    <span>{link.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area with Header & Dedicated Footer */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar inside Dashboard */}
        <header className="h-16 border-b border-stone-200/80 dark:border-stone-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between bg-[#FAF9F6]/90 dark:bg-[#0C0A09]/90 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 lg:hidden text-stone-600 dark:text-stone-300"
              aria-label="Buka Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Link href="/" className="hover:text-stone-900 dark:hover:text-stone-100">
                Skillora
              </Link>
              <span>/</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200 capitalize">
                {pathname.includes("/superadmin/logs")
                  ? "Activity Logs"
                  : pathname.includes("/superadmin/users")
                  ? "Users Management"
                  : pathname.includes("/admin/courses")
                  ? "Manajemen Kursus"
                  : pathname.includes("/admin/dashboard")
                  ? "Pendaftaran"
                  : pathname.includes("/superadmin/profile") || pathname.includes("/admin/profile")
                  ? "Pengaturan Profil"
                  : pathname.includes("/superadmin")
                  ? "Superadmin"
                  : pathname.includes("/admin")
                  ? "Pendaftaran"
                  : "Dashboard"}
              </span>
            </div>
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
                  <div className="w-7 h-7 rounded-lg overflow-hidden border border-emerald-500/30 shrink-0">
                    <SmoothImage
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#0F3E2E] text-emerald-300 font-bold text-xs flex items-center justify-center uppercase">
                    {fullName ? fullName.charAt(0) : "A"}
                  </div>
                )}
                <div className="flex flex-col text-left hidden sm:flex">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 leading-tight max-w-[120px] truncate">
                    {fullName || "Administrator"}
                  </span>
                  <span className="text-[10px] text-stone-500 capitalize leading-none">
                    {role}
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
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-500/30 shrink-0 mt-0.5">
                        <SmoothImage
                          src={avatarUrl}
                          alt="Foto Profil"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#0F3E2E] text-emerald-300 font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5 uppercase">
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
                            role === "superadmin"
                              ? "role-superadmin"
                              : role === "admin"
                              ? "role-admin"
                              : "role-student"
                          }
                          className="text-[9px] uppercase px-1.5 py-0.2"
                        >
                          {role}
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

        {/* Dashboard Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>

        {/* Dedicated Dashboard Footer */}
        <footer className="border-t border-stone-200/80 dark:border-stone-800/80 px-6 py-4 bg-white/40 dark:bg-stone-950/40 text-stone-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="w-full flex space-x-1 gap-1 items-center">© {new Date().getFullYear()} Skillora. All rights reserved. Made with true <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> by Skillora Dev</div>
          <div className="text-[11px]">v1.0.0</div>
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
