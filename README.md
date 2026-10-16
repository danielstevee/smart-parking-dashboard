# Smart Parking Dashboard 🚗

Dashboard monitoring Smart Parking menggunakan React, Vite, dan Tailwind CSS untuk menampilkan status slot parkir, gerbang, dan aktivitas parkir.

## 🛠️ Tech Stack
- React + Vite
- Tailwind CSS
- JavaScript (JSX)
- REST API

## 📁 Struktur Folder

| Folder | Fungsi |
|---|---|
| `components/` | Komponen UI yang bisa digunakan berulang kali, seperti Sidebar dan StatCard. |
| `pages/` | Halaman utama, seperti Dashboard dan Riwayat Aktivitas. |
| `layouts/` | Kerangka halaman, seperti Sidebar dan area konten. |
| `services/` | Menghubungkan frontend dengan API. |
| `data/` | Data dummy selama API belum tersedia. |
| `assets/` | Gambar, ikon, dan aset visual. |

## 💻 Panduan Pengembangan

- Buat halaman di `pages/`.
- Buat komponen yang bisa digunakan ulang di `components/`.
- Gunakan Tailwind CSS untuk styling melalui `className`.
- Letakkan komunikasi API di `services/`.
- Gunakan data dummy dari `data/` selama API belum tersedia.

## 🌿 Git Workflow

Branch utama:
- `main` — kode utama yang stabil.
- `frontend` — pengembangan dashboard.
- `api` — branch terpisah untuk pengerjaan API.

Simpan perubahan dengan commit yang jelas:

```bash
git add .
git commit -m "feat: add dashboard"
git push
```

Jangan commit `node_modules/` atau file `.env`.

## 🎨 Design System

SPARKS menggunakan desain minimalis dengan warna coral-orange sebagai identitas utama, dipadukan dengan warna netral agar dashboard tetap nyaman dibaca.

### Color Palette

| Penggunaan | Warna | Tailwind CSS |
|---|---|---|
| Background utama | `#F4774F` | `bg-[#F4774F]` |
| Navbar | `#F4774F` | `bg-[#F4774F]` |
| Card utama | `#FFFFFF` | `bg-white` |
| Card sekunder | `#FFF7ED` | `bg-orange-50` |
| Card aksen | `#292524` | `bg-stone-800` |
| Teks utama pada card putih | `#1C1917` | `text-stone-900` |
| Teks sekunder | `#78716C` | `text-stone-500` |
| Tombol utama | `#1C1917` | `bg-stone-900` |

### Status Parkir

| Status | Tailwind CSS |
|---|---|
| Slot tersedia | `bg-emerald-100 text-emerald-700` |
| Slot terisi | `bg-rose-100 text-rose-700` |

### Aturan Penggunaan

- Gunakan coral-orange `#F4774F` sebagai warna utama identitas SPARKS.
- Gunakan `bg-white` untuk sebagian besar card statistik dan informasi.
- Gunakan `bg-orange-50` untuk card sekunder.
- Gunakan `bg-stone-800` hanya untuk panel aksen.
- Pastikan warna teks memiliki kontras yang cukup dengan background.
- Gunakan class Tailwind CSS agar styling konsisten dan mudah dipelihara.
- Hindari menambahkan warna baru tanpa kebutuhan desain yang jelas.

## 📚 Dokumentasi
- React: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/docs
