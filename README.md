# Mini Booking Service

Mini Booking Service adalah purwarupa sistem pemesanan tiket dengan fokus pada mekanisme **Seat Locking** (penguncian kursi) untuk mencegah race-condition saat ada dua user atau lebih yang mencoba memesan kursi yang sama di saat bersamaan.

## Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite
- **Frontend**: Next.js 14, TailwindCSS, TypeScript
- **Testing**: Vitest, Supertest

## Pendekatan Concurrency (Optimistic Locking)
Dikarenakan proyek ini menggunakan database **SQLite** untuk kemudahan pengujian (tidak perlu install PostgreSQL/Docker), maka fitur lock level database seperti `SELECT ... FOR UPDATE` (Pessimistic Locking) tidak dapat digunakan pada level baris (row-level). 

Sebagai gantinya, proyek ini mengimplementasikan **Optimistic Locking** menggunakan kolom `version` di tabel `Seat`.
Alur kerja:
1. Saat user mengklik kursi, backend akan mengeksekusi `UPDATE seats SET status='LOCKED', version=version+1, lockedBy=... WHERE id=seatId AND version=currentVersion`.
2. Jika ada dua user yang mencoba secara simultan, hanya satu transaksi yang akan menemukan `version` yang cocok, sementara transaksi satunya akan gagal (rows count = 0).
3. Transaksi yang gagal akan dilempar error 409 Concurrency Conflict, dan frontend akan mencegah user tersebut melanjutkan pesanan.
4. User yang berhasil akan diberikan countdown 5 menit untuk melakukan konfirmasi (booking).
5. Jika waktu habis, scheduler malas (lazy check saat query) atau job akan merilis kursi kembali menjadi `AVAILABLE`.

## Cara Menjalankan Aplikasi

### 1. Backend (API Server)
Buka terminal baru:
```bash
cd backend
npm install
# Inisialisasi DB, jalankan migrasi, dan masukan data dummy
npx prisma migrate dev --name init
npx prisma db seed

# Jalankan server API (akan berjalan di port 4000)
npm run dev
```

### 2. Frontend (Web UI)
Buka terminal baru:
```bash
cd frontend
npm install
# Jalankan web dev server (akan berjalan di port 3000)
npm run dev
```
Buka browser pada `http://localhost:3000`.

## Testing Backend
Semua kasus uji concurrency dan otentikasi dapat dijalankan via:
```bash
cd backend
npx vitest run
```

## Akun Login Dummy
- **Email:** `user1@example.com` | **Password:** `password123`
- **Email:** `user2@example.com` | **Password:** `password123`

## Dokumentasi API (Ringkas)
- `POST /auth/login`: Menerima `{ email, password }` mengembalikan JWT.
- `GET /schedules`: Mengambil jadwal perjalanan.
- `GET /schedules/:id/seats`: Mengambil ketersediaan kursi. Otomatis membersihkan lock yang sudah expired secara lazy.
- `POST /schedules/:id/seats/:seatId/lock`: (Protected) Mengunci kursi selama 5 menit.
- `POST /bookings/confirm`: (Protected) Konfirmasi pesanan kursi.
