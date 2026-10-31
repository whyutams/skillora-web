import { Suspense } from "react";
import { Sparkles, HelpCircle, MessageCircle, ChevronDown, Pencil, Clock, UserCheck } from "lucide-react";
import { LandingKatalogKursus } from "@/components/home/LandingKatalogKursus";
import { LandingTestimoni } from "@/components/home/LandingTestimoni";
import { SectionStatistikPengunjung } from "@/components/SectionStatistikPengunjung";
import { CourseCatalogSkeleton, TestimonialsSkeleton } from "@/components/ui/Skeleton";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const adminPhone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "6281234567890";

  return (
    <div className="space-y-24 sm:space-y-36 pb-24 overflow-hidden">
      {/* Hero Section */}
      <section id="hero" className="scroll-mt-24 relative pt-14 sm:pt-24 lg:pt-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[680px] lg:w-[880px] h-[250px] sm:h-[420px] bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-emerald-400/20 dark:from-emerald-600/25 dark:via-emerald-400/10 dark:to-teal-500/20 rounded-full blur-[80px] sm:blur-[130px] pointer-events-none -z-10" />
        <div className="absolute -top-6 left-6 sm:left-12 w-48 sm:w-80 h-48 sm:h-80 bg-emerald-400/15 dark:bg-emerald-700/15 rounded-full blur-[80px] pointer-events-none -z-10" />
        <div className="absolute top-16 right-6 sm:right-12 w-56 sm:w-96 h-56 sm:h-96 bg-teal-400/15 dark:bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none -z-10" />

        <div className="absolute inset-0 -z-10 opacity-[0.035] dark:opacity-[0.06] pointer-events-none [background-image:radial-gradient(#1c1917_1.2px,transparent_1.2px)] dark:[background-image:radial-gradient(#f5f5f4_1.2px,transparent_1.2px)] [background-size:24px_24px]" />

        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          <h1
            data-aos="fade-up"
            data-aos-delay="100"
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-[1.14]"
          >
            Kursus Digital Untuk Pelajar.{" "}
            <span className="relative inline-block text-[#0F3E2E] dark:text-emerald-400">
              Harga Ramah Pelajar.
              <svg
                className="absolute -bottom-2 left-0 w-full text-emerald-500/40 dark:text-emerald-400/50"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 9.5C65 2.5 185 -0.5 298 9.5"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p
            data-aos="fade-up"
            data-aos-delay="200"
            className="text-base sm:text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto leading-relaxed"
          >
            Skillora adalah layanan platform kursus online yang menyediakan berbagai kelas praktikum dengan menyediakan biaya terjangkau bagi pelajar.
          </p>

          <div
            data-aos="fade-up"
            data-aos-delay="300"
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <a
              href="#kursus"
              className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-sm bg-[#0F3E2E] hover:bg-[#16533e] text-white border border-[#1d5849]/50 shadow-sm transition-all duration-150 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Jelajahi Kursus</span>
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </a>
            <a
              href={`https://wa.me/${adminPhone}?text=${encodeURIComponent(
                "Halo Admin Skillora, saya ingin bertanya seputar kelas kursus."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-sm border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-900/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 transition-all duration-150 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Hubungi Admin via WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* Katalog Kursus */}
      <section id="kursus" className="scroll-mt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div data-aos="fade-up" className="space-y-3 mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F3E2E] dark:text-emerald-400 uppercase tracking-wider">
            <span>Kursus</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Berbagai Pilihan Kursus yang Tersedia Saat Ini
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-2xl">
            Pilih kursus yang ingin Anda kuasai. Klik &quot;Lihat Detail&quot; untuk melihat detail dan pendaftaran kursus
          </p>
        </div>

        <Suspense fallback={<CourseCatalogSkeleton />}>
          <LandingKatalogKursus />
        </Suspense>
      </section>

      {/* Keunggulan */}
      <section id="keunggulan" className="scroll-mt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div
          data-aos="fade-up"
          className="rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/40 dark:bg-stone-900/20 p-6 sm:p-12 backdrop-blur-sm"
        >
          <div className="max-w-2xl mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
              Mengapa Skillora?
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-2">
              Platform pembelajaran praktikum digital yang didesain khusus agar mudah diakses dan dipahami pelajar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              data-aos="fade-up"
              data-aos-delay="100"
              className="p-6 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 space-y-3"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Pencil className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Kursus Berfokus Pada Praktikum
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                Kursus kami lebih berfokus pada kelas praktikum secara daring
              </p>
            </div>

            <div
              data-aos="fade-up"
              data-aos-delay="200"
              className="p-6 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 space-y-3"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Lebih Fleksibel
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                Kursus online yang dibuka kapan saja di akhir pekan atau malam hari tanpa mengganggu jam perkuliahan.
              </p>
            </div>

            <div
              data-aos="fade-up"
              data-aos-delay="300"
              className="p-6 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 space-y-3"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-400 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Grup Diskusi Responsif
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                Setelah pembayaran disetujui oleh admin, Peserta langsung mendapatkan link masuk ke Grup WhatsApp kelas kursus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ulasan Peserta */}
      <section id="ulasan" className="scroll-mt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div data-aos="fade-up" className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F3E2E] dark:text-emerald-400 uppercase tracking-wider">
            <span>Ulasan</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Ulasan Peserta Kursus
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
            Testimoni dari peserta pelajar yang telah menyelesaikan kursus
          </p>
        </div>

        <Suspense fallback={<TestimonialsSkeleton />}>
          <LandingTestimoni />
        </Suspense>
      </section>

      {/* Statistik Pengunjung */}
      <SectionStatistikPengunjung />

      {/* Alur Pendaftaran */}
      <section id="alur" className="scroll-mt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div data-aos="fade-up" className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F3E2E] dark:text-emerald-400 uppercase tracking-wider">
            <span>Sistem Pendaftaran</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Alur Pendaftaran
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-xl mx-auto">
            Proses cepat dan praktis. Cukup transfer langsung biaya kursus dan kirimkan bukti pembayaran untuk langsung bergabung ke grup kelas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <div
            data-aos="fade-up"
            data-aos-delay="100"
            className="p-4 sm:p-5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 flex flex-col justify-start"
          >
            <span className="text-3xl font-extrabold text-[#0F3E2E]/20 dark:text-emerald-500/20 mb-2 block">
              01
            </span>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Daftar Akun Peserta
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Isi nama lengkap, username, asal kampus, nomor whatsapp aktif, dan lain-lain.
            </p>
          </div>

          <div
            data-aos="fade-up"
            data-aos-delay="200"
            className="p-4 sm:p-5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 flex flex-col justify-start"
          >
            <span className="text-3xl font-extrabold text-[#0F3E2E]/20 dark:text-emerald-500/20 mb-2 block">
              02
            </span>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Pilih Kursus
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Pilih kursus yang ingin Anda pelajari dan klik tombol &quot;Daftar Kursus&quot;.
            </p>
          </div>

          <div
            data-aos="fade-up"
            data-aos-delay="300"
            className="p-4 sm:p-5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 flex flex-col justify-start"
          >
            <span className="text-3xl font-extrabold text-[#0F3E2E]/20 dark:text-emerald-500/20 mb-2 block">
              03
            </span>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Kirim Bukti Transfer
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Upload bukti biaya pendaftaran dan akan diperiksa oleh Admin.
            </p>
          </div>

          <div
            data-aos="fade-up"
            data-aos-delay="400"
            className="p-4 sm:p-5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 flex flex-col justify-start"
          >
            <span className="text-3xl font-extrabold text-[#0F3E2E]/20 dark:text-emerald-500/20 mb-2 block">
              04
            </span>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Masuk Grup Kelas
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Admin menyetujui pendaftaran dan akan diarahkan ke grup kelas.
            </p>
          </div>

          <div
            data-aos="fade-up"
            data-aos-delay="500"
            className="p-4 sm:p-5 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900/60 flex flex-col justify-start"
          >
            <span className="text-3xl font-extrabold text-[#0F3E2E]/20 dark:text-emerald-500/20 mb-2 block">
              05
            </span>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Kerjakan Kursus
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Mengerjakan kursus secara mandiri dan bisa bimbingan via whatsapp kapan saja melalui grup kelas
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div data-aos="fade-up" className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F3E2E] dark:text-emerald-400 uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Pertanyaan yang Sering Diajukan
          </h2>
        </div>

        <div className="space-y-4">
          <details
            data-aos="fade-up"
            className="group rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 p-5 transition-colors cursor-pointer"
          >
            <summary className="font-bold text-sm text-stone-900 dark:text-stone-100 list-none flex items-center justify-between">
              <span>Bagaimana cara saya mendaftar kursus di Skillora?</span>
              <ChevronDown className="w-4 h-4 text-emerald-600 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-3 leading-relaxed space-y-2">
              <p>Proses pendaftaran sangat mudah dan praktis melalui 5 langkah berikut:</p>
              <ul className="list-decimal list-inside space-y-1 pl-1">
                <li>Buat akun peserta Anda terlebih dahulu</li>
                <li>Daftar ke kursus yang Anda minati</li>
                <li>Lakukan transfer pembayaran ke nomor rekening tertera</li>
                <li>Unggah dan kirimkan bukti transfer Anda ke form pendaftaran kursus untuk diverifikasi oleh admin</li>
                <li>Setelah disetujui, Gabung ke grup whatsapp melalui tombol yang disediakan</li>
              </ul>
            </div>
          </details>

          <details
            data-aos="fade-up"
            className="group rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 p-5 transition-colors cursor-pointer"
          >
            <summary className="font-bold text-sm text-stone-900 dark:text-stone-100 list-none flex items-center justify-between">
              <span>Apakah ada sertifikat setelah kursus selesai?</span>
              <ChevronDown className="w-4 h-4 text-emerald-600 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-3 leading-relaxed">
              Tentu saja! Anda akan mendapatkan e-sertifikat setelah menyelesaikan seluruh proses dari kursus yang Anda ikuti 
            </p>
          </details>

          <details
            data-aos="fade-up"
            className="group rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-stone-900/50 p-5 transition-colors cursor-pointer"
          >
            <summary className="font-bold text-sm text-stone-900 dark:text-stone-100 list-none flex items-center justify-between">
              <span>Setelah masuk ke grup WhatsApp, apa langkah selanjutnya yang harus saya lakukan?</span>
              <ChevronDown className="w-4 h-4 text-emerald-600 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-3 leading-relaxed">
              Para peserta sudah bisa untuk mengerjakan kursus secara mandiri melalui akun masing-masing. Bila ada pertanyaan seputar kursus bisa ditanyakan langsung ke mentor kursus melalui grup kelas.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
