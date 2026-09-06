import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LenisProvider } from "@/components/LenisProvider";
import { NavigationProgressBar } from "@/components/ProgressBar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://skillora.vercel.app"),
  title: {
    default: "Skillora | Platform Kursus Online Pelajar & Mahasiswa",
    template: "%s | Skillora",
  },
  description:
    "Kuasai keterampilan digital masa depan (Web Dev, Python Otomasi, UI/UX Design) dengan biaya hemat pelajar dan jadwal belajar fleksibel.",
  keywords: [
    "kursus online pelajar",
    "kursus coding mahasiswa",
    "belajar figma murah",
    "kursus python dasar",
    "web development pemula",
    "techno-edupreneurship",
    "kursus murah bersertifikat",
    "skillora kursus digital",
  ],
  authors: [{ name: "Skillora Edupreneurship Team", url: "https://skillora.vercel.app" }],
  creator: "Skillora",
  publisher: "Skillora",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Skillora | Platform Kursus Online Pelajar & Mahasiswa",
    description:
      "Kuasai keterampilan digital masa depan (Web Dev, Python, UI/UX) dengan biaya hemat pelajar dan bimbingan mentor via WhatsApp Group.",
    url: "https://skillora.vercel.app",
    siteName: "Skillora",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80",
        width: 1200,
        height: 630,
        alt: "Skillora Platform Kursus Online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Skillora | Platform Kursus Online Pelajar & Mahasiswa",
    description:
      "Kuasai keterampilan digital masa depan (Web Dev, Python, UI/UX) dengan biaya hemat pelajar.",
    images: ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning className={`${plusJakarta.variable} scroll-smooth`}>
      <body className="min-h-screen flex flex-col bg-[#FAF9F6] text-stone-900 dark:bg-[#0C0A09] dark:text-stone-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <NavigationProgressBar />
          <LenisProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <ScrollToTop />
            <Footer />
          </LenisProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

