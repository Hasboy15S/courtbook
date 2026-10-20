# CourtBook — Platform Booking Lapangan Olahraga Online

CourtBook adalah platform reservasi lapangan olahraga online (Futsal, Badminton, Tenis) modern berkinerja tinggi, dilengkapi sistem anti double-booking dengan row-level lock transaksi database, visualisasi 3D lapangan interaktif, integrasi pembayaran resmi Midtrans Snap, sistem notifikasi multi-channel, dan manajemen jadwal operasional admin.

---

## 🛠 Stack Teknologi
- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Visual & UI**: Three.js & React Three Fiber (`@react-three/fiber`, `@react-three/drei`), Vanilla CSS Design System (Turf Pitch Dark `#080c09` & Volt Lime `#ccff00`)
- **Database & ORM**: PostgreSQL, Prisma ORM 7 (`@prisma/adapter-pg` & `pg.Pool`)
- **Validasi & Keamanan**: Zod, Jose (JWT), Timing-Safe SHA512 Signature, In-memory Sliding Window Rate Limiter
- **Payment Gateway**: Midtrans Snap Sandbox & Production
- **Notifikasi**: Provider Architecture (In-App DB, Email, WhatsApp)

---

## 🚀 Panduan Setup & Instalasi Lokal

### 1. Prasyarat
- Node.js v18.18+ atau v20+
- PostgreSQL database aktif

### 2. Salin Environment Variables
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi berikut:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/courtbook?schema=public"
SESSION_SECRET="your-strong-random-session-secret-min-32-chars"
CRON_SECRET="your-strong-random-cron-secret-min-32-chars"

# Kredensial Midtrans Sandbox
MIDTRANS_SERVER_KEY="SB-Mid-server-your-sandbox-key"
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="SB-Mid-client-your-sandbox-key"
MIDTRANS_IS_PRODUCTION="false"
```

### 3. Install Dependensi & Sinkronisasi Database
```bash
npm install
npx prisma generate
node scripts/migrate-payment.js
node scripts/migrate-notifications.js
npm run seed
```

### 4. Jalankan Server Development
```bash
npm run dev
```
Buka browser pada: `http://localhost:3000`

---

## 💳 Pengujian Pembayaran Midtrans Snap (Sandbox)

### Langkah 1: Dapatkan Kunci Sandbox Midtrans
1. Daftar atau login ke [Midtrans Dashboard Sandbox](https://dashboard.sandbox.midtrans.com/).
2. Buka menu **Settings** → **Access Keys**.
3. Salin **Server Key** ke `MIDTRANS_SERVER_KEY` di `.env`.
4. Salin **Client Key** ke `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` di `.env`.

### Langkah 2: Ekspos Webhook Lokal via Tunnel (ngrok / cloudflared)
Midtrans membutuhkan URL publik HTTPS untuk mengirim notifikasi status pembayaran:
```bash
# Menggunakan ngrok:
ngrok http 3000

# Atau menggunakan cloudflared:
cloudflared tunnel --url http://localhost:3000
```
Salin URL HTTPS publik yang dihasilkan (misal `https://abc-123.ngrok-free.app`).

### Langkah 3: Konfigurasi Webhook di Midtrans Dashboard
1. Buka Midtrans Dashboard → **Settings** → **Configuration**.
2. Pada field **Payment Notification URL**, masukkan:
   ```
   https://<domain-tunnel-anda>/api/midtrans/notification
   ```
3. Klik **Save Changes**.

### Langkah 4: Simulasi Pembayaran
1. Buat pesanan di CourtBook dan buka halaman checkout `/booking/[id]/pay`.
2. Klik tombol **"BAYAR DENGAN MIDTRANS SNAP"**.
3. Popup Midtrans Snap akan muncul dengan pilihan QRIS, Transfer Bank (Virtual Account), atau GoPay.
4. Gunakan [Midtrans Payment Simulator](https://simulator.sandbox.midtrans.com/) untuk menyelesaikan transaksi:
   - **QRIS**: Scan QR code yang tampil di layar menggunakan simulator QRIS Midtrans.
   - **BCA/BNI/Mandiri VA**: Salin nomor Virtual Account dan bayar di simulator Virtual Account.
5. Setelah pembayaran berhasil, webhook `/api/midtrans/notification` akan memverifikasi signature SHA512 dan mengubah status booking menjadi `CONFIRMED` serta payment menjadi `PAID`. Halaman `/booking/[id]/status` akan otomatis terupdate.

---

## ⏱️ Setup Automated Cron Job (`/api/cron/cleanup`)

CourtBook memiliki endpoint cleanup otomatis untuk:
1. Membatalkan booking `PENDING` yang melewati batas hold waktu pembayaran (15 menit) sehingga slot kembali `AVAILABLE`.
2. Menandai booking `CONFIRMED` menjadi `COMPLETED` otomatis setelah jadwal waktu bermain selesai.

### Konfigurasi Pemanggilan Cron:
Panggil endpoint via GET atau POST dengan secret key:
```bash
# Menggunakan curl / server crontab (setiap 5 menit):
*/5 * * * * curl -X POST -H "x-cron-secret: your-strong-random-cron-secret-min-32-chars" https://yourdomain.com/api/cron/cleanup
```
Atau jika menggunakan Vercel Cron (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

## 📋 Checklist Go-Live (Checklist Produksi)

Sebelum merilis CourtBook ke server produksi:

- [ ] **1. Kredensial Midtrans Production**
  - Ganti `MIDTRANS_SERVER_KEY` dengan Server Key dari Midtrans Production.
  - Ganti `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` dengan Client Key dari Midtrans Production.
  - Set `MIDTRANS_IS_PRODUCTION="true"`.
- [ ] **2. Webhook Notification URL Production**
  - Di Midtrans Dashboard Production → **Settings** → **Configuration**, atur **Payment Notification URL** ke `https://yourdomain.com/api/midtrans/notification`.
- [ ] **3. Ubah Password Akun Admin Default**
  - Login ke akun admin bawaan seed (`admin@courtbook.com` / `admin123`).
  - Buka menu **Profil** (`/profile`) dan perbarui password dengan kombinasi kuat.
- [ ] **4. Nonaktifkan Quick-Fill Akun Demo**
  - Tombol quick-fill akun demo pada halaman login otomatis non-aktif saat `NODE_ENV=production`.
- [ ] **5. Kunci Rahasia Sesi Kriptografis**
  - Pastikan `SESSION_SECRET` di `.env` berupa string acak minimal 32 karakter (misal hasil dari `openssl rand -base64 32`).
- [ ] **6. Atur Cron Job Server**
  - Pastikan cron pembersih berjalan periodik (1-5 menit sekali) memanggil `/api/cron/cleanup` dengan header `x-cron-secret`.
- [ ] **7. Konfigurasi Email & WhatsApp Notification Gateway**
  - Pasang `SMTP_HOST` / `RESEND_API_KEY` pada `EmailNotificationProvider` dan token gateway WhatsApp di `WhatsAppNotificationProvider` pada `lib/notifications.ts`.

---

## 🧪 Menjalankan Automated Test Suites

### 1. Test Suite Midtrans Snap & Webhook (FASE 4)
```bash
node scripts/test-midtrans-payment.js
```

### 2. Test Suite Race Condition & Booking (FASE 3)
```bash
node scripts/test-booking-race-condition.js
```

### 3. Test Suite Admin & RBAC (FASE 5)
```bash
node scripts/test-admin-features.js
```

### 4. Test Suite Review, Notifikasi & Profil (FASE 6)
```bash
node scripts/test-phase6.js
```

### 5. Type Checking & ESLint
```bash
npx tsc --noEmit
npm run lint
```
Semua test dipastikan lulus 100% tanpa error maupun warning.
