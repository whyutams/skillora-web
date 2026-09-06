"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { NavbarUserSkeleton } from "@/components/ui/Skeleton";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { UserRole } from "@/types/database";
import {
  GraduationCap,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  User,
  ChevronDown,
} from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [user, setUser] = React.useState<{ id: string; email?: string } | null>(null);
  const [role, setRole] = React.useState<UserRole>("student");
  const [fullName, setFullName] = React.useState<string>("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<string>("");

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email });

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, role, avatar_url")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile) {
            setRole((profile.role as UserRole) || "student");
            setFullName(profile.full_name || "");
            setAvatarUrl(profile.avatar_url || null);
          } else if (session.user.email === "skillorastartup26@gmail.com") {
            setRole("superadmin");
          }
        } else {
          setUser(null);
          setRole("student");
          setFullName("");
          setAvatarUrl(null);
        }
      } catch (err) {
        console.error("Error checking auth:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
        loadUser();
      } else {
        setUser(null);
        setRole("student");
        setFullName("");
        setAvatarUrl(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Scrollspy observer to detect active section as user scrolls (KHUSUS HANYA DI LANDING PAGE "/")
  React.useEffect(() => {
    if (pathname !== "/") {
      setActiveSection("");
      return;
    }

    const sectionIds = [
      "hero",
      "kursus",
      "keunggulan",
      "ulasan",
      "alur",
      "faq",
    ];

    const handleScroll = () => {
      if (pathname !== "/") {
        setActiveSection("");
        return;
      }

      // 1. Jika di posisi puncak halaman
      if (window.scrollY < 80) {
        setActiveSection("hero");
        return;
      }

      // 2. Jika user scroll sudah mendekati / mencapai dasar halaman (bottom of page / FAQ)
      const faqEl = document.getElementById("faq");
      const scrollBottom = window.innerHeight + window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      if (faqEl && scrollBottom >= documentHeight - 220) {
        setActiveSection("faq");
        return;
      }

      // 3. Cari section dengan area tampak (visible height) terbesar di layar
      let maxVisibleHeight = 0;
      let mostVisibleSection = "hero";

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const visibleTop = Math.max(64, rect.top);
          const visibleBottom = Math.min(window.innerHeight, rect.bottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);

          if (visibleHeight > maxVisibleHeight) {
            maxVisibleHeight = visibleHeight;
            mostVisibleSection = id;
          }
        }
      }

      if (maxVisibleHeight > 0) {
        setActiveSection(mostVisibleSection);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname, user, role]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      setIsLogoutModalOpen(false);
      setUser(null);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Navigasi tombol Dashboard yang andal
  const handleDashboardClick = (_e: React.MouseEvent) => {
    if (role === "superadmin") {
      router.push("/superadmin/users");
      return;
    }
    if (role === "admin") {
      router.push("/admin/dashboard");
      return;
    }

    // Untuk Student → halaman Kursus Saya (di luar layout admin, pakai Navbar landing)
    router.push("/kursus-saya");
  };

  // Nav link item configuration
  const navItems = [
    { id: "hero", label: "Beranda", href: "/#" },
    { id: "kursus", label: "Kursus", href: "/#kursus" },
    { id: "keunggulan", label: "Keunggulan", href: "/#keunggulan" },
    { id: "ulasan", label: "Ulasan", href: "/#ulasan" },
    { id: "alur", label: "Alur Belajar", href: "/#alur" },
    { id: "faq", label: "Tanya Jawab", href: "/#faq" },
  ];

  // Handler klik navlink di halaman yang sama (mencegah NProgress & smooth scroll murni)
  const handleNavLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: { id: string; href: string }
  ) => {
    if (pathname === "/") {
      e.preventDefault();
      if (item.id === "hero") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        history.pushState(null, "", "/#");
        setActiveSection("hero");
      } else {
        const el = document.getElementById(item.id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          history.pushState(null, "", item.href);
          setActiveSection(item.id);
        }
      }
    }
  };

  // Sembunyikan Navbar hanya di halaman admin/superadmin, bukan di /kursus-saya
  const isDashboardRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin");

  if (isDashboardRoute) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 dark:border-stone-800/80 bg-[#FAF9F6]/90 dark:bg-[#0C0A09]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center group transition-transform active:scale-[0.99]"
            title="Skillora"
          >
            <img
              src="/logo.png"
              alt="Skillora"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav Links with Expanding Center Border Animation & Active Scrollspy */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = pathname === "/" && activeSection === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavLinkClick(e, item)}
                  className={`relative py-1.5 transition-colors ${
                    isActive
                      ? "text-[#0F3E2E] dark:text-emerald-400 font-bold after:w-full"
                      : "text-stone-600 dark:text-stone-300 hover:text-[#0F3E2E] dark:hover:text-emerald-400 after:w-0 hover:after:w-full"
                  } after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[2px] after:bg-[#0F3E2E] dark:after:bg-emerald-400 after:transition-all after:duration-300`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>


          {/* Action Controls & User Auth with Profile Dropdown */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            {loading ? (
              <NavbarUserSkeleton />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                {/* Profile Trigger Button with Dropdown Indicator */}
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
                    <div className="w-7 h-7 rounded-lg bg-[#0F3E2E] text-emerald-300 font-bold text-xs flex items-center justify-center">
                      {fullName ? fullName.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 leading-tight max-w-[100px] truncate">
                      {fullName || "Akun Saya"}
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

                {/* Profile Dropdown Popover */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-stone-200/90 dark:border-stone-800/90 bg-white/95 dark:bg-[#0C0A09]/95 backdrop-blur-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header Profil */}
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
                        <div className="w-10 h-10 rounded-xl bg-[#0F3E2E] text-emerald-300 font-extrabold text-sm flex items-center justify-center shrink-0 mt-0.5">
                          {fullName ? fullName.charAt(0).toUpperCase() : "U"}
                        </div>
                      )}
                      <div className="overflow-hidden flex-1">
                        <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {fullName || "Pengguna"}
                        </p>
                        <p className="text-[11px] text-stone-500 truncate">
                          {user.email}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                            {role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu Options */}
                    <div className="space-y-1">
                      {role === "superadmin" || role === "admin" ? (
                        <>
                          {/* 1. Dashboard / Main Area */}
                          <Link
                            href={
                              role === "superadmin"
                                ? "/superadmin/users"
                                : "/admin/dashboard"
                            }
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-emerald-500/10 hover:text-[#0F3E2E] dark:hover:text-emerald-300 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Dashboard</span>
                          </Link>

                          {/* 2. Edit Profile Dashboard */}
                          <Link
                            href={
                              role === "superadmin"
                                ? "/superadmin/profile"
                                : "/admin/profile"
                            }
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          >
                            <User className="w-4 h-4 text-stone-500" />
                            <span>Edit Profil</span>
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
                        </>
                      ) : (
                        /* Menu Khusus Student (Kursus Saya, Edit Profil, Logout) */
                        <>
                          {/* 1. Kursus Saya */}
                          <button
                            onClick={(e) => {
                              setIsProfileDropdownOpen(false);
                              handleDashboardClick(e);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-emerald-500/10 hover:text-[#0F3E2E] dark:hover:text-emerald-300 transition-colors text-left"
                          >
                            <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Kursus Saya</span>
                          </button>

                          {/* 2. Edit Profil */}
                          <Link
                            href="/profile"
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          >
                            <User className="w-4 h-4 text-stone-500" />
                            <span>Edit Profil</span>
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
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Masuk
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Daftar Akun
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300"
              aria-label="Buka menu navigasi"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-stone-200 dark:border-stone-800 bg-[#FAF9F6] dark:bg-[#0C0A09] px-4 py-4 space-y-3">
            <nav className="flex flex-col space-y-2 text-sm font-medium">
              {navItems.map((item) => {
                const isActive = pathname === "/" && activeSection === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      handleNavLinkClick(e, item);
                    }}
                    className={`py-1.5 px-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-emerald-500/10 text-[#0F3E2E] dark:text-emerald-400 font-bold"
                        : "text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2">
              {user ? (
                <>
                  <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-900 flex items-center gap-3">
                    {avatarUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                        <SmoothImage
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#0F3E2E] text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {fullName ? fullName.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {fullName || "Pengguna"}
                      </p>
                      <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      handleDashboardClick(e);
                    }}
                    className="w-full justify-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4 text-emerald-300" />
                    <span>{role === "student" ? "Kursus Saya" : "Dashboard"}</span>
                  </Button>

                  <Link
                    href={
                      role === "superadmin"
                        ? "/superadmin/profile"
                        : role === "admin"
                        ? "/admin/profile"
                        : "/profile"
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full"
                  >
                    <Button variant="outline" size="sm" className="w-full justify-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Edit Profil</span>
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="w-full text-rose-600 justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar Akun
                  </Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Masuk
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full">
                      Daftar
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Modal Konfirmasi Logout */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        isLoading={isLoggingOut}
        title="Konfirmasi Keluar Akun"
        description="Apakah Anda yakin ingin keluar dari akun Skillora? Anda perlu masuk kembali untuk mengakses materi kursus dan grup kelas."
        confirmText="Ya, Keluar Akun"
        cancelText="Batal"
        variant="danger"
      />
    </>
  );
}
