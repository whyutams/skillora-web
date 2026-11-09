"use client";

import * as React from "react";

// komponen pelacak pengunjung global yang berjalan di seluruh halaman
export function PelacakPengunjung() {
  React.useEffect(() => {
    // tandai kunjungan satu kali per hari di browser pengguna
    const todayKey = `skillora_visit_${new Date().toISOString().slice(0, 10)}`;
    try {
      const alreadyTrackedToday = sessionStorage.getItem(todayKey);
      if (alreadyTrackedToday) return;
    } catch {
      // abaikan kesalahan akses storage
    }

    // kirim tracking kunjungan ke api analitik
    fetch("/api/analytics/visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((res) => {
        if (res.ok) {
          try {
            sessionStorage.setItem(todayKey, "1");
          } catch {
            // abaikan
          }
        }
      })
      .catch(() => {
        // non blocking
      });
  }, []);

  return null;
}

