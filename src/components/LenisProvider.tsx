"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import AOS from "aos";
import "aos/dist/aos.css";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = React.useRef<Lenis | null>(null);

  // smooth scroll aktif untuk landing page dan halaman publik seperti katalog dan detail kursus
  const isDashboardRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin") ||
    pathname.startsWith("/kursus-saya") ||
    pathname.startsWith("/profil");

  const isPublicCoursePage =
    pathname === "/kursus" ||
    pathname.startsWith("/kursus/") ||
    pathname === "/courses" ||
    pathname.startsWith("/courses/");

  const isCertificatePage = pathname.startsWith("/sertifikat");

  const isLandingPage = pathname === "/" || isPublicCoursePage || isCertificatePage;
  const shouldEnableLenis = isLandingPage && !isDashboardRoute;

  React.useEffect(() => {
    // jika rute dashboard atau bukan halaman publik yang diizinkan lenis dihancurkan
    if (!shouldEnableLenis) {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
        if (typeof window !== "undefined") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (window as any).__lenis;
        }
      }
      return;
    }

    // inisialisasi lenis smooth scroll khusus landing page dan halaman publik kursus
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      prevent: (node) => {
        if (!node || typeof node.closest !== "function") return false;
        return Boolean(
          node.tagName === "TEXTAREA" ||
          node.tagName === "PRE" ||
          node.tagName === "CODE" ||
          node.isContentEditable ||
          node.closest("textarea, pre, code, [data-lenis-prevent], [contenteditable='true']")
        );
      },
    });

    lenisRef.current = lenis;
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__lenis = lenis;
    }

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    // inisialisasi aos animate on scroll untuk landing page
    AOS.init({
      duration: 750,
      easing: "ease-out-cubic",
      once: true,
      offset: 50,
    });

    // pantau perubahan ukuran dokumen secara dinamis agar lenis selalu sinkron di landing page
    const resizeObserver = new ResizeObserver(() => {
      lenis.resize();
    });
    if (document.body) {
      resizeObserver.observe(document.body);
    }

    // smooth scroll interceptor untuk tautan id anchor pada landing page
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;

      if (href.startsWith("#") || (href.startsWith("/#") && window.location.pathname === "/")) {
        const hash = href.includes("#") ? href.substring(href.indexOf("#") + 1) : "";
        if (!hash) {
          e.preventDefault();
          lenis.scrollTo(0, { duration: 1.2 });
          history.pushState(null, "", window.location.pathname);
          return;
        }

        const element = document.getElementById(hash);
        if (element) {
          e.preventDefault();
          lenis.scrollTo(element, { offset: -80, duration: 1.2 });
          history.pushState(null, "", `#${hash}`);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("click", handleAnchorClick);
      resizeObserver.disconnect();
      lenis.destroy();
      lenisRef.current = null;
      if (typeof window !== "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).__lenis;
      }
    };
  }, [shouldEnableLenis]);

  return <>{children}</>;
}
