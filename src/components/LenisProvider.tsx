"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import AOS from "aos";
import "aos/dist/aos.css";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = React.useRef<Lenis | null>(null);

  React.useEffect(() => {
    // inisialisasi lenis smooth scroll
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
        // izinkan scrolling alami mouse wheel pada textarea, pre, code, editor html dan elemen ber-scrollbar
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
    (window as any).__lenis = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    // inisialisasi aos animate on scroll
    AOS.init({
      duration: 750,
      easing: "ease-out-cubic",
      once: true,
      offset: 50,
    });

    // pantau perubahan ukuran dokumen secara dinamis agar lenis selalu sinkron
    const resizeObserver = new ResizeObserver(() => {
      lenis.resize();
    });
    if (document.body) {
      resizeObserver.observe(document.body);
    }

    // smooth scroll interceptor untuk tautan id anchor
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
      delete (window as any).__lenis;
    };
  }, []);

  // saat rute navigasi halaman berubah reset scroll ke atas dan ukur ulang dimensi halaman
  React.useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
      lenisRef.current.resize();
    }
  }, [pathname]);

  return <>{children}</>;
}
