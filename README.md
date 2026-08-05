# DagangCerdas — Solusi Cerdas UMKM Naik Kelas

![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-54.0-000000?style=for-the-badge&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Offline_First-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Groq AI](https://img.shields.io/badge/Groq_AI-Llama_3.3-F34F29?style=for-the-badge&logo=groq&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.style=for-the-badge)

**DagangCerdas** adalah aplikasi manajemen bisnis terintegrasi (*Smart POS*, *Inventory*, *Group Buying*, & *AI Mentor*) yang dirancang khusus untuk mendorong digitalisasi dan efisiensi operasional pelaku UMKM (Usaha Mikro, Kecil, dan Menengah) di Kota Medan.

Aplikasi ini mengusung pendekatan **Offline-First**, sehingga seluruh fungsi utama (kasir, inventaris, dan pencatatan transaksi) dapat terus berjalan 100% tanpa jaringan internet, dan akan tersinkronisasi otomatis saat terhubung ke cloud.

---

## Fitur Utama (Core Features)

### 1. Smart POS (Kasir Pintar)
- **Pencatatan Transaksi Kilat**: Antarmuka kasir yang intuitif dengan keranjang belanja interaktif.
- **Pemindai Barcode**: Mendukung pemindaian barcode fisik menggunakan kamera perangkat (*Expo Camera*).
- **Multi-Metode Pembayaran**: Catat pembayaran Tunai (dengan kalkulator kembalian otomatis), QRIS, maupun Transfer Bank.
- **Struk & Riwayat Transaksi**: Simpan dan lihat riwayat penjualan kapan saja.

### 2. Manajemen Stok & Inventaris
- **Monitoring Stok Real-Time**: Lacak sisa produk, harga modal (*cost price*), dan harga jual.
- **Notifikasi Stok Rendah**: Alert otomatis jika persediaan barang berada di bawah ambang batas minimum (*min stock*).
- **Barcode Generator**: Fitur pembuat kode barcode unik (EAN-13) untuk produk yang belum memiliki barcode dari pabrik.

### 3. Belanja Kolektif (Group Buying)
- **Ekosistem Pembelian Komunal**: Memungkinkan sesama pelaku UMKM terdekat bergabung untuk melakukan order grosir bahan baku secara kolektif dari distributor.
- **Diskon Grosir Volume Besar**: Dapatkan penghematan harga eceran hingga 15-25% dengan pemenuhan kuota grosir bersama.
- **Spasial Geolocation (Haversine)**: Menghitung jarak antar toko dan menentukan titik kumpul pengiriman (*centroid hub*) paling optimal berdasarkan lokasi GPS.

### 4. AI Mentor Bisnis ("Cerdas")
- **Powered by Groq Cloud & Llama 3.3 70B**: Respon AI ultra-cepat untuk analisis operasional toko.
- **Context Ingestion**: AI otomatis membaca data penjualan 7 hari terakhir, barang paling laku, dan stok kritis dari database lokal untuk memberikan saran bisnis yang actionable dan spesifik.
- **Local Fallback Engine**: Sistem rekomendasi tetap memberikan tips bisnis cerdas meski perangkat sedang offline.

### 5. Dashboard Analytics & KPI
- **Grafik Omzet & Profit**: Visualisasi statistik penjualan mingguan dan estimasi keuntungan bersih.
- **Analisis Produk Terlaris**: Pemetaaan barang paling diminati pelanggan untuk perencanaan stok.

---

## Tech Stack & Arsitektur

| Komponen | Teknologi / Library | Fungsi |
| :--- | :--- | :--- |
| **Framework Mobile** | [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) (v54) | Multiplatform Android & iOS |
| **Navigasi** | [Expo Router](https://docs.expo.dev/router/introduction/) (v6) | File-based routing & nested tab layouts |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (v5.9) | Strict typing untuk keandalan kode |
| **Database Lokal** | `expo-sqlite` (v16) | Database offline-first dengan WAL mode |
| **Cloud Service** | Firebase Auth & Firestore | Autentikasi & sinkronisasi data cloud |
| **AI Engine** | Groq Cloud API (`llama-3.3-70b-versatile`) | Pemrosesan bahasa alami & AI Advisor |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs/) (v5) + React Context | Manajer state global aplikasi |
| **Sensor & Hardware** | `expo-camera`, `expo-location`, `expo-haptics` | Scan barcode, geolokalasi GPS, & getaran |

---

## Prasyarat Sistem (Prerequisites)

Sebelum menjalankan aplikasi ini di lingkungan lokal Anda, pastikan telah menginstal:

- **Node.js**: `v18.x` atau lebih baru ([Download Node.js](https://nodejs.org/))
- **npm** (termasuk dalam Node.js) atau **yarn** / **pnpm**
- **Git** ([Download Git](https://git-scm.com/))
- **Expo Go App** (diinstal di smartphone Android/iOS Anda) atau **Android Emulator / iOS Simulator**

---

## Panduan Instalasi & Memulai (Quick Start)

Ikuti langkah-langkah berikut untuk menjalankan aplikasi di komputer lokal Anda:

### 1. Clone Repository
```bash
git clone https://github.com/ZeaLIsHere/DagangCerdas-MedanCup.git
cd DagangCerdas-MedanCup
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variable (`.env`)
Buat file `.env` di root direktori proyek (atau gunakan file `.env` yang ada) dan tambahkan API Key Groq Anda:

```env
EXPO_PUBLIC_GROQ_API_KEY=gsk_your_groq_api_key_here
```

> **Petunjuk mendapatkan API Key Groq (Gratis)**:
> 1. Buka [Groq Console](https://console.groq.com/)
> 2. Buat akun gratis dan masuk ke menu **API Keys**
> 3. Buat key baru dan paste ke file `.env` Anda.
> 
> *Catatan: Jika Anda tidak memasukkan API Key, fitur AI Chatbot tetap dapat berjalan menggunakan modul **Local Fallback** bawaan aplikasi.*

### 4. Jalankan Server Pengembang (Development Server)
```bash
npx expo start
```
Atau jalankan perintah spesifik platform:
```bash
# Menjalankan untuk Web Browser
npm run web

# Menjalankan di Android Emulator / Device
npm run android

# Menjalankan di iOS Simulator (khusus macOS)
npm run ios
```

### 5. Hubungkan ke Perangkat (Device Execution)
- **Smartphone Fisik**: Buka aplikasi **Expo Go** di Android/iOS, lalu scan QR Code yang muncul di terminal Anda.
- **Web Browser**: Tekan tombol `w` di terminal untuk membuka tampilan web secara instan.

---

## Struktur Direktori Proyek

```text
DagangCerdas-MedanCup/
├── app/                      # Expo Router File-Based Navigation
│   ├── (auth)/               # Layar Alur Autentikasi (Login / Register)
│   ├── (tabs)/               # Layar Utama Tab Navigasi
│   │   ├── index.tsx         # Dashboard Analytics & KPI
│   │   ├── pos.tsx           # Smart POS (Kasir Digital)
│   │   ├── inventory.tsx     # Manajemen Stok Barang
│   │   ├── group-buying.tsx  # Belanja Kolektif UMKM
│   │   └── profile.tsx       # Profil Pengguna & Pengaturan
│   └── _layout.tsx           # Root Layout & Provider Setup
├── assets/                   # Gambar, Ikon, & Font
├── components/               # Komponen UI Reusable (Custom Tabs, Haptics, dll)
├── src/
│   ├── services/
│   │   ├── ai/               # Chatbot service & Groq API Integration
│   │   ├── database/         # SQLite Schema, Migration, & Repository
│   │   ├── firebase/         # Firebase Auth & Firestore Client Config
│   │   └── geo/              # Algoritma Haversine & Centroid Distance
│   ├── stores/               # Zustand Store (Cart, Auth, Sync)
│   ├── theme/                # System Design System & Color Tokens
│   ├── types/                # TypeScript Interfaces & Definitions
│   └── utils/                # Helper, Formatters, & Seed Data
├── .env                      # Environment Variables Config
├── app.json                  # Konfigurasi Expo & App Manifest
└── package.json              # File Dependensi NPM
```

---

## Algoritma Utama yang Digunakan

1. **Haversine Distance Formula** (`src/services/geo/haversine.ts`):
   Digunakan untuk menghitung jarak spasial antar UMKM dalam radius tertentu untuk fitur *Group Buying*.
2. **Centroid Distribution** (`src/services/geo/haversine.ts`):
   Menghitung titik koordinat rata-rata dari sekelompok UMKM untuk menentukan lokasi pengiriman barang bersama yang paling seimbang.
3. **Business Context Ingestion** (`src/services/ai/chatbot.ts`):
   Mengekstrak data transaksi SQLite secara dinamis dan menyuntikkannya ke prompt AI Llama 3.3 untuk menghasilkan rekomendasi bisnis kontekstual.

---

## Kontribusi (Contributing)

Kontribusi dari komunitas open-source sangat kami sambut baik! Jika Anda bermaksud untuk memperbaiki bug, menambah fitur baru, atau meningkatkan dokumentasi:

1. **Fork** repository ini.
2. Buat feature branch baru: `git checkout -b feature/FiturBaru`.
3. Commit perubahan Anda: `git commit -m 'Menambahkan fitur X'`.
4. Push ke branch Anda: `git push origin feature/FiturBaru`.
5. Buat **Pull Request (PR)** baru dan jelaskan perubahan yang Anda buat.

---

## Lisensi & Pengakuan

- **Lisensi**: Proyek ini dilisensikan di bawah **[MIT License](LICENSE)**. Bebas digunakan, dimodifikasi, dan didistribusikan.
- **Kompetisi**: Dikembangkan sebagai karya untuk **Medan Cup (MCC) 2026** — *Membangun UMKM Digital Menuju Indonesia Emas 2045*.

---
<p center="align">
  <b>DagangCerdas</b> — Membawa UMKM Lokal Naik Kelas Lewat Teknologi
</p>


