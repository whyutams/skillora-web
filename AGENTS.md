<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Aturan Umum Proyek Skillora

- DILARANG menggunakan tanda-tanda AI slop (seperti icon Sparkles, magic wand, bintang berkilau generik, atau ornamen AI klise) di seluruh antarmuka.
- DILARANG menggunakan karakter titik dua pada komentar kode apa pun.
- Komentar kode harus huruf kecil semua.
- DILARANG menggunakan kata sekolah di seluruh web (gunakan istilah perguruan tinggi, kampus, atau institusi).
- Istilah peran di UI: Peserta (bukan Student, Pelajar, atau Siswa).
- Istilah audiens umum: mahasiswa.
- Penamaan endpoint wajib bahasa Indonesia sewajarnya (/kursus, /kursus-saya, /profil, /sertifikat).
- Seluruh file dokumen md kecuali readme harus berada di folder .nogit.
- Seluruh tampilan antarmuka (UI) dashboard dan halaman wajib full width (w-full) mengisi seluruh lebar layar kontainer. DILARANG membatasi lebar tata letak utama dengan max-w (seperti max-w-7xl, max-w-6xl, max-w-5xl, mx-auto) yang membuat tampilan menyempit di tengah.
- Seluruh panel, card, banner, modal, dan kontainer antarmuka wajib konsisten menggunakan rounded-2xl. DILARANG menggunakan rounded-3xl pada panel.
- DILARANG menggunakan font mono di seluruh antarmuka UI (seperti pada badge, nomor soal, tanggal, nilai/skor, angka statistik, versi aplikasi, tombol, dll karena merupakan ciri AI slop). Seluruh teks antarmuka wajib menggunakan font sans standar yang bersih dan profesional. Penggunaan font mono HANYA diizinkan secara terbatas pada blok kode/editor pengetikan pemrograman interaktif (seperti WebCodeEditor) dan baris nomor editor kode.
- Wajib menerapkan smooth scrolling (Lenis) untuk seluruh halaman web tanpa terkecuali (baik halaman publik, autentikasi, maupun dashboard internal). Seluruh kontainer tata letak utama dilarang membatasi scroll dengan overflow-y-auto lokal yang merusak kelancaran smooth scroll window.
