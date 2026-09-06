"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-24 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/50" />
    );
  }

  return (
    <div
      role="group"
      aria-label="Pengaturan Tema Tampilan"
      className="inline-flex items-center p-0.5 rounded-lg border border-stone-200/80 dark:border-stone-800/80 bg-stone-100/80 dark:bg-stone-900/80 text-stone-500 text-xs"
    >
      {/* Light */}
      <button
        type="button"
        title="Tema Terang (Light)"
        onClick={() => setTheme("light")}
        className={`p-1.5 rounded-md transition-all ${
          theme === "light"
            ? "bg-white text-stone-900 shadow-xs dark:bg-stone-800 dark:text-stone-100"
            : "hover:text-stone-900 dark:hover:text-stone-200"
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>

      {/* System (Default) */}
      <button
        type="button"
        title="Tema Sistem (Otomatis)"
        onClick={() => setTheme("system")}
        className={`p-1.5 rounded-md transition-all ${
          theme === "system"
            ? "bg-white text-[#0F3E2E] dark:text-emerald-400 shadow-xs dark:bg-stone-800"
            : "hover:text-stone-900 dark:hover:text-stone-200"
        }`}
      >
        <Laptop className="w-3.5 h-3.5" />
      </button>

      {/* Dark */}
      <button
        type="button"
        title="Tema Gelap (Dark)"
        onClick={() => setTheme("dark")}
        className={`p-1.5 rounded-md transition-all ${
          theme === "dark"
            ? "bg-white text-stone-900 shadow-xs dark:bg-stone-800 dark:text-stone-100"
            : "hover:text-stone-900 dark:hover:text-stone-200"
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
