"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.2 });

export function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialLoadRef = React.useRef(true);
  const currentPathRef = React.useRef(pathname);

  // Selesaikan NProgress saat navigasi selesai berpindah halaman
  React.useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      NProgress.done();
      return;
    }

    NProgress.done();
    currentPathRef.current = pathname;
  }, [pathname, searchParams]);

  // Interseptor klik link secara global
  React.useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      // Abaikan jika bukan klik kiri utama atau jika menggunakan tombol modifier (tab baru)
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Abaikan jika target external / download / mailto / tel
      if (
        anchor.target === "_blank" ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        try {
          const url = new URL(href, window.location.href);
          if (url.origin !== window.location.origin) {
            return;
          }
        } catch {
          return;
        }
      }

      try {
        const url = new URL(href, window.location.href);

        // ATURAN UTAMA: Jika menuju ke halaman yang masih sama (pathname sama), JANGAN perlihatkan NProgress!
        const isSamePathname = url.pathname === window.location.pathname;
        const isSameSearch = url.search === window.location.search;

        if (isSamePathname && isSameSearch) {
          return;
        }

        // Jika hanya perbedaan hash (#) pada halaman yang sama, jangan tampilkan NProgress
        if (isSamePathname && url.hash) {
          return;
        }

        // Halaman benar-benar berbeda -> mulai NProgress
        NProgress.start();
      } catch {
        // Abaikan URL tidak valid
      }
    };

    document.addEventListener("click", handleLinkClick, true);

    return () => {
      document.removeEventListener("click", handleLinkClick, true);
      NProgress.done();
    };
  }, []);

  return (
    <style jsx global>{`
      #nprogress {
        pointer-events: none;
      }
      #nprogress .bar {
        background: #34d399;
        position: fixed;
        z-index: 9999;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        box-shadow: 0 0 10px #34d399, 0 0 5px #0f3e2e;
      }
      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px #34d399, 0 0 5px #34d399;
        opacity: 1;
        transform: rotate(3deg) translate(0px, -4px);
      }
    `}</style>
  );
}

export function NavigationProgressBar() {
  return (
    <React.Suspense fallback={null}>
      <ProgressBar />
    </React.Suspense>
  );
}
