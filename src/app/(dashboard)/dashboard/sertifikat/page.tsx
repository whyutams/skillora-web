"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { StudentEnrollmentItem } from "@/app/(dashboard)/kursus-saya/DashboardPesertaClient";

export default function DashboardSertifikatPage() {
  const [enrollments, setEnrollments] = React.useState<StudentEnrollmentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [previewCertUrl, setPreviewCertUrl] = React.useState<string | null>(null);

  // ambil data pendaftaran kursus
  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("/api/student/enrollments");
        const data = await res.json();
        if (res.ok) {
          setEnrollments(data.enrollments || []);
        }
      } catch (err) {
        console.error("Gagal memuat sertifikat peserta", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const approvedList = enrollments.filter((e) => e.status === "approved");
  const certReadyList = approvedList.filter((e) => Boolean(e.certificate_url));
  const certPendingList = approvedList.filter((e) => !e.certificate_url);

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      {/* header halaman sertifikat */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-200/80 dark:border-stone-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Award className="w-7 h-7 text-[#0F3E2E] dark:text-emerald-400" />
            <span>Sertifikat Kelulusan Saya</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Daftar e-sertifikat resmi yang diterbitkan Skillora sebagai bukti kompetensi dan penyelesaian materi belajar Anda.
          </p>
        </div>

        <Link href="/kursus-saya" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold">
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Kursus Saya</span>
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 p-6 space-y-4 animate-pulse"
            >
              <Skeleton className="w-full h-44 rounded-xl" />
              <Skeleton className="w-3/4 h-5 rounded" />
              <Skeleton className="w-1/2 h-4 rounded" />
            </div>
          ))}
        </div>
      ) : certReadyList.length === 0 && certPendingList.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/50 dark:bg-stone-900/30 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
            <Award className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Belum Ada Sertifikat Kelulusan
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              Selesaikan modul dan evaluasi kuis pada kursus yang Anda ikuti untuk mendapatkan sertifikat resmi dari instruktur.
            </p>
          </div>
          <Link href="/dashboard/kursus">
            <Button variant="primary" size="sm" className="text-xs font-bold gap-1.5 mt-2">
              <BookOpen className="w-4 h-4" />
              <span>Jelajahi Kursus</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* daftar sertifikat yang sudah terbit */}
          {certReadyList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Sertifikat Resmi yang Telah Diterbitkan ({certReadyList.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certReadyList.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-white/80 dark:bg-stone-900/70 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* preview e-sertifikat */}
                      <div
                        className="relative h-48 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden cursor-pointer group"
                        onClick={() => setPreviewCertUrl(item.certificate_url)}
                      >
                        {item.certificate_url ? (
                          <SmoothImage
                            src={item.certificate_url}
                            alt={`Sertifikat ${item.course?.title || "Kursus"}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold">
                          <Eye className="w-4 h-4" />
                          <span>Klik untuk Pratinjau</span>
                        </div>
                      </div>

                      <div className="p-5 space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Terverifikasi Skillora</span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 line-clamp-2">
                          {item.course?.title}
                        </h3>
                        <p className="text-[11px] text-stone-400 font-medium">
                          ID Kredensial #{item.id.slice(0, 13).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 border-t border-stone-100 dark:border-stone-800/60 mt-4 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewCertUrl(item.certificate_url)}
                        className="flex-1 text-xs font-semibold gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Pratinjau</span>
                      </Button>
                      {item.certificate_url && (
                        <a
                          href={item.certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="flex-1"
                        >
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full text-xs font-bold gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Unduh</span>
                          </Button>
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* daftar kursus yang sedang dipelajari menunggu penerbitan sertifikat */}
          {certPendingList.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-stone-200/70 dark:border-stone-800/70">
              <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400 font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Kursus Dalam Proses Pembelajaran ({certPendingList.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certPendingList.map((item) => (
                  <Card
                    key={item.id}
                    className="p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300">
                        Dalam Proses
                      </span>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {item.course?.title}
                      </h3>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        Selesaikan materi dan kuis pada silabus agar admin dapat menerbitkan sertifikat kelulusan resmi Anda.
                      </p>
                    </div>

                    <Link href={`/kursus-saya/${item.course?.slug || item.id}/belajar/0/0`}>
                      <Button variant="outline" size="sm" className="w-full text-xs font-semibold gap-1.5">
                        <span>Lanjutkan Belajar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* modal pratinjau sertifikat resolusi tinggi */}
      {previewCertUrl && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewCertUrl(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Pratinjau E-Sertifikat Resmi Skillora
              </span>
              <button
                onClick={() => setPreviewCertUrl(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 flex items-center justify-center bg-stone-100 dark:bg-stone-950 max-h-[75vh] overflow-auto">
              <img
                src={previewCertUrl}
                alt="Pratinjau Sertifikat"
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-md"
              />
            </div>
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
              <a
                href={previewCertUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                <Button variant="primary" size="sm" className="text-xs font-bold gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File Sertifikat</span>
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
