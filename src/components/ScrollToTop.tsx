"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ChevronUp } from "lucide-react";

export function ScrollToTop() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = React.useState(false);

  const isDashboardRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/superadmin") ||
    pathname === "/dashboard";

  React.useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (isDashboardRoute || !isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll kembali ke atas"
      className="fixed bottom-6 right-6 z-40 p-3 rounded-xl border border-stone-300/80 dark:border-stone-700/80 bg-[#FAF9F6]/90 dark:bg-[#0C0A09]/90 text-stone-800 dark:text-stone-200 shadow-lg backdrop-blur-md hover:bg-stone-200 dark:hover:bg-stone-800 transition-all duration-200 hover:-translate-y-1 active:scale-95 group"
    >
      <ChevronUp className="w-5 h-5 text-[#0F3E2E] dark:text-emerald-400 group-hover:animate-bounce" />
    </button>
  );
}
