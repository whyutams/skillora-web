"use client";

import * as React from "react";
import Lenis from "lenis";
import AOS from "aos";
import "aos/dist/aos.css";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Inisialisasi Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Inisialisasi AOS (Animate On Scroll)
    AOS.init({
      duration: 750,
      easing: "ease-out-cubic",
      once: true,
      offset: 50,
    });

    // Smooth scroll interceptor untuk semua link yang menuju ke ID
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
      document.removeEventListener("click", handleAnchorClick);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
