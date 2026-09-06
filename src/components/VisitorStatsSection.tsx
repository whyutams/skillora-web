"use client";

import * as React from "react";
import { AnimatedCounter } from "./AnimatedCounter";
import { Calendar, TrendingUp, Users } from "lucide-react";
import { VisitorStatsSkeleton } from "@/components/ui/Skeleton";

export function VisitorStatsSection() {
  const [dailyCount, setDailyCount] = React.useState<number>(0);
  const [monthlyCount, setMonthlyCount] = React.useState<number>(0);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    async function trackVisitor() {
      try {
        const storedIp = localStorage.getItem("skillora_visitor_ip");

        if (storedIp) {
          const res = await fetch("/api/analytics/visitor");
          const data = await res.json();
          if (typeof data.dailyVisitors === "number") setDailyCount(data.dailyVisitors);
          if (typeof data.monthlyVisitors === "number") setMonthlyCount(data.monthlyVisitors);
          if (typeof data.totalVisitors === "number") setTotalCount(data.totalVisitors);
          return;
        }

        // Cek IP pengunjung untuk mencegah duplikasi (tidak ditampilkan ke layar)
        const ipRes = await fetch("https://api.ipify.org/?format=json");
        const ipData = await ipRes.json();
        const clientIp = ipData?.ip;

        if (clientIp) {
          localStorage.setItem("skillora_visitor_ip", clientIp);

          const apiRes = await fetch("/api/analytics/visitor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ip: clientIp }),
          });

          const apiData = await apiRes.json();
          if (typeof apiData.dailyVisitors === "number") setDailyCount(apiData.dailyVisitors);
          if (typeof apiData.monthlyVisitors === "number") setMonthlyCount(apiData.monthlyVisitors);
          if (typeof apiData.totalVisitors === "number") setTotalCount(apiData.totalVisitors);
        }
      } catch (err) {
        console.error("Error tracking visitor stats:", err);
      } finally {
        setLoading(false);
      }
    }

    trackVisitor();
  }, []);

  return (
    <section id="visitor" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header Section Simpel */}
      <div data-aos="fade-up" className="text-center space-y-2 mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F3E2E] dark:text-emerald-400 uppercase tracking-wider">
          <span>Statistik Pengunjung</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
          Aktivitas Pengunjung
        </h2>
      </div>

      {loading ? (
        <VisitorStatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            data-aos="fade-up"
            data-aos-delay="100"
            className="p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 backdrop-blur-sm space-y-3 transition-all hover:border-stone-300 dark:hover:border-stone-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Hari Ini
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              <AnimatedCounter value={dailyCount} />
            </div>
            <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Pengunjung Harian
            </p>
          </div>

          <div
            data-aos="fade-up"
            data-aos-delay="200"
            className="p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 backdrop-blur-sm space-y-3 transition-all hover:border-stone-300 dark:hover:border-stone-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Bulan Ini
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#0F3E2E] dark:text-emerald-400 tracking-tight">
              <AnimatedCounter value={monthlyCount} />
            </div>
            <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Pengunjung Bulanan
            </p>
          </div>

          <div
            data-aos="fade-up"
            data-aos-delay="300"
            className="p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 backdrop-blur-sm space-y-3 transition-all hover:border-stone-300 dark:hover:border-stone-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Total Seluruh Waktu
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              <AnimatedCounter value={totalCount} />
            </div>
            <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Total Pengunjung
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
