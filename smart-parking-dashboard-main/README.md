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

## 📚 Dokumentasi
- React: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/docs
